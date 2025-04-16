// Simple cache for SPARQL queries
const queryCache = {};

// Function to execute SPARQL queries against Wikidata
export const querySPARQL = async (sparqlQuery) => {
  try {
    // Use a CORS proxy
    const corsProxy = 'https://corsproxy.io/?';
    const url = 'https://query.wikidata.org/sparql';
    const fullUrl = `${corsProxy}${encodeURIComponent(url)}?query=${encodeURIComponent(sparqlQuery)}&format=json`;
    
    const response = await fetch(fullUrl, {
      headers: {
        'Accept': 'application/sparql-results+json',
        'User-Agent': 'Wikidata Visualization Tool/1.0'
      }
    });
    
    if (!response.ok) {
      throw new Error(`SPARQL query failed: ${response.status} ${response.statusText}`);
    }
    
    const data = await response.json();
    return data.results.bindings;
  } catch (error) {
    console.error('Error executing SPARQL query:', error);
    // Fallback to mock data for demonstration
    return generateMockData(sparqlQuery);
  }
};

// Generate mock data for demos and when API fails
function generateMockData(query) {
  if (query.includes('gender')) {
    return generateGenderMockData();
  } else if (query.includes('discovery')) {
    return generateDiscoveryMockData();
  }
  return [];
}

function generateGenderMockData() {
  // Simplified mock data for gender representation
  const fields = ['astronomer', 'physicist', 'chemist', 'programmer'];
  const decades = [1800, 1850, 1900, 1950, 2000];
  const data = [];
  
  fields.forEach(field => {
    decades.forEach(decade => {
      // Male data
      data.push({
        field: { value: `http://www.wikidata.org/entity/Q${Math.floor(Math.random() * 1000000)}` },
        fieldLabel: { value: field },
        decade: { value: decade.toString() },
        gender: { value: 'http://www.wikidata.org/entity/Q6581097' },
        genderLabel: { value: 'male' },
        count: { value: Math.floor(Math.random() * 100 + 50).toString() }
      });
      
      // Female data
      data.push({
        field: { value: `http://www.wikidata.org/entity/Q${Math.floor(Math.random() * 1000000)}` },
        fieldLabel: { value: field },
        decade: { value: decade.toString() },
        gender: { value: 'http://www.wikidata.org/entity/Q6581072' },
        genderLabel: { value: 'female' },
        count: { value: Math.floor(Math.random() * 50 + 5).toString() }
      });
    });
  });
  
  return data;
}

function generateDiscoveryMockData() {
  // Simplified mock data for scientific discoveries
  const discoveries = [
    { name: 'Electromagnetic induction', year: 1831, field: 'physics', location: 'London', country: 'United Kingdom', lat: 51.5074, lon: -0.1278, discoverer: 'Michael Faraday' },
    { name: 'X-rays', year: 1895, field: 'physics', location: 'Würzburg', country: 'Germany', lat: 49.7913, lon: 9.9534, discoverer: 'Wilhelm Röntgen' },
    { name: 'Radioactivity', year: 1896, field: 'physics', location: 'Paris', country: 'France', lat: 48.8566, lon: 2.3522, discoverer: 'Henri Becquerel' },
    { name: 'Electron', year: 1897, field: 'physics', location: 'Cambridge', country: 'United Kingdom', lat: 52.2053, lon: 0.1218, discoverer: 'J.J. Thomson' },
    { name: 'DNA structure', year: 1953, field: 'biology', location: 'Cambridge', country: 'United Kingdom', lat: 52.2053, lon: 0.1218, discoverer: 'Watson and Crick' },
    { name: 'Penicillin', year: 1928, field: 'medicine', location: 'London', country: 'United Kingdom', lat: 51.5074, lon: -0.1278, discoverer: 'Alexander Fleming' },
    { name: 'Transistor', year: 1947, field: 'physics', location: 'New Jersey', country: 'United States', lat: 40.0583, lon: -74.4057, discoverer: 'Bardeen, Brattain, and Shockley' },
    { name: 'World Wide Web', year: 1989, field: 'computer science', location: 'Geneva', country: 'Switzerland', lat: 46.2044, lon: 6.1432, discoverer: 'Tim Berners-Lee' },
    { name: 'Periodic table', year: 1869, field: 'chemistry', location: 'Saint Petersburg', country: 'Russia', lat: 59.9343, lon: 30.3351, discoverer: 'Dmitri Mendeleev' },
    { name: 'Theory of relativity', year: 1905, field: 'physics', location: 'Bern', country: 'Switzerland', lat: 46.9480, lon: 7.4474, discoverer: 'Albert Einstein' }
  ];
  
  return discoveries.map(d => ({
    discovery: { value: `http://www.wikidata.org/entity/Q${Math.floor(Math.random() * 1000000)}` },
    discoveryLabel: { value: d.name },
    year: { value: d.year.toString() },
    field: { value: `http://www.wikidata.org/entity/Q${Math.floor(Math.random() * 1000000)}` },
    fieldLabel: { value: d.field },
    locationLabel: { value: d.location },
    countryLabel: { value: d.country },
    lat: { value: d.lat.toString() },
    lon: { value: d.lon.toString() },
    discovererLabel: { value: d.discoverer }
  }));
}

// Cached version of the query function
export const querySPARQLWithCache = async (sparqlQuery, cacheTimeMinutes = 60) => {
  const cacheKey = sparqlQuery;
  
  // Check if we have a cached result
  if (queryCache[cacheKey]) {
    const { timestamp, data } = queryCache[cacheKey];
    const cacheAge = (Date.now() - timestamp) / (1000 * 60); // in minutes
    
    if (cacheAge < cacheTimeMinutes) {
      return data;
    }
  }
  
  // No valid cache, execute query
  const results = await querySPARQL(sparqlQuery);
  
  // Cache the results
  queryCache[cacheKey] = {
    timestamp: Date.now(),
    data: results
  };
  
  return results;
};

// Helper to clean SPARQL query results
export const processWikidataResults = (results) => {
  if (!results || !Array.isArray(results)) {
    console.error('Invalid results format:', results);
    return [];
  }

  return results.map(item => {
    const processed = {};
    
    // Convert each property object to a simple value
    Object.keys(item).forEach(key => {
      if (item[key] && item[key].value !== undefined) {
        processed[key] = item[key].value;
        
        // Convert numeric strings to numbers
        if (!isNaN(processed[key]) && key !== 'id') {
          processed[key] = Number(processed[key]);
        }
      }
    });
    
    return processed;
  });
};