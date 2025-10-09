'use client';

import { useEffect } from 'react';

// SECURITY: Redirects to Stack Auth OAuth login
export default function LoginPage() {
  useEffect(() => {
    // Redirect to Stack Auth sign-in page
    window.location.href = '/handler/sign-in';
  }, []);

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex items-center justify-center">
      <div className="max-w-md mx-auto text-center">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">The Ode Islands</h1>
          <p className="mt-2 text-sm text-gray-600">
            Redirecting to secure login...
          </p>
        </div>
        
        <div className="animate-pulse">
          <div className="bg-blue-500 text-white px-6 py-3 rounded-lg">
            Please wait while we redirect you to secure login
          </div>
        </div>
      </div>
    </div>
  );
}