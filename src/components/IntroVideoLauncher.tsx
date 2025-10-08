'use client';

import { useState, useEffect } from 'react';
import IntroVideoHero from './before/IntroVideoHero';
import { useRouter } from 'next/navigation';

interface HeroContent {
  id: string;
  name: string;
  type: string;
  title: string;
  subtitle?: string;
  videoMedia?: {
    fileUrl: string;
  };
  imageMedia?: {
    fileUrl: string;
  };
  ctaPrimary?: {
    label: string;
    action: 'story' | 'app' | 'url';
    target?: string;
  };
  ctaSecondary?: {
    label: string;
    action: 'story' | 'app' | 'url';
    target?: string;
  };
  settings?: {
    loop?: boolean;
    muted?: boolean;
    showOnLaunch?: boolean;
  };
}

interface IntroVideoLauncherProps {
  onComplete?: () => void;
}

export default function IntroVideoLauncher({ onComplete }: IntroVideoLauncherProps) {
  const [introContent, setIntroContent] = useState<HeroContent | null>(null);
  const [showIntro, setShowIntro] = useState(false);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetchIntroVideo();
  }, []);

  const fetchIntroVideo = async () => {
    try {
      setLoading(true);
      const response = await fetch('/api/hero-content/intro');
      if (response.ok) {
        const data = await response.json();
        if (data.content && data.content.settings?.showOnLaunch) {
          // Check if user has seen this intro before (using localStorage)
          const seenKey = `intro_seen_${data.content.id}`;
          const hasSeen = localStorage.getItem(seenKey);

          if (!hasSeen) {
            setIntroContent(data.content);
            setShowIntro(true);
          }
        }
      }
    } catch (error) {
      console.error('Error fetching intro video:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleDismiss = () => {
    if (introContent) {
      // Mark as seen
      localStorage.setItem(`intro_seen_${introContent.id}`, 'true');
    }
    setShowIntro(false);
    if (onComplete) {
      onComplete();
    }
  };

  const handleNavigate = (deeplink: string) => {
    if (introContent) {
      localStorage.setItem(`intro_seen_${introContent.id}`, 'true');
    }

    // Parse the deeplink
    if (deeplink === 'story' || deeplink.startsWith('/story') || deeplink.startsWith('/before')) {
      router.push('/before');
    } else if (deeplink === 'app' || deeplink.startsWith('/event')) {
      router.push('/event');
    } else if (deeplink.startsWith('http')) {
      window.location.href = deeplink;
    } else {
      router.push(deeplink);
    }
  };

  if (loading || !showIntro || !introContent) {
    return null;
  }

  // Build video URL and poster
  const videoUrl = introContent.videoMedia?.fileUrl || '';
  const posterImage = introContent.imageMedia?.fileUrl || '';

  // Build CTAs
  const primaryCTA = introContent.ctaPrimary || {
    label: 'Explore Story',
    action: 'story' as const,
  };

  const secondaryCTA = introContent.ctaSecondary || {
    label: 'Skip to App',
    action: 'app' as const,
  };

  // Convert action to deeplink
  const getPrimaryDeeplink = () => {
    if (primaryCTA.target) return primaryCTA.target;
    if (primaryCTA.action === 'story') return '/before';
    if (primaryCTA.action === 'app') return '/event';
    return '/';
  };

  const getSecondaryDeeplink = () => {
    if (secondaryCTA.target) return secondaryCTA.target;
    if (secondaryCTA.action === 'story') return '/before';
    if (secondaryCTA.action === 'app') return '/event';
    return '/';
  };

  return (
    <IntroVideoHero
      videoUrl={videoUrl}
      posterImage={posterImage}
      loop={introContent.settings?.loop ?? true}
      muteDefault={introContent.settings?.muted ?? true}
      title={introContent.title}
      subTitle={introContent.subtitle}
      ctaPrimary={{
        label: primaryCTA.label,
        deeplink: getPrimaryDeeplink(),
      }}
      ctaSecondary={
        secondaryCTA.label
          ? {
              label: secondaryCTA.label,
              deeplink: getSecondaryDeeplink(),
            }
          : undefined
      }
      onDismiss={handleDismiss}
      onNavigate={handleNavigate}
    />
  );
}
