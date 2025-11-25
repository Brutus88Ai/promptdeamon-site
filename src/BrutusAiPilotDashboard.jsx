import React, { useState, useEffect, useRef } from 'react';
import { LineChart, Sparkles, Video, Share2, Check, ArrowRight, Download } from 'lucide-react';

function BrutusAiPilotDashboard() {
  const [currentStep, setCurrentStep] = useState(0);
  const [isRunning, setIsRunning] = useState(false);
  const timeoutIds = useRef([]);

  const steps = [
    {
      title: "Google Trends Scraper",
      icon: LineChart,
      badge: "AI News (+300%)",
      status: "Ready"
    },
    {
      title: "Pro-Prompt Engineer",
      icon: Sparkles,
      status: "Script Optimized"
    },
    {
      title: "Video Generator",
      icon: Video,
      status: "Ready to Download"
    },
    {
      title: "Multi-Platform Upload",
      icon: Share2,
      status: "Done"
    }
  ];

  useEffect(() => {
    if (isRunning) {
      // Clear any existing timeouts
      timeoutIds.current.forEach(clearTimeout);
      timeoutIds.current = [];

      // Set new timeouts
      const newTimeoutIds = [
        setTimeout(() => setCurrentStep(1), 1000),
        setTimeout(() => setCurrentStep(2), 3000),
        setTimeout(() => setCurrentStep(3), 5000),
        setTimeout(() => setIsRunning(false), 6000)
      ];
      timeoutIds.current = newTimeoutIds;
    }

    // Cleanup function to clear timeouts when the component unmounts or isRunning changes to false
    return () => {
      timeoutIds.current.forEach(clearTimeout);
    };
  }, [isRunning]);

  const handleStart = () => {
    setIsRunning(true);
    setCurrentStep(0);
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className="w-64 bg-white shadow-sm border-r border-gray-200">
        <div className="p-6">
          <h1 className="text-xl font-bold text-purple-600">BrutusAi Pilot</h1>
        </div>
        <nav className="mt-8 px-4">
          <a href="#" className="block px-4 py-3 text-purple-600 bg-purple-50 rounded-lg font-medium mb-2">Studio</a>
          <a href="#" className="block px-4 py-3 text-gray-600 hover:text-purple-600 mb-2">Planer</a>
          <a href="#" className="block px-4 py-3 text-gray-600 hover:text-purple-600 mb-2">Tracking</a>
          <a href="#" className="block px-4 py-3 text-gray-600 hover:text-purple-600 mb-2">Profil</a>
        </nav>
        <div className="absolute bottom-0 w-64 p-6 border-t border-gray-200">
          <div className="text-sm text-gray-600 font-medium">User Settings</div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-1 p-8">
        <h2 className="text-3xl font-bold text-gray-800 mb-8">Full-Auto Trend Pipeline</h2>

        {/* Pipeline */}
        <div className="flex items-center justify-center space-x-8 mb-12">
          {steps.map((step, index) => (
            <React.Fragment key={index}>
              <div className={`bg-white p-6 rounded-xl shadow-sm border-2 transition-all duration-300 ${
                currentStep >= index ? 'border-purple-500 shadow-purple-100' : 'border-gray-200'
              }`}>
                <step.icon className={`w-10 h-10 mb-4 ${
                  currentStep >= index ? 'text-purple-600' : 'text-gray-400'
                }`} />
                <h3 className="text-lg font-semibold text-gray-800 mb-2">{step.title}</h3>
                {step.badge && (
                  <span className="inline-block bg-purple-100 text-purple-700 text-sm px-2 py-1 rounded-full mb-2">
                    {step.badge}
                  </span>
                )}
                <p className="text-sm text-gray-600 mb-4">{step.status}</p>

                {/* Step-specific content */}
                {index === 2 && currentStep >= 2 && (
                  <div className="space-y-2">
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div className="bg-purple-600 h-2 rounded-full" style={{ width: '100%' }}></div>
                    </div>
                    <button className="w-full flex items-center justify-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors">
                      <Download className="w-4 h-4 mr-2" />
                      Download
                    </button>
                  </div>
                )}

                {index === 3 && currentStep >= 3 && (
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-700">TikTok</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-700">Reels</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-gray-700">Shorts</span>
                    </div>
                  </div>
                )}
              </div>

              {index < steps.length - 1 && (
                <ArrowRight className={`w-8 h-8 ${
                  currentStep > index ? 'text-purple-600' : 'text-gray-400'
                }`} />
              )}
            </React.Fragment>
          ))}
        </div>

        {/* Start Button */}
        <div className="text-center">
          <button
            onClick={handleStart}
            disabled={isRunning}
            className="px-12 py-4 bg-purple-600 text-white text-lg font-semibold rounded-xl hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg hover:shadow-xl"
          >
            {isRunning ? 'Auto-Pilot Running...' : 'Start Auto-Pilot'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default BrutusAiPilotDashboard;