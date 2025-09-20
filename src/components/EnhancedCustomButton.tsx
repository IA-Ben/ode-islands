'use client';

import React from 'react';
import { useRouter } from 'next/navigation';

interface UnlockCondition {
  type: 'stamp-required' | 'task-required' | 'time-window' | 'geofence' | 'sign-in';
  stampId?: string;
  stampName?: string;
  taskId?: string;
  taskName?: string;
  startTime?: string;
  endTime?: string;
  location?: { lat: number; lng: number; radius: number };
}

interface EnhancedCustomButtonProps {
  button: {
    id: string;
    label: string;
    variant?: 'primary' | 'secondary' | 'link' | 'ghost';
    icon?: string;
    destinationType: 'sub-chapter' | 'chapter' | 'ar-item' | 'event-route' | 'wallet' | 'presents' | 'external-link';
    destinationId?: string;
    unlockConditions?: UnlockCondition[];
    isUnlocked?: boolean;
    unlockHint?: string;
    order?: number;
  };
  className?: string;
  onClick?: () => void;
}

const LockIcon = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
    <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
  </svg>
);

const getIcon = (iconName: string) => {
  switch (iconName) {
    case 'arrow-right':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
        </svg>
      );
    case 'play':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
        </svg>
      );
    case 'ar':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>
      );
    case 'gift':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clipRule="evenodd" />
          <path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z" />
        </svg>
      );
    case 'wallet':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
          <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
        </svg>
      );
    case 'external':
      return (
        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
          <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
          <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
        </svg>
      );
    default:
      return null;
  }
};

export const EnhancedCustomButton: React.FC<EnhancedCustomButtonProps> = ({
  button,
  className = '',
  onClick
}) => {
  const router = useRouter();
  const isLocked = button.unlockConditions && !button.isUnlocked;

  const handleClick = () => {
    if (isLocked) {
      // Show hint on locked button click
      alert(button.unlockHint || 'This content is locked. Complete the requirements to unlock.');
      return;
    }

    if (onClick) {
      onClick();
      return;
    }

    switch (button.destinationType) {
      case 'sub-chapter':
        if (button.destinationId) {
          // Assuming sub-chapter route follows pattern /before/story/[chapterId]/[subId]
          router.push(`/before/story/${button.destinationId}`);
        }
        break;
      
      case 'chapter':
        if (button.destinationId) {
          router.push(`/before/story/${button.destinationId}`);
        }
        break;
      
      case 'ar-item':
        if (button.destinationId) {
          router.push(`/before/ar/${button.destinationId}`);
        }
        break;
      
      case 'event-route':
        if (button.destinationId) {
          router.push(`/event/${button.destinationId}`);
        }
        break;
      
      case 'wallet':
        router.push('/memory-wallet');
        break;
      
      case 'presents':
        router.push('/presents');
        break;
      
      case 'external-link':
        if (button.destinationId) {
          window.open(button.destinationId, '_blank', 'noopener,noreferrer');
        }
        break;
    }
  };

  // Determine button styles based on variant
  const getVariantClasses = () => {
    const baseClasses = 'inline-flex items-center gap-2 font-medium transition-all duration-200 disabled:opacity-50';
    
    switch (button.variant) {
      case 'primary':
        return `${baseClasses} px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`;
      
      case 'secondary':
        return `${baseClasses} px-4 py-2 bg-gray-200 text-gray-900 rounded-lg hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2`;
      
      case 'ghost':
        return `${baseClasses} px-4 py-2 text-gray-700 rounded-lg hover:bg-gray-100 focus:outline-none focus:ring-2 focus:ring-gray-500 focus:ring-offset-2`;
      
      case 'link':
        return `${baseClasses} text-blue-600 underline hover:text-blue-800 focus:outline-none focus:ring-2 focus:ring-blue-500`;
      
      default:
        return `${baseClasses} px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2`;
    }
  };

  return (
    <button
      onClick={handleClick}
      className={`${getVariantClasses()} ${isLocked ? 'cursor-not-allowed opacity-60' : ''} ${className}`}
      disabled={isLocked}
      title={isLocked ? button.unlockHint : undefined}
      aria-label={button.label}
    >
      {isLocked && <LockIcon />}
      {button.icon && !isLocked && getIcon(button.icon)}
      <span>{button.label}</span>
      {isLocked && button.unlockHint && (
        <span className="sr-only">{button.unlockHint}</span>
      )}
    </button>
  );
};

export default EnhancedCustomButton;