'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import ImmersivePageLayout, { ImmersiveTheme } from '@/components/ImmersivePageLayout';
import AnimateText from '@/components/AnimateText';
import type { CardData } from '@/@typings';

type ChapterData = {
  [key: string]: CardData[];
};

type User = {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  isAdmin: boolean;
};

interface TabTheme {
  background: string;
  overlay: string;
  title: string;
  subtitle: string;
  description: string;
  shadow?: boolean;
}

export default function CMSPage() {
  console.log('CMS Page component loaded - debugging active');
  const [chapters, setChapters] = useState<ChapterData>({});
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string>('chapter-1');
  const [selectedPhase, setSelectedPhase] = useState<string>('before');
  const [loginError, setLoginError] = useState('');
  const [csrfToken, setCsrfToken] = useState<string>('');
  const [animateIn, setAnimateIn] = useState(false);
  
  // Professional Lumus-inspired themes for different CMS phases
  const tabThemes: Record<string, TabTheme> = {
    before: {
      background: 'linear-gradient(135deg, #1e293b 0%, #334155 100%)',
      overlay: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.1))',
      title: '#ffffff',
      subtitle: '#e2e8f0',
      description: '#cbd5e0',
      shadow: true
    },
    event: {
      background: 'linear-gradient(135deg, #7c2d12 0%, #9a3412 100%)',
      overlay: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.1))',
      title: '#ffffff',
      subtitle: '#fef7f0',
      description: '#fed7aa',
      shadow: true
    },
    after: {
      background: 'linear-gradient(135deg, #065f46 0%, #047857 100%)',
      overlay: 'linear-gradient(rgba(0,0,0,0.3), rgba(0,0,0,0.1))',
      title: '#ffffff',
      subtitle: '#ecfdf5',
      description: '#d1fae5',
      shadow: true
    }
  };
  
  const currentTheme: ImmersiveTheme = tabThemes[selectedPhase] || tabThemes.before;

  useEffect(() => {
    checkAuthStatus();
    // Trigger animation after mount
    const timer = setTimeout(() => setAnimateIn(true), 200);
    return () => clearTimeout(timer);
  }, []);

  useEffect(() => {
    if (user?.isAdmin) {
      fetchCSRFToken();
      fetchChapters();
    }
  }, [user]);
  
  useEffect(() => {
    // Re-trigger animation when phase changes
    setAnimateIn(false);
    const timer = setTimeout(() => setAnimateIn(true), 100);
    return () => clearTimeout(timer);
  }, [selectedPhase]);

  const checkAuthStatus = async () => {
    try {
      console.log('Checking authentication status...');
      const response = await fetch('/api/auth/status');
      console.log('Auth status response:', response.status, response.statusText);
      
      if (response.ok) {
        // Safely parse JSON response
        let statusData;
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            statusData = await response.json();
          } else {
            console.warn('Auth status response is not JSON, treating as unauthenticated');
            setUser(null);
            return;
          }
        } catch (parseError) {
          console.error('Failed to parse auth status response:', parseError);
          setUser(null);
          return;
        }
        
        // Get user data if authenticated
        const userResponse = await fetch('/api/auth/user');
        if (userResponse.ok) {
          try {
            const userContentType = userResponse.headers.get('content-type');
            if (userContentType && userContentType.includes('application/json')) {
              const userData = await userResponse.json();
              console.log('User data received:', userData);
              
              // Validate user data structure
              if (userData && typeof userData === 'object' && userData.id) {
                setUser(userData);
              } else {
                console.error('Invalid user data structure:', userData);
                setUser(null);
              }
            } else {
              console.warn('User response is not JSON');
              setUser(null);
            }
          } catch (parseError) {
            console.error('Failed to parse user response:', parseError);
            setUser(null);
          }
        } else {
          console.log('Failed to fetch user data:', userResponse.status, userResponse.statusText);
          setUser(null);
        }
      } else {
        console.log('User not authenticated:', response.status, response.statusText);
        setUser(null);
      }
    } catch (error) {
      console.error('Network error checking auth status:', error);
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchCSRFToken = async () => {
    try {
      const response = await fetch('/api/csrf-token', {
        credentials: 'same-origin'
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.csrfToken) {
          setCsrfToken(data.csrfToken);
          console.log('CSRF token fetched successfully');
        }
      } else {
        console.error('Failed to fetch CSRF token:', response.status);
      }
    } catch (error) {
      console.error('Error fetching CSRF token:', error);
    }
  };

  const fetchChapters = async () => {
    try {
      const response = await fetch('/api/cms/chapters', {
        credentials: 'same-origin'
      });
      
      if (response.ok) {
        try {
          const contentType = response.headers.get('content-type');
          if (contentType && contentType.includes('application/json')) {
            const data = await response.json();
            
            // Validate chapters data structure
            if (data && typeof data === 'object') {
              setChapters(data);
              console.log('Chapters loaded successfully:', Object.keys(data).length, 'chapters');
            } else {
              console.error('Invalid chapters data structure:', data);
              setChapters({});
            }
          } else {
            console.error('Chapters response is not JSON:', contentType);
            setChapters({});
          }
        } catch (parseError) {
          console.error('Failed to parse chapters response:', parseError);
          setChapters({});
        }
      } else {
        console.error('Failed to fetch chapters:', response.status, response.statusText);
        if (response.status === 401) {
          console.log('Authentication required for chapters');
        } else if (response.status === 404) {
          console.log('Chapters endpoint not found');
        }
        setChapters({});
      }
    } catch (error) {
      console.error('Network error fetching chapters:', error);
      setChapters({});
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = () => {
    console.log('Redirecting to Replit OAuth login...');
    // Redirect to Replit OAuth login
    window.location.href = '/api/login';
  };

  const handleLogout = async () => {
    try {
      // For Replit OAuth, redirect to logout endpoint
      window.location.href = '/api/logout';
    } catch (error) {
      console.error('Error during logout:', error);
      // Fallback: clear user state and reload
      setUser(null);
      window.location.reload();
    }
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const saveChapter = async (chapterId: string, cards: CardData[]) => {
    if (!csrfToken) {
      alert('Security token not available. Please refresh the page.');
      return;
    }
    
    try {
      const response = await fetch('/api/cms/chapters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
        },
        body: JSON.stringify({ id: chapterId, cards }),
        credentials: 'same-origin',
      });
      
      if (response.ok) {
        alert('Chapter saved successfully!');
        fetchChapters(); // Refresh data
      } else {
        if (response.status === 403) {
          alert('Security token expired. Please refresh the page.');
        } else {
          alert('Failed to save chapter');
        }
      }
    } catch (error) {
      console.error('Error saving chapter:', error);
      alert('Error saving chapter');
    }
  };

  if (authLoading) {
    return (
      <ImmersivePageLayout
        title="Initializing"
        subtitle="CMS Access Control"
        description="Verifying admin credentials and preparing the content management interface..."
        theme={{
          background: 'linear-gradient(135deg, #374151 0%, #1f2937 100%)',
          overlay: 'linear-gradient(rgba(0,0,0,0.4), rgba(0,0,0,0.2))',
          title: '#ffffff',
          subtitle: '#e5e7eb',
          description: '#d1d5db',
          shadow: true
        }}
        animateIn={true}
      >
        <div className="flex flex-col items-center justify-center space-y-8">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-white/60 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <div className="text-center">
            <div className="text-white/80 text-lg font-medium mb-2">Authenticating...</div>
            <div className="flex items-center justify-center space-x-2 text-white/60 text-sm">
              <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      </ImmersivePageLayout>
    );
  }

  // Show login screen if not authenticated
  if (!user) {
    return (
      <ImmersivePageLayout
        title="The Ode Islands"
        subtitle="Admin Access Portal"
        description="Enter your admin credentials to access the comprehensive content management system"
        theme={{
          background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)',
          overlay: 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.3))',
          title: '#ffffff',
          subtitle: '#e2e8f0',
          description: '#cbd5e0',
          shadow: true
        }}
        animateIn={animateIn}
        centerContent={true}
      >
        <div className="max-w-md mx-auto">
          <div 
            className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8"
            style={{
              opacity: 0,
              animation: animateIn ? 'animButtonIn 0.8s 1.5s ease forwards' : 'none'
            }}
          >
            <div className="text-center mb-8">
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-white mb-4">
                <AnimateText active={animateIn} delay={1800}>
                  Admin Portal
                </AnimateText>
              </h3>
              <p className="text-white/80 mb-8 leading-relaxed">
                <AnimateText active={animateIn} delay={2100}>
                  Secure access to content management, analytics, and administrative controls
                </AnimateText>
              </p>
            </div>
            
            <div className="space-y-6">
              <div>
                <div className="text-center text-white/80 mb-6">
                  <p className="text-lg">Sign in with your Replit account to access the CMS</p>
                  <p className="text-sm text-white/60 mt-2">Admin permissions required</p>
                </div>
              </div>
              
              {loginError && (
                <div 
                  className="text-red-400 text-sm bg-red-500/10 border border-red-500/20 rounded-lg p-3 backdrop-blur-sm"
                  style={{
                    opacity: 0,
                    animation: 'animButtonIn 0.3s ease forwards'
                  }}
                >
                  <div className="flex items-center space-x-2">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                    </svg>
                    <span>{loginError}</span>
                  </div>
                </div>
              )}
              
              <button 
                type="button"
                className="group relative overflow-hidden w-full bg-blue-600 hover:bg-blue-700 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl backdrop-blur-sm border border-blue-500 hover:border-blue-400"
                onClick={handleLogin}
              >
                <div className="absolute inset-0 bg-blue-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
                <div className="relative flex items-center justify-center space-x-3">
                  <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                    <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
                  </svg>
                  <span className="text-lg">Sign in with Replit</span>
                </div>
              </button>
            </div>
          </div>
        </div>
      </ImmersivePageLayout>
    );
  }

  // Show access denied if not admin
  if (!user.isAdmin) {
    return (
      <ImmersivePageLayout
        title="Access Restricted"
        subtitle="Administrator Privileges Required"
        description="This content management system requires admin-level access permissions to continue"
        theme={{
          background: 'linear-gradient(135deg, #7c2d12 0%, #991b1b 100%)',
          overlay: 'linear-gradient(rgba(0,0,0,0.5), rgba(0,0,0,0.3))',
          title: '#ffffff',
          subtitle: '#fef2f2',
          description: '#fecaca',
          shadow: true
        }}
        animateIn={animateIn}
        centerContent={true}
      >
        <div className="max-w-md mx-auto">
          <div 
            className="bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 text-center"
            style={{
              opacity: 0,
              animation: animateIn ? 'animButtonIn 0.8s 1.5s ease forwards' : 'none'
            }}
          >
            <div className="mb-8">
              <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-3xl font-bold text-white mb-4">
                <AnimateText active={animateIn} delay={1800}>
                  Insufficient Permissions
                </AnimateText>
              </h3>
              <p className="text-white/80 mb-6 leading-relaxed">
                <AnimateText active={animateIn} delay={2100}>
                  Content management access is restricted to administrators only
                </AnimateText>
              </p>
              <div className="text-white/60 text-sm mb-8 bg-white/10 rounded-lg p-3 backdrop-blur-sm">
                Logged in as: <span className="font-mono text-white/80">{user.email}</span>
              </div>
            </div>
            
            <button
              onClick={handleLogout}
              className="group relative overflow-hidden w-full bg-white/20 hover:bg-white/30 text-white font-bold py-4 px-8 rounded-xl transition-all duration-300 transform hover:scale-105 shadow-lg hover:shadow-xl backdrop-blur-sm border border-white/30 hover:border-white/50"
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300" />
              <div className="relative flex items-center justify-center space-x-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                </svg>
                <span>Return to Login</span>
              </div>
            </button>
          </div>
        </div>
      </ImmersivePageLayout>
    );
  }

  if (loading) {
    return (
      <ImmersivePageLayout
        title="Preparing CMS"
        subtitle="Content Management System"
        description="Loading your admin dashboard, content libraries, and management tools..."
        theme={currentTheme}
        animateIn={true}
      >
        <div className="flex flex-col items-center justify-center space-y-8">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-white/30 border-t-white rounded-full animate-spin"></div>
            <div className="absolute inset-0 w-16 h-16 border-4 border-transparent border-t-white/60 rounded-full animate-spin" style={{ animationDirection: 'reverse', animationDuration: '1.5s' }}></div>
          </div>
          <div className="text-center">
            <div className="text-white/80 text-lg font-medium mb-2">Initializing workspace...</div>
            <div className="flex items-center justify-center space-x-2 text-white/60 text-sm">
              <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
              <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.2s' }}></div>
              <div className="w-2 h-2 bg-white/60 rounded-full animate-pulse" style={{ animationDelay: '0.4s' }}></div>
            </div>
          </div>
        </div>
      </ImmersivePageLayout>
    );
  }

  // Filter out sub-chapters from main navigation (only show chapter-X format)
  const chapterKeys = Object.keys(chapters).filter(id => /^chapter-\d+$/.test(id)).sort();
  const currentChapterCards = chapters[selectedChapter] || [];

  const getPhaseTitle = (phase: string) => {
    switch (phase) {
      case 'before': return 'Before Phase Management';
      case 'event': return 'Event Phase Management';
      case 'after': return 'After Phase Management';
      default: return 'Content Management System';
    }
  };

  const getPhaseSubtitle = (phase: string) => {
    switch (phase) {
      case 'before': return 'Storytelling & Preparation Content';
      case 'event': return 'Live Event Features & Interactions';
      case 'after': return 'Post-Event Experiences & Community';
      default: return 'Admin Dashboard';
    }
  };

  const getPhaseDescription = (phase: string) => {
    switch (phase) {
      case 'before': return `Manage storytelling chapters, educational content, and user preparation materials. ${chapterKeys.length} chapters with ${Object.values(chapters).flat().length} total cards configured.`;
      case 'event': return 'Configure real-time features, live polling, AR experiences, and interactive elements that enhance your live event experience.';
      case 'after': return 'Design post-event experiences including memories, sharing tools, community features, and continued engagement opportunities.';
      default: return 'Professional content management for your three-phase event companion application.';
    }
  };

  return (
    <ImmersivePageLayout
      title="The Ode Islands CMS"
      subtitle={getPhaseTitle(selectedPhase)}
      description={getPhaseDescription(selectedPhase)}
      theme={currentTheme}
      animateIn={animateIn}
      centerContent={false}
      showHeader={true}
      headerContent={
        <div className="flex items-center justify-between w-full">
          <div className="flex items-center">
            <div className="text-white/90 text-lg font-semibold">
              Content Management System
            </div>
          </div>

          <div className="text-center flex-1">
            <div className="text-white/90 text-base font-semibold">
              {getPhaseTitle(selectedPhase)}
            </div>
            <div className="text-white/60 text-sm">
              {new Date().toLocaleDateString('en-US', { 
                weekday: 'long', 
                month: 'short', 
                day: 'numeric' 
              })}
            </div>
          </div>

          <div className="flex items-center space-x-3">
            <div className="text-right mr-4">
              <div className="text-sm text-white/80 font-medium">
                {user.firstName} {user.lastName}
              </div>
              <div className="text-xs text-white/60">
                {user.email}
              </div>
            </div>
            <Link
              href="/admin/theme"
              className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-sm transition-all duration-200 font-medium flex items-center gap-2 backdrop-blur-sm border border-white/20 hover:border-white/30"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zM21 5a2 2 0 00-2-2h-4a2 2 0 00-2 2v12a4 4 0 004 4h4a2 2 0 002-2V5z" />
              </svg>
              Theme Editor
            </Link>
            <button 
              onClick={handleLogout}
              className="px-4 py-2 bg-white/10 hover:bg-white/20 rounded-lg text-sm transition-all duration-200 font-medium flex items-center gap-2 backdrop-blur-sm border border-white/20 hover:border-white/30"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
              Logout
            </button>
          </div>
        </div>
      }
    >
      <div className="space-y-8">

        {/* Professional Phase Navigation */}
        <div 
          className="bg-white/8 backdrop-blur-sm rounded-2xl border border-white/20 p-1"
          style={{
            opacity: 0,
            animation: animateIn ? 'animButtonIn 0.8s 1.2s ease forwards' : 'none'
          }}
        >
          <div className="flex space-x-1">
            <button
              onClick={() => setSelectedPhase('before')}
              className={`group flex-1 px-6 py-4 text-sm font-semibold rounded-xl transition-all duration-200 ${
                selectedPhase === 'before'
                  ? 'bg-white/20 text-white shadow-sm backdrop-blur-sm border border-white/30'
                  : 'text-white/70 hover:text-white/90 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-center space-x-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
                </svg>
                <div className="text-left">
                  <div className="font-bold">Before Phase</div>
                  <div className="text-xs opacity-80">Storytelling Content</div>
                </div>
              </div>
            </button>
            <button
              onClick={() => setSelectedPhase('event')}
              className={`group flex-1 px-6 py-4 text-sm font-semibold rounded-xl transition-all duration-200 ${
                selectedPhase === 'event'
                  ? 'bg-white/20 text-white shadow-sm backdrop-blur-sm border border-white/30'
                  : 'text-white/70 hover:text-white/90 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-center space-x-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                </svg>
                <div className="text-left">
                  <div className="font-bold">Event Phase</div>
                  <div className="text-xs opacity-80">Live Features</div>
                </div>
              </div>
            </button>
            <button
              onClick={() => setSelectedPhase('after')}
              className={`group flex-1 px-6 py-4 text-sm font-semibold rounded-xl transition-all duration-200 ${
                selectedPhase === 'after'
                  ? 'bg-white/20 text-white shadow-sm backdrop-blur-sm border border-white/30'
                  : 'text-white/70 hover:text-white/90 hover:bg-white/10'
              }`}
            >
              <div className="flex items-center justify-center space-x-3">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                </svg>
                <div className="text-left">
                  <div className="font-bold">After Phase</div>
                  <div className="text-xs opacity-80">Post-Event</div>
                </div>
              </div>
            </button>
          </div>
        </div>

        {/* Quick Action Cards - CMS Tools */}
        <div 
          className="mb-8 grid grid-cols-1 md:grid-cols-3 gap-4"
          style={{
            opacity: 0,
            animation: animateIn ? 'animButtonIn 0.8s 1.4s ease forwards' : 'none'
          }}
        >
          <Link href="/admin/cms/custom-buttons">
            <Card className="bg-gradient-to-br from-blue-500/20 to-purple-500/20 backdrop-blur-md border-white/20 hover:from-blue-500/30 hover:to-purple-500/30 transition-all cursor-pointer h-full">
              <CardContent className="p-6 text-center">
                <div className="text-3xl mb-2">🎯</div>
                <h3 className="text-white text-lg font-semibold mb-2">Custom Buttons Manager</h3>
                <p className="text-white/70 text-sm">Configure interactive buttons across all content</p>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/admin/cms/scheduler">
            <Card className="bg-gradient-to-br from-green-500/20 to-teal-500/20 backdrop-blur-md border-white/20 hover:from-green-500/30 hover:to-teal-500/30 transition-all cursor-pointer h-full">
              <CardContent className="p-6 text-center">
                <div className="text-3xl mb-2">⏰</div>
                <h3 className="text-white text-lg font-semibold mb-2">Content Scheduler</h3>
                <p className="text-white/70 text-sm">Manage time-based content availability</p>
              </CardContent>
            </Card>
          </Link>
          
          <Link href="/admin/cms/after-experience">
            <Card className="bg-gradient-to-br from-orange-500/20 to-red-500/20 backdrop-blur-md border-white/20 hover:from-orange-500/30 hover:to-red-500/30 transition-all cursor-pointer h-full">
              <CardContent className="p-6 text-center">
                <div className="text-3xl mb-2">🎭</div>
                <h3 className="text-white text-lg font-semibold mb-2">After Experience</h3>
                <p className="text-white/70 text-sm">Configure post-event content and features</p>
              </CardContent>
            </Card>
          </Link>
        </div>

        {/* Before Phase Content */}
        {selectedPhase === 'before' && (
          <>
            {/* Professional Chapter Navigation */}
            <div 
              className="mb-8"
              style={{
                opacity: 0,
                animation: animateIn ? 'animButtonIn 0.8s 1.5s ease forwards' : 'none'
              }}
            >
              <div className="bg-white/8 backdrop-blur-sm rounded-xl border border-white/20 p-6">
                <h3 className="text-xl font-bold text-white mb-6 flex items-center">
                  <svg className="w-6 h-6 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C20.832 18.477 19.246 18 17.5 18c-1.746 0-3.332.477-4.5 1.253" />
                  </svg>
                  <AnimateText active={animateIn} delay={1800}>
                    Storytelling Chapters
                  </AnimateText>
                </h3>
                <div className="flex flex-wrap gap-3">
                  {chapterKeys.map((chapterId) => (
                    <button
                      key={chapterId}
                      onClick={() => setSelectedChapter(chapterId)}
                      className={`px-4 py-2 text-sm font-semibold rounded-lg transition-all duration-200 capitalize ${
                        selectedChapter === chapterId
                          ? 'bg-white/25 text-white shadow-sm backdrop-blur-sm border border-white/40'
                          : 'bg-white/10 text-white/80 hover:text-white hover:bg-white/20 border border-white/20 hover:border-white/30'
                      }`}
                    >
                      {chapterId.replace('-', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </>
        )}

        {/* Professional Chapter Overview */}
        {selectedPhase === 'before' && (
          <div 
            className="mb-8"
            style={{
              opacity: 0,
              animation: animateIn ? 'animButtonIn 0.8s 1.8s ease forwards' : 'none'
            }}
          >
            <div className="bg-white/8 backdrop-blur-sm rounded-2xl border border-white/20 p-8">
              <div className="flex items-center justify-between mb-8">
                <h3 className="text-2xl font-bold text-white flex items-center">
                  <AnimateText active={animateIn} delay={2100}>
                    {`${selectedChapter.replace('-', ' ').toUpperCase()} Chapter`}
                  </AnimateText>
                </h3>
                <div className="text-white/70 text-sm bg-white/10 px-4 py-2 rounded-lg backdrop-blur-sm border border-white/20">
                  {currentChapterCards.length} Cards Total
                </div>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {currentChapterCards.map((card, index) => (
                  <div 
                    key={index} 
                    className="group bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-6 cursor-pointer hover:bg-white/15 hover:border-white/30 transition-all duration-300 transform hover:scale-105"
                    onClick={() => window.location.href = `/cms/edit/${selectedChapter}/${index}`}
                  >
                    <div className="flex items-center justify-between mb-4">
                      <div className="text-sm text-white/60 font-medium">Card {index + 1}</div>
                      <svg className="w-4 h-4 text-white/60 group-hover:text-white/80 transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </div>
                    
                    {card.text?.title && (
                      <div className="font-bold text-lg mb-2 text-white group-hover:text-blue-200 transition-colors" style={{ color: card.theme?.title || '#ffffff' }}>
                        {card.text.title}
                      </div>
                    )}
                    
                    {card.text?.subtitle && (
                      <div className="font-medium mb-3 text-white/80" style={{ color: card.theme?.subtitle || '#e2e8f0' }}>
                        {card.text.subtitle}
                      </div>
                    )}
                    
                    {card.text?.description && (
                      <div className="text-sm text-white/70 mb-4 line-clamp-3">
                        {card.text.description.substring(0, 100)}...
                      </div>
                    )}

                    <div className="flex flex-wrap gap-2 mb-4">
                      {card.video && (
                        <span className="inline-flex items-center gap-1 bg-red-500/20 text-red-200 text-xs px-2 py-1 rounded-md border border-red-500/30">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          VIDEO
                        </span>
                      )}
                      
                      {card.image && (
                        <span className="inline-flex items-center gap-1 bg-green-500/20 text-green-200 text-xs px-2 py-1 rounded-md border border-green-500/30">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          IMAGE
                        </span>
                      )}

                      {card.cta && (
                        <span className="inline-flex items-center gap-1 bg-purple-500/20 text-purple-200 text-xs px-2 py-1 rounded-md border border-purple-500/30">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                          </svg>
                          CTA
                        </span>
                      )}
                    </div>
                    
                    <div className="text-xs text-white/50 group-hover:text-white/70 transition-colors">
                      Click to edit content
                    </div>
                  </div>
                ))}
                
                {/* Add New Card Button */}
                <div 
                  className="group bg-white/5 backdrop-blur-sm rounded-xl border-2 border-dashed border-white/20 p-6 cursor-pointer hover:bg-white/10 hover:border-white/30 transition-all duration-300 flex items-center justify-center"
                  onClick={() => window.location.href = `/cms/edit/${selectedChapter}/new`}
                >
                  <div className="text-center">
                    <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4 group-hover:bg-white/30 transition-colors">
                      <svg className="w-6 h-6 text-white/80" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                      </svg>
                    </div>
                    <div className="font-semibold text-white/80 group-hover:text-white transition-colors mb-2">Add New Card</div>
                    <div className="text-sm text-white/60 group-hover:text-white/80 transition-colors">Create content</div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Professional Event Phase Content */}
        {selectedPhase === 'event' && (
          <div 
            className="mb-8"
            style={{
              opacity: 0,
              animation: animateIn ? 'animButtonIn 0.8s 1.5s ease forwards' : 'none'
            }}
          >
            <div className="bg-white/8 backdrop-blur-sm rounded-2xl border border-white/20 p-8">
              <div className="text-center mb-12">
                <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 10l4.553-2.276A1 1 0 0121 8.618v6.764a1 1 0 01-1.447.894L15 14M5 18h8a2 2 0 002-2V8a2 2 0 00-2-2H5a2 2 0 00-2 2v8a2 2 0 002 2z" />
                  </svg>
                </div>
                <h3 className="text-3xl font-bold text-white mb-4">
                  <AnimateText active={animateIn} delay={1800}>
                    Live Event Management
                  </AnimateText>
                </h3>
                <p className="text-white/80 mb-8 max-w-2xl mx-auto leading-relaxed">
                  <AnimateText active={animateIn} delay={2100}>
                    Configure real-time features, audience interactions, and live experiences that enhance your event
                  </AnimateText>
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                <div 
                  className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-8 text-center transform transition-all duration-300 hover:scale-105 hover:bg-white/15"
                  style={{
                    opacity: 0,
                    animation: animateIn ? 'animButtonIn 0.6s 2.3s ease forwards' : 'none'
                  }}
                >
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold text-white mb-4">Live Polls & Q&A</h4>
                  <p className="text-white/70 leading-relaxed mb-6">Real-time audience interaction tools for engagement and feedback collection</p>
                  <button className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-medium rounded-lg transition-all duration-200 backdrop-blur-sm border border-white/30 hover:border-white/50" disabled>
                    Development Phase
                  </button>
                </div>
                
                <div 
                  className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-8 text-center transform transition-all duration-300 hover:scale-105 hover:bg-white/15"
                  style={{
                    opacity: 0,
                    animation: animateIn ? 'animButtonIn 0.6s 2.4s ease forwards' : 'none'
                  }}
                >
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold text-white mb-4">AR Experiences</h4>
                  <p className="text-white/70 leading-relaxed mb-6">Synchronized augmented reality content and immersive digital overlays</p>
                  <button className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-medium rounded-lg transition-all duration-200 backdrop-blur-sm border border-white/30 hover:border-white/50" disabled>
                    Development Phase
                  </button>
                </div>
                
                <div 
                  className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-8 text-center transform transition-all duration-300 hover:scale-105 hover:bg-white/15"
                  style={{
                    opacity: 0,
                    animation: animateIn ? 'animButtonIn 0.6s 2.5s ease forwards' : 'none'
                  }}
                >
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold text-white mb-4">Event Timeline</h4>
                  <p className="text-white/70 leading-relaxed mb-6">Synchronized content delivery and timed interactive experiences</p>
                  <button className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-medium rounded-lg transition-all duration-200 backdrop-blur-sm border border-white/30 hover:border-white/50" disabled>
                    Development Phase
                  </button>
                </div>
                
                <div 
                  className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-8 text-center transform transition-all duration-300 hover:scale-105 hover:bg-white/15"
                  style={{
                    opacity: 0,
                    animation: animateIn ? 'animButtonIn 0.6s 2.6s ease forwards' : 'none'
                  }}
                >
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold text-white mb-4">Live Analytics</h4>
                  <p className="text-white/70 leading-relaxed mb-6">Real-time metrics, engagement tracking, and audience insights</p>
                  <button className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-medium rounded-lg transition-all duration-200 backdrop-blur-sm border border-white/30 hover:border-white/50" disabled>
                    Development Phase
                  </button>
                </div>
              </div>
              
              <div className="text-center mt-12">
                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 max-w-md mx-auto">
                  <div className="text-white/60 mb-2">
                    <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-white/60 text-sm">Features will be developed based on your specific event requirements</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Professional After Phase Content */}
        {selectedPhase === 'after' && (
          <div 
            className="mb-8"
            style={{
              opacity: 0,
              animation: animateIn ? 'animButtonIn 0.8s 1.5s ease forwards' : 'none'
            }}
          >
            <div className="bg-white/8 backdrop-blur-sm rounded-2xl border border-white/20 p-8">
              <div className="text-center mb-12">
                <div className="w-20 h-20 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                  <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z" />
                  </svg>
                </div>
                <h3 className="text-3xl font-bold text-white mb-4">
                  <AnimateText active={animateIn} delay={1800}>
                    Post-Event Experience
                  </AnimateText>
                </h3>
                <p className="text-white/80 mb-8 max-w-2xl mx-auto leading-relaxed">
                  <AnimateText active={animateIn} delay={2100}>
                    Design lasting connections through memories, community features, and continued engagement opportunities
                  </AnimateText>
                </p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-8 max-w-6xl mx-auto">
                <div 
                  className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-8 text-center transform transition-all duration-300 hover:scale-105 hover:bg-white/15"
                  style={{
                    opacity: 0,
                    animation: animateIn ? 'animButtonIn 0.6s 2.3s ease forwards' : 'none'
                  }}
                >
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold text-white mb-4">Event Memories</h4>
                  <p className="text-white/70 leading-relaxed mb-6">Curated highlights, photo galleries, and memorable moments from the experience</p>
                  <button className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-medium rounded-lg transition-all duration-200 backdrop-blur-sm border border-white/30 hover:border-white/50" disabled>
                    Development Phase
                  </button>
                </div>
                
                <div 
                  className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-8 text-center transform transition-all duration-300 hover:scale-105 hover:bg-white/15"
                  style={{
                    opacity: 0,
                    animation: animateIn ? 'animButtonIn 0.6s 2.4s ease forwards' : 'none'
                  }}
                >
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold text-white mb-4">Social Sharing</h4>
                  <p className="text-white/70 leading-relaxed mb-6">Share experiences, testimonials, and create lasting social connections</p>
                  <button className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-medium rounded-lg transition-all duration-200 backdrop-blur-sm border border-white/30 hover:border-white/50" disabled>
                    Development Phase
                  </button>
                </div>
                
                <div 
                  className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-8 text-center transform transition-all duration-300 hover:scale-105 hover:bg-white/15"
                  style={{
                    opacity: 0,
                    animation: animateIn ? 'animButtonIn 0.6s 2.5s ease forwards' : 'none'
                  }}
                >
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold text-white mb-4">Continued Journey</h4>
                  <p className="text-white/70 leading-relaxed mb-6">Extended learning paths and follow-up content to maintain engagement</p>
                  <button className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-medium rounded-lg transition-all duration-200 backdrop-blur-sm border border-white/30 hover:border-white/50" disabled>
                    Development Phase
                  </button>
                </div>
                
                <div 
                  className="bg-white/10 backdrop-blur-lg rounded-xl border border-white/20 p-8 text-center transform transition-all duration-300 hover:scale-105 hover:bg-white/15"
                  style={{
                    opacity: 0,
                    animation: animateIn ? 'animButtonIn 0.6s 2.6s ease forwards' : 'none'
                  }}
                >
                  <div className="w-16 h-16 bg-white/20 rounded-2xl flex items-center justify-center mx-auto mb-6">
                    <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <h4 className="text-xl font-bold text-white mb-4">Community Building</h4>
                  <p className="text-white/70 leading-relaxed mb-6">Foster connections between participants and create lasting networks</p>
                  <button className="px-6 py-3 bg-white/20 hover:bg-white/30 text-white font-medium rounded-lg transition-all duration-200 backdrop-blur-sm border border-white/30 hover:border-white/50" disabled>
                    Development Phase
                  </button>
                </div>
              </div>
              
              <div className="text-center mt-12">
                <div className="bg-white/5 backdrop-blur-sm rounded-xl border border-white/10 p-6 max-w-md mx-auto">
                  <div className="text-white/60 mb-2">
                    <svg className="w-6 h-6 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <p className="text-white/60 text-sm">Post-event features will be customized to your engagement goals</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Professional Quick Actions */}
        <div 
          className="bg-white/8 backdrop-blur-sm rounded-xl border border-white/20 p-6"
          style={{
            opacity: 0,
            animation: animateIn ? 'animButtonIn 0.8s 2.1s ease forwards' : 'none'
          }}
        >
          <h3 className="text-lg font-bold text-white mb-6 flex items-center">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7" />
            </svg>
            <AnimateText active={animateIn} delay={2400}>
              Quick Actions
            </AnimateText>
          </h3>
          <div className="flex gap-4 flex-wrap">
            {selectedPhase === 'before' && (
              <>
                <button 
                  onClick={() => {
                    const chapterId = prompt('Enter new chapter ID (e.g., chapter-4):');
                    if (chapterId && chapterId.match(/^chapter-\d+$/)) {
                      window.location.href = `/cms/edit/${chapterId}/new`;
                    } else if (chapterId) {
                      alert('Chapter ID must be in format: chapter-X (e.g., chapter-4)');
                    }
                  }}
                  className="group flex items-center space-x-3 bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-lg px-6 py-3 transition-all duration-200 border border-white/20 hover:border-white/40 text-white font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                  <span>Add New Chapter</span>
                </button>
                <button 
                  onClick={() => alert('Media upload feature coming soon!')}
                  className="group flex items-center space-x-3 bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-lg px-6 py-3 transition-all duration-200 border border-white/20 hover:border-white/40 text-white font-medium"
                >
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <span>Upload Media</span>
                </button>
              </>
            )}
            
            {selectedPhase === 'event' && (
              <button 
                onClick={() => alert('Event phase features will be developed based on your specific event requirements. Contact support to discuss your needs.')}
                className="group flex items-center space-x-3 bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-lg px-6 py-3 transition-all duration-200 border border-white/20 hover:border-white/40 text-white font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Configure Event Features</span>
              </button>
            )}
            
            {selectedPhase === 'after' && (
              <button 
                onClick={() => alert('After phase features will be developed based on your post-event engagement goals. Contact support to discuss your needs.')}
                className="group flex items-center space-x-3 bg-white/15 hover:bg-white/25 backdrop-blur-sm rounded-lg px-6 py-3 transition-all duration-200 border border-white/20 hover:border-white/40 text-white font-medium"
              >
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                </svg>
                <span>Configure After Features</span>
              </button>
            )}
            
            <button 
              onClick={() => fetchChapters()}
              className="group flex items-center space-x-3 bg-white/10 hover:bg-white/20 backdrop-blur-sm rounded-lg px-6 py-3 transition-all duration-200 border border-white/20 hover:border-white/30 text-white/80 hover:text-white font-medium"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              <span>Refresh Data</span>
            </button>
          </div>
        </div>

        {/* Professional System Status */}
        <div 
          className="bg-white/8 backdrop-blur-sm rounded-xl border border-white/20 p-6"
          style={{
            opacity: 0,
            animation: animateIn ? 'animButtonIn 0.8s 2.4s ease forwards' : 'none'
          }}
        >
          <h3 className="text-lg font-bold text-white mb-6 flex items-center">
            <svg className="w-5 h-5 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
            </svg>
            <AnimateText active={animateIn} delay={2700}>
              System Overview
            </AnimateText>
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-5 gap-6">
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="text-white/60 text-sm font-medium mb-2">Current Phase</div>
              <div className="text-white font-bold text-lg capitalize">{selectedPhase}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="text-white/60 text-sm font-medium mb-2">Total Chapters</div>
              <div className="text-white font-bold text-lg">{chapterKeys.length}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="text-white/60 text-sm font-medium mb-2">Total Cards</div>
              <div className="text-white font-bold text-lg">{Object.values(chapters).flat().length}</div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="text-white/60 text-sm font-medium mb-2">API Status</div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-400 font-medium text-sm">Online</span>
              </div>
            </div>
            <div className="bg-white/10 backdrop-blur-sm rounded-lg p-4 border border-white/20">
              <div className="text-white/60 text-sm font-medium mb-2">Admin Status</div>
              <div className="flex items-center space-x-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-400 font-medium text-sm">Authenticated</span>
              </div>
            </div>
          </div>
        </div>

      </div>
    </ImmersivePageLayout>
  );
}