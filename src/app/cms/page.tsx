'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
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

export default function CMSPage() {
  console.log('CMS Page component loaded - debugging active');
  const [chapters, setChapters] = useState<ChapterData>({});
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string>('chapter-1');
  const [selectedPhase, setSelectedPhase] = useState<string>('before');
  const [password, setPassword] = useState('');
  const [loginError, setLoginError] = useState('');

  useEffect(() => {
    checkAuthStatus();
  }, []);

  useEffect(() => {
    if (user?.isAdmin) {
      fetchChapters();
    }
  }, [user]);

  const checkAuthStatus = async () => {
    try {
      console.log('Checking authentication status...');
      const response = await fetch('/api/auth/status');
      console.log('Auth status response:', response.status, response.statusText);
      if (response.ok) {
        // Get user data if authenticated
        const userResponse = await fetch('/api/auth/user');
        if (userResponse.ok) {
          const userData = await userResponse.json();
          console.log('User data received:', userData);
          setUser(userData);
        }
      } else {
        console.log('User not authenticated');
        setUser(null);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
      setUser(null);
    } finally {
      setAuthLoading(false);
    }
  };

  const fetchChapters = async () => {
    try {
      const response = await fetch('/api/cms/chapters');
      if (response.ok) {
        const data = await response.json();
        setChapters(data);
      } else {
        console.error('Failed to fetch chapters');
      }
    } catch (error) {
      console.error('Error fetching chapters:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    console.log('handleLogin called - form submitted');
    e.preventDefault();
    setLoginError('');
    
    try {
      console.log('Making login request with password:', password ? 'PRESENT' : 'MISSING');
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ password }),
      });

      console.log('Login response status:', response.status);
      if (response.ok) {
        console.log('Login successful');
        checkAuthStatus(); // Refresh auth status
      } else {
        const data = await response.json();
        console.log('Login failed:', data);
        setLoginError(data.message || 'Invalid password');
      }
    } catch (error) {
      console.error('Error during login:', error);
      setLoginError('Login failed. Please try again.');
    }
  };

  const handleLogout = () => {
    // Clear user session and redirect
    fetch('/api/auth/logout', { method: 'POST' })
      .then(() => {
        setUser(null);
        window.location.reload();
      })
      .catch(error => console.error('Error logging out:', error));
  };

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const saveChapter = async (chapterId: string, cards: CardData[]) => {
    try {
      const response = await fetch('/api/cms/chapters', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ id: chapterId, cards }),
      });
      
      if (response.ok) {
        alert('Chapter saved successfully!');
        fetchChapters(); // Refresh data
      } else {
        alert('Failed to save chapter');
      }
    } catch (error) {
      console.error('Error saving chapter:', error);
      alert('Error saving chapter');
    }
  };

  if (authLoading) {
    return (
      <div className="scroll-container bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">Loading...</h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
        </div>
      </div>
    );
  }

  // Show login screen if not authenticated
  if (!user) {
    return (
      <div className="scroll-container bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <h1 className="text-4xl font-bold mb-6">The Ode Islands</h1>
          <h2 className="text-2xl font-semibold mb-4">Admin Login</h2>
          <p className="text-gray-400 mb-8">
            Enter the admin password to access the content management system.
          </p>
          
          <div className="space-y-4">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Admin password"
                className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-lg text-white placeholder-gray-400 focus:border-blue-500 focus:outline-none"
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleLogin(e);
                  }
                }}
              />
            </div>
            
            {loginError && (
              <div className="text-red-400 text-sm">
                {loginError}
              </div>
            )}
            
            <button 
              type="button"
              className="w-full bg-blue-600 hover:bg-blue-700 py-3 text-lg rounded-md font-medium transition-colors"
              onClick={async (e) => {
                console.log('Button clicked!');
                e.preventDefault();
                await handleLogin(e);
              }}
            >
              🔐 Login
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Show access denied if not admin
  if (!user.isAdmin) {
    return (
      <div className="scroll-container bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <h1 className="text-4xl font-bold mb-6">Access Denied</h1>
          <p className="text-gray-400 mb-8">
            You don&apos;t have admin privileges to access the CMS.
          </p>
          <div className="space-y-4">
            <div className="text-sm text-gray-500">
              Logged in as: {user.email}
            </div>
            <Button 
              onClick={handleLogout}
              variant="outline"
              className="w-full"
            >
              🚪 Logout
            </Button>
          </div>
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="scroll-container bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">CMS Loading...</h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
        </div>
      </div>
    );
  }

  // Filter out sub-chapters from main navigation (only show chapter-X format)
  const chapterKeys = Object.keys(chapters).filter(id => /^chapter-\d+$/.test(id)).sort();
  const currentChapterCards = chapters[selectedChapter] || [];

  return (
    <div className="scroll-container bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2">The Ode Islands CMS</h1>
            <p className="text-gray-400">Content Management System for your three-phase event companion app</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400 mb-2">
              Welcome, {user.firstName} {user.lastName}
            </div>
            <div className="text-xs text-gray-500 mb-3">
              {user.email}
            </div>
            <div className="flex gap-2">
              <a
                href="/cms/theme"
                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 rounded text-sm transition-colors font-medium flex items-center gap-2"
              >
                🎨 Theme Editor
              </a>
              <Button 
                onClick={handleLogout}
                variant="outline"
                size="sm"
              >
                🚪 Logout
              </Button>
            </div>
          </div>
        </div>

        {/* Phase Navigation */}
        <div className="mb-8">
          <h2 className="text-2xl font-semibold mb-4">Phase Management</h2>
          <div className="flex space-x-2 mb-6">
            <Button
              variant={selectedPhase === 'before' ? "default" : "outline"}
              onClick={() => setSelectedPhase('before')}
              className="px-6 py-3"
            >
              📖 Before Phase
            </Button>
            <Button
              variant={selectedPhase === 'event' ? "default" : "outline"}
              onClick={() => setSelectedPhase('event')}
              className="px-6 py-3"
            >
              🎪 Event Phase
            </Button>
            <Button
              variant={selectedPhase === 'after' ? "default" : "outline"}
              onClick={() => setSelectedPhase('after')}
              className="px-6 py-3"
            >
              🎊 After Phase
            </Button>
          </div>
        </div>

        {/* Before Phase Content */}
        {selectedPhase === 'before' && (
          <>
            {/* Chapter Navigation */}
            <div className="mb-6">
              <h3 className="text-lg font-medium mb-3">Before Phase - Storytelling Chapters</h3>
              <div className="flex space-x-2">
                {chapterKeys.map((chapterId) => (
                  <Button
                    key={chapterId}
                    variant={selectedChapter === chapterId ? "default" : "outline"}
                    onClick={() => setSelectedChapter(chapterId)}
                    className="capitalize"
                  >
                    {chapterId.replace('-', ' ')}
                  </Button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Phase-specific Content */}
        {selectedPhase === 'before' && (
          <>
            {/* Chapter Overview */}
            <div className="mb-8">
              <Card className="bg-gray-900 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">
                    {selectedChapter.replace('-', ' ').toUpperCase()} - {currentChapterCards.length} Cards
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    {currentChapterCards.map((card, index) => (
                      <div 
                        key={index} 
                        className="bg-gray-800 p-4 rounded-lg border border-gray-600 cursor-pointer hover:bg-gray-700 transition-colors"
                        onClick={() => window.location.href = `/cms/edit/${selectedChapter}/${index}`}
                      >
                        <div className="text-sm text-gray-400 mb-2">Card {index + 1} - Click to Edit</div>
                        
                        {card.text?.title && (
                          <div className="font-bold text-lg mb-2" style={{ color: card.theme?.title || '#white' }}>
                            {card.text.title}
                          </div>
                        )}
                        
                        {card.text?.subtitle && (
                          <div className="font-medium mb-2" style={{ color: card.theme?.subtitle || '#gray' }}>
                            {card.text.subtitle}
                          </div>
                        )}
                        
                        {card.text?.description && (
                          <div className="text-sm text-gray-300 mb-3 line-clamp-3">
                            {card.text.description.substring(0, 100)}...
                          </div>
                        )}

                        {card.video && (
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-red-600 text-xs px-2 py-1 rounded">VIDEO</span>
                            <span className="text-xs text-gray-400">{card.video.url}</span>
                          </div>
                        )}
                        
                        {card.image && (
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-green-600 text-xs px-2 py-1 rounded">IMAGE</span>
                            <span className="text-xs text-gray-400">{card.image.url}</span>
                          </div>
                        )}

                        {card.cta && (
                          <div className="flex items-center gap-2 mb-2">
                            <span className="bg-purple-600 text-xs px-2 py-1 rounded">CTA</span>
                            <span className="text-xs text-gray-400">{card.cta.title}</span>
                          </div>
                        )}
                      </div>
                    ))}
                    
                    <div 
                      className="bg-gray-700 p-4 rounded-lg border border-gray-500 border-dashed cursor-pointer hover:bg-gray-600 transition-colors flex items-center justify-center"
                      onClick={() => window.location.href = `/cms/edit/${selectedChapter}/new`}
                    >
                      <div className="text-center">
                        <div className="text-4xl mb-2">➕</div>
                        <div className="font-semibold">Add New Card</div>
                        <div className="text-sm text-gray-400">Click to create</div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>
          </>
        )}

        {/* Event Phase Content */}
        {selectedPhase === 'event' && (
          <div className="mb-8">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Event Phase Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎪</div>
                  <h3 className="text-2xl font-semibold mb-4">Live Event Features</h3>
                  <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
                    Manage real-time content, live polling, AR experiences, and interactive features 
                    that supplement your live event. These tools will be developed based on your specific event needs.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                    <div className="bg-gray-800 p-6 rounded-lg">
                      <h4 className="text-lg font-semibold mb-3">🎯 Live Polls & Q&A</h4>
                      <p className="text-gray-400 text-sm mb-4">Real-time audience interaction tools</p>
                      <Button variant="outline" disabled className="w-full">
                        Coming Soon
                      </Button>
                    </div>
                    
                    <div className="bg-gray-800 p-6 rounded-lg">
                      <h4 className="text-lg font-semibold mb-3">📱 Live AR Content</h4>
                      <p className="text-gray-400 text-sm mb-4">Synchronized AR experiences</p>
                      <Button variant="outline" disabled className="w-full">
                        Coming Soon
                      </Button>
                    </div>
                    
                    <div className="bg-gray-800 p-6 rounded-lg">
                      <h4 className="text-lg font-semibold mb-3">⏱️ Event Timeline</h4>
                      <p className="text-gray-400 text-sm mb-4">Timed content delivery system</p>
                      <Button variant="outline" disabled className="w-full">
                        Coming Soon
                      </Button>
                    </div>
                    
                    <div className="bg-gray-800 p-6 rounded-lg">
                      <h4 className="text-lg font-semibold mb-3">📊 Live Data</h4>
                      <p className="text-gray-400 text-sm mb-4">Real-time event metrics</p>
                      <Button variant="outline" disabled className="w-full">
                        Coming Soon
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* After Phase Content */}
        {selectedPhase === 'after' && (
          <div className="mb-8">
            <Card className="bg-gray-900 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">After Phase Management</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-center py-12">
                  <div className="text-6xl mb-4">🎊</div>
                  <h3 className="text-2xl font-semibold mb-4">Post-Event Content</h3>
                  <p className="text-gray-400 mb-8 max-w-2xl mx-auto">
                    Manage post-event experiences including memories, sharing tools, community features, 
                    and continued engagement opportunities. These features will be developed to extend your event impact.
                  </p>
                  
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 max-w-4xl mx-auto">
                    <div className="bg-gray-800 p-6 rounded-lg">
                      <h4 className="text-lg font-semibold mb-3">📸 Event Memories</h4>
                      <p className="text-gray-400 text-sm mb-4">Curated highlights and moments</p>
                      <Button variant="outline" disabled className="w-full">
                        Coming Soon
                      </Button>
                    </div>
                    
                    <div className="bg-gray-800 p-6 rounded-lg">
                      <h4 className="text-lg font-semibold mb-3">💬 Share & Reflect</h4>
                      <p className="text-gray-400 text-sm mb-4">Social sharing and reflection tools</p>
                      <Button variant="outline" disabled className="w-full">
                        Coming Soon
                      </Button>
                    </div>
                    
                    <div className="bg-gray-800 p-6 rounded-lg">
                      <h4 className="text-lg font-semibold mb-3">🚀 Continued Journey</h4>
                      <p className="text-gray-400 text-sm mb-4">Extended content and experiences</p>
                      <Button variant="outline" disabled className="w-full">
                        Coming Soon
                      </Button>
                    </div>
                    
                    <div className="bg-gray-800 p-6 rounded-lg">
                      <h4 className="text-lg font-semibold mb-3">🤝 Community</h4>
                      <p className="text-gray-400 text-sm mb-4">Participant connections</p>
                      <Button variant="outline" disabled className="w-full">
                        Coming Soon
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

        {/* Quick Actions */}
        <div className="flex gap-4 flex-wrap">
          {selectedPhase === 'before' && (
            <>
              <Button 
                onClick={() => {
                  const chapterId = prompt('Enter new chapter ID (e.g., chapter-4):');
                  if (chapterId && chapterId.match(/^chapter-\d+$/)) {
                    window.location.href = `/cms/edit/${chapterId}/new`;
                  } else if (chapterId) {
                    alert('Chapter ID must be in format: chapter-X (e.g., chapter-4)');
                  }
                }}
                className="bg-purple-600 hover:bg-purple-700"
              >
                ➕ Add New Chapter
              </Button>
              <Button 
                onClick={() => alert('Media upload feature coming soon!')}
                className="bg-blue-600 hover:bg-blue-700"
              >
                📹 Upload Media
              </Button>
            </>
          )}
          
          {selectedPhase === 'event' && (
            <Button 
              onClick={() => alert('Event phase features will be developed based on your specific event requirements. Contact support to discuss your needs.')}
              className="bg-orange-600 hover:bg-orange-700"
            >
              🎪 Configure Event Features
            </Button>
          )}
          
          {selectedPhase === 'after' && (
            <Button 
              onClick={() => alert('After phase features will be developed based on your post-event engagement goals. Contact support to discuss your needs.')}
              className="bg-green-600 hover:bg-green-700"
            >
              🎊 Configure After Features
            </Button>
          )}
          
          <Button 
            onClick={() => fetchChapters()}
            variant="outline"
          >
            🔄 Refresh
          </Button>
        </div>

        {/* System Status */}
        <div className="mt-8 p-4 bg-gray-900 rounded-lg">
          <h3 className="text-lg font-semibold mb-2">System Status</h3>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Current Phase:</span>
              <span className="ml-2 font-mono capitalize">{selectedPhase}</span>
            </div>
            <div>
              <span className="text-gray-400">Total Chapters:</span>
              <span className="ml-2 font-mono">{chapterKeys.length}</span>
            </div>
            <div>
              <span className="text-gray-400">Total Cards:</span>
              <span className="ml-2 font-mono">{Object.values(chapters).flat().length}</span>
            </div>
            <div>
              <span className="text-gray-400">API Status:</span>
              <span className="ml-2 text-green-400">✅ Online</span>
            </div>
            <div>
              <span className="text-gray-400">Auth Status:</span>
              <span className="ml-2 text-green-400">✅ Admin Logged In</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}