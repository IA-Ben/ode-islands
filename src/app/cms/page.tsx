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
  const [chapters, setChapters] = useState<ChapterData>({});
  const [loading, setLoading] = useState(true);
  const [authLoading, setAuthLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [selectedChapter, setSelectedChapter] = useState<string>('chapter-1');

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
      const response = await fetch('/api/auth/user');
      if (response.ok) {
        const userData = await response.json();
        setUser(userData);
      }
    } catch (error) {
      console.error('Error checking auth status:', error);
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

  const handleLogin = () => {
    window.location.href = '/api/login';
  };

  const handleLogout = () => {
    // Clear user session and redirect
    fetch('/api/logout', { method: 'POST' })
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
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
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
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center max-w-md mx-auto p-8">
          <h1 className="text-4xl font-bold mb-6">The Ode Islands</h1>
          <h2 className="text-2xl font-semibold mb-4">Admin Login</h2>
          <p className="text-gray-400 mb-8">
            Sign in with your Replit account to access the content management system.
          </p>
          <Button 
            onClick={handleLogin}
            className="w-full bg-blue-600 hover:bg-blue-700 py-3 text-lg"
          >
            🔐 Login with Replit
          </Button>
        </div>
      </div>
    );
  }

  // Show access denied if not admin
  if (!user.isAdmin) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
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
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold mb-4">CMS Loading...</h1>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-white mx-auto"></div>
        </div>
      </div>
    );
  }

  const chapterKeys = Object.keys(chapters).sort();
  const currentChapterCards = chapters[selectedChapter] || [];

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="container mx-auto px-4 py-8">
        {/* Header */}
        <div className="mb-8 flex justify-between items-start">
          <div>
            <h1 className="text-4xl font-bold mb-2">The Ode Islands CMS</h1>
            <p className="text-gray-400">Content Management System for your immersive storytelling experience</p>
          </div>
          <div className="text-right">
            <div className="text-sm text-gray-400 mb-2">
              Welcome, {user.firstName} {user.lastName}
            </div>
            <div className="text-xs text-gray-500 mb-3">
              {user.email}
            </div>
            <Button 
              onClick={handleLogout}
              variant="outline"
              size="sm"
            >
              🚪 Logout
            </Button>
          </div>
        </div>

        {/* Chapter Navigation */}
        <div className="mb-6">
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
                    className="bg-gray-800 p-4 rounded-lg border border-gray-600"
                  >
                    <div className="text-sm text-gray-400 mb-2">Card {index + 1}</div>
                    
                    {/* Card Content Preview */}
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

                    {/* Media Info */}
                    {card.video && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-red-600 text-xs px-2 py-1 rounded">VIDEO</span>
                        <span className="text-xs text-gray-400">{card.video.url}</span>
                        {card.video.audio && <span className="text-xs bg-blue-600 px-1 rounded">AUDIO</span>}
                      </div>
                    )}
                    
                    {card.image && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-green-600 text-xs px-2 py-1 rounded">IMAGE</span>
                        <span className="text-xs text-gray-400">{card.image.url}</span>
                      </div>
                    )}

                    {/* CTA Info */}
                    {card.cta && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-purple-600 text-xs px-2 py-1 rounded">CTA</span>
                        <span className="text-xs text-gray-400">{card.cta.title}</span>
                      </div>
                    )}

                    {card.ctaStart && (
                      <div className="flex items-center gap-2 mb-2">
                        <span className="bg-purple-600 text-xs px-2 py-1 rounded">START</span>
                        <span className="text-xs text-gray-400">{card.ctaStart}</span>
                      </div>
                    )}

                    {/* Theme Info */}
                    {card.theme && (
                      <div className="mt-3 pt-2 border-t border-gray-700">
                        <div className="text-xs text-gray-500">Theme:</div>
                        <div className="flex flex-wrap gap-1 mt-1">
                          {card.theme.background && (
                            <span 
                              className="text-xs px-2 py-1 rounded border"
                              style={{ backgroundColor: card.theme.background, color: '#000' }}
                            >
                              BG
                            </span>
                          )}
                          {card.theme.mix && (
                            <span className="text-xs bg-gray-600 px-2 py-1 rounded">
                              {card.theme.mix}
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Quick Actions */}
        <div className="flex gap-4">
          <Button 
            onClick={() => alert('Media upload feature coming next!')}
            className="bg-blue-600 hover:bg-blue-700"
          >
            📹 Upload Media
          </Button>
          <Button 
            onClick={() => alert('Visual editor coming next!')}
            className="bg-green-600 hover:bg-green-700"
          >
            ✏️ Edit Chapter
          </Button>
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
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
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