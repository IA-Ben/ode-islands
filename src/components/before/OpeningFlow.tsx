"use client";

import { useState, useEffect } from "react";
import OpeningAnimation from "./OpeningAnimation";
import IntroVideoHero from "./IntroVideoHero";

interface OpeningFlowConfig {
  animation: {
    type: "video" | "lottie" | "image-sequence";
    assetUrl: string;
    durationCapSec?: number;
    skippable: boolean;
    caption?: string;
  };
  introHero: {
    videoUrl: string;
    posterImage: string;
    loop: boolean;
    muteDefault: boolean;
    captionsVTT?: string;
    title: string;
    subTitle?: string;
    ctaPrimary: {
      label: string;
      deeplink: string;
    };
    ctaSecondary?: {
      label: string;
      deeplink: string;
    };
    fallbackImage?: string;
    reduceMotionFallback: "posterImage" | "stillFrame";
    showOnStages: string[];
  };
}

interface OpeningFlowProps {
  config: OpeningFlowConfig;
  currentStage: string;
  onComplete: () => void;
  onNavigate: (deeplink: string) => void;
}

type FlowState = "animation" | "hero" | "complete";

export default function OpeningFlow({
  config,
  currentStage,
  onComplete,
  onNavigate
}: OpeningFlowProps) {
  const [flowState, setFlowState] = useState<FlowState>("animation");
  const [hasSeenOpening, setHasSeenOpening] = useState(false);
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false);

  // Check if user prefers reduced motion
  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    setPrefersReducedMotion(mediaQuery.matches);

    const handleChange = (e: MediaQueryListEvent) => {
      setPrefersReducedMotion(e.matches);
    };

    mediaQuery.addEventListener("change", handleChange);
    return () => mediaQuery.removeEventListener("change", handleChange);
  }, []);

  // Check session storage for seen status
  useEffect(() => {
    const sessionKey = "odeislands_opening_seen";
    const seen = sessionStorage.getItem(sessionKey);
    
    if (seen === "true") {
      setHasSeenOpening(true);
      setFlowState("complete");
      onComplete();
    }
  }, [onComplete]);

  // Handle reduced motion - skip animation in useEffect
  useEffect(() => {
    if (prefersReducedMotion && flowState === "animation") {
      // Skip both animation and hero, go straight to completion
      handleFlowComplete();
    }
  }, [prefersReducedMotion, flowState]);

  // Check if intro hero should be shown for this stage
  const shouldShowIntroHero = config.introHero.showOnStages.includes(currentStage);

  const handleAnimationComplete = () => {
    // Skip intro hero and go straight to completion
    handleFlowComplete();
  };

  const handleHeroDismiss = () => {
    handleFlowComplete();
  };

  const handleFlowComplete = () => {
    const sessionKey = "odeislands_opening_seen";
    sessionStorage.setItem(sessionKey, "true");
    setHasSeenOpening(true);
    setFlowState("complete");
    onComplete();
  };

  // If already seen or shouldn't show, don't render
  if (hasSeenOpening || flowState === "complete") {
    return null;
  }

  return (
    <>
      {flowState === "animation" && (
        <OpeningAnimation
          type={config.animation.type}
          assetUrl={config.animation.assetUrl}
          durationCapSec={config.animation.durationCapSec}
          skippable={config.animation.skippable}
          caption={config.animation.caption}
          onComplete={handleAnimationComplete}
        />
      )}
    </>
  );
}

// Helper function to clear opening seen status (for debugging or replay feature)
export function clearOpeningSeen() {
  sessionStorage.removeItem("odeislands_opening_seen");
}
