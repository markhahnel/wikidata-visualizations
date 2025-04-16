import React from 'react';

const About = () => {
  return (
    <div className="p-4 border rounded-lg shadow-lg">
      <h2 className="text-xl font-bold mb-4">About This Project</h2>
      
      <p className="mb-4">
        This project explores novel research directions using Wikidata's structured data through SPARQL queries.
        These visualizations demonstrate how public knowledge graphs can reveal patterns and insights 
        across different domains of human knowledge.
      </p>
      
      <h3 className="text-lg font-semibold mt-6 mb-2">Gender Representation Evolution</h3>
      <p className="mb-4">
        This visualization explores how gender representation has changed over time across different professional
        fields. The data is sourced directly from Wikidata using SPARQL queries that analyze people by occupation,
        gender, and birth date.
      </p>
      
      <h3 className="text-lg font-semibold mt-6 mb-2">Geographic Distribution of Scientific Discoveries</h3>
      <p className="mb-4">
        This map visualization shows where important scientific discoveries took place throughout history.
        It allows exploring patterns in scientific innovation by field, location, and time period.
      </p>
      
      <h3 className="text-lg font-semibold mt-6 mb-2">Other Potential Research Directions</h3>
      <p className="mb-4">
        There are many other fascinating research questions that could be explored using Wikidata:
      </p>
      <ul className="list-disc ml-6 mb-4">
        <li>Historical migration patterns of artists and scientists</li>
        <li>Evolution of professional career paths across different time periods</li>
        <li>Cross-cultural influence networks in philosophy and literature</li>
        <li>Analysis of co-authorship networks in scientific publications</li>
        <li>Evolution of urban development and architectural styles</li>
      </ul>
      
      <h3 className="text-lg font-semibold mt-6 mb-2">Technical Implementation</h3>
      <p className="mb-4">
        These visualizations are built using:
      </p>
      <ul className="list-disc ml-6 mb-4">
        <li>React for the UI framework</li>
        <li>D3.js for custom visualizations</li>
        <li>Recharts for chart components</li>
        <li>Wikidata SPARQL endpoint for data retrieval</li>
        <li>Tailwind CSS for styling</li>
      </ul>
      
      <h3 className="text-lg font-semibold mt-6 mb-2">Source Code</h3>
      <p>
        The source code for this project is available on 
        <a href="https://github.com/YOUR-USERNAME/wikidata-visualizations" className="text-blue-600 hover:underline ml-1">
          GitHub
        </a>.
      </p>
    </div>
  );
};

export default About;