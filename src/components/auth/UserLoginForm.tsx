'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';

export default function UserLoginForm() {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);

  const handleOAuthLogin = () => {
    setIsLoading(true);
    // Redirect to Stack Auth OAuth login
    window.location.href = '/handler/sign-in';
  };

  return (
    <div className="max-w-md mx-auto mt-8 p-6 bg-white rounded-lg shadow-md">
      <h2 className="text-2xl font-bold text-center mb-6 text-gray-800">Welcome Back</h2>
      
      <div className="space-y-4">
        <button
          onClick={handleOAuthLogin}
          disabled={isLoading}
          className="w-full bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors font-medium flex items-center justify-center space-x-2"
        >
          <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
            <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
          </svg>
          <span>{isLoading ? 'Redirecting...' : 'Sign In'}</span>
        </button>

        <div className="text-center">
          <p className="text-sm text-gray-500">
            Secure authentication powered by Stack Auth
          </p>
        </div>

        <div className="text-center mt-6">
          <p className="text-sm text-gray-600">
            New to The Ode Islands?{' '}
            <button
              type="button"
              onClick={() => router.push('/auth/register')}
              className="text-blue-600 hover:text-blue-700 font-medium"
            >
              Create an account
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}