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
    console.log('Falling back to mock data');
    return [];
  }
};

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

// Function with retry capability for handling rate limits
export const querySPARQLWithRetry = async (sparqlQuery, maxRetries = 3) => {
  let retries = 0;
  
  while (retries < maxRetries) {
    try {
      return await querySPARQL(sparqlQuery);
    } catch (error) {
      if (error.message.includes('429')) {
        // Rate limited, wait and retry
        retries++;
        const waitTime = Math.pow(2, retries) * 1000;
        await new Promise(resolve => setTimeout(resolve, waitTime));
      } else {
        throw error;
      }
    }
  }
  
  throw new Error('Maximum retries exceeded');
};