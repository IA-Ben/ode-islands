"use client";

import { useState, useEffect, useCallback } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useWebSocket } from '@/hooks/useWebSocket';

// Types for the Interactive Choice System
interface Choice {
  id: string;
  label: string;
  description?: string;
  icon?: string;
  color?: string;
  value?: any;
}

interface InteractiveChoice {
  id: string;
  title: string;
  description?: string;
  choiceType: 'multi_choice' | 'ranking' | 'preference_scale' | 'grouped_choices' | 'collaborative_board';
  choices: Choice[];
  maxSelections?: number;
  minSelections: number;
  allowCustomInput: boolean;
  visualizationType: 'bar_chart' | 'pie_chart' | 'word_cloud' | 'live_grid';
  showLiveResults: boolean;
  showPercentages: boolean;
  animateResults: boolean;
  timeLimit?: number;
  status: 'draft' | 'active' | 'paused' | 'completed' | 'archived';
  showResults: boolean;
  feedbackMessage?: string;
  themeSettings?: any;
}

interface ResponseStats {
  [choiceId: string]: {
    count: number;
    percentage: number;
    label?: string;
    averageRanking?: number;
  };
}

interface ChoiceSystemProps {
  choice: InteractiveChoice;
  userId?: string;
  isAdmin?: boolean;
  onResponseSubmit?: (response: any) => void;
  className?: string;
}

export default function InteractiveChoiceSystem({
  choice,
  userId,
  isAdmin = false,
  onResponseSubmit,
  className = ""
}: ChoiceSystemProps) {
  const [selectedChoices, setSelectedChoices] = useState<string[]>([]);
  const [customInput, setCustomInput] = useState("");
  const [ranking, setRanking] = useState<string[]>([]);
  const [responseStats, setResponseStats] = useState<ResponseStats>({});
  const [totalResponses, setTotalResponses] = useState(0);
  const [hasResponded, setHasResponded] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [timeRemaining, setTimeRemaining] = useState<number | null>(null);
  const [confidence, setConfidence] = useState(5);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [eventId, setEventId] = useState<string | null>(null);

  // WebSocket connection for real-time updates
  const { sendMessage } = useWebSocket(
    typeof window !== 'undefined' && eventId ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws` : null,
    {
      onMessage: (message) => {
        if (message.type === 'choice_response_update' && message.payload.choiceId === choice.id) {
          // Update response statistics in real-time
          setResponseStats(message.payload.responseStats || {});
          setTotalResponses(message.payload.totalResponses || 0);
        } else if (message.type === 'choice_activated' && message.payload.choiceId === choice.id) {
          // Choice has been activated
          console.log('Choice activated:', message.payload);
        } else if (message.type === 'choice_deactivated' && message.payload.choiceId === choice.id) {
          // Choice has been deactivated
          console.log('Choice deactivated:', message.payload);
        }
      },
      onOpen: () => {
        // Join the event for real-time updates
        if (eventId) {
          sendMessage({
            type: 'join_event',
            payload: { eventId },
            timestamp: Date.now(),
          });
        }
      }
    }
  );

  // Fetch current results and check if user has responded
  const fetchResults = useCallback(async () => {
    try {
      const response = await fetch(`/api/cms/interactive-choices/${choice.id}/responses`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setResponseStats(data.responseStats || {});
        setTotalResponses(data.totalResponses || 0);
        
        // Check if user has already responded (would need separate endpoint)
        // For now, we'll assume they haven't responded
        setHasResponded(false);
      }
    } catch (err) {
      console.error('Failed to fetch results:', err);
      setError('Failed to load choice data');
    } finally {
      setLoading(false);
    }
  }, [choice.id]);

  // Initialize component
  useEffect(() => {
    fetchResults();
    
    // Extract event ID from choice for WebSocket connection
    if ((choice as any).eventId) {
      setEventId((choice as any).eventId);
    }
    
    // Set up time limit if specified
    if (choice.timeLimit) {
      setTimeRemaining(choice.timeLimit);
      const timer = setInterval(() => {
        setTimeRemaining(prev => {
          if (prev && prev > 0) {
            return prev - 1;
          } else {
            clearInterval(timer);
            return 0;
          }
        });
      }, 1000);
      
      return () => clearInterval(timer);
    }
  }, [choice.timeLimit, fetchResults]);

  // Handle choice selection for multi-choice
  const handleChoiceSelect = (choiceId: string) => {
    if (hasResponded || choice.status !== 'active') return;

    if (choice.choiceType === 'multi_choice' || choice.choiceType === 'grouped_choices') {
      setSelectedChoices(prev => {
        if (prev.includes(choiceId)) {
          return prev.filter(id => id !== choiceId);
        } else {
          const newSelection = [...prev, choiceId];
          if (choice.maxSelections && newSelection.length > choice.maxSelections) {
            return newSelection.slice(-choice.maxSelections);
          }
          return newSelection;
        }
      });
    }
  };

  // Handle ranking (drag and drop would be ideal, but for now simple up/down)
  const handleRankingMove = (choiceId: string, direction: 'up' | 'down') => {
    if (hasResponded || choice.status !== 'active') return;

    setRanking(prev => {
      const currentIndex = prev.indexOf(choiceId);
      if (currentIndex === -1) {
        // Add to ranking
        return [...prev, choiceId];
      }
      
      const newRanking = [...prev];
      if (direction === 'up' && currentIndex > 0) {
        [newRanking[currentIndex], newRanking[currentIndex - 1]] = 
        [newRanking[currentIndex - 1], newRanking[currentIndex]];
      } else if (direction === 'down' && currentIndex < newRanking.length - 1) {
        [newRanking[currentIndex], newRanking[currentIndex + 1]] = 
        [newRanking[currentIndex + 1], newRanking[currentIndex]];
      }
      return newRanking;
    });
  };

  // Submit response
  const handleSubmit = async () => {
    if (isSubmitting || hasResponded) return;
    
    // Validate minimum selections
    if (choice.choiceType === 'multi_choice' && selectedChoices.length < choice.minSelections) {
      setError(`Please select at least ${choice.minSelections} option(s)`);
      return;
    }
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const responseData: any = {
        responseTime: choice.timeLimit ? choice.timeLimit - (timeRemaining || 0) : undefined,
        confidence,
        isAnonymous: false
      };
      
      if (choice.choiceType === 'multi_choice' || choice.choiceType === 'grouped_choices') {
        responseData.selectedChoices = selectedChoices;
      } else if (choice.choiceType === 'ranking') {
        responseData.ranking = ranking;
      }
      
      if (choice.allowCustomInput && customInput.trim()) {
        responseData.customInput = customInput.trim();
      }
      
      const response = await fetch(`/api/cms/interactive-choices/${choice.id}/responses`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        credentials: 'include',
        body: JSON.stringify(responseData)
      });
      
      if (response.ok) {
        const responseJson = await response.json();
        setHasResponded(true);
        
        // Update local state with real-time stats from response
        if (responseJson.realTimeStats) {
          setResponseStats(responseJson.realTimeStats.responseStats);
          setTotalResponses(responseJson.realTimeStats.totalResponses);
        }
        
        onResponseSubmit?.(responseData);
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to submit response');
      }
    } catch (err) {
      setError('Failed to submit response');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render choice option based on type
  const renderChoiceOption = (choiceOption: Choice, index: number) => {
    const isSelected = selectedChoices.includes(choiceOption.id);
    const stats = responseStats[choiceOption.id];
    const rankPosition = ranking.indexOf(choiceOption.id) + 1;
    
    return (
      <Card 
        key={choiceOption.id}
        className={`cursor-pointer transition-all duration-200 ${
          isSelected 
            ? 'ring-2 ring-blue-500 bg-blue-50 border-blue-200' 
            : 'hover:bg-gray-50 border-gray-200'
        } ${hasResponded || choice.status !== 'active' ? 'opacity-60 cursor-not-allowed' : ''}`}
        onClick={() => handleChoiceSelect(choiceOption.id)}
      >
        <CardContent className="p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {choiceOption.icon && (
                <div className="text-2xl">{choiceOption.icon}</div>
              )}
              <div>
                <h4 className="font-medium text-gray-900">{choiceOption.label}</h4>
                {choiceOption.description && (
                  <p className="text-sm text-gray-600 mt-1">{choiceOption.description}</p>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-3">
              {choice.choiceType === 'ranking' && (
                <div className="flex flex-col space-y-1">
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleRankingMove(choiceOption.id, 'up');
                    }}
                    disabled={hasResponded || choice.status !== 'active'}
                  >
                    ↑
                  </Button>
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={(e: React.MouseEvent) => {
                      e.stopPropagation();
                      handleRankingMove(choiceOption.id, 'down');
                    }}
                    disabled={hasResponded || choice.status !== 'active'}
                  >
                    ↓
                  </Button>
                </div>
              )}
              
              {rankPosition > 0 && (
                <div className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm font-medium">
                  #{rankPosition}
                </div>
              )}
              
              {choice.showLiveResults && stats && (
                <div className="text-right">
                  <div className="text-lg font-bold text-gray-900">{stats.count}</div>
                  {choice.showPercentages && (
                    <div className="text-sm text-gray-600">{stats.percentage}%</div>
                  )}
                  {choice.visualizationType === 'bar_chart' && (
                    <Progress 
                      value={stats.percentage} 
                      className="w-20 h-2 mt-1"
                    />
                  )}
                </div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>
    );
  };

  if (loading) {
    return (
      <Card className={className}>
        <CardContent className="p-6">
          <div className="flex items-center justify-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-500"></div>
            <span className="ml-2 text-gray-600">Loading choice...</span>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className={className}>
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-xl font-bold">{choice.title}</CardTitle>
            {choice.description && (
              <p className="text-gray-600 mt-2">{choice.description}</p>
            )}
          </div>
          
          <div className="flex items-center space-x-4">
            {timeRemaining !== null && (
              <div className="bg-orange-100 text-orange-800 px-3 py-1 rounded-lg">
                {Math.floor(timeRemaining / 60)}:{(timeRemaining % 60).toString().padStart(2, '0')}
              </div>
            )}
            
            <div className="text-sm text-gray-600">
              {totalResponses} response{totalResponses !== 1 ? 's' : ''}
            </div>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="p-6">
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}
        
        <div className="space-y-3">
          {choice.choices.map(renderChoiceOption)}
        </div>
        
        {choice.allowCustomInput && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Additional Comments (Optional)
            </label>
            <Textarea
              value={customInput}
              onChange={(e) => setCustomInput(e.target.value)}
              placeholder="Share your thoughts..."
              disabled={hasResponded || choice.status !== 'active'}
              className="w-full"
              rows={3}
            />
          </div>
        )}
        
        {/* Confidence slider for research purposes */}
        {!hasResponded && choice.status === 'active' && (
          <div className="mt-6">
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Confidence in your choice (1-10)
            </label>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-500">1</span>
              <Input
                type="range"
                min="1"
                max="10"
                value={confidence}
                onChange={(e) => setConfidence(parseInt(e.target.value))}
                className="flex-1"
              />
              <span className="text-sm text-gray-500">10</span>
              <span className="text-sm font-medium text-gray-900 w-8">{confidence}</span>
            </div>
          </div>
        )}
        
        {!hasResponded && choice.status === 'active' && (
          <div className="mt-6 flex items-center justify-between">
            <div className="text-sm text-gray-600">
              {choice.choiceType === 'multi_choice' && choice.maxSelections && (
                `Select up to ${choice.maxSelections} option${choice.maxSelections > 1 ? 's' : ''}`
              )}
              {choice.choiceType === 'ranking' && (
                `Rank the options by preference`
              )}
            </div>
            
            <Button
              onClick={handleSubmit}
              disabled={
                isSubmitting || 
                (choice.choiceType === 'multi_choice' && selectedChoices.length < choice.minSelections) ||
                (timeRemaining === 0)
              }
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isSubmitting ? 'Submitting...' : 'Submit Response'}
            </Button>
          </div>
        )}
        
        {hasResponded && choice.feedbackMessage && (
          <div className="mt-6 bg-green-50 border border-green-200 text-green-700 px-4 py-3 rounded">
            {choice.feedbackMessage}
          </div>
        )}
        
        {hasResponded && (
          <div className="mt-6 text-center text-green-600 font-medium">
            ✓ Your response has been submitted
          </div>
        )}
      </CardContent>
    </Card>
  );
}