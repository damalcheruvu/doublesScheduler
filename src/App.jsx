import BadmintonScheduler from './components/BadmintonScheduler';

function App() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Mobile-Optimized Header */}
      <div className="bg-gradient-to-r from-blue-600 to-indigo-700 shadow-lg">
        <div className="mx-auto max-w-7xl px-3 py-4 sm:px-4 sm:py-6">
          <div className="text-center">
            <div className="mb-2 flex items-center justify-center sm:mb-4">
              <div className="mr-2 flex h-8 w-8 items-center justify-center rounded-full bg-white shadow-lg sm:mr-4 sm:h-12 sm:w-12">
                <svg
                  className="h-5 w-5 text-blue-600 sm:h-8 sm:w-8"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-3 7h3m-3 4h3m-6-4h.01M9 16h.01"
                  />
                </svg>
              </div>
              <h1 className="text-xl font-bold text-white sm:text-3xl lg:text-4xl">
                🏸 Tournament Scheduler
              </h1>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content - No extra padding on mobile */}
      <BadmintonScheduler />

      {/* Simplified Footer */}
      <footer className="bg-gray-800 py-4 text-gray-300 sm:py-6">
        <div className="mx-auto max-w-7xl px-3 text-center sm:px-4">
          <p className="text-xs sm:text-sm">🏸🌟🎉</p>
        </div>
      </footer>
    </div>
  );
}

export default App;
