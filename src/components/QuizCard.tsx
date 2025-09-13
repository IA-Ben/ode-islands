'use client';

import React, { useState, useEffect } from 'react';
import AnimateText from './AnimateText';
import CustomButton from './CustomButton';

interface QuizData {
  id?: string;
  chapterId?: string;
  cardIndex?: number;
  question: string;
  options: string[];
  correctAnswer: string;
  explanation?: string;
  showFeedback?: boolean;
  timeLimit?: number;
  points?: number;
}

interface QuizCardProps {
  data: QuizData;
  active: boolean;
  theme?: {
    background?: string;
    title?: string;
    subtitle?: string;
    description?: string;
    shadow?: boolean;
    overlay?: string;
  };
}

interface QuizResponse {
  selectedOption: string;
  isCorrect: boolean;
  submittedAt: string;
}

const QuizCard: React.FC<QuizCardProps> = ({ data, active, theme }) => {
  const [selectedOption, setSelectedOption] = useState<string | null>(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showFeedback, setShowFeedback] = useState(false);
  const [isCorrect, setIsCorrect] = useState<boolean | null>(null);
  const [timeLeft, setTimeLeft] = useState<number | null>(data.timeLimit || null);
  const [error, setError] = useState<string | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [anim, setAnim] = useState(false);
  const [quizId, setQuizId] = useState<string | null>(data.id || null);
  const [userResponse, setUserResponse] = useState<QuizResponse | null>(null);

  const textShadow = theme?.shadow ? "0 4px 16px rgba(0,0,0,0.4)" : undefined;

  // Check authentication status
  useEffect(() => {
    checkAuthStatus();
  }, []);

  // Handle timer and quiz creation when active
  useEffect(() => {
    if (active && !anim) {
      setAnim(true);
      if (!quizId) {
        createQuiz();
      } else {
        loadQuizData();
      }
    }

    // Start timer if quiz has time limit
    if (active && timeLeft !== null && timeLeft > 0 && !hasAnswered) {
      const timer = setInterval(() => {
        setTimeLeft(prev => {
          if (prev === null || prev <= 1) {
            handleTimeUp();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(timer);
    }
  }, [active, anim, timeLeft, hasAnswered, quizId]);

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

  const createQuiz = async () => {
    if (!isAuthenticated) {
      setError('Please log in to take quizzes');
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
          pollType: 'quiz',
          correctAnswer: data.correctAnswer,
          isLive: false,
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.poll) {
          setQuizId(result.poll.id);
          loadQuizData();
        }
      } else {
        setError('Failed to create quiz');
      }
    } catch (error) {
      console.error('Error creating quiz:', error);
      setError('Failed to create quiz');
    }
  };

  const loadQuizData = async () => {
    if (!quizId || !isAuthenticated) return;

    try {
      const response = await fetch(`/api/polls/responses?pollId=${quizId}&userId=${user?.id}`, {
        credentials: 'include',
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success && result.userResponse) {
          setUserResponse(result.userResponse);
          setHasAnswered(true);
          setSelectedOption(result.userResponse.selectedOption);
          setIsCorrect(result.userResponse.isCorrect);
          setShowFeedback(true);
          setTimeLeft(null); // Stop timer
        }
      }
    } catch (error) {
      console.error('Error loading quiz data:', error);
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

  const handleTimeUp = () => {
    if (!hasAnswered) {
      handleSubmit(true);
    }
  };

  const handleSubmit = async (isTimeUp: boolean = false) => {
    if (!selectedOption && !isTimeUp) return;
    if (!quizId || !isAuthenticated || isSubmitting) return;

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
          pollId: quizId,
          selectedOption: selectedOption || 'No answer',
        }),
      });

      if (response.ok) {
        const result = await response.json();
        if (result.success) {
          setHasAnswered(true);
          setIsCorrect(result.isCorrect);
          setUserResponse(result.response);
          setShowFeedback(data.showFeedback !== false);
          setTimeLeft(null);
          
          // Track quiz completion in progress and interactions
          await trackQuizCompletion(result.isCorrect);
        } else {
          setError(result.message || 'Failed to submit answer');
        }
      } else {
        const result = await response.json();
        setError(result.message || 'Failed to submit answer');
      }
    } catch (error) {
      console.error('Error submitting answer:', error);
      setError('Failed to submit answer');
    } finally {
      setIsSubmitting(false);
    }
  };

  const trackQuizCompletion = async (wasCorrect: boolean) => {
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
            timeSpent: data.timeLimit ? (data.timeLimit - (timeLeft || 0)) : 45 // Time spent on quiz
          }),
        });
        
        if (!progressResponse.ok) {
          console.warn('Failed to track progress for quiz completion');
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
          contentType: 'quiz',
          contentId: quizId || `${data.chapterId}-${data.cardIndex}`,
          interactionType: 'complete',
          duration: data.timeLimit ? (data.timeLimit - (timeLeft || 0)) : 45,
          metadata: {
            question: data.question,
            selectedOption: selectedOption || 'No answer',
            correctAnswer: data.correctAnswer,
            isCorrect: wasCorrect,
            points: wasCorrect ? data.points : 0,
            timeLimit: data.timeLimit
          }
        }),
      });
      
      if (!interactionResponse.ok) {
        console.warn('Failed to track quiz interaction');
      }
    } catch (error) {
      console.warn('Failed to track quiz completion:', error);
    }
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs.toString().padStart(2, '0')}`;
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
              Please log in to take quizzes
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
        {/* Timer */}
        {timeLeft !== null && timeLeft > 0 && !hasAnswered && (
          <div
            className="mb-6"
            style={{
              opacity: anim ? 1 : 0,
              transform: anim ? 'translateY(0)' : 'translateY(-20px)',
              transition: 'all 0.5s ease 200ms',
            }}
          >
            <div className={`inline-block px-4 py-2 rounded-full text-lg font-bold ${
              timeLeft <= 10 ? 'bg-red-500 text-white animate-pulse' : 'bg-white/20 text-white'
            }`}>
              ⏱️ {formatTime(timeLeft)}
            </div>
          </div>
        )}

        {/* Quiz Question */}
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

        {/* Quiz Indicator */}
        <div className="mb-6">
          <span
            className="inline-block px-4 py-2 rounded-full text-sm font-medium"
            style={{
              backgroundColor: theme?.subtitle || '#37ffce',
              color: theme?.background || 'black',
            }}
          >
            <AnimateText active={anim} delay={600}>
              {`Quiz${data.points ? ` • ${data.points} points` : ''}`}
            </AnimateText>
          </span>
        </div>

        {/* Error Message */}
        {error && (
          <div className="mb-6 p-4 bg-red-500/20 border border-red-500 rounded-lg">
            <p className="text-red-200">{error}</p>
          </div>
        )}

        {/* Quiz Options */}
        <div className="space-y-4 mb-8">
          {data.options.map((option, index) => {
            const isSelected = selectedOption === option;
            const isCorrectOption = option === data.correctAnswer;
            const wasUserChoice = userResponse?.selectedOption === option;
            
            let borderColor = 'border-white/30';
            let backgroundColor = 'rgba(255, 255, 255, 0.1)';
            
            if (showFeedback && hasAnswered) {
              if (isCorrectOption) {
                borderColor = 'border-green-400';
                backgroundColor = 'rgba(34, 197, 94, 0.2)';
              } else if (wasUserChoice && !isCorrectOption) {
                borderColor = 'border-red-400';
                backgroundColor = 'rgba(239, 68, 68, 0.2)';
              }
            } else if (isSelected && !hasAnswered) {
              borderColor = 'border-white';
            }

            return (
              <div
                key={index}
                className={`relative overflow-hidden rounded-lg transition-all duration-300 ${
                  hasAnswered ? 'cursor-default' : 'cursor-pointer hover:scale-105'
                } ${
                  isSelected && !hasAnswered ? 'ring-2 ring-white' : ''
                }`}
                onClick={() => {
                  if (!hasAnswered) {
                    setSelectedOption(option);
                  }
                }}
                style={{
                  opacity: anim ? 1 : 0,
                  transform: anim ? 'translateY(0)' : 'translateY(20px)',
                  transition: `all 0.5s ease ${(index + 1) * 150 + 900}ms`,
                }}
              >
                <div
                  className={`relative p-4 border-2 transition-all duration-300 ${borderColor} ${
                    !hasAnswered ? 'hover:border-white/60' : ''
                  }`}
                  style={{
                    backgroundColor,
                  }}
                >
                  <div className="flex justify-between items-center">
                    <span className="text-white font-medium text-lg">{option}</span>
                    {showFeedback && hasAnswered && (
                      <div className="flex items-center space-x-2">
                        {isCorrectOption && (
                          <span className="text-green-400 text-xl">✓</span>
                        )}
                        {wasUserChoice && !isCorrectOption && (
                          <span className="text-red-400 text-xl">✗</span>
                        )}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Submit Button */}
        {!hasAnswered && (
          <div
            style={{
              opacity: anim ? 1 : 0,
              transform: anim ? 'translateY(0)' : 'translateY(20px)',
              transition: `all 0.5s ease ${data.options.length * 150 + 1200}ms`,
            }}
          >
            <button
              onClick={() => handleSubmit()}
              disabled={!selectedOption || isSubmitting || timeLeft === 0}
              className={`px-8 py-3 text-lg font-semibold transition-all duration-300 rounded-full ${
                selectedOption && !isSubmitting
                  ? 'bg-white hover:bg-white/80 text-black'
                  : 'bg-white/20 text-white/50 cursor-not-allowed'
              }`}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Answer'}
            </button>
          </div>
        )}

        {/* Results and Feedback */}
        {showFeedback && hasAnswered && (
          <div
            className="mt-6 space-y-4"
            style={{
              opacity: anim ? 1 : 0,
              transform: anim ? 'translateY(0)' : 'translateY(20px)',
              transition: `all 0.5s ease ${data.options.length * 150 + 1500}ms`,
            }}
          >
            {/* Result Status */}
            <div
              className={`p-4 rounded-lg ${
                isCorrect ? 'bg-green-500/20 border border-green-500' : 'bg-red-500/20 border border-red-500'
              }`}
            >
              <div className="flex items-center justify-center space-x-2">
                <span className={`text-2xl ${isCorrect ? 'text-green-400' : 'text-red-400'}`}>
                  {isCorrect ? '🎉' : '💡'}
                </span>
                <p className={`text-lg font-bold ${isCorrect ? 'text-green-200' : 'text-red-200'}`}>
                  <AnimateText active={anim} delay={data.options.length * 150 + 1500}>
                    {`${isCorrect ? 'Correct!' : 'Incorrect'}${data.points && isCorrect ? ` +${data.points} points` : ''}`}
                  </AnimateText>
                </p>
              </div>
            </div>

            {/* Explanation */}
            {data.explanation && (
              <div className="p-4 bg-white/10 rounded-lg">
                <p className="text-white/80">
                  <AnimateText active={anim} delay={data.options.length * 150 + 1800}>
                    {data.explanation}
                  </AnimateText>
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default QuizCard;