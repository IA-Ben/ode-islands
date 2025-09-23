'use client';

import React, { useState, useEffect } from 'react';
import { CardData } from '@/@typings';
import { useCardActionRouter, ActionConfig, LegacyActionConfig } from './CardActionRouter';
import { useButtonFeatureFlags, createUserCohort } from '../lib/buttonFeatureFlags';
import { useButtonMonitoring } from '../lib/buttonMonitoring';
import { ButtonFallback } from './legacy/LegacyButtonFallback';

// Extract the button type from CardData
type CustomButtonData = NonNullable<CardData['customButtons']>[0];

interface CardButtonProps {
  button: CustomButtonData;
  active: boolean;
  cardTheme?: {
    invert?: boolean;
    cta?: string;
    background?: string;
    title?: string;
    subtitle?: string;
    description?: string;
  };
  className?: string;
  onClick?: () => void;
}

/**
 * Icon component library for buttons
 */
const ButtonIcon: React.FC<{ name: string; className?: string }> = ({ name, className = 'h-4 w-4' }) => {
  const icons = {
    'arrow-right': (
      <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10.293 3.293a1 1 0 011.414 0l6 6a1 1 0 010 1.414l-6 6a1 1 0 01-1.414-1.414L14.586 11H3a1 1 0 110-2h11.586l-4.293-4.293a1 1 0 010-1.414z" clipRule="evenodd" />
      </svg>
    ),
    'play': (
      <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM9.555 7.168A1 1 0 008 8v4a1 1 0 001.555.832l3-2a1 1 0 000-1.664l-3-2z" clipRule="evenodd" />
      </svg>
    ),
    'ar': (
      <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
      </svg>
    ),
    'gift': (
      <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5 5a3 3 0 015-2.236A3 3 0 0114.83 6H16a2 2 0 110 4h-5V9a1 1 0 10-2 0v1H4a2 2 0 110-4h1.17C5.06 5.687 5 5.35 5 5zm4 1V5a1 1 0 10-1 1h1zm3 0a1 1 0 10-1-1v1h1z" clipRule="evenodd" />
        <path d="M9 11H3v5a2 2 0 002 2h4v-7zM11 18h4a2 2 0 002-2v-5h-6v7z" />
      </svg>
    ),
    'wallet': (
      <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path d="M4 4a2 2 0 00-2 2v1h16V6a2 2 0 00-2-2H4z" />
        <path fillRule="evenodd" d="M18 9H2v5a2 2 0 002 2h12a2 2 0 002-2V9zM4 13a1 1 0 011-1h1a1 1 0 110 2H5a1 1 0 01-1-1zm5-1a1 1 0 100 2h1a1 1 0 100-2H9z" clipRule="evenodd" />
      </svg>
    ),
    'external': (
      <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path d="M11 3a1 1 0 100 2h2.586l-6.293 6.293a1 1 0 101.414 1.414L15 6.414V9a1 1 0 102 0V4a1 1 0 00-1-1h-5z" />
        <path d="M5 5a2 2 0 00-2 2v8a2 2 0 002 2h8a2 2 0 002-2v-3a1 1 0 10-2 0v3H5V7h3a1 1 0 000-2H5z" />
      </svg>
    ),
    'lock': (
      <svg xmlns="http://www.w3.org/2000/svg" className={className} viewBox="0 0 20 20" fill="currentColor">
        <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
      </svg>
    )
  };

  return icons[name as keyof typeof icons] || null;
};

/**
 * Unified CardButton component with feature flag integration and monitoring
 * Automatically falls back to legacy button implementations when feature flags are disabled
 */
export const CardButton: React.FC<CardButtonProps> = ({ 
  button, 
  active, 
  cardTheme,
  className = '',
  onClick 
}) => {
  const actionRouter = useCardActionRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Feature flag and monitoring integration
  const userCohort = createUserCohort({
    userId: 'current-user', // In real app, get from auth context
    sessionId: typeof window !== 'undefined' ? sessionStorage.getItem('sessionId') || 'anonymous' : 'server',
    userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : undefined,
    isAdmin: false // In real app, get from auth context
  });

  const { shouldUseUnifiedButtons, recordPerformance, recordError } = useButtonFeatureFlags(userCohort);
  const { recordInteraction, recordValidation, startTiming } = useButtonMonitoring();

  // Timer-based visibility logic (from CustomButton) - MUST be called before any conditional returns
  useEffect(() => {
    if (active && startTime === null && button.timing) {
      setStartTime(Date.now());
    } else if (!active) {
      setStartTime(null);
      setIsVisible(false);
    }
  }, [active, startTime, button.timing]);

  useEffect(() => {
    if (!active || startTime === null || !button.timing) return;

    const checkVisibility = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed >= button.timing!.visibleFrom && !isVisible) {
        setIsVisible(true);
      }
    };

    const interval = setInterval(checkVisibility, 100);
    return () => clearInterval(interval);
  }, [active, startTime, button.timing?.visibleFrom, isVisible]);

  // If feature flags indicate we should use legacy, render legacy component
  if (!shouldUseUnifiedButtons) {
    return <ButtonFallback 
      button={button} 
      active={active} 
      cardTheme={cardTheme} 
      className={className} 
      onClick={onClick} 
    />;
  }

  // Get display text (prioritize label over text for enhanced compatibility)
  const displayText = button.label || button.text || 'Button';
  
  // Check if button is locked
  const isLocked = button.unlockConditions && !button.isUnlocked;

  // Handle button click with monitoring
  const handleClick = () => {
    const endTiming = startTiming('button-click');
    let success = false;
    let actionType = 'unknown';

    try {
      // Handle locked buttons
      if (isLocked) {
        const hint = button.unlockHint || 'This content is locked. Complete the requirements to unlock.';
        alert(hint);
        recordInteraction(button.id, 'locked-attempt', false, { hint });
        return;
      }

      // Custom onClick handler takes precedence
      if (onClick) {
        onClick();
        success = true;
        actionType = 'custom';
        recordInteraction(button.id, actionType, success);
        return;
      }

      // Execute action using unified router
      if (button.action) {
        actionType = button.action.type;
        actionRouter.executeAction(button.action);
        success = true;
      } else if (button.link) {
        // Backward compatibility with legacy link format
        actionType = `legacy-${button.link.type}`;
        actionRouter.executeLegacyAction(button.link);
        success = true;
      } else {
        console.warn('Button has no action or link configuration:', button);
        recordError('button-configuration', new Error('Button missing action/link configuration'), {
          buttonId: button.id,
          hasAction: !!button.action,
          hasLink: !!button.link
        });
        return;
      }

      recordInteraction(button.id, actionType, success, {
        action: button.action,
        link: button.link
      });

    } catch (error) {
      success = false;
      recordError('button-action-execution', error instanceof Error ? error : new Error(String(error)), {
        buttonId: button.id,
        actionType,
        action: button.action,
        link: button.link
      });
      
      console.error('Button action execution failed:', error);
    } finally {
      endTiming();
    }
  };

  // Don't render if not visible (timing-based or locked without positioning)
  if (button.timing && !isVisible) return null;

  // Validate button data and record validation metrics
  React.useEffect(() => {
    const endValidation = startTiming('button-validation');
    const validation = validateButtonData(button);
    recordValidation(button.id, validation, performance.now() - Date.now());
    endValidation();
  }, [button, recordValidation, startTiming]);

  // Get variant-based styling
  const getVariantStyles = () => {
    const variant = button.variant || 'primary';
    
    const baseStyles = {
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      fontWeight: '600',
      transition: 'all 0.2s ease',
      cursor: isLocked ? 'not-allowed' : 'pointer',
      outline: 'none',
      border: '2px solid transparent',
      textDecoration: 'none'
    };

    const variantStyles = {
      primary: {
        backgroundColor: button.styling?.backgroundColor || cardTheme?.cta || '#3B82F6',
        color: button.styling?.textColor || '#FFFFFF',
        padding: button.styling?.padding || '12px 24px',
        borderRadius: button.styling?.borderRadius || '9999px',
        boxShadow: '0 4px 16px rgba(0,0,0,0.4)'
      },
      secondary: {
        backgroundColor: button.styling?.backgroundColor || '#6B7280',
        color: button.styling?.textColor || '#FFFFFF',
        padding: button.styling?.padding || '12px 24px',
        borderRadius: button.styling?.borderRadius || '8px',
        boxShadow: '0 2px 8px rgba(0,0,0,0.2)'
      },
      ghost: {
        backgroundColor: 'transparent',
        color: button.styling?.textColor || cardTheme?.title || '#FFFFFF',
        padding: button.styling?.padding || '12px 24px',
        borderRadius: button.styling?.borderRadius || '8px',
        border: `2px solid ${button.styling?.borderColor || 'currentColor'}`
      },
      link: {
        backgroundColor: 'transparent',
        color: button.styling?.textColor || cardTheme?.cta || '#3B82F6',
        padding: button.styling?.padding || '8px 16px',
        textDecoration: 'underline'
      }
    };

    return { ...baseStyles, ...variantStyles[variant] };
  };

  // Get positioning styles
  const getPositionStyles = () => {
    if (!button.position) return {};

    return {
      position: 'absolute' as const,
      left: button.position.unit === 'percent' ? `${button.position.x}%` : `${button.position.x}px`,
      top: button.position.unit === 'percent' ? `${button.position.y}%` : `${button.position.y}px`,
      transform: button.position.unit === 'percent' ? 'translate(-50%, -50%)' : 'none',
      zIndex: 100
    };
  };

  // Get animation styles
  const getAnimationStyles = () => {
    if (!button.animation || !isVisible) return {};

    const { animation, timing } = button;
    const duration = animation.duration || 0.6;
    const delay = timing?.animationDelay || 0;
    const easing = animation.easing || 'ease';

    const animationMap = {
      'fadeIn': 'fadeIn',
      'slideUp': 'slideInUp',
      'slideDown': 'slideInDown',
      'slideLeft': 'slideInLeft',
      'slideRight': 'slideInRight',
      'bounce': 'bounceIn',
      'scale': 'scaleIn'
    };

    const animationName = animationMap[animation.type] || 'fadeIn';

    return {
      opacity: 0,
      animation: `${animationName} ${duration}s ${delay}s ${easing} forwards`
    };
  };

  // Combine all styles
  const combinedStyles = {
    ...getVariantStyles(),
    ...getPositionStyles(),
    ...getAnimationStyles(),
    opacity: isLocked ? 0.6 : (button.styling?.opacity ?? 1)
  };

  // Monitor render performance
  React.useEffect(() => {
    const renderEndTime = performance.now();
    recordPerformance('button-render', renderEndTime - (window.buttonRenderStart || renderEndTime));
  }, [recordPerformance]);

  return (
    <>
      {/* CSS Animations */}
      <style jsx>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideInUp {
          from { opacity: 0; transform: translateY(30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInDown {
          from { opacity: 0; transform: translateY(-30px); }
          to { opacity: 1; transform: translateY(0); }
        }
        @keyframes slideInLeft {
          from { opacity: 0; transform: translateX(-30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes slideInRight {
          from { opacity: 0; transform: translateX(30px); }
          to { opacity: 1; transform: translateX(0); }
        }
        @keyframes bounceIn {
          0% { opacity: 0; transform: scale(0.3); }
          50% { opacity: 1; transform: scale(1.05); }
          70% { transform: scale(0.9); }
          100% { opacity: 1; transform: scale(1); }
        }
        @keyframes scaleIn {
          from { opacity: 0; transform: scale(0); }
          to { opacity: 1; transform: scale(1); }
        }
      `}</style>

      <button
        onClick={handleClick}
        style={combinedStyles}
        className={className}
        disabled={isLocked}
        title={isLocked ? button.unlockHint : undefined}
        aria-label={displayText}
        onMouseEnter={(e) => {
          if (!isLocked && !button.position) {
            e.currentTarget.style.transform = 'scale(1.05)';
          }
        }}
        onMouseLeave={(e) => {
          if (!isLocked && !button.position) {
            e.currentTarget.style.transform = 'scale(1)';
          }
        }}
        onFocus={(e) => {
          e.currentTarget.style.outline = '2px solid rgba(59, 130, 246, 0.5)';
          e.currentTarget.style.outlineOffset = '2px';
        }}
        onBlur={(e) => {
          e.currentTarget.style.outline = 'none';
        }}
      >
        {/* Lock icon for locked buttons */}
        {isLocked && <ButtonIcon name="lock" />}
        
        {/* Button icon */}
        {button.icon && !isLocked && <ButtonIcon name={button.icon} />}
        
        {/* Button text */}
        <span>{displayText}</span>
        
        {/* Screen reader hint for locked buttons */}
        {isLocked && button.unlockHint && (
          <span className="sr-only">{button.unlockHint}</span>
        )}
      </button>
    </>
  );
};

export default CardButton;

/**
 * Helper function to validate button data
 */
export function validateButtonData(button: CustomButtonData): { isValid: boolean; errors: string[] } {
  const errors: string[] = [];

  // Check for required fields
  if (!button.id) errors.push('Button ID is required');
  if (!button.text && !button.label) errors.push('Button text or label is required');

  // Validate action or link
  if (!button.action && !button.link) {
    errors.push('Button must have either action or link configuration');
  }

  // Validate action if present
  if (button.action) {
    if (!button.action.type) errors.push('Action type is required');
    if (['external-url', 'iframe'].includes(button.action.type) && !button.action.target) {
      errors.push(`Action target is required for ${button.action.type}`);
    }
  }

  // Validate position if present
  if (button.position) {
    if (button.position.x < 0 || button.position.x > (button.position.unit === 'percent' ? 100 : 9999)) {
      errors.push('Position X is out of bounds');
    }
    if (button.position.y < 0 || button.position.y > (button.position.unit === 'percent' ? 100 : 9999)) {
      errors.push('Position Y is out of bounds');
    }
  }

  // Validate timing if present
  if (button.timing) {
    if (button.timing.visibleFrom < 0) errors.push('Visible from time cannot be negative');
    if (button.timing.animationDelay && button.timing.animationDelay < 0) {
      errors.push('Animation delay cannot be negative');
    }
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

/**
 * Helper function to migrate legacy button data to unified format
 */
export function migrateLegacyButton(button: any): CustomButtonData {
  const migrated: CustomButtonData = {
    id: button.id,
    text: button.text,
    label: button.label || button.text,
    position: button.position,
    timing: button.timing,
    animation: button.animation,
    styling: button.styling
  };

  // Migrate link to action
  if (button.link && !button.action) {
    const typeMapping = {
      'external': 'external-url',
      'chapter': 'chapter',
      'subchapter': 'sub-chapter',
      'iframe': 'iframe'
    };

    migrated.action = {
      type: typeMapping[button.link.type as keyof typeof typeMapping] || 'external-url',
      target: button.link.url || button.link.target,
      iframeConfig: button.link.iframeConfig
    };

    // Keep legacy link for backward compatibility
    migrated.link = button.link;
  }

  // Copy enhanced features
  if (button.variant) migrated.variant = button.variant;
  if (button.icon) migrated.icon = button.icon;
  if (button.order !== undefined) migrated.order = button.order;
  if (button.unlockConditions) migrated.unlockConditions = button.unlockConditions;
  if (button.isUnlocked !== undefined) migrated.isUnlocked = button.isUnlocked;
  if (button.unlockHint) migrated.unlockHint = button.unlockHint;

  return migrated;
}