"use client";

import { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import AnimateText from './AnimateText';

interface JourneyEvent {
  id: string;
  type: 'prologue' | 'chapter' | 'poll' | 'task' | 'keepsake' | 'event';
  title: string;
  description?: string;
  timestamp: string;
  chapterId?: string;
  metadata?: any;
}

interface RecapData {
  userId: string;
  eventTitle: string;
  venue: string;
  date: string;
  prologueTone?: string;
  journeyEvents: JourneyEvent[];
  totalChapters: number;
  completedChapters: number;
  totalKeepsakes: number;
  pollsAnswered: number;
  tasksCompleted: number;
}

interface HeroRecapCardProps {
  className?: string;
  onShare?: () => void;
}

export default function HeroRecapCard({ className = '', onShare }: HeroRecapCardProps) {
  const { theme } = useTheme();
  const [recapData, setRecapData] = useState<RecapData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [animateIn, setAnimateIn] = useState(false);
  const [expandedTimeline, setExpandedTimeline] = useState(false);

  useEffect(() => {
    fetchRecapData();
    const timer = setTimeout(() => setAnimateIn(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const fetchRecapData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get the most recent event/ticket for the user
      const response = await fetch('/api/recap/journey');
      
      if (!response.ok) {
        throw new Error('Failed to fetch recap data');
      }

      const data = await response.json();
      if (data.success) {
        setRecapData(data.recap);
      } else {
        throw new Error(data.message || 'Failed to load recap data');
      }
    } catch (error) {
      console.error('Fetch recap error:', error);
      setError(error instanceof Error ? error.message : 'Failed to load recap');
      // Create mock data for demo purposes
      setRecapData({
        userId: 'user-1',
        eventTitle: 'The Ode Islands',
        venue: 'Digital Experience',
        date: new Date().toISOString().split('T')[0],
        prologueTone: 'reflective',
        journeyEvents: [
          {
            id: 'prologue',
            type: 'prologue',
            title: 'Journey Began',
            description: 'Started your adventure through The Ode Islands',
            timestamp: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString()
          },
          {
            id: 'chapter-1',
            type: 'chapter',
            title: 'Chapter 1 Completed',
            description: 'Explored the first chapter',
            timestamp: new Date(Date.now() - 90 * 60 * 1000).toISOString(),
            chapterId: 'chapter-1'
          },
          {
            id: 'chapter-2',
            type: 'chapter',
            title: 'Chapter 2 Completed',
            description: 'Discovered new insights',
            timestamp: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
            chapterId: 'chapter-2'
          }
        ],
        totalChapters: 4,
        completedChapters: 2,
        totalKeepsakes: 3,
        pollsAnswered: 2,
        tasksCompleted: 1
      });
    } finally {
      setLoading(false);
    }
  };

  const getEventIcon = (type: string) => {
    switch (type) {
      case 'prologue':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
        );
      case 'chapter':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 713.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 410 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 410-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 713.138-3.138z" />
          </svg>
        );
      case 'poll':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 712 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 712-2h2a2 2 0 712 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
          </svg>
        );
      case 'task':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v10a2 2 0 002 2h8a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 712 2m-6 9l2 2 4-4" />
          </svg>
        );
      case 'keepsake':
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
          </svg>
        );
      default:
        return (
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        );
    }
  };

  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diffMs = now.getTime() - date.getTime();
    const diffMins = Math.floor(diffMs / 60000);
    const diffHours = Math.floor(diffMins / 60);

    if (diffMins < 60) {
      return `${diffMins}m ago`;
    } else if (diffHours < 24) {
      return `${diffHours}h ago`;
    } else {
      return date.toLocaleDateString();
    }
  };

  const generateShareableImage = async () => {
    if (!recapData) return;

    try {
      const response = await fetch('/api/recap/share-image', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          eventTitle: recapData.eventTitle,
          venue: recapData.venue,
          date: recapData.date,
          completedChapters: recapData.completedChapters,
          totalChapters: recapData.totalChapters,
          userInitials: 'JD' // TODO: Get from user profile
        }),
      });

      if (response.ok) {
        const blob = await response.blob();
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = `recap-${recapData.eventTitle.replace(/\s+/g, '-').toLowerCase()}.png`;
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }
    } catch (error) {
      console.error('Failed to generate shareable image:', error);
    }
  };

  if (loading) {
    return (
      <div className={`bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 ${className}`}>
        <div className="animate-pulse">
          <div className="h-6 bg-white/20 rounded w-3/4 mb-4"></div>
          <div className="h-4 bg-white/10 rounded w-1/2 mb-6"></div>
          <div className="space-y-3">
            <div className="h-4 bg-white/10 rounded w-full"></div>
            <div className="h-4 bg-white/10 rounded w-5/6"></div>
            <div className="h-4 bg-white/10 rounded w-4/6"></div>
          </div>
        </div>
      </div>
    );
  }

  if (error || !recapData) {
    return (
      <div className={`bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 ${className}`}>
        <div className="text-center">
          <div className="w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-4">
            <svg className="w-8 h-8 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-xl font-bold text-white mb-2">Journey Recap Unavailable</h3>
          <p className="text-white/60 mb-4">We couldn't load your journey recap at the moment.</p>
          <button
            onClick={fetchRecapData}
            className="px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors"
          >
            Try Again
          </button>
        </div>
      </div>
    );
  }

  const completionPercentage = Math.round((recapData.completedChapters / recapData.totalChapters) * 100);

  return (
    <div 
      className={`bg-white/10 backdrop-blur-lg rounded-2xl border border-white/20 p-8 ${className}`}
      style={{
        opacity: 0,
        animation: animateIn ? 'animButtonIn 0.8s 0.2s ease forwards' : 'none'
      }}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white mb-2">
            <AnimateText active={animateIn} delay={500}>
              Your Journey Recap
            </AnimateText>
          </h2>
          <p className="text-white/70">
            <AnimateText active={animateIn} delay={800}>
              {`${recapData.eventTitle} • ${recapData.venue} • ${new Date(recapData.date).toLocaleDateString()}`}
            </AnimateText>
          </p>
        </div>
        <button
          onClick={generateShareableImage}
          className="flex items-center space-x-2 px-4 py-2 bg-white/20 hover:bg-white/30 rounded-lg text-white transition-colors group"
          style={{
            opacity: 0,
            animation: animateIn ? 'animButtonIn 0.6s 1.2s ease forwards' : 'none'
          }}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.367 2.684 3 3 0 00-5.367-2.684z" />
          </svg>
          <span className="text-sm">Share</span>
        </button>
      </div>

      {/* Progress Summary */}
      <div 
        className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6"
        style={{
          opacity: 0,
          animation: animateIn ? 'animButtonIn 0.8s 1.0s ease forwards' : 'none'
        }}
      >
        <div className="bg-white/10 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white mb-1">{recapData.completedChapters}</div>
          <div className="text-white/60 text-sm">Chapters</div>
        </div>
        <div className="bg-white/10 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white mb-1">{recapData.totalKeepsakes}</div>
          <div className="text-white/60 text-sm">Keepsakes</div>
        </div>
        <div className="bg-white/10 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white mb-1">{recapData.pollsAnswered}</div>
          <div className="text-white/60 text-sm">Polls</div>
        </div>
        <div className="bg-white/10 rounded-xl p-4 text-center">
          <div className="text-2xl font-bold text-white mb-1">{recapData.tasksCompleted}</div>
          <div className="text-white/60 text-sm">Tasks</div>
        </div>
      </div>

      {/* Timeline */}
      <div 
        className="mb-6"
        style={{
          opacity: 0,
          animation: animateIn ? 'animButtonIn 0.8s 1.4s ease forwards' : 'none'
        }}
      >
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Journey Timeline</h3>
          <button
            onClick={() => setExpandedTimeline(!expandedTimeline)}
            className="text-white/60 hover:text-white transition-colors"
          >
            <svg className={`w-5 h-5 transform transition-transform ${expandedTimeline ? 'rotate-180' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </button>
        </div>

        <div className="space-y-3">
          {recapData.journeyEvents.slice(0, expandedTimeline ? undefined : 3).map((event, index) => (
            <div key={event.id} className="flex items-start space-x-3">
              <div className="flex-shrink-0 w-8 h-8 bg-white/20 rounded-full flex items-center justify-center text-white/80">
                {getEventIcon(event.type)}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <h4 className="text-white font-medium">{event.title}</h4>
                  <span className="text-white/50 text-sm">{formatTime(event.timestamp)}</span>
                </div>
                {event.description && (
                  <p className="text-white/60 text-sm mt-1">{event.description}</p>
                )}
              </div>
            </div>
          ))}
          
          {!expandedTimeline && recapData.journeyEvents.length > 3 && (
            <button
              onClick={() => setExpandedTimeline(true)}
              className="w-full text-center text-white/60 hover:text-white text-sm py-2 border border-white/20 rounded-lg hover:bg-white/10 transition-colors"
            >
              Show {recapData.journeyEvents.length - 3} more events
            </button>
          )}
        </div>
      </div>

      {/* Completion Progress */}
      <div 
        className="bg-white/10 rounded-xl p-4"
        style={{
          opacity: 0,
          animation: animateIn ? 'animButtonIn 0.8s 1.6s ease forwards' : 'none'
        }}
      >
        <div className="flex items-center justify-between mb-3">
          <span className="text-white font-medium">Overall Progress</span>
          <span className="text-white/80 text-sm">{completionPercentage}%</span>
        </div>
        <div className="w-full bg-white/20 rounded-full h-2">
          <div 
            className="bg-gradient-to-r from-blue-400 to-purple-500 h-2 rounded-full transition-all duration-1000"
            style={{ width: `${completionPercentage}%` }}
          ></div>
        </div>
      </div>
    </div>
  );
}