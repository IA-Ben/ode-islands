"use client";

import { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface ChatMessage {
  id: string;
  eventId: string;
  userId: string;
  message: string;
  messageType: string;
  isModerated: boolean;
  sentAt: string;
  // User data with privacy-safe structure
  user?: {
    id: string;
    firstName: string | null;
    lastName: string | null;
    isAdmin: boolean;
    displayName: string;
    // Email only available to admins
    email?: string;
  };
}

interface LiveEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  settings?: string;
  createdBy?: string;
  createdAt: string;
}

interface SessionData {
  isAuthenticated: boolean;
  userId?: string;
  isAdmin?: boolean;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
    isAdmin: boolean;
  };
}

interface LiveChatInterfaceProps {
  event: LiveEvent;
  session: SessionData;
  theme: any;
}

export default function LiveChatInterface({ event, session, theme }: LiveChatInterfaceProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);
  const [lastFetchTime, setLastFetchTime] = useState<string>('');
  const [showModerationPanel, setShowModerationPanel] = useState(false);
  const [knownMessageIds, setKnownMessageIds] = useState<Set<string>>(new Set());
  const [isUserAdmin, setIsUserAdmin] = useState(false);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);

  // Get CSRF token from cookies
  const getCsrfToken = (): string => {
    const cookies = document.cookie.split(';');
    for (let cookie of cookies) {
      const [name, value] = cookie.trim().split('=');
      if (name === 'csrf-token') {
        return decodeURIComponent(value);
      }
    }
    return '';
  };

  // Auto-scroll to bottom of messages
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  // Fetch messages from API
  const fetchMessages = async (since?: string) => {
    try {
      let url = `/api/chat?eventId=${event.id}&limit=100`;
      if (since) {
        url += `&since=${encodeURIComponent(since)}`;
      }

      const response = await fetch(url, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        const newMessages = data.messages || [];
        const messageIds = data.messageIds || [];
        setIsUserAdmin(data.isAdmin || false);

        if (since && newMessages.length > 0) {
          // Filter out duplicates using messageIds
          const uniqueNewMessages = newMessages.filter((msg: ChatMessage) => !knownMessageIds.has(msg.id));
          
          if (uniqueNewMessages.length > 0) {
            setMessages(prev => [...prev, ...uniqueNewMessages]);
            setKnownMessageIds(prev => new Set([...prev, ...messageIds]));
            
            // Update cursor to the latest message timestamp from server data
            const maxTimestamp = Math.max(...uniqueNewMessages.map((msg: ChatMessage) => new Date(msg.sentAt).getTime()));
            setLastFetchTime(new Date(maxTimestamp).toISOString());
            
            // Auto-scroll when new messages arrive
            setTimeout(scrollToBottom, 100);
          }
          // If no unique messages, don't advance the cursor
        } else if (!since) {
          // Initial load
          setMessages(newMessages);
          setKnownMessageIds(new Set(messageIds));
          
          // Set cursor to the latest message timestamp, or current time if no messages
          if (newMessages.length > 0) {
            const maxTimestamp = Math.max(...newMessages.map((msg: ChatMessage) => new Date(msg.sentAt).getTime()));
            setLastFetchTime(new Date(maxTimestamp).toISOString());
          } else {
            setLastFetchTime(new Date().toISOString());
          }
          
          setTimeout(scrollToBottom, 100);
        }
      }
    } catch (err) {
      console.error('Failed to fetch messages:', err);
      if (!since) {
        setError('Failed to load messages');
      }
    }
  };

  // Send new message
  const sendMessage = async () => {
    if (!newMessage.trim() || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({
          eventId: event.id,
          message: newMessage.trim(),
          messageType: 'text'
        })
      });

      if (response.ok) {
        setNewMessage('');
        // Immediately fetch new messages to show the sent message
        await fetchMessages(lastFetchTime);
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to send message');
      }
    } catch (err) {
      setError('Failed to send message');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Handle enter key press in message input
  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  // Format user display name
  const formatUserName = (message: ChatMessage) => {
    if (message.user) {
      const { displayName, isAdmin } = message.user;
      return isAdmin ? `${displayName} (Admin)` : displayName;
    }
    return 'Anonymous User';
  };

  // Toggle message moderation (admin only)
  const toggleModeration = async (messageId: string, isModerated: boolean) => {
    if (!isUserAdmin) {
      setError('Admin access required for moderation');
      return;
    }

    try {
      const response = await fetch(`/api/chat/${messageId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({
          isModerated: !isModerated
        })
      });

      if (response.ok) {
        // Update the message in our local state
        setMessages(prev => prev.map(msg => 
          msg.id === messageId ? { ...msg, isModerated: !isModerated } : msg
        ));
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to moderate message');
      }
    } catch (err) {
      setError('Failed to moderate message');
    }
  };

  // Format message timestamp
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  // Initialize chat and set up real-time updates
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await fetchMessages();
      setLoading(false);
    };

    initialize();

    // Set up real-time updates every 2 seconds for chat (more frequent than polls)
    const interval = setInterval(() => {
      fetchMessages(lastFetchTime);
    }, 2000);

    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [event.id]);

  // Update fetch interval when lastFetchTime changes
  useEffect(() => {
    if (refreshInterval) {
      clearInterval(refreshInterval);
    }

    const interval = setInterval(() => {
      fetchMessages(lastFetchTime);
    }, 2000);

    setRefreshInterval(interval);

    return () => {
      if (interval) clearInterval(interval);
    };
  }, [lastFetchTime]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.colors.primary }}></div>
      </div>
    );
  }

  return (
    <div className="space-y-6 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Live Chat</h2>
          <p className="text-white/60">
            {messages.length > 0 
              ? `${messages.length} message${messages.length !== 1 ? 's' : ''} • Live updates`
              : 'No messages yet • Be the first to chat!'
            }
          </p>
        </div>
        
        <div className="flex items-center gap-3">
          {/* Live indicator */}
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></span>
            <span className="text-green-400 text-sm">Live</span>
          </div>

          {/* Admin moderation toggle */}
          {isUserAdmin && (
            <Button
              size="sm"
              variant={showModerationPanel ? "default" : "outline"}
              onClick={() => setShowModerationPanel(!showModerationPanel)}
              className="text-xs"
            >
              🛡️ Moderation
            </Button>
          )}
        </div>
      </div>

      {/* Error display */}
      {error && (
        <Card className="bg-red-500/10 border-red-500/20">
          <CardContent className="p-4">
            <p className="text-red-400 text-sm">{error}</p>
            <Button
              size="sm"
              variant="outline"
              onClick={() => setError(null)}
              className="mt-2 border-red-500/40 text-red-400 hover:bg-red-500/10"
            >
              Dismiss
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Main chat interface */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 h-[70vh]">
        {/* Messages area */}
        <div className={`${showModerationPanel && session.isAdmin ? 'lg:col-span-3' : 'lg:col-span-4'}`}>
          <Card className="bg-white/5 border-white/10 backdrop-blur-sm h-full flex flex-col">
            <CardHeader className="flex-none">
              <CardTitle className="text-white text-lg">
                Chat for {event.title}
              </CardTitle>
            </CardHeader>
            
            <CardContent className="flex-1 flex flex-col p-4">
              {/* Messages list */}
              <div className="flex-1 overflow-y-auto mb-4 space-y-3 max-h-[50vh]">
                {messages.length === 0 ? (
                  <div className="text-center py-12">
                    <div className="text-4xl mb-4">💬</div>
                    <h3 className="text-lg font-semibold mb-2 text-white">No messages yet</h3>
                    <p className="text-white/60">Start the conversation during this live event!</p>
                  </div>
                ) : (
                  messages.map((message) => (
                    <div
                      key={message.id}
                      className={`flex gap-3 p-3 rounded-lg transition-all ${
                        message.userId === session.userId 
                          ? 'bg-white/10 ml-8' 
                          : 'bg-white/5 mr-8'
                      } ${message.isModerated ? 'opacity-50' : ''}`}
                    >
                      {/* User Avatar */}
                      <div 
                        className="w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium"
                        style={{ 
                          backgroundColor: message.user?.isAdmin ? theme.colors.primary : theme.colors.accent,
                          color: theme.colors.background 
                        }}
                      >
                        {message.user?.displayName?.charAt(0).toUpperCase() || '?'}
                      </div>

                      {/* Message content */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-medium text-white text-sm">
                            {formatUserName(message)}
                          </span>
                          <span className="text-white/40 text-xs">
                            {formatTime(message.sentAt)}
                          </span>
                          {message.isModerated && (
                            <span className="text-red-400 text-xs bg-red-400/20 px-2 py-0.5 rounded">
                              Moderated
                            </span>
                          )}
                        </div>
                        <p className={`text-sm break-words ${message.isModerated ? 'text-white/40 line-through' : 'text-white/80'}`}>
                          {message.isModerated ? '[Message moderated by admin]' : message.message}
                        </p>
                      </div>

                      {/* Admin moderation controls */}
                      {isUserAdmin && (
                        <div className="flex-none">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => toggleModeration(message.id, message.isModerated)}
                            className={`text-xs px-2 py-1 ${
                              message.isModerated 
                                ? 'border-green-500/40 text-green-400 hover:bg-green-500/10' 
                                : 'border-red-500/40 text-red-400 hover:bg-red-500/10'
                            }`}
                            title={message.isModerated ? 'Restore message' : 'Moderate message'}
                          >
                            {message.isModerated ? '✓ Restore' : '🛡️ Hide'}
                          </Button>
                        </div>
                      )}
                    </div>
                  ))
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Message composition */}
              <div className="flex-none">
                <div className="flex gap-2">
                  <div className="flex-1 relative">
                    <textarea
                      ref={messageInputRef}
                      value={newMessage}
                      onChange={(e) => setNewMessage(e.target.value)}
                      onKeyPress={handleKeyPress}
                      placeholder="Type your message... (Enter to send, Shift+Enter for new line)"
                      className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/40 resize-none"
                      rows={2}
                      maxLength={500}
                      disabled={isSubmitting}
                    />
                    <div className="absolute bottom-1 right-1 text-xs text-white/40">
                      {newMessage.length}/500
                    </div>
                  </div>
                  <Button
                    onClick={sendMessage}
                    disabled={!newMessage.trim() || isSubmitting}
                    style={{ 
                      backgroundColor: theme.colors.primary, 
                      color: theme.colors.background,
                      opacity: (!newMessage.trim() || isSubmitting) ? 0.5 : 1
                    }}
                    className="px-6"
                  >
                    {isSubmitting ? '⏳' : '🚀'}
                  </Button>
                </div>
                
                {/* Emoji quick actions */}
                <div className="flex gap-1 mt-2">
                  {['👍', '👏', '❤️', '😊', '🎉', '🔥'].map(emoji => (
                    <Button
                      key={emoji}
                      size="sm"
                      variant="outline"
                      onClick={() => setNewMessage(prev => prev + emoji)}
                      className="border-white/10 text-white/70 hover:bg-white/5 text-xs p-1"
                    >
                      {emoji}
                    </Button>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Moderation panel */}
        {showModerationPanel && session.isAdmin && (
          <div className="lg:col-span-1">
            <Card className="bg-white/5 border-white/10 backdrop-blur-sm h-full">
              <CardHeader>
                <CardTitle className="text-white text-lg">Moderation</CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <div className="text-white/60 text-sm">
                  <div className="flex justify-between mb-2">
                    <span>Total Messages:</span>
                    <span>{messages.length}</span>
                  </div>
                  <div className="flex justify-between mb-2">
                    <span>Active Users:</span>
                    <span>{new Set(messages.map(m => m.userId)).size}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Moderated:</span>
                    <span>{messages.filter(m => m.isModerated).length}</span>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <h4 className="text-white font-medium mb-2">Quick Actions</h4>
                  <div className="space-y-2">
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10 text-xs"
                      onClick={() => {
                        // TODO: Implement clear all messages
                      }}
                    >
                      🧹 Clear All Messages
                    </Button>
                    <Button
                      size="sm"
                      variant="outline"
                      className="w-full border-blue-500/40 text-blue-400 hover:bg-blue-500/10 text-xs"
                      onClick={() => {
                        // TODO: Implement export chat log
                      }}
                    >
                      📥 Export Chat Log
                    </Button>
                  </div>
                </div>

                <div className="pt-4 border-t border-white/10">
                  <h4 className="text-white font-medium mb-2">Chat Settings</h4>
                  <div className="space-y-2 text-xs">
                    <label className="flex items-center gap-2 text-white/70">
                      <input type="checkbox" className="rounded" defaultChecked />
                      Auto-moderate inappropriate content
                    </label>
                    <label className="flex items-center gap-2 text-white/70">
                      <input type="checkbox" className="rounded" defaultChecked />
                      Allow emoji reactions
                    </label>
                    <label className="flex items-center gap-2 text-white/70">
                      <input type="checkbox" className="rounded" />
                      Require approval for first-time users
                    </label>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}