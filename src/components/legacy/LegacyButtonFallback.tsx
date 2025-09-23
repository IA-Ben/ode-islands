/**
 * Legacy Button Fallback Components
 * 
 * Provides backward compatibility with legacy CustomButton and EnhancedCustomButton
 * implementations when unified button system is disabled via feature flags.
 * 
 * These components maintain the exact API and behavior of the original legacy
 * components to ensure seamless fallback during rollback scenarios.
 */

'use client';

import React, { useState, useEffect } from 'react';
import { CardData } from '@/@typings';

// Extract the button type from CardData
type CustomButtonData = NonNullable<CardData['customButtons']>[0];

interface LegacyButtonProps {
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
 * Legacy CustomButton implementation for fallback scenarios
 * Maintains the original behavior and styling for backward compatibility
 */
export const LegacyCustomButton: React.FC<LegacyButtonProps> = ({
  button,
  active,
  cardTheme,
  className = '',
  onClick
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Legacy visibility logic based on timing
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

  // Legacy click handler
  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }

    // Legacy link handling
    if (button.link) {
      const { type, url, target } = button.link;
      
      switch (type) {
        case 'external':
          if (url) window.open(url, '_blank', 'noopener,noreferrer');
          break;
        case 'chapter':
          if (target) window.location.href = `/before/story/${target}`;
          break;
        case 'subchapter':
          if (target) window.location.href = `/before/story/${target}`;
          break;
        case 'iframe':
          if (url) {
            // Simple iframe modal for legacy support
            const modal = document.createElement('div');
            modal.style.cssText = `
              position: fixed; top: 0; left: 0; width: 100%; height: 100%;
              background: rgba(0,0,0,0.8); z-index: 9999; display: flex;
              align-items: center; justify-content: center;
            `;
            
            const iframe = document.createElement('iframe');
            iframe.src = url;
            iframe.style.cssText = `
              width: 80%; height: 80%; border: none; border-radius: 8px; background: white;
            `;
            
            const closeBtn = document.createElement('button');
            closeBtn.innerHTML = '✕';
            closeBtn.style.cssText = `
              position: absolute; top: 20px; right: 20px; background: white;
              border: none; border-radius: 50%; width: 40px; height: 40px;
              font-size: 18px; cursor: pointer; z-index: 10000;
            `;
            closeBtn.onclick = () => document.body.removeChild(modal);
            
            modal.appendChild(iframe);
            modal.appendChild(closeBtn);
            document.body.appendChild(modal);
          }
          break;
        default:
          console.warn('Unknown legacy link type:', type);
      }
    }
  };

  // Don't render if not visible
  if (button.timing && !isVisible) return null;

  // Legacy styling with basic positioning
  const style: React.CSSProperties = {
    position: button.position ? 'absolute' : 'relative',
    left: button.position ? `${button.position.x}${button.position.unit}` : 'auto',
    top: button.position ? `${button.position.y}${button.position.unit}` : 'auto',
    backgroundColor: button.styling?.backgroundColor || cardTheme?.cta || '#3B82F6',
    color: button.styling?.textColor || '#FFFFFF',
    padding: button.styling?.padding || '12px 24px',
    borderRadius: button.styling?.borderRadius || '9999px',
    border: 'none',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: '14px',
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    transition: 'all 0.2s ease',
    outline: 'none',
    zIndex: 10
  };

  return (
    <button
      className={`legacy-custom-button ${className}`}
      style={style}
      onClick={handleClick}
      onMouseEnter={(e) => {
        e.currentTarget.style.transform = 'scale(1.05)';
      }}
      onMouseLeave={(e) => {
        e.currentTarget.style.transform = 'scale(1)';
      }}
    >
      {button.text || button.label || 'Button'}
    </button>
  );
};

/**
 * Enhanced Legacy Button with additional features
 * Used for more complex button configurations in fallback mode
 */
export const LegacyEnhancedCustomButton: React.FC<LegacyButtonProps> = ({
  button,
  active,
  cardTheme,
  className = '',
  onClick
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);
  const [isAnimating, setIsAnimating] = useState(false);

  // Enhanced visibility logic with animations
  useEffect(() => {
    if (active && startTime === null && button.timing) {
      setStartTime(Date.now());
    } else if (!active) {
      setStartTime(null);
      setIsVisible(false);
      setIsAnimating(false);
    }
  }, [active, startTime, button.timing]);

  useEffect(() => {
    if (!active || startTime === null || !button.timing) return;

    const checkVisibility = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed >= button.timing!.visibleFrom && !isVisible) {
        setIsVisible(true);
        setIsAnimating(true);
        
        // Stop animation after duration
        setTimeout(() => setIsAnimating(false), 
          (button.animation?.duration || 0.5) * 1000);
      }
    };

    const interval = setInterval(checkVisibility, 100);
    return () => clearInterval(interval);
  }, [active, startTime, button.timing?.visibleFrom, isVisible, button.animation?.duration]);

  const handleClick = () => {
    if (onClick) {
      onClick();
      return;
    }

    // Enhanced action handling with validation
    if (button.action) {
      const { type, target } = button.action;
      
      switch (type) {
        case 'external-url':
          if (target) window.open(target, '_blank', 'noopener,noreferrer');
          break;
        case 'chapter':
          if (target) window.location.href = `/before/story/${target}`;
          break;
        case 'sub-chapter':
          if (target) window.location.href = `/before/story/${target}`;
          break;
        case 'wallet':
          window.location.href = '/memory-wallet';
          break;
        case 'ar-item':
          if (target) window.location.href = `/before/ar/${target}`;
          break;
        default:
          console.warn('Unknown action type in legacy mode:', type);
      }
    } else if (button.link) {
      // Fallback to legacy link handling
      LegacyCustomButton({ button, active, cardTheme, className, onClick: undefined }).props.onClick?.();
    }
  };

  if (button.timing && !isVisible) return null;

  // Enhanced styling with animations
  const getAnimationStyle = (): React.CSSProperties => {
    if (!isAnimating || !button.animation) return {};

    const { type, duration = 0.5, easing = 'ease-out' } = button.animation;
    
    const animations: Record<string, React.CSSProperties> = {
      fadeIn: {
        animation: `fadeIn ${duration}s ${easing}`,
      },
      slideUp: {
        animation: `slideUp ${duration}s ${easing}`,
      },
      slideDown: {
        animation: `slideDown ${duration}s ${easing}`,
      },
      slideLeft: {
        animation: `slideLeft ${duration}s ${easing}`,
      },
      slideRight: {
        animation: `slideRight ${duration}s ${easing}`,
      },
      bounce: {
        animation: `bounce ${duration}s ${easing}`,
      },
      scale: {
        animation: `scale ${duration}s ${easing}`,
      }
    };

    return animations[type] || {};
  };

  const style: React.CSSProperties = {
    position: button.position ? 'absolute' : 'relative',
    left: button.position ? `${button.position.x}${button.position.unit}` : 'auto',
    top: button.position ? `${button.position.y}${button.position.unit}` : 'auto',
    backgroundColor: button.styling?.backgroundColor || cardTheme?.cta || '#3B82F6',
    color: button.styling?.textColor || '#FFFFFF',
    padding: button.styling?.padding || '12px 24px',
    borderRadius: button.styling?.borderRadius || '8px',
    border: button.styling?.border || 'none',
    cursor: 'pointer',
    fontWeight: '600',
    fontSize: button.styling?.fontSize || '14px',
    boxShadow: button.styling?.boxShadow || '0 2px 8px rgba(0,0,0,0.2)',
    transition: 'all 0.2s ease',
    outline: 'none',
    zIndex: 10,
    opacity: isVisible ? 1 : 0,
    ...getAnimationStyle()
  };

  // Icon rendering for enhanced buttons
  const renderIcon = () => {
    if (!button.icon) return null;
    
    // Simple icon implementation for legacy fallback
    const iconMap: Record<string, string> = {
      'arrow-right': '→',
      'play': '▶',
      'ar': '📱',
      'gift': '🎁',
      'wallet': '💼',
      'external': '↗',
      'lock': '🔒'
    };

    return (
      <span style={{ marginRight: '8px' }}>
        {iconMap[button.icon] || button.icon}
      </span>
    );
  };

  return (
    <>
      <style>
        {`
          @keyframes fadeIn {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from { transform: translateY(20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes slideDown {
            from { transform: translateY(-20px); opacity: 0; }
            to { transform: translateY(0); opacity: 1; }
          }
          @keyframes slideLeft {
            from { transform: translateX(20px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes slideRight {
            from { transform: translateX(-20px); opacity: 0; }
            to { transform: translateX(0); opacity: 1; }
          }
          @keyframes bounce {
            0%, 20%, 50%, 80%, 100% { transform: translateY(0); }
            40% { transform: translateY(-10px); }
            60% { transform: translateY(-5px); }
          }
          @keyframes scale {
            from { transform: scale(0.8); opacity: 0; }
            to { transform: scale(1); opacity: 1; }
          }
        `}
      </style>
      <button
        className={`legacy-enhanced-custom-button ${className}`}
        style={style}
        onClick={handleClick}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = 'scale(1.05)';
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = 'scale(1)';
        }}
        onFocus={(e) => {
          e.currentTarget.style.outline = '2px solid rgba(59, 130, 246, 0.5)';
          e.currentTarget.style.outlineOffset = '2px';
        }}
        onBlur={(e) => {
          e.currentTarget.style.outline = 'none';
        }}
      >
        {renderIcon()}
        {button.label || button.text || 'Button'}
      </button>
    </>
  );
};

/**
 * Button fallback selector - chooses appropriate legacy component
 */
export const ButtonFallback: React.FC<LegacyButtonProps> = (props) => {
  const { button } = props;
  
  // Use enhanced version if button has advanced features
  const needsEnhanced = !!(
    button.animation ||
    button.icon ||
    button.variant ||
    button.styling?.border ||
    button.action
  );

  return needsEnhanced 
    ? <LegacyEnhancedCustomButton {...props} />
    : <LegacyCustomButton {...props} />;
};

export default ButtonFallback;