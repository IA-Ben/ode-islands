"use client";

import React, { useState, useEffect } from 'react';
import { useTheme } from '@/contexts/ThemeContext';
import type { ScoreToastData } from '@/@typings/fanScore';
import { ACTIVITY_CONFIGS } from '@/@typings/fanScore';

interface ScoreToastProps {
  /** Array of toast notifications to display */
  toasts: ScoreToastData[];
  /** Callback when a toast is dismissed */
  onDismiss: (index: number) => void;
  /** Position of toast container */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
  /** Maximum number of toasts to show simultaneously */
  maxToasts?: number;
  /** Whether to show confetti animation for achievements */
  showConfetti?: boolean;
}

export default function ScoreToast({
  toasts,
  onDismiss,
  position = 'top-right',
  maxToasts = 3,
  showConfetti = true
}: ScoreToastProps) {
  const { theme } = useTheme();
  const [confettiVisible, setConfettiVisible] = useState(false);

  // Trigger confetti for high-value activities
  useEffect(() => {
    const hasAchievement = toasts.some(toast => 
      toast.activityType === 'achievement_unlock' || 
      toast.activityType === 'chapter_completion' ||
      toast.points >= 50
    );
    
    if (hasAchievement && showConfetti) {
      setConfettiVisible(true);
      setTimeout(() => setConfettiVisible(false), 3000);
    }
  }, [toasts, showConfetti]);

  const getPositionClasses = () => {
    switch (position) {
      case 'top-left':
        return 'top-4 left-4';
      case 'bottom-right':
        return 'bottom-4 right-4';
      case 'bottom-left':
        return 'bottom-4 left-4';
      case 'top-center':
        return 'top-4 left-1/2 transform -translate-x-1/2';
      default:
        return 'top-4 right-4';
    }
  };

  const getActivityConfig = (activityType: string) => {
    return ACTIVITY_CONFIGS[activityType as keyof typeof ACTIVITY_CONFIGS] || {
      icon: 'default',
      color: theme.colors.primary,
      label: 'Points Earned',
      emoji: '⭐'
    };
  };

  const getPointsAnimation = (points: number) => {
    if (points >= 100) return 'animate-bounce-big';
    if (points >= 50) return 'animate-bounce-medium';
    if (points >= 20) return 'animate-bounce-small';
    return 'animate-pulse';
  };

  const displayToasts = toasts.slice(0, maxToasts);

  if (displayToasts.length === 0) {
    return null;
  }

  return (
    <>
      {/* Confetti Animation */}
      {confettiVisible && (
        <div className="fixed inset-0 pointer-events-none z-50">
          <div className="confetti-container">
            {Array.from({ length: 20 }).map((_, i) => (
              <div
                key={i}
                className="confetti-piece"
                style={{
                  left: `${Math.random() * 100}%`,
                  animationDelay: `${Math.random() * 2}s`,
                  backgroundColor: i % 2 === 0 ? '#FFD700' : theme.colors.primary,
                }}
              />
            ))}
          </div>
        </div>
      )}

      {/* Toast Container */}
      <div className={`fixed z-40 space-y-2 ${getPositionClasses()}`} style={{ maxWidth: '320px' }}>
        {displayToasts.map((toast, index) => {
          const config = getActivityConfig(toast.activityType);
          
          return (
            <div
              key={index}
              className="toast-item animate-slide-in-right"
              style={{
                animationDelay: `${index * 100}ms`,
              }}
            >
              <div 
                className="relative bg-white/95 backdrop-blur-sm border rounded-lg shadow-lg p-4 transition-all duration-300 hover:shadow-xl group cursor-pointer"
                style={{
                  borderColor: config.color + '40',
                  background: `linear-gradient(135deg, ${config.color}10, white 50%)`
                }}
                onClick={() => onDismiss(index)}
              >
                {/* Close Button */}
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDismiss(index);
                  }}
                  className="absolute top-2 right-2 w-6 h-6 rounded-full bg-gray-200/50 hover:bg-gray-300/50 flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity duration-200"
                >
                  <svg className="w-3 h-3 text-gray-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>

                <div className="flex items-start space-x-3">
                  {/* Activity Icon */}
                  <div 
                    className="flex-shrink-0 w-10 h-10 rounded-full flex items-center justify-center text-lg font-bold text-white"
                    style={{ backgroundColor: config.color }}
                  >
                    {config.emoji}
                  </div>

                  {/* Content */}
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between">
                      <h4 className="text-sm font-semibold text-gray-900 truncate">
                        {toast.title || config.label}
                      </h4>
                      <div 
                        className={`flex items-center space-x-1 ${getPointsAnimation(toast.points)}`}
                      >
                        <span className="text-lg font-bold" style={{ color: config.color }}>
                          +{toast.points}
                        </span>
                        <svg className="w-4 h-4 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
                          <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                        </svg>
                      </div>
                    </div>
                    
                    {toast.description && (
                      <p className="text-xs text-gray-600 mt-1 truncate">
                        {toast.description}
                      </p>
                    )}

                    {/* Activity Type Badge */}
                    <div className="mt-2">
                      <span 
                        className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium text-white"
                        style={{ backgroundColor: config.color + '80' }}
                      >
                        {config.label}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Progress Bar (Auto-dismiss indicator) */}
                <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-200 rounded-b-lg overflow-hidden">
                  <div 
                    className="h-full rounded-b-lg"
                    style={{ 
                      backgroundColor: config.color,
                      animation: `shrink-width ${toast.duration || 3000}ms linear`
                    }}
                  />
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* CSS Animations */}
      <style jsx>{`
        .animate-slide-in-right {
          animation: slideInRight 0.4s ease-out;
        }

        @keyframes slideInRight {
          from {
            transform: translateX(100%);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }

        .animate-bounce-big {
          animation: bounceBig 0.6s ease-out;
        }

        .animate-bounce-medium {
          animation: bounceMedium 0.5s ease-out;
        }

        .animate-bounce-small {
          animation: bounceSmall 0.4s ease-out;
        }

        @keyframes bounceBig {
          0%, 20%, 53%, 100% {
            transform: scale(1);
          }
          40%, 43% {
            transform: scale(1.4);
          }
        }

        @keyframes bounceMedium {
          0%, 20%, 53%, 100% {
            transform: scale(1);
          }
          40%, 43% {
            transform: scale(1.25);
          }
        }

        @keyframes bounceSmall {
          0%, 20%, 53%, 100% {
            transform: scale(1);
          }
          40%, 43% {
            transform: scale(1.1);
          }
        }

        @keyframes shrink-width {
          from {
            width: 100%;
          }
          to {
            width: 0%;
          }
        }

        .confetti-container {
          position: relative;
          width: 100%;
          height: 100%;
        }

        .confetti-piece {
          position: absolute;
          width: 8px;
          height: 8px;
          animation: confetti-fall 3s linear infinite;
        }

        @keyframes confetti-fall {
          0% {
            transform: translateY(-100vh) rotate(0deg);
            opacity: 1;
          }
          100% {
            transform: translateY(100vh) rotate(720deg);
            opacity: 0;
          }
        }
      `}</style>
    </>
  );
}

// Individual Toast Component for standalone use
interface SingleScoreToastProps extends Omit<ScoreToastData, 'duration'> {
  onDismiss: () => void;
  visible: boolean;
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left' | 'top-center';
  autoHide?: boolean;
  duration?: number;
}

export function SingleScoreToast({
  points,
  activityType,
  title,
  description,
  onDismiss,
  visible,
  position = 'top-right',
  autoHide = true,
  duration = 3000
}: SingleScoreToastProps) {
  const [show, setShow] = useState(visible);

  useEffect(() => {
    setShow(visible);
    
    if (visible && autoHide) {
      const timer = setTimeout(() => {
        setShow(false);
        setTimeout(onDismiss, 300); // Wait for exit animation
      }, duration);
      
      return () => clearTimeout(timer);
    }
  }, [visible, autoHide, duration, onDismiss]);

  if (!show) return null;

  return (
    <ScoreToast
      toasts={[{ points, activityType, title, description, duration }]}
      onDismiss={onDismiss}
      position={position}
      maxToasts={1}
    />
  );
}