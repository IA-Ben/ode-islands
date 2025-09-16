"use client";

import React from 'react';
import { Button } from '@/components/ui/button';

interface HelpButtonProps {
  onClick: () => void;
  size?: 'sm' | 'default' | 'lg';
  variant?: 'default' | 'outline' | 'ghost';
  className?: string;
  tooltip?: string;
}

const QuestionMarkIcon = () => (
  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

export default function HelpButton({ 
  onClick, 
  size = 'sm', 
  variant = 'ghost', 
  className = '', 
  tooltip 
}: HelpButtonProps) {
  const [showTooltip, setShowTooltip] = React.useState(false);

  return (
    <div className="relative inline-block">
      <Button
        variant={variant}
        size={size === 'sm' ? 'icon' : size}
        onClick={onClick}
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        className={`text-gray-400 hover:text-blue-400 hover:bg-blue-400/10 transition-colors ${className}`}
        title={tooltip}
      >
        <QuestionMarkIcon />
      </Button>
      
      {tooltip && showTooltip && (
        <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-2 py-1 bg-gray-800 text-white text-xs rounded whitespace-nowrap z-50 border border-gray-600">
          {tooltip}
        </div>
      )}
    </div>
  );
}