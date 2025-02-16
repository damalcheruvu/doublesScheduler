import React from 'react';
import BadmintonScheduler from './components/BadmintonScheduler';

function App() {
  return (
    <div className="min-h-screen bg-gray-100 py-8">
      <div className="max-w-7xl mx-auto px-4">
        <h1 className="text-3xl font-bold text-gray-900 mb-8 text-center">
          Badminton Court Scheduler
        </h1>
        <BadmintonScheduler />
      </div>
    </div>
  );
}

export default App;