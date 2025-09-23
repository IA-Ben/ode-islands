'use client';

import React, { useState, useEffect } from 'react';
import AnimateText from './AnimateText';
import { CardButton } from './CardButton';
import MemoryCollectionButton from './MemoryCollectionButton';
import type { CardData } from '@/@typings';

interface PollOption {
  text: string;
  votes: number;
  percentage: number;
}

interface PollData {
  id?: string;
  chapterId?: string;
  cardIndex?: number;
  question: string;
  options: string[];
  pollType: 'poll' | 'survey';
  isLive?: boolean;
  expiresAt?: string;
  showResults?: boolean;
  allowMultiple?: boolean;
}

interface PollCardProps {
  data: PollData;
  active: boolean;
  cardId?: string;
  chapterId?: string;
  theme?: {
    background?: string;
    title?: string;
    subtitle?: string;
    description?: string;
    shadow?: boolean;
    overlay?: string;
  };
}

interface PollResponse {
  selectedOption: string;
  count: number;
}

interface UserResponse {
  selectedOption: string;
  isCorrect?: boolean;
}

const PollCard: React.FC<PollCardProps> = ({ data, active, cardId, chapterId, theme }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasVoted, setHasVoted] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const [pollResults, setPollResults] = useState<PollResponse[]>([]);
  const [userResponse, setUserResponse] = useState<UserResponse | null>(null);
  const [totalVotes, setTotalVotes] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [anim, setAnim] = useState(false);
  const [pollId, setPollId] = useState<string | null>(data.id || null);

  const textShadow = theme?.shadow ? "0 4px 16px rgba(0,0,0,0.4)" : undefined;

  // Check authentication status
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Create poll if it doesn't exist and animation when active
  useEffect(() => {
    if (active && !anim) {
      setAnim(true);
      if (!pollId) {
        createPoll();
      } else {
        loadPollData();
      }
    }
  }, [active, anim, pollId]);

  const checkAuthStatus = async () => {
    try {
      const response = await fetch('/api/auth/user-login', {
        credentials: 'include',
      });
      if (response.ok) {
        const data = await response.json();
        if (data.success && data.user) {
          setIsAuthenticated(true);
          setUser(data.user);
        }
      }
    } catch (error) {
      console.error('Auth check failed:', error);
    }
  };

  const createPoll = async () => {
    if (!isAuthenticated) {
      setError('Please log in to participate in polls');
      return;
    }

    try {
      const csrfToken = getCsrfToken();
      const response = await fetch('/api/polls', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          chapterId: data.chapterId,
          cardIndex: data.cardIndex,
          question: data.question,
          options: data.options,
          pollType: data.pollType,
          isLive: data.isLive || false,
          expiresAt: data.expiresAt,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.poll) {
          setPollId(result.poll.id);
          loadPollData();
        }
      } else {
        setError('Failed to create poll');
      }
    } catch (error) {
      console.error('Error creating poll:', error);
      setError('Failed to create poll');
    }
  };

  const loadPollData = async () => {
    if (!pollId || !isAuthenticated) return;

    try {
      // Load poll responses and user's response
      const response = await fetch(`/api/polls/responses?pollId=${pollId}&userId=${user?.id}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setPollResults(result.responses || []);
          setTotalVotes(result.totalResponses || 0);
          
          if (result.userResponse) {
            setUserResponse(result.userResponse);
            setHasVoted(true);
            setSelectedOption(result.userResponse.selectedOption);
            setShowResults(data.showResults !== false);
          }
        }
      }
    } catch (error) {
      console.error('Error loading poll data:', error);
    }
  };

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

  const handleVote = async () => {
    if (!selectedOption || !pollId || !isAuthenticated || isSubmitting) return;

    setIsSubmitting(true);
    setError(null);

    try {
      const csrfToken = getCsrfToken();
      const response = await fetch('/api/polls/responses', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          pollId,
          selectedOption,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setHasVoted(true);
          setUserResponse(result.response);
          setShowResults(true);
          loadPollData(); // Refresh results
          
          // Track poll completion in progress and interactions
          await trackPollCompletion();
        } else {
          setError(result.message || 'Failed to submit vote');
        }
      } else {
        const result = await response.json();
        setError(result.message || 'Failed to submit vote');
      }
    } catch (error) {
      console.error('Error submitting vote:', error);
      setError('Failed to submit vote');
    } finally {
      setIsSubmitting(false);
    }
  };

  const trackPollCompletion = async () => {
    try {
      const csrfToken = getCsrfToken();
      
      // Track progress completion for this card
      if (data.chapterId && data.cardIndex !== undefined) {
        const progressResponse = await fetch('/api/progress', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'x-csrf-token': csrfToken,
          },
          credentials: 'include',
          body: JSON.stringify({
            chapterId: data.chapterId,
            cardIndex: data.cardIndex,
            timeSpent: 30 // Estimated time for poll participation
          }),
        });
        
        if (!progressResponse.ok) {
          console.warn('Failed to track progress for poll completion');
        }
      }
      
      // Track content interaction
      const interactionResponse = await fetch('/api/interactions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': csrfToken,
        },
        credentials: 'include',
        body: JSON.stringify({
          contentType: 'poll',
          contentId: pollId || `${data.chapterId}-${data.cardIndex}`,
          interactionType: 'complete',
          duration: 30,
          metadata: {
            question: data.question,
            selectedOption: selectedOption,
            pollType: data.pollType
          }
        }),
      });
      
      if (!interactionResponse.ok) {
        console.warn('Failed to track poll interaction');
      }
    } catch (error) {
      console.warn('Failed to track poll completion:', error);
    }
  };

  const getOptionPercentage = (option: string): number => {
    if (totalVotes === 0) return 0;
    const result = pollResults.find(r => r.selectedOption === option);
    return result ? Math.round((result.count / totalVotes) * 100) : 0;
  };

  const getOptionVotes = (option: string): number => {
    const result = pollResults.find(r => r.selectedOption === option);
    return result ? result.count : 0;
  };

  if (!isAuthenticated) {
    return (
      <div 
        className="relative w-full h-full flex items-center justify-center"
        style={{
          backgroundColor: theme?.background || "black",
          height: "100dvh",
        }}
      >
        {theme?.overlay && (
          <div
            className="absolute w-full h-full"
            style={{ background: theme.overlay }}
          />
        )}
        <div className="relative text-center px-6">
          <h2 className="text-2xl font-bold text-white mb-4">
            <AnimateText active={anim} delay={300}>
              Please log in to participate in polls
            </AnimateText>
          </h2>
          <button
            onClick={() => window.location.href = '/auth/login'}
            className="bg-white hover:bg-white/80 text-black px-6 py-3 rounded-full font-semibold transition-all duration-300"
          >
            Log In
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      className="relative w-full h-full flex items-center justify-center"
      style={{
        backgroundColor: theme?.background || "black",
        height: "100dvh",
      }}
    >
      {theme?.overlay && (
        <div
          className="absolute w-full h-full"
          style={{ background: theme.overlay }}
        />
      )}
      
      <div className="relative w-full max-w-4xl px-6 text-center">
        {/* Poll Question */}
        <h2
          className="text-3xl md:text-5xl font-bold text-white mb-8"
          style={{
            color: theme?.title || undefined,
            textShadow,
          }}
        >
          <AnimateText active={anim} delay={300}>
            {data.question}
          </AnimateText>
        </h2>

        {/* Poll Type Indicator */}
        <div className="mb-6">
          <span
            className="inline-block px-4 py-2 rounded-full text-sm font-medium"
            style={{
              backgroundColor: theme?.subtitle || '#37ffce',
              color: theme?.background || 'black',
            }}
          >
            <AnimateText active={anim} delay={600}>
              {data.pollType === 'poll' ? 'Poll' : 'Survey'}
            </AnimateText>
          </span>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Poll Options */}
        <div className="space-y-4 mb-8">
          {data.options.map((option, index) => {
            const votes = getOptionVotes(option);
            const percentage = getOptionPercentage(option);
            const isSelected = selectedOption === option;
            const wasUserChoice = userResponse?.selectedOption === option;

            return (
              <div
                key={index}
                className={`relative overflow-hidden rounded-lg cursor-pointer transition-all duration-300 ${
                  hasVoted ? 'cursor-default' : 'hover:scale-105'
                } ${
                  isSelected && !hasVoted ? 'ring-2 ring-white' : ''
                }`}
                onClick={() => {
                  if (!hasVoted) {
                    setSelectedOption(option);
                  }
                }}
                style={{
                  opacity: anim ? 1 : 0,
                  transform: anim ? 'translateY(0)' : 'translateY(20px)',
                  transition: `all 0.5s ease ${(index + 1) * 150 + 900}ms`,
                }}
              >
                {/* Result Bar Background */}
                {showResults && (
                  <div
                    className="absolute inset-0 bg-white/20 transition-all duration-1000"
                    style={{
                      width: `${percentage}%`,
                    }}
                  />
                )}
                
                <div
                  className={`relative p-4 border-2 transition-all duration-300 ${
                    wasUserChoice ? 'border-green-400 bg-green-400/20' : 'border-white/30'
                  } ${
                    !hasVoted ? 'hover:border-white/60' : ''
                  }`}
                  style={{
                    backgroundColor: hasVoted 
                      ? (wasUserChoice ? 'rgba(34, 197, 94, 0.2)' : 'rgba(255, 255, 255, 0.1)')
                      : 'rgba(255, 255, 255, 0.1)',
                  }}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium text-lg">{option}</span>
                    {showResults && (
                      <div className="flex items-center space-x-2 text-white/80">
                        <span className="text-sm">{votes} votes</span>
                        <span className="font-bold">{percentage}%</span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Vote Button */}
        {!hasVoted && (
          <div
            style={{
              opacity: anim ? 1 : 0,
              transform: anim ? 'translateY(0)' : 'translateY(20px)',
              transition: `all 0.5s ease ${data.options.length * 150 + 1200}ms`,
            }}
          >
            <button
              onClick={handleVote}
              disabled={!selectedOption || isSubmitting}
              className={`px-8 py-3 text-lg font-semibold transition-all duration-300 rounded-full ${
                selectedOption && !isSubmitting
                  ? 'bg-white hover:bg-white/80 text-black'
                  : 'bg-white/20 text-white/50 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Vote'}
            </button>
          </div>
        )}

        {/* Results Summary */}
        {showResults && hasVoted && (
          <div
            className="mt-6 p-4 bg-white/10 rounded-lg"
            style={{
              opacity: anim ? 1 : 0,
              transform: anim ? 'translateY(0)' : 'translateY(20px)',
              transition: `all 0.5s ease ${data.options.length * 150 + 1500}ms`,
            }}
          >
            <p className="text-white/80">
              <AnimateText active={anim} delay={data.options.length * 150 + 1500}>
                {`Total votes: ${totalVotes} • Thank you for participating!`}
              </AnimateText>
            </p>
          </div>
        )}

        {/* Memory Collection Button */}
        {cardId && hasVoted && (
          <div
            style={{
              opacity: anim ? 1 : 0,
              transform: anim ? 'translateY(0)' : 'translateY(20px)',
              transition: `all 0.5s ease ${data.options.length * 150 + 1800}ms`,
            }}
          >
            <MemoryCollectionButton
              cardData={{
                poll: data,
                memory: {
                  enabled: true,
                  title: `Poll: ${data.question}`,
                  description: `You participated in a poll about "${data.question}". Your answer: ${userResponse?.selectedOption}`,
                  category: 'Poll',
                  tags: ['poll', 'participation', data.pollType],
                }
              } as CardData}
              cardId={cardId}
              chapterId={chapterId}
              active={active}
              theme={theme}
            />
          </div>
        )}
      </div>
    </div>
  );
};

export default PollCard;