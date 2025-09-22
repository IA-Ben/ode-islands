'use client';

import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';

interface SampleDataControlProps {
  csrfToken: string;
}

export default function SampleDataControl({ csrfToken }: SampleDataControlProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [sampleDataEnabled, setSampleDataEnabled] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  // Check sample data status on component mount
  useEffect(() => {
    const checkSampleDataStatus = async () => {
      try {
        const response = await fetch('/api/admin/sample-data/status', {
          headers: {
            'X-CSRF-Token': csrfToken,
          },
          credentials: 'same-origin',
        });

        if (response.ok) {
          const data = await response.json();
          setSampleDataEnabled(data.sampleDataExists);
        }
      } catch (error) {
        console.error('Error checking sample data status:', error);
      } finally {
        setIsLoading(false);
      }
    };

    if (csrfToken) {
      checkSampleDataStatus();
    }
  }, [csrfToken]);

  const handleToggleSampleData = async () => {
    if (!csrfToken) {
      setMessage({ type: 'error', text: 'Security token not available. Please refresh the page.' });
      return;
    }

    setIsGenerating(true);
    setMessage(null);

    try {
      const endpoint = sampleDataEnabled ? '/api/admin/sample-data/remove' : '/api/admin/sample-data/generate';
      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        credentials: 'same-origin',
      });

      const data = await response.json();

      if (response.ok) {
        setSampleDataEnabled(!sampleDataEnabled);
        setMessage({ 
          type: 'success', 
          text: sampleDataEnabled 
            ? 'Sample data removed successfully! App reset to clean state.' 
            : `Sample data generated successfully! Created ${data.summary?.totalItems || 'multiple'} items across all features.`
        });
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to process sample data' });
      }
    } catch (error) {
      console.error('Error processing sample data:', error);
      setMessage({ type: 'error', text: 'Network error processing sample data' });
    } finally {
      setIsGenerating(false);
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex-1">
            <h4 className="text-white font-semibold mb-2">Demo Mode</h4>
            <p className="text-white/70 text-sm">
              Checking sample data status...
            </p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="w-4 h-4 border-2 border-white/30 border-t-transparent rounded-full animate-spin"></div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex-1">
          <h4 className="text-white font-semibold mb-2">Demo Mode</h4>
          <p className="text-white/70 text-sm">
            {sampleDataEnabled 
              ? 'Sample data is currently active. All app features are populated with demo content.'
              : 'Generate comprehensive sample data to showcase all app features for demonstrations.'
            }
          </p>
        </div>
        <div className="flex items-center space-x-4">
          <div className="flex items-center space-x-2">
            <div className={`w-3 h-3 rounded-full ${sampleDataEnabled ? 'bg-green-400' : 'bg-gray-400'}`}></div>
            <span className="text-white/80 text-sm font-medium">
              {sampleDataEnabled ? 'Active' : 'Inactive'}
            </span>
          </div>
          <Button
            onClick={handleToggleSampleData}
            disabled={isGenerating}
            className={`px-6 py-2 rounded-lg font-medium transition-all duration-200 ${
              sampleDataEnabled
                ? 'bg-red-500/20 hover:bg-red-500/30 text-red-200 border border-red-500/30'
                : 'bg-amber-500/20 hover:bg-amber-500/30 text-amber-200 border border-amber-500/30'
            }`}
          >
            {isGenerating ? (
              <div className="flex items-center space-x-2">
                <div className="w-4 h-4 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                <span>Processing...</span>
              </div>
            ) : sampleDataEnabled ? (
              'Remove Sample Data'
            ) : (
              'Generate Sample Data'
            )}
          </Button>
        </div>
      </div>

      {message && (
        <div 
          className={`p-4 rounded-lg border backdrop-blur-sm ${
            message.type === 'success'
              ? 'bg-green-500/10 border-green-500/20 text-green-200'
              : 'bg-red-500/10 border-red-500/20 text-red-200'
          }`}
        >
          <div className="flex items-start space-x-2">
            <svg 
              className={`w-5 h-5 mt-0.5 ${message.type === 'success' ? 'text-green-400' : 'text-red-400'}`} 
              fill="none" 
              stroke="currentColor" 
              viewBox="0 0 24 24"
            >
              {message.type === 'success' ? (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
              ) : (
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
              )}
            </svg>
            <span className="text-sm">{message.text}</span>
          </div>
        </div>
      )}

      {!sampleDataEnabled && (
        <div className="bg-white/5 rounded-lg p-4 border border-white/10">
          <h5 className="text-white font-medium mb-2">What gets generated:</h5>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm text-white/70">
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
              </svg>
              <span>Live events with venue details</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
              </svg>
              <span>Interactive polls & Q&A sessions</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
              </svg>
              <span>Collectible grid items & achievements</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-yellow-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <span>Memory wallet collections</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              <span>Live chat messages & reactions</span>
            </div>
            <div className="flex items-center space-x-2">
              <svg className="w-4 h-4 text-indigo-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
              <span>Community settings & social features</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}