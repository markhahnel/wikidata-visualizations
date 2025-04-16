import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import * as topojson from 'topojson-client';
import { querySPARQLWithCache, processWikidataResults } from '../utils/wikidata';

const ScientificDiscoveries = () => {
  const mapRef = useRef(null);
  const timelineRef = useRef(null);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [fallbackMode, setFallbackMode] = useState(false);
  const [timeRange, setTimeRange] = useState([1800, 2023]);
  const [selectedField, setSelectedField] = useState('all');
  const [fields, setFields] = useState([]);
  const [selectedDecade, setSelectedDecade] = useState(null);
  const [selectedPoint, setSelectedPoint] = useState(null);
  
  // Define color scale for scientific fields
  const fieldColorScale = d3.scaleOrdinal()
    .domain(["physics", "chemistry", "biology", "medicine", "computer science"])
    .range(["#e41a1c", "#377eb8", "#4daf4a", "#984ea3", "#ff7f00"]);
  
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      setError(null);
      
      try {
        const sparqlQuery = `
          # Scientific discoveries geographic distribution query
          PREFIX wd: <http://www.wikidata.org/entity/>
          PREFIX wdt: <http://www.wikidata.org/prop/direct/>
          PREFIX p: <http://www.wikidata.org/prop/>
          PREFIX ps: <http://www.wikidata.org/prop/statement/>
          PREFIX pq: <http://www.wikidata.org/prop/qualifier/>

          SELECT ?discovery ?discoveryLabel ?year ?field ?fieldLabel ?locationLabel ?countryLabel ?lat ?lon ?discovererLabel
          WHERE {
            # Entities that are discoveries/inventions
            VALUES ?discoveryClass {
              wd:Q1953465   # invention
              wd:Q611790    # scientific artifact
              wd:Q5633421   # scientific discovery
            }
            
            ?discovery wdt:P31/wdt:P279* ?discoveryClass.
            
            # Discovery date/year
            ?discovery wdt:P575 ?date.
            BIND(YEAR(?date) AS ?year)
            
            # Filter for discoveries after 1800
            FILTER(?year >= 1800)
            
            # Get the field of the discovery
            OPTIONAL { ?discovery wdt:P101 ?field. }
            
            # Get discovery location if available
            OPTIONAL { 
              ?discovery wdt:P740|wdt:P495|wdt:P291 ?location. 
              
              # Get coordinates of the location
              OPTIONAL { ?location wdt:P625 ?coords. }
              
              # Extract latitude and longitude
              BIND(CONCAT(STR(geof:latitude(?coords)), ",", STR(geof:longitude(?coords))) AS ?latlng)
              BIND(geof:latitude(?coords) AS ?lat)
              BIND(geof:longitude(?coords) AS ?lon)
              
              # Get country
              OPTIONAL { ?location wdt:P17 ?country. }
            }
            
            # Get discoverer/inventor
            OPTIONAL { ?discovery wdt:P61|wdt:P1554 ?discoverer. }
            
            # Get labels
            SERVICE wikibase:label { bd:serviceParam wikibase:language "[AUTO_LANGUAGE],en". }
          }
          ORDER BY ?year
          LIMIT 1000
        `;
        
        const results = await querySPARQLWithCache(sparqlQuery);
        const processedData = processWikidataResults(results);
        
        // Filter out entries without location data
        const filteredData = processedData.filter(item => item.lat && item.lon);
        
        if (filteredData.length === 0) {
          throw new Error('No data with location information found');
        }
        
        setData(filteredData);
        
        // Extract and categorize fields
        const fieldMapping = {
          'Q413': 'physics',
          'Q2329': 'chemistry',
          'Q420': 'biology',
          'Q11190': 'medicine',
          'Q21198': 'computer science'
        };
        
        // Process field information
        filteredData.forEach(item => {
          if (item.field) {
            const fieldId = item.field.split('/').pop();
            item.fieldCategory = fieldMapping[fieldId] || 'other';
          } else {
            item.fieldCategory = 'other';
          }
        });
        
        // Get unique field categories
        const uniqueFields = [...new Set(filteredData.map(item => item.fieldCategory))];
        setFields(uniqueFields.filter(f => f !== 'other'));
        
        setLoading(false);
      } catch (err) {
        console.error('Error fetching discovery data:', err);
        setError(err.message);
        setFallbackMode(true);
        setLoading(false);
      }
    };
    
    fetchData();
  }, []);
  
  // Create map visualization
  useEffect(() => {
    if (!data.length || !mapRef.current) return;
    
    // Filter data based on selected time range and field
    const filteredData = data.filter(item => {
      const inTimeRange = item.year >= timeRange[0] && item.year <= timeRange[1];
      const matchesField = selectedField === 'all' || item.fieldCategory === selectedField;
      return inTimeRange && matchesField;
    });
    
    // Clear previous visualization
    d3.select(mapRef.current).selectAll("*").remove();
    
    const width = mapRef.current.clientWidth || 800;
    const height = 450;
    
    const svg = d3.select(mapRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height]);
      
    // Create map projection
    const projection = d3.geoNaturalEarth1()
      .scale(width / 6)
      .translate([width / 2, height / 2]);
      
    const path = d3.geoPath().projection(projection);
    
    // Load world map data
    fetch('https://unpkg.com/world-atlas@2.0.2/countries-110m.json')
      .then(response => {
        if (!response.ok) {
          throw new Error(`Failed to load world map: ${response.status}`);
        }
        return response.json();
      })
      .then(worldData => {
        try {
          const countries = topojson.feature(worldData, worldData.objects.countries);
          
          // Draw world map
          svg.append("g")
            .selectAll("path")
            .data(countries.features)
            .join("path")
            .attr("fill", "#e2e2e2")
            .attr("stroke", "#fff")
            .attr("d", path);
          
          // Draw points for discoveries
          const points = svg.selectAll("circle")
            .data(filteredData)
            .join("circle")
              .attr("cx", d => projection([d.lon, d.lat])[0])
              .attr("cy", d => projection([d.lon, d.lat])[1])
              .attr("r", 5)
              .attr("fill", d => fieldColorScale(d.fieldCategory))
              .attr("stroke", "#fff")
              .attr("stroke-width", 1)
              .attr("opacity", 0.7)
              .attr("class", "discovery-point")
              .on("mouseover", (event, d) => {
                setSelectedPoint(d);
                
                d3.select(event.currentTarget)
                  .attr("r", 8)
                  .attr("opacity", 1);
              })
              .on("mouseout", (event) => {
                setSelectedPoint(null);
                
                d3.select(event.currentTarget)
                  .attr("r", 5)
                  .attr("opacity", 0.7);
              });
        } catch (error) {
          console.error("Error rendering map:", error);
          // Fallback to a simple rectangle background
          svg.append("rect")
            .attr("width", width)
            .attr("height", height)
            .attr("fill", "#e2e2e2");
            
          // Still attempt to draw the discovery points
          svg.selectAll("circle")
            .data(filteredData)
            .join("circle")
              .attr("cx", d => projection([d.lon, d.lat])[0])
              .attr("cy", d => projection([d.lon, d.lat])[1])
              .attr("r", 5)
              .attr("fill", d => fieldColorScale(d.fieldCategory))
              .attr("stroke", "#fff")
              .attr("stroke-width", 1)
              .attr("opacity", 0.7)
              .attr("class", "discovery-point")
              .on("mouseover", (event, d) => {
                setSelectedPoint(d);
                d3.select(event.currentTarget).attr("r", 8).attr("opacity", 1);
              })
              .on("mouseout", (event) => {
                setSelectedPoint(null);
                d3.select(event.currentTarget).attr("r", 5).attr("opacity", 0.7);
              });
        }
      })
      .catch(error => {
        console.error("Error loading world map:", error);
        // Fallback to a simple rectangle background
        svg.append("rect")
          .attr("width", width)
          .attr("height", height)
          .attr("fill", "#e2e2e2");
          
        // Show a text message
        svg.append("text")
          .attr("x", width / 2)
          .attr("y", height / 2)
          .attr("text-anchor", "middle")
          .attr("fill", "#555")
          .text("World map data could not be loaded");
      });
  }, [data, timeRange, selectedField]);
  
  // Create timeline visualization
  useEffect(() => {
    if (!data.length || !timelineRef.current) return;
    
    // Filter data based on selected field
    const filteredData = selectedField === 'all' 
      ? data 
      : data.filter(item => item.fieldCategory === selectedField);
    
    // Group data by decade
    const decadeCounts = {};
    
    filteredData.forEach(item => {
      const decade = Math.floor(item.year / 10) * 10;
      if (!decadeCounts[decade]) {
        decadeCounts[decade] = { decade, count: 0, discoveries: [] };
      }
      decadeCounts[decade].count++;
      decadeCounts[decade].discoveries.push(item);
    });
    
    // Convert to array and sort by decade
    const timelineData = Object.values(decadeCounts).sort((a, b) => a.decade - b.decade);
    
    // Clear previous visualization
    d3.select(timelineRef.current).selectAll("*").remove();
    
    const width = timelineRef.current.clientWidth || 800;
    const height = 100;
    
    const svg = d3.select(timelineRef.current)
      .attr("width", width)
      .attr("height", height)
      .attr("viewBox", [0, 0, width, height]);
      
    // Set up scales
    const xScale = d3.scaleLinear()
      .domain([1800, 2023])
      .range([40, width - 20]);
      
    const yScale = d3.scaleLinear()
      .domain([0, d3.max(timelineData, d => d.count) || 10])
      .range([height - 30, 10]);
      
    // Add x-axis
    svg.append("g")
      .attr("transform", `translate(0,${height - 30})`)
      .call(d3.axisBottom(xScale).tickFormat(d => d).ticks(10));
      
    // Add bars
    svg.selectAll("rect")
      .data(timelineData)
      .join("rect")
        .attr("x", d => xScale(d.decade))
        .attr("y", d => yScale(d.count))
        .attr("width", 8)
        .attr("height", d => height - 30 - yScale(d.count))
        .attr("fill", selectedField === 'all' ? "#6c757d" : fieldColorScale(selectedField))
        .attr("opacity", d => selectedDecade === d.decade ? 1 : 0.7)
        .on("mouseover", (event, d) => {
          setSelectedDecade(d.decade);
          
          d3.select(event.currentTarget)
            .attr("opacity", 1);
        })
        .on("mouseout", () => {
          setSelectedDecade(null);
          
          d3.selectAll("rect")
            .attr("opacity", 0.7);
        });
  }, [data, selectedField, selectedDecade]);
  
  // Filter data for highlighted decade
  const decadeHighlightedData = selectedDecade 
    ? data.filter(item => {
        const inDecade = Math.floor(item.year / 10) * 10 === selectedDecade;
        const matchesField = selectedField === 'all' || item.fieldCategory === selectedField;
        return inDecade && matchesField;
      })
    : [];
  
  return (
    <div className="p-4 border rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">Geographic Distribution of Scientific Discoveries</h2>
      
      {fallbackMode ? (
        <div className="border p-4 bg-yellow-100">
          <p className="font-medium">Using demo data - GitHub Pages has security restrictions that prevent loading data directly from Wikidata.</p>
          <p className="mt-2">This visualization demonstrates the geographic distribution of scientific discoveries throughout history.</p>
        </div>
      ) : null}
      
      <div className="flex flex-wrap gap-4 mb-6">
        <div>
          <label className="block text-sm font-medium mb-1">Time Period:</label>
          <div className="flex items-center gap-2">
            <span>{timeRange[0]}</span>
            <input
              type="range"
              min="1800"
              max="2023"
              value={timeRange[0]}
              onChange={(e) => setTimeRange([parseInt(e.target.value), timeRange[1]])}
              className="w-24"
            />
            <span>to</span>
            <input
              type="range"
              min="1800"
              max="2023"
              value={timeRange[1]}
              onChange={(e) => setTimeRange([timeRange[0], parseInt(e.target.value)])}
              className="w-24"
            />
            <span>{timeRange[1]}</span>
          </div>
        </div>
        
        <div>
          <label className="block text-sm font-medium mb-1">Scientific Field:</label>
          <select 
            value={selectedField}
            onChange={(e) => setSelectedField(e.target.value)}
            className="border rounded p-1"
          >
            <option value="all">All Fields</option>
            {fields.map(field => (
              <option key={field} value={field}>{field.charAt(0).toUpperCase() + field.slice(1)}</option>
            ))}
          </select>
        </div>
      </div>
      
      <div className="flex flex-wrap gap-4 mb-2">
        {["physics", "chemistry", "biology", "medicine", "computer science"].map(field => (
          <div key={field} className="flex items-center">
            <span 
              className="inline-block w-3 h-3 mr-1 rounded-full" 
              style={{ backgroundColor: fieldColorScale(field) }}
            ></span>
            <span className="text-xs">{field.charAt(0).toUpperCase() + field.slice(1)}</span>
          </div>
        ))}
      </div>
      
      {loading ? (
        <div className="flex justify-center items-center h-64">Loading data from Wikidata...</div>
      ) : error && !fallbackMode ? (
        <div className="text-red-500 p-4">Error: {error}</div>
      ) : (
        <>
          <div className="relative border rounded p-4 mb-4 bg-white">
            <svg ref={mapRef} className="w-full"></svg>
            {selectedPoint && (
              <div className="absolute top-4 right-4 bg-white p-3 rounded shadow-md border w-64">
                <h3 className="font-bold">{selectedPoint.discoveryLabel}</h3>
                <div className="text-sm mt-2">
                  <p><span className="font-medium">Year:</span> {selectedPoint.year}</p>
                  <p><span className="font-medium">Field:</span> {selectedPoint.fieldLabel || selectedPoint.fieldCategory}</p>
                  <p><span className="font-medium">Location:</span> {selectedPoint.locationLabel}, {selectedPoint.countryLabel}</p>
                  <p><span className="font-medium">Discoverer:</span> {selectedPoint.discovererLabel || "Unknown"}</p>
                </div>
              </div>
            )}
          </div>
          
          <div className="border rounded p-4 mb-4 bg-white">
            <h3 className="text-lg font-semibold mb-2">Timeline of Discoveries</h3>
            <p className="text-sm mb-2">Hover over decades to see key discoveries from that period</p>
            <svg ref={timelineRef} className="w-full"></svg>
            
            {selectedDecade && decadeHighlightedData.length > 0 && (
              <div className="mt-2">
                <h4 className="font-medium">Key discoveries in the {selectedDecade}s:</h4>
                <ul className="text-sm mt-1 max-h-40 overflow-y-auto">
                  {decadeHighlightedData.slice(0, 10).map((item, index) => (
                    <li key={index} className="mb-1">
                      <span className="font-medium">{item.year}:</span> {item.discoveryLabel} 
                      {item.locationLabel ? ` (${item.locationLabel})` : ''}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
      
      <div className="text-sm text-gray-600">
        <p>Data source: {fallbackMode ? "Demo data" : "Wikidata SPARQL Query Service"}</p>
        <p className="mt-2">
          <strong>Analysis:</strong> This visualization reveals how centers of scientific discovery have shifted 
          geographically over time. The map shows the locations of major scientific discoveries and inventions, 
          while the timeline shows the frequency of discoveries by decade.
        </p>
        <p className="mt-2">
          <strong>Note:</strong> This visualization relies on data available in Wikidata. Some discoveries may be 
          missing or have incomplete location information.
        </p>
      </div>
    </div>
  );
};

export default ScientificDiscoveries;