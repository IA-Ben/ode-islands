"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface Poll {
  id: string;
  eventId?: string;
  chapterId?: string;
  cardIndex?: number;
  question: string;
  options: string;
  pollType: string;
  isLive: boolean;
  correctAnswer?: string;
  createdBy?: string;
  createdAt: string;
  expiresAt?: string;
}

interface PollResponse {
  selectedOption: string;
  count: number;
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

interface LivePollingInterfaceProps {
  event: LiveEvent;
  session: SessionData;
  theme: any;
}

export default function LivePollingInterface({ event, session, theme }: LivePollingInterfaceProps) {
  const [polls, setPolls] = useState<Poll[]>([]);
  const [activePoll, setActivePoll] = useState<Poll | null>(null);
  const [pollResponses, setPollResponses] = useState<{ [pollId: string]: PollResponse[] }>({});
  const [userResponses, setUserResponses] = useState<{ [pollId: string]: string }>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [refreshInterval, setRefreshInterval] = useState<NodeJS.Timeout | null>(null);

  // Helper function to safely parse poll options
  const parsePollOptions = (optionsJson: string): string[] => {
    try {
      const parsed = JSON.parse(optionsJson);
      return Array.isArray(parsed) ? parsed : [];
    } catch (error) {
      console.error('Failed to parse poll options:', error, 'Raw options:', optionsJson);
      return [];
    }
  };

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

  // Fetch polls for this event
  const fetchPolls = async () => {
    try {
      const response = await fetch(`/api/polls?eventId=${event.id}&isLive=true`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setPolls(data.polls || []);
        
        // Set the first live poll as active if none is selected
        if (!activePoll && data.polls?.length > 0) {
          setActivePoll(data.polls[0]);
        }
      }
    } catch (err) {
      console.error('Failed to fetch polls:', err);
      setError('Failed to load polls');
    }
  };

  // Fetch responses for a specific poll
  const fetchPollResponses = async (pollId: string) => {
    try {
      const response = await fetch(`/api/polls/responses?pollId=${pollId}&userId=${session.userId}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setPollResponses(prev => ({
          ...prev,
          [pollId]: data.responses || []
        }));
        
        if (data.userResponse) {
          setUserResponses(prev => ({
            ...prev,
            [pollId]: data.userResponse.selectedOption
          }));
        }
      }
    } catch (err) {
      console.error('Failed to fetch poll responses:', err);
    }
  };

  // Submit poll response
  const submitResponse = async (pollId: string, selectedOption: string) => {
    try {
      const response = await fetch('/api/polls/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({
          pollId,
          selectedOption
        })
      });

      if (response.ok) {
        const data = await response.json();
        setUserResponses(prev => ({
          ...prev,
          [pollId]: selectedOption
        }));
        
        // Refresh responses
        fetchPollResponses(pollId);
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to submit response');
      }
    } catch (err) {
      setError('Failed to submit response');
    }
  };

  // Create new poll
  const createPoll = async (pollData: any) => {
    try {
      const response = await fetch('/api/polls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({
          ...pollData,
          eventId: event.id,
          isLive: true
        })
      });

      if (response.ok) {
        setShowCreateForm(false);
        fetchPolls();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to create poll');
      }
    } catch (err) {
      setError('Failed to create poll');
    }
  };

  // Initialize component - runs once
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await fetchPolls();
      setLoading(false);
    };

    initialize();
  }, []);

  // Set up real-time polling interval - recreates when activePoll changes
  useEffect(() => {
    // Always poll for new polls every 3 seconds
    const pollsInterval = setInterval(() => {
      fetchPolls();
    }, 3000);

    // Only poll for responses if we have an active poll
    let responsesInterval: NodeJS.Timeout | null = null;
    if (activePoll) {
      responsesInterval = setInterval(() => {
        fetchPollResponses(activePoll.id);
      }, 3000);
    }

    // Store the main interval for cleanup in other parts of component
    setRefreshInterval(pollsInterval);

    return () => {
      clearInterval(pollsInterval);
      if (responsesInterval) {
        clearInterval(responsesInterval);
      }
    };
  }, [activePoll]); // Recreate when activePoll changes

  // Fetch responses immediately when active poll changes
  useEffect(() => {
    if (activePoll) {
      fetchPollResponses(activePoll.id);
    }
  }, [activePoll]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.colors.primary }}></div>
      </div>
    );
  }

  const livePolls = polls.filter(poll => poll.isLive);
  const activeResponses = activePoll ? pollResponses[activePoll.id] || [] : [];
  const totalResponses = activeResponses.reduce((sum, response) => sum + response.count, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between mb-12">
        <div>
          <h1 className="text-4xl font-bold text-white mb-3">Live Polling</h1>
          <div className="flex items-center gap-4">
            <p className="text-white/70 text-lg">
              {livePolls.length > 0 
                ? `${livePolls.length} active poll${livePolls.length !== 1 ? 's' : ''}`
                : 'No active polls'
              }
            </p>
            {livePolls.length > 0 && (
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                <span className="text-green-400 font-medium text-sm uppercase tracking-wide">Live</span>
              </div>
            )}
          </div>
        </div>
        
        {session.isAdmin && (
          <Button
            onClick={() => setShowCreateForm(true)}
            style={{ backgroundColor: theme.colors.primary, color: theme.colors.background }}
            className="px-6 py-3 font-semibold"
          >
            Create New Poll
          </Button>
        )}
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

      {/* Create poll form */}
      {showCreateForm && session.isAdmin && (
        <PollCreationForm
          onCreatePoll={createPoll}
          onCancel={() => setShowCreateForm(false)}
          theme={theme}
        />
      )}

      {livePolls.length === 0 && !showCreateForm ? (
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <div className="w-16 h-16 mx-auto mb-6 rounded-full bg-white/10 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-white/40 rounded border-dashed"></div>
            </div>
            <h3 className="text-2xl font-bold mb-4 text-white">No Active Polls</h3>
            <p className="text-white/60 mb-4">
              {session.isAdmin 
                ? 'Create a live poll to engage your audience during the event.'
                : 'Live polls will appear here when the event organizer creates them.'
              }
            </p>
            {session.isAdmin && (
              <Button
                onClick={() => setShowCreateForm(true)}
                style={{ backgroundColor: theme.colors.primary, color: theme.colors.background }}
              >
                Create First Poll
              </Button>
            )}
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Poll list */}
          <div className="lg:col-span-1 space-y-4">
            <h2 className="text-2xl font-bold text-white mb-6">Active Polls</h2>
            {livePolls.map(poll => (
              <Card
                key={poll.id}
                className={`bg-white/5 border backdrop-blur-sm cursor-pointer transition-all hover:bg-white/10 ${
                  activePoll?.id === poll.id ? 'border-white/30 ring-2 ring-white/20' : 'border-white/10'
                }`}
                onClick={() => setActivePoll(poll)}
              >
                <CardContent className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <h3 className="font-semibold text-white text-base line-clamp-2 leading-relaxed">{poll.question}</h3>
                    <div className="flex items-center gap-1 ml-3">
                      <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                      <span className="text-green-400 text-xs font-medium uppercase tracking-wide">Live</span>
                    </div>
                  </div>
                  <div className="text-white/60 text-sm">
                    {poll.pollType.charAt(0).toUpperCase() + poll.pollType.slice(1)} • {new Date(poll.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Active poll display */}
          <div className="lg:col-span-2">
            {activePoll ? (
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader className="pb-6">
                  <div className="flex items-start justify-between mb-4">
                    <CardTitle className="text-white text-2xl font-bold leading-relaxed">{activePoll.question}</CardTitle>
                    <div className="flex items-center gap-4 ml-4">
                      <div className="flex items-center gap-2">
                        <div className="w-2 h-2 rounded-full bg-green-400 animate-pulse"></div>
                        <span className="text-green-400 text-sm font-semibold uppercase tracking-wide">Live</span>
                      </div>
                      <div className="text-white/70 font-medium">{totalResponses} responses</div>
                    </div>
                  </div>
                </CardHeader>
                
                <CardContent>
                  <div className="space-y-4">
                    {parsePollOptions(activePoll.options).map((option: string, index: number) => {
                      const responseData = activeResponses.find(r => r.selectedOption === option);
                      const count = responseData?.count || 0;
                      const percentage = totalResponses > 0 ? (count / totalResponses) * 100 : 0;
                      const userSelected = userResponses[activePoll.id] === option;
                      const hasUserResponded = activePoll.id in userResponses;

                      return (
                        <div
                          key={index}
                          className={`relative p-4 rounded-lg border transition-all ${
                            userSelected
                              ? 'border-white/40 bg-white/15'
                              : hasUserResponded
                              ? 'border-white/10 bg-white/5'
                              : 'border-white/20 bg-white/10 hover:bg-white/15 cursor-pointer'
                          }`}
                          onClick={() => {
                            if (!hasUserResponded) {
                              submitResponse(activePoll.id, option);
                            }
                          }}
                        >
                          {/* Progress bar background */}
                          <div 
                            className="absolute inset-0 rounded-lg opacity-20"
                            style={{
                              background: `linear-gradient(to right, ${theme.colors.primary} 0%, ${theme.colors.primary} ${percentage}%, transparent ${percentage}%)`
                            }}
                          />
                          
                          <div className="relative flex items-center justify-between">
                            <div className="flex items-center gap-3">
                              <span className="text-lg">{String.fromCharCode(65 + index)}</span>
                              <span className="text-white font-medium">{option}</span>
                              {userSelected && <span className="text-green-400">✓</span>}
                            </div>
                            <div className="flex items-center gap-2">
                              <span className="text-white/60 text-sm">{count}</span>
                              <span className="text-white/40 text-sm">({percentage.toFixed(1)}%)</span>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>

                  {/* Poll status */}
                  <div className="mt-6 pt-4 border-t border-white/10">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-white/60">
                        {activePoll.pollType === 'quiz' && activePoll.correctAnswer && userResponses[activePoll.id] && (
                          <span className={userResponses[activePoll.id] === activePoll.correctAnswer ? 'text-green-400' : 'text-red-400'}>
                            {userResponses[activePoll.id] === activePoll.correctAnswer ? '✅ Correct!' : '❌ Incorrect'}
                          </span>
                        )}
                      </span>
                      <span className="text-white/40">
                        Updated: {new Date().toLocaleTimeString()}
                      </span>
                    </div>
                    {/* Debug info for development */}
                    {process.env.NODE_ENV === 'development' && (
                      <div className="mt-2 text-xs text-white/30">
                        Options: {parsePollOptions(activePoll.options).length} parsed
                      </div>
                    )}
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                  <div className="text-4xl mb-4">👆</div>
                  <h3 className="text-lg font-semibold mb-2 text-white">Select a Poll</h3>
                  <p className="text-white/60">Choose a poll from the list to view results and participate.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Poll creation form component
function PollCreationForm({ onCreatePoll, onCancel, theme }: { onCreatePoll: (data: any) => void, onCancel: () => void, theme: any }) {
  const [formData, setFormData] = useState({
    question: '',
    options: ['', ''],
    pollType: 'poll',
    correctAnswer: '',
    expiresAt: ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    const validOptions = formData.options.filter(opt => opt.trim() !== '');
    if (validOptions.length < 2) {
      alert('Please provide at least 2 options');
      return;
    }

    onCreatePoll({
      question: formData.question,
      options: validOptions, // Send as array, not JSON string
      pollType: formData.pollType,
      correctAnswer: formData.pollType === 'quiz' ? formData.correctAnswer : undefined,
      expiresAt: formData.expiresAt || undefined
    });
  };

  const addOption = () => {
    if (formData.options.length < 6) {
      setFormData(prev => ({
        ...prev,
        options: [...prev.options, '']
      }));
    }
  };

  const removeOption = (index: number) => {
    if (formData.options.length > 2) {
      setFormData(prev => ({
        ...prev,
        options: prev.options.filter((_, i) => i !== index)
      }));
    }
  };

  const updateOption = (index: number, value: string) => {
    setFormData(prev => ({
      ...prev,
      options: prev.options.map((opt, i) => i === index ? value : opt)
    }));
  };

  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
      <CardHeader>
        <CardTitle style={{ color: theme.colors.primary }}>Create Live Poll</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white text-sm font-medium mb-2">Question *</label>
            <input
              type="text"
              value={formData.question}
              onChange={(e) => setFormData(prev => ({ ...prev, question: e.target.value }))}
              required
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/40"
              placeholder="Enter your poll question..."
            />
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">Poll Type</label>
            <select
              value={formData.pollType}
              onChange={(e) => setFormData(prev => ({ ...prev, pollType: e.target.value }))}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40"
            >
              <option value="poll">Opinion Poll</option>
              <option value="quiz">Quiz Question</option>
              <option value="survey">Survey</option>
            </select>
          </div>

          <div>
            <label className="block text-white text-sm font-medium mb-2">Options *</label>
            {formData.options.map((option, index) => (
              <div key={index} className="flex gap-2 mb-2">
                <span className="flex items-center justify-center w-8 h-10 bg-white/10 rounded-lg text-white text-sm">
                  {String.fromCharCode(65 + index)}
                </span>
                <input
                  type="text"
                  value={option}
                  onChange={(e) => updateOption(index, e.target.value)}
                  className="flex-1 px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/40"
                  placeholder={`Option ${index + 1}...`}
                  required
                />
                {formData.options.length > 2 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => removeOption(index)}
                    className="border-red-500/40 text-red-400 hover:bg-red-500/10"
                  >
                    ✕
                  </Button>
                )}
              </div>
            ))}
            
            {formData.options.length < 6 && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={addOption}
                className="border-white/20 text-white/70 hover:bg-white/5"
              >
                + Add Option
              </Button>
            )}
          </div>

          {formData.pollType === 'quiz' && (
            <div>
              <label className="block text-white text-sm font-medium mb-2">Correct Answer</label>
              <select
                value={formData.correctAnswer}
                onChange={(e) => setFormData(prev => ({ ...prev, correctAnswer: e.target.value }))}
                className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white focus:outline-none focus:border-white/40"
              >
                <option value="">Select correct answer...</option>
                {formData.options.map((option, index) => 
                  option.trim() && (
                    <option key={index} value={option}>
                      {String.fromCharCode(65 + index)}: {option}
                    </option>
                  )
                )}
              </select>
            </div>
          )}

          <div className="flex gap-4 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              className="border-white/20 text-white/70 hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              style={{ backgroundColor: theme.colors.primary, color: theme.colors.background }}
            >
              Create Live Poll
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}