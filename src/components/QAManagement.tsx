"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface QASession {
  id: string;
  eventId: string;
  question: string;
  askedBy: string;
  answeredBy?: string;
  answer?: string;
  isModerated: boolean;
  isAnswered: boolean;
  upvotes: number;
  createdAt: string;
  answeredAt?: string;
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

interface QAManagementProps {
  event: LiveEvent;
  session: SessionData;
  theme: any;
}

export default function QAManagement({ event, session, theme }: QAManagementProps) {
  const [questions, setQuestions] = useState<QASession[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedQuestion, setSelectedQuestion] = useState<QASession | null>(null);
  const [showSubmitForm, setShowSubmitForm] = useState(false);
  const [filter, setFilter] = useState<'all' | 'unanswered' | 'answered' | 'moderated'>('all');
  const [sortBy, setSortBy] = useState<'recent' | 'upvotes'>('upvotes');

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

  // Fetch Q&A sessions for this event
  const fetchQuestions = async () => {
    try {
      const response = await fetch(`/api/qa?eventId=${event.id}`, {
        credentials: 'include'
      });
      
      if (response.ok) {
        const data = await response.json();
        setQuestions(data.questions || []);
      }
    } catch (err) {
      console.error('Failed to fetch questions:', err);
      setError('Failed to load questions');
    }
  };

  // Submit new question
  const submitQuestion = async (questionText: string) => {
    try {
      const response = await fetch('/api/qa', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({
          eventId: event.id,
          question: questionText
        })
      });

      if (response.ok) {
        setShowSubmitForm(false);
        fetchQuestions();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to submit question');
      }
    } catch (err) {
      setError('Failed to submit question');
    }
  };

  // Submit answer (admin only)
  const submitAnswer = async (questionId: string, answerText: string) => {
    try {
      const response = await fetch('/api/qa', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({
          questionId,
          answer: answerText,
          answeredBy: session.userId
        })
      });

      if (response.ok) {
        fetchQuestions();
        setSelectedQuestion(null);
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to submit answer');
      }
    } catch (err) {
      setError('Failed to submit answer');
    }
  };

  // Toggle moderation status (admin only)
  const toggleModeration = async (questionId: string, isModerated: boolean) => {
    try {
      const response = await fetch('/api/qa', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({
          questionId,
          isModerated
        })
      });

      if (response.ok) {
        fetchQuestions();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to update moderation status');
      }
    } catch (err) {
      setError('Failed to update moderation status');
    }
  };

  // Upvote question
  const upvoteQuestion = async (questionId: string, currentUpvotes: number) => {
    try {
      const response = await fetch('/api/qa', {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'x-csrf-token': getCsrfToken(),
        },
        credentials: 'include',
        body: JSON.stringify({
          questionId,
          upvotes: currentUpvotes + 1
        })
      });

      if (response.ok) {
        fetchQuestions();
      } else {
        const data = await response.json();
        setError(data.message || 'Failed to upvote question');
      }
    } catch (err) {
      setError('Failed to upvote question');
    }
  };

  // Initialize and set up real-time updates
  useEffect(() => {
    const initialize = async () => {
      setLoading(true);
      await fetchQuestions();
      setLoading(false);
    };

    initialize();

    // Set up real-time updates every 5 seconds
    const interval = setInterval(fetchQuestions, 5000);

    return () => clearInterval(interval);
  }, [event.id]);

  // Filter and sort questions
  const filteredQuestions = questions.filter(q => {
    switch (filter) {
      case 'unanswered': return !q.isAnswered;
      case 'answered': return q.isAnswered;
      case 'moderated': return q.isModerated;
      default: return true;
    }
  }).sort((a, b) => {
    if (sortBy === 'upvotes') {
      return b.upvotes - a.upvotes;
    } else {
      return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
    }
  });

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2" style={{ borderColor: theme.colors.primary }}></div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">Q&A Session</h2>
          <p className="text-white/60">
            {questions.length > 0 
              ? `${questions.filter(q => !q.isAnswered).length} unanswered, ${questions.filter(q => q.isAnswered).length} answered`
              : 'No questions yet'
            }
          </p>
        </div>
        
        <Button
          onClick={() => setShowSubmitForm(true)}
          style={{ backgroundColor: theme.colors.primary, color: theme.colors.background }}
          className="flex items-center gap-2"
        >
          <span>❓</span>
          Ask Question
        </Button>
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

      {/* Question submission form */}
      {showSubmitForm && (
        <QuestionSubmissionForm
          onSubmitQuestion={submitQuestion}
          onCancel={() => setShowSubmitForm(false)}
          theme={theme}
        />
      )}

      {/* Filters and sorting */}
      <div className="flex flex-wrap gap-4 items-center">
        <div className="flex gap-2">
          <span className="text-white/60 text-sm">Filter:</span>
          {(['all', 'unanswered', 'answered', 'moderated'] as const).map(f => (
            <Button
              key={f}
              size="sm"
              variant={filter === f ? "default" : "outline"}
              onClick={() => setFilter(f)}
              className={`text-xs ${
                filter === f 
                  ? 'bg-white/10 text-white border-white/20' 
                  : 'bg-transparent text-white/70 border-white/10 hover:bg-white/5'
              }`}
            >
              {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1)}
            </Button>
          ))}
        </div>

        <div className="flex gap-2">
          <span className="text-white/60 text-sm">Sort by:</span>
          {(['upvotes', 'recent'] as const).map(s => (
            <Button
              key={s}
              size="sm"
              variant={sortBy === s ? "default" : "outline"}
              onClick={() => setSortBy(s)}
              className={`text-xs ${
                sortBy === s 
                  ? 'bg-white/10 text-white border-white/20' 
                  : 'bg-transparent text-white/70 border-white/10 hover:bg-white/5'
              }`}
            >
              {s === 'upvotes' ? '👍 Upvotes' : '🕒 Recent'}
            </Button>
          ))}
        </div>
      </div>

      {/* Questions list */}
      {filteredQuestions.length === 0 ? (
        <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
          <CardContent className="p-8 text-center">
            <div className="text-4xl mb-4">❓</div>
            <h3 className="text-xl font-semibold mb-2 text-white">No Questions</h3>
            <p className="text-white/60 mb-4">
              {filter === 'all' 
                ? 'Be the first to ask a question during this event.'
                : `No ${filter} questions found.`
              }
            </p>
            <Button
              onClick={() => setShowSubmitForm(true)}
              style={{ backgroundColor: theme.colors.primary, color: theme.colors.background }}
            >
              Ask First Question
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Questions list */}
          <div className="space-y-4">
            {filteredQuestions.map(question => (
              <Card
                key={question.id}
                className={`bg-white/5 border backdrop-blur-sm cursor-pointer transition-all hover:bg-white/10 ${
                  selectedQuestion?.id === question.id ? 'border-white/30 ring-2 ring-white/20' : 'border-white/10'
                }`}
                onClick={() => setSelectedQuestion(question)}
              >
                <CardContent className="p-4">
                  <div className="flex items-start justify-between mb-3">
                    <h4 className="font-medium text-white text-sm line-clamp-2 flex-1">{question.question}</h4>
                    <div className="flex items-center gap-2 ml-3">
                      {!question.isModerated && session.isAdmin && (
                        <span className="text-yellow-400 text-xs">⚠️ Unmoderated</span>
                      )}
                      {question.isAnswered && (
                        <span className="text-green-400 text-xs">✅ Answered</span>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center justify-between text-xs text-white/60">
                    <span>{new Date(question.createdAt).toLocaleString()}</span>
                    <div className="flex items-center gap-4">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          upvoteQuestion(question.id, question.upvotes);
                        }}
                        className="flex items-center gap-1 hover:text-white transition-colors"
                      >
                        <span>👍</span>
                        <span>{question.upvotes}</span>
                      </button>
                      
                      {session.isAdmin && !question.isModerated && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleModeration(question.id, true);
                          }}
                          className="text-yellow-400 hover:text-yellow-300 transition-colors"
                        >
                          ✓ Approve
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {question.answer && (
                    <div className="mt-3 pt-3 border-t border-white/10">
                      <p className="text-white/80 text-sm line-clamp-2">{question.answer}</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            ))}
          </div>

          {/* Selected question detail */}
          <div className="lg:sticky lg:top-4">
            {selectedQuestion ? (
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardHeader>
                  <div className="flex items-start justify-between">
                    <CardTitle className="text-white text-lg line-clamp-3">{selectedQuestion.question}</CardTitle>
                    <div className="flex items-center gap-2 ml-3">
                      <button
                        onClick={() => upvoteQuestion(selectedQuestion.id, selectedQuestion.upvotes)}
                        className="flex items-center gap-1 text-white/60 hover:text-white transition-colors"
                      >
                        <span>👍</span>
                        <span>{selectedQuestion.upvotes}</span>
                      </button>
                    </div>
                  </div>
                  <div className="text-white/60 text-sm">
                    Asked on {new Date(selectedQuestion.createdAt).toLocaleString()}
                  </div>
                </CardHeader>
                
                <CardContent>
                  {selectedQuestion.answer ? (
                    <div className="space-y-4">
                      <div>
                        <h4 className="text-white font-medium mb-2">Answer:</h4>
                        <p className="text-white/80">{selectedQuestion.answer}</p>
                      </div>
                      <div className="text-white/60 text-sm">
                        Answered on {selectedQuestion.answeredAt && new Date(selectedQuestion.answeredAt).toLocaleString()}
                      </div>
                    </div>
                  ) : (
                    <div>
                      {session.isAdmin ? (
                        <AnswerForm
                          questionId={selectedQuestion.id}
                          onSubmitAnswer={submitAnswer}
                          theme={theme}
                        />
                      ) : (
                        <div className="text-center py-6">
                          <div className="text-4xl mb-2">⏳</div>
                          <p className="text-white/60">Waiting for answer from event organizer...</p>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Admin moderation controls */}
                  {session.isAdmin && (
                    <div className="mt-6 pt-4 border-t border-white/10">
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant={selectedQuestion.isModerated ? "default" : "outline"}
                          onClick={() => toggleModeration(selectedQuestion.id, !selectedQuestion.isModerated)}
                          className={`text-xs ${
                            selectedQuestion.isModerated 
                              ? 'bg-green-600 hover:bg-green-700 text-white' 
                              : 'border-yellow-500/40 text-yellow-400 hover:bg-yellow-500/10'
                          }`}
                        >
                          {selectedQuestion.isModerated ? '✅ Approved' : '⚠️ Approve'}
                        </Button>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            ) : (
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardContent className="p-8 text-center">
                  <div className="text-4xl mb-4">👆</div>
                  <h3 className="text-lg font-semibold mb-2 text-white">Select a Question</h3>
                  <p className="text-white/60">Choose a question from the list to view details and interact.</p>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

// Question submission form component
function QuestionSubmissionForm({ onSubmitQuestion, onCancel, theme }: { onSubmitQuestion: (question: string) => void, onCancel: () => void, theme: any }) {
  const [question, setQuestion] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!question.trim()) return;

    setIsSubmitting(true);
    await onSubmitQuestion(question.trim());
    setIsSubmitting(false);
  };

  return (
    <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
      <CardHeader>
        <CardTitle style={{ color: theme.colors.primary }}>Ask a Question</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-white text-sm font-medium mb-2">Your Question *</label>
            <textarea
              value={question}
              onChange={(e) => setQuestion(e.target.value)}
              required
              rows={4}
              className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/40 resize-none"
              placeholder="Ask your question about the event..."
            />
            <div className="text-right text-xs text-white/40 mt-1">
              {question.length}/500
            </div>
          </div>

          <div className="flex gap-4">
            <Button
              type="button"
              variant="outline"
              onClick={onCancel}
              disabled={isSubmitting}
              className="border-white/20 text-white/70 hover:bg-white/5"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !question.trim()}
              style={{ 
                backgroundColor: theme.colors.primary, 
                color: theme.colors.background,
                opacity: (isSubmitting || !question.trim()) ? 0.5 : 1
              }}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Question'}
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

// Answer form component for admins
function AnswerForm({ questionId, onSubmitAnswer, theme }: { questionId: string, onSubmitAnswer: (questionId: string, answer: string) => void, theme: any }) {
  const [answer, setAnswer] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!answer.trim()) return;

    setIsSubmitting(true);
    await onSubmitAnswer(questionId, answer.trim());
    setIsSubmitting(false);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-white text-sm font-medium mb-2">Your Answer *</label>
        <textarea
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          required
          rows={4}
          className="w-full px-3 py-2 bg-white/10 border border-white/20 rounded-lg text-white placeholder-white/40 focus:outline-none focus:border-white/40 resize-none"
          placeholder="Provide your answer to this question..."
        />
      </div>

      <Button
        type="submit"
        disabled={isSubmitting || !answer.trim()}
        style={{ 
          backgroundColor: theme.colors.primary, 
          color: theme.colors.background,
          opacity: (isSubmitting || !answer.trim()) ? 0.5 : 1
        }}
        className="w-full"
      >
        {isSubmitting ? 'Submitting Answer...' : 'Submit Answer'}
      </Button>
    </form>
  );
}