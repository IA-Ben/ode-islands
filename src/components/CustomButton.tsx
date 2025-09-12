'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';

interface CustomButtonProps {
  button: {
    id: string
    text: string
    position: {
      x: number
      y: number
      unit: 'percent' | 'px'
    }
    timing: {
      visibleFrom: number
      animationDelay?: number
    }
    animation?: {
      type: 'fadeIn' | 'slideUp' | 'slideDown' | 'slideLeft' | 'slideRight' | 'bounce' | 'scale'
      duration?: number
      easing?: string
    }
    link: {
      type: 'iframe' | 'external' | 'chapter' | 'subchapter'
      url?: string
      target?: string
      iframeConfig?: {
        width?: number
        height?: number
        allowFullscreen?: boolean
      }
    }
    styling?: {
      backgroundColor?: string
      textColor?: string
      borderColor?: string
      borderRadius?: string
      fontSize?: string
      padding?: string
      opacity?: number
    }
  }
  active: boolean
  cardTheme?: {
    invert?: boolean
    cta?: string
  }
}

export const CustomButton: React.FC<CustomButtonProps> = ({ button, active, cardTheme }) => {
  const router = useRouter();
  const [isVisible, setIsVisible] = useState(false);
  const [startTime, setStartTime] = useState<number | null>(null);

  // Start timer when card becomes active
  useEffect(() => {
    if (active && startTime === null) {
      setStartTime(Date.now());
    } else if (!active) {
      setStartTime(null);
      setIsVisible(false);
    }
  }, [active, startTime]);

  // Check visibility based on timing
  useEffect(() => {
    if (!active || startTime === null) return;

    const checkVisibility = () => {
      const elapsed = (Date.now() - startTime) / 1000;
      if (elapsed >= button.timing.visibleFrom && !isVisible) {
        setIsVisible(true);
      }
    };

    const interval = setInterval(checkVisibility, 100);
    return () => clearInterval(interval);
  }, [active, startTime, button.timing.visibleFrom, isVisible]);

  const handleClick = () => {
    const { link } = button;
    
    switch (link.type) {
      case 'external':
        if (link.url) {
          window.open(link.url, '_blank');
        }
        break;
      case 'chapter':
        if (link.target) {
          router.push(`/${link.target}`);
        }
        break;
      case 'subchapter':
        if (link.target) {
          router.push(`/${link.target}`);
        }
        break;
      case 'iframe':
        if (link.url) {
          // Create a modal with iframe
          const modal = document.createElement('div');
          modal.style.cssText = `
            position: fixed;
            top: 0;
            left: 0;
            width: 100%;
            height: 100%;
            background: rgba(0, 0, 0, 0.8);
            z-index: 9999;
            display: flex;
            align-items: center;
            justify-content: center;
          `;
          
          const iframe = document.createElement('iframe');
          iframe.src = link.url;
          iframe.style.cssText = `
            width: ${link.iframeConfig?.width || 800}px;
            height: ${link.iframeConfig?.height || 600}px;
            border: none;
            border-radius: 8px;
            max-width: 90vw;
            max-height: 90vh;
          `;
          
          if (link.iframeConfig?.allowFullscreen) {
            iframe.allowFullscreen = true;
          }
          
          const closeButton = document.createElement('button');
          closeButton.innerHTML = '✕';
          closeButton.style.cssText = `
            position: absolute;
            top: 20px;
            right: 20px;
            background: white;
            border: none;
            border-radius: 50%;
            width: 40px;
            height: 40px;
            font-size: 18px;
            cursor: pointer;
            z-index: 10000;
          `;
          
          closeButton.onclick = () => document.body.removeChild(modal);
          modal.onclick = (e) => {
            if (e.target === modal) document.body.removeChild(modal);
          };
          
          modal.appendChild(iframe);
          modal.appendChild(closeButton);
          document.body.appendChild(modal);
        }
        break;
    }
  };

  if (!isVisible) return null;

  // Generate animation CSS
  const getAnimationCSS = () => {
    const { animation } = button;
    if (!animation) return {};

    const duration = animation.duration || 0.6;
    const delay = button.timing.animationDelay || 0;
    const easing = animation.easing || 'ease';

    let animationName = '';
    switch (animation.type) {
      case 'fadeIn':
        animationName = 'fadeIn';
        break;
      case 'slideUp':
        animationName = 'slideInUp';
        break;
      case 'slideDown':
        animationName = 'slideInDown';
        break;
      case 'slideLeft':
        animationName = 'slideInLeft';
        break;
      case 'slideRight':
        animationName = 'slideInRight';
        break;
      case 'bounce':
        animationName = 'bounceIn';
        break;
      case 'scale':
        animationName = 'scaleIn';
        break;
      default:
        animationName = 'fadeIn';
    }

    return {
      opacity: 0,
      animation: `${animationName} ${duration}s ${delay}s ${easing} forwards`
    };
  };

  // Position styles
  const positionStyles = {
    position: 'absolute' as const,
    left: button.position.unit === 'percent' ? `${button.position.x}%` : `${button.position.x}px`,
    top: button.position.unit === 'percent' ? `${button.position.y}%` : `${button.position.y}px`,
    transform: button.position.unit === 'percent' ? 'translate(-50%, -50%)' : 'none'
  };

  // Default button styles
  const defaultStyles = {
    backgroundColor: button.styling?.backgroundColor || cardTheme?.cta || (cardTheme?.invert ? '#000000' : '#ffffff'),
    color: button.styling?.textColor || (cardTheme?.invert ? '#ffffff' : '#000000'),
    borderColor: button.styling?.borderColor || 'transparent',
    borderRadius: button.styling?.borderRadius || '9999px',
    fontSize: button.styling?.fontSize || '16px',
    padding: button.styling?.padding || '12px 24px',
    opacity: button.styling?.opacity || 1,
    border: `2px solid ${button.styling?.borderColor || 'transparent'}`,
    cursor: 'pointer',
    fontWeight: '600',
    boxShadow: '0 4px 16px rgba(0,0,0,0.4)',
    transition: 'all 0.2s ease',
    zIndex: 100
  };

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
        style={{
          ...positionStyles,
          ...defaultStyles,
          ...getAnimationCSS()
        }}
        onMouseEnter={(e) => {
          e.currentTarget.style.transform = `${positionStyles.transform || ''} scale(1.05)`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.transform = positionStyles.transform || '';
        }}
        aria-label={button.text}
      >
        {button.text}
      </button>
    </>
  );
};

export default CustomButton;