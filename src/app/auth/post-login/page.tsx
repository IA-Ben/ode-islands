'use client';

import { useEffect, useState } from 'react';
import { apiGet } from '@/lib/csrfUtils';

export default function PostLoginPage() {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');

  useEffect(() => {
    async function refreshUserAndRedirect() {
      try {
        // Force a fresh fetch of user data to ensure session is recognized
        const response = await apiGet('/api/me');
        
        if (response) {
          setStatus('success');
          
          // Check if there's a returnTo URL in the query params
          const params = new URLSearchParams(window.location.search);
          const returnTo = params.get('returnTo') || '/event';
          
          // Force full page reload to ensure all components re-mount with fresh session
          window.location.href = returnTo;
        } else {
          // No user data - redirect to login
          setStatus('error');
          setTimeout(() => {
            window.location.href = '/api/login';
          }, 1000);
        }
      } catch (error) {
        console.error('Post-login refresh failed:', error);
        setStatus('error');
        // Redirect to home on error
        setTimeout(() => {
          window.location.href = '/';
        }, 1000);
      }
    }

    refreshUserAndRedirect();
  }, []);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      <div className="text-center">
        {status === 'loading' && (
          <>
            <div className="inline-block h-12 w-12 animate-spin rounded-full border-4 border-solid border-fuchsia-400 border-r-transparent mb-4"></div>
            <p className="text-white text-lg">Completing login...</p>
          </>
        )}
        {status === 'success' && (
          <>
            <div className="text-fuchsia-400 text-5xl mb-4">✓</div>
            <p className="text-white text-lg">Login successful! Redirecting...</p>
          </>
        )}
        {status === 'error' && (
          <>
            <div className="text-red-400 text-5xl mb-4">⚠</div>
            <p className="text-white text-lg">Authentication error. Redirecting...</p>
          </>
        )}
      </div>
    </div>
  );
}
