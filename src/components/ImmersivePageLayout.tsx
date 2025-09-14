'use client';

import React, { useEffect, useState, ReactNode } from "react";
import Image from "next/image";
import { useTheme } from '@/contexts/ThemeContext';
import AnimateText from "./AnimateText";
import Player from "./Player";

export interface ImmersiveTheme {
  // Background configuration
  background?: string;
  
  // Media configuration
  image?: {
    url: string;
    width: number;
    height: number;
  };
  video?: {
    type?: 'background' | 'immersive';
    url: string;
    width: number;
    height: number;
    audio?: boolean;
    audioMuted?: boolean;
  };
  
  // Overlay and blend modes
  overlay?: string;
  mix?: string;
  
  // Typography colors
  title?: string;
  subtitle?: string;
  description?: string;
  
  // Visual effects
  shadow?: boolean;
  invert?: boolean;
}

interface ImmersivePageLayoutProps {
  children: ReactNode;
  
  // Content configuration
  title?: string;
  subtitle?: string;
  description?: string;
  
  // Theme and styling
  theme?: ImmersiveTheme;
  className?: string;
  
  // Layout options
  centerContent?: boolean;
  showHeader?: boolean;
  headerContent?: ReactNode;
  showFooter?: boolean;
  footerContent?: ReactNode;
  
  // Animation control
  animateIn?: boolean;
  animationDelay?: number;
  
  // Background interaction
  onBackgroundClick?: () => void;
}

const cdnUrl = "https://storage.googleapis.com/odeislands";

export const ImmersivePageLayout: React.FC<ImmersivePageLayoutProps> = ({
  children,
  title,
  subtitle,
  description,
  theme = {},
  className = '',
  centerContent = true,
  showHeader = false,
  headerContent,
  showFooter = false,
  footerContent,
  animateIn = true,
  animationDelay = 300,
  onBackgroundClick
}) => {
  const { theme: appTheme } = useTheme();
  const [anim, setAnim] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [imageLoad, setImageLoad] = useState(false);
  const [imageActive, setImageActive] = useState(false);
  
  const imageUrl = theme.image?.url ? `${cdnUrl}/img/${theme.image.url}` : "";
  const videoImmersive = theme.video && theme.video?.type === "immersive" ? true : false;
  const textShadow = theme?.shadow ? "0 4px 16px rgba(0,0,0,0.4)" : undefined;

  useEffect(() => {
    // Image animation
    if (imageLoad && animateIn) {
      setImageActive(true);
    }
    
    // Text and other animations
    if (animateIn && !anim) {
      setAnim(true);
    }
  }, [animateIn, anim, imageLoad]);

  return (
    <div
      className={`relative w-full overflow-y-auto overflow-x-hidden flex-col items-center justify-center text-center ${className}`}
      style={{
        backgroundColor: theme?.background || appTheme.colors.background,
        minHeight: "100dvh"
      }}
      onClick={onBackgroundClick}
    >
      {/* Media Background - Fixed positioning for scrollable content */}
      <div className="fixed inset-0 w-full h-screen flex items-center justify-center z-0">
        {/* Background Image */}
        {imageUrl && (
          <Image
            src={imageUrl}
            alt="Background"
            className="absolute w-full h-full object-cover"
            width={theme.image?.width || 1920}
            height={theme.image?.height || 1080}
            style={{
              opacity: imageActive ? 1 : 0,
              transition: imageActive ? "opacity 0.3s ease" : "none",
            }}
            priority
            onLoad={() => setImageLoad(true)}
          />
        )}
        
        {/* Background Video */}
        {theme.video && theme.video.url && (
          <>
            <Player
              video={{
                url: theme.video.url,
                width: theme.video.width,
                height: theme.video.height,
                audio: theme.video.audio,
                audioMuted: theme.video.audioMuted,
              }}
              active={playing}
              className={`absolute ${
                videoImmersive && typeof window !== 'undefined' && window.innerWidth > window.innerHeight
                  ? "h-full w-auto"
                  : "w-full h-full object-cover"
              }`}
              muted={!theme.video.audio}
              loop
              style={{
                opacity: playing ? 1 : 0.5,
                transition: "opacity 0.3s ease",
              }}
            />
            
            {/* Video Controls for Immersive Videos */}
            {videoImmersive && (
              <div
                className="absolute inset-0 w-full h-full flex items-center justify-center z-10 cursor-pointer"
                onClick={() => setPlaying(!playing)}
              >
                <button
                  className="absolute flex items-center justify-center w-20 h-20 rounded-full bg-white/10 hover:bg-white/20 cursor-pointer"
                  aria-label="Play"
                  title="Play"
                  style={{
                    opacity: playing ? 0 : 1,
                    transition: "opacity 0.15s ease",
                  }}
                >
                  <svg
                    xmlns="http://www.w3.org/2000/svg"
                    width="100%"
                    height="100%"
                    viewBox="0 0 28 28"
                    fill="none"
                    style={{ display: "block" }}
                  >
                    <polygon points="11,9 21,14 11,19" fill="white" />
                  </svg>
                </button>
              </div>
            )}
          </>
        )}
      </div>

      {/* Theme Overlay */}
      {theme?.overlay && (
        <div
          className="fixed inset-0 w-full h-screen z-0"
          style={{ background: theme.overlay }}
        />
      )}

      {/* Header - Fixed positioning for scrollable content */}
      {showHeader && (
        <div className="fixed top-0 left-0 right-0 z-30 p-6 bg-gradient-to-b from-black/20 to-transparent backdrop-blur-sm">
          <div className="flex items-center justify-between">
            {headerContent || (
              <div className="text-left">
                <div className="text-white/80 text-sm font-medium">
                  {new Date().toLocaleDateString()}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Main Content */}
      <div
        className={`relative flex flex-col px-6 text-center pb-16 sm:pb-0 z-10 ${
          centerContent ? 'items-center justify-center min-h-screen' : 'items-start justify-start pt-20'
        }`}
        style={{ mixBlendMode: theme?.mix as React.CSSProperties['mixBlendMode'] || undefined }}
      >
        {/* Typography Section */}
        {(title || subtitle || description) && (
          <div className="mb-8">
            {title && (
              <h1
                className="text-5xl sm:text-7xl md:text-[8rem] font-bold text-white mb-6 font-sans leading-tight"
                style={{
                  color: theme?.title || appTheme.colors.textPrimary,
                  textShadow,
                }}
              >
                <AnimateText active={anim} delay={animationDelay}>
                  {title}
                </AnimateText>
              </h1>
            )}
            
            {subtitle && (
              <h2
                className="w-full max-w-4xl text-3xl sm:text-5xl md:text-6xl font-bold text-white mb-6 font-sans leading-tight"
                style={{
                  color: theme?.subtitle || appTheme.colors.textSecondary,
                  textShadow,
                }}
              >
                <AnimateText active={anim} delay={title ? animationDelay + 600 : animationDelay}>
                  {subtitle}
                </AnimateText>
              </h2>
            )}
            
            {description && (
              <p
                className="w-full max-w-4xl text-lg md:text-2xl lg:text-3xl text-white leading-relaxed font-sans"
                style={{
                  color: theme?.description || appTheme.colors.textMuted,
                  textShadow,
                }}
              >
                <AnimateText active={anim} delay={title || subtitle ? animationDelay + 900 : animationDelay + 600}>
                  {description}
                </AnimateText>
              </p>
            )}
          </div>
        )}

        {/* Main Content Area */}
        <div className="w-full max-w-7xl mx-auto">
          {children}
        </div>
      </div>

      {/* Footer - Fixed positioning for scrollable content */}
      {showFooter && (
        <div className="fixed bottom-0 left-0 right-0 z-30 p-6 bg-gradient-to-t from-black/20 to-transparent backdrop-blur-sm">
          <div className="flex items-center justify-center">
            {footerContent || (
              <div className="text-center">
                <div className="text-white/60 text-sm">
                  Powered by Ode Islands
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default ImmersivePageLayout;