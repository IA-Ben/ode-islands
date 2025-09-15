"use client";

import { useMobile } from '@/contexts/MobileContext';
import { useTheme } from '@/contexts/ThemeContext';

interface DataSaverToggleProps {
  className?: string;
  showLabel?: boolean;
  compact?: boolean;
}

export default function DataSaverToggle({ 
  className = '', 
  showLabel = true, 
  compact = false 
}: DataSaverToggleProps) {
  const { isDataSaverEnabled, toggleDataSaver, isMobile } = useMobile();
  const { theme } = useTheme();

  if (!isMobile && !isDataSaverEnabled) {
    // Only show on mobile or when data saver is already enabled
    return null;
  }

  return (
    <div className={`flex items-center ${className}`}>
      <button
        onClick={toggleDataSaver}
        className={`relative inline-flex items-center ${
          compact ? 'h-5 w-9' : 'h-6 w-11'
        } rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 ${
          isDataSaverEnabled 
            ? 'bg-blue-600' 
            : 'bg-gray-600'
        }`}
        role="switch"
        aria-checked={isDataSaverEnabled}
        aria-label="Toggle data saver mode"
      >
        <span
          className={`inline-block transform transition-transform duration-200 rounded-full bg-white ${
            compact ? 'h-3 w-3' : 'h-4 w-4'
          } ${
            isDataSaverEnabled 
              ? (compact ? 'translate-x-5' : 'translate-x-6') 
              : 'translate-x-1'
          }`}
        />
      </button>
      
      {showLabel && (
        <div className="ml-3">
          <span className={`${compact ? 'text-xs' : 'text-sm'} font-medium text-white/90`}>
            Data Saver
          </span>
          {isDataSaverEnabled && (
            <div className={`${compact ? 'text-xs' : 'text-xs'} text-white/60 mt-1`}>
              Reduces video quality to save data
            </div>
          )}
        </div>
      )}
    </div>
  );
}