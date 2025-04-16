import React, { useState } from 'react';
import GenderRepresentation from './GenderRepresentation';
import ScientificDiscoveries from './ScientificDiscoveries';
import About from './About';

const App = () => {
  const [activeView, setActiveView] = useState('gender');

  return (
    <div className="container mx-auto p-4">
      <h1 className="text-3xl font-bold mb-6">Wikidata Visualizations</h1>
      
      <div className="mb-6">
        <div className="flex space-x-4">
          <button 
            className={`px-4 py-2 rounded ${activeView === 'gender' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setActiveView('gender')}
          >
            Gender Representation
          </button>
          <button 
            className={`px-4 py-2 rounded ${activeView === 'discoveries' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setActiveView('discoveries')}
          >
            Scientific Discoveries
          </button>
          <button 
            className={`px-4 py-2 rounded ${activeView === 'about' ? 'bg-blue-500 text-white' : 'bg-gray-200'}`}
            onClick={() => setActiveView('about')}
          >
            About
          </button>
        </div>
      </div>
      
      {activeView === 'gender' && <GenderRepresentation />}
      {activeView === 'discoveries' && <ScientificDiscoveries />}
      {activeView === 'about' && <About />}
    </div>
  );
};

export default App;