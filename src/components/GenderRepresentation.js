import React, { useState, useEffect } from 'react';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { querySPARQLWithCache, processWikidataResults } from '../utils/wikidata';

const GenderRepresentation = () => {
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedField, setSelectedField] = useState('all');
  const [visualizationType, setVisualizationType] = useState('percentage');
  const [aggregatedData, setAggregatedData] = useState([]);
  const [fields, setFields] = useState([]);
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const sparqlQuery = `
          # Gender representation evolution query
          PREFIX wd: <http://www.wikidata.org/entity/>
          PREFIX wdt: <http://www.wikidata.org/prop/direct/>
          PREFIX p: <http://www.wikidata.org/prop/>
          PREFIX ps: <http://www.wikidata.org/prop/statement/>
          PREFIX pq: <http://www.wikidata.org/prop/qualifier/>

          SELECT ?field ?fieldLabel ?decade ?gender ?genderLabel (COUNT(DISTINCT ?person) as ?count)
          WHERE {
            # Get people in various fields
            ?person wdt:P106 ?field.
            
            # Get their gender
            ?person wdt:P21 ?gender.
            
            # Get birth date
            ?person wdt:P569 ?birthDate.
            
            # Calculate decade of birth
            BIND(YEAR(?birthDate) - (YEAR(?birthDate) % 10) AS ?decade)
            
            # Filter for specific fields of interest
            VALUES ?field {
              wd:Q11063   # astronomer
              wd:Q169470  # physicist
              wd:Q593644  # chemist
              wd:Q170790  # mathematician
              wd:Q37226   # teacher
              wd:Q5482740 # programmer
              wd:Q11631   # astronaut
            }
            
            # Filter for 1800 onwards
            FILTER(?decade >= 1800)
            
            # Get labels
            SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
          }
          GROUP BY ?field ?fieldLabel ?decade ?gender ?genderLabel
          ORDER BY ?field ?decade ?gender
          LIMIT 1000
        `;
        
        const results = await querySPARQLWithCache(sparqlQuery);
        const processedData = processWikidataResults(results);
        
        setData(processedData);
        
        // Extract unique fields
        const uniqueFields = [...new Set(processedData.map(item => item.fieldLabel))];
        setFields(uniqueFields);
        
        setLoading(false);
      } catch (err) {
        setError(err.message);
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Process data based on selected field and visualization type
  useEffect(() => {
    if (data.length === 0) return;
    
    // Filter data by selected field if not 'all'
    const filteredData = selectedField === 'all' 
      ? data 
      : data.filter(item => item.fieldLabel === selectedField);
    
    // Group data by decade and gender
    const groupedByDecade = {};
    
    filteredData.forEach(item => {
      const decadeStr = item.decade.toString();
      if (!groupedByDecade[decadeStr]) {
        groupedByDecade[decadeStr] = { decade: item.decade };
      }
      
      const genderKey = item.genderLabel === 'male' ? 'maleCount' : 
                        item.genderLabel === 'female' ? 'femaleCount' : 
                        `other${item.genderLabel}Count`;
      
      // For absolute counts
      groupedByDecade[decadeStr][genderKey] = parseInt(item.count, 10);
      
      // Track total for calculating percentages
      if (!groupedByDecade[decadeStr].total) {
        groupedByDecade[decadeStr].total = 0;
      }
      groupedByDecade[decadeStr].total += parseInt(item.count, 10);
    });
    
    // Calculate percentages
    Object.values(groupedByDecade).forEach(item => {
      if (item.maleCount && item.total) {
        item.malePercentage = (item.maleCount / item.total) * 100;
      }
      if (item.femaleCount && item.total) {
        item.femalePercentage = (item.femaleCount / item.total) * 100;
      }
      // Handle other genders if present
      Object.keys(item).forEach(key => {
        if (key.startsWith('other') && key.endsWith('Count')) {
          const genderName = key.slice(5, -5);
          item[`${genderName}Percentage`] = (item[key] / item.total) * 100;
        }
      });
    });
    
    // Convert to array and sort by decade
    const result = Object.values(groupedByDecade).sort((a, b) => a.decade - b.decade);
    setAggregatedData(result);
  }, [data, selectedField]);
  
  const renderVisualization = () => {
    if (loading) {
      return <div className="flex justify-center items-center h-64">Loading data from Wikidata...</div>;
    }
    
    if (error) {
      return <div className="text-red-500 p-4">Error: {error}</div>;
    }
    
    if (aggregatedData.length === 0) {
      return <div className="text-center p-4">No data available for the selected field.</div>;
    }
    
    if (visualizationType === 'percentage') {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <AreaChart data={aggregatedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="decade" />
            <YAxis tickFormatter={(value) => `${value}%`} domain={[0, 100]} />
            <Tooltip formatter={(value) => `${value.toFixed(1)}%`} />
            <Legend />
            <Area type="monotone" dataKey="femalePercentage" name="Female %" stackId="1" stroke="#8884d8" fill="#8884d8" />
            <Area type="monotone" dataKey="malePercentage" name="Male %" stackId="1" stroke="#82ca9d" fill="#82ca9d" />
          </AreaChart>
        </ResponsiveContainer>
      );
    } else {
      return (
        <ResponsiveContainer width="100%" height={400}>
          <BarChart data={aggregatedData} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis dataKey="decade" />
            <YAxis />
            <Tooltip />
            <Legend />
            <Bar dataKey="femaleCount" name="Female Count" stackId="a" fill="#8884d8" />
            <Bar dataKey="maleCount" name="Male Count" stackId="a" fill="#82ca9d" />
          </BarChart>
        </ResponsiveContainer>
      );
    }
  };
  
  return (
    <div className="p-4 border rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">Gender Representation Evolution in Professional Fields</h2>
      
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Field:</label>
          <select 
            value={selectedField}
            onChange={(e) => setSelectedField(e.target.value)}
            className="border rounded p-1"
          >
            <option value="all">All Fields Combined</option>
            {fields.map(field => (
              <option key={field} value={field}>{field}</option>
            ))}
          </select>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Visualization Type:</label>
          <select 
            value={visualizationType}
            onChange={(e) => setVisualizationType(e.target.value)}
            className="border rounded p-1"
          >
            <option value="percentage">Percentage Stacked Area</option>
            <option value="absolute">Absolute Count Stacked Bar</option>
          </select>
        </div>
      </div>
      
      <div className="border rounded p-4">
        {renderVisualization()}
      </div>
      
      <div className="mt-4 text-sm text-gray-600">
        <p>Data source: Wikidata SPARQL Query Service</p>
        <p className="mt-2">
          <strong>Analysis:</strong> This visualization reveals how gender representation has evolved in different 
          professional fields over time. The data is based on entries in Wikidata for people in these professions
          born in each decade.
        </p>
      </div>
    </div>
  );
};

export default GenderRepresentation;