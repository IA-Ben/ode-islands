'use client';

import React, { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import type { CardData } from '@/@typings';

import AnimateText from "./AnimateText";
import Player from "./Player";
import PlayCanvasViewer from "./PlayCanvasViewer";
import ARViewer from "./ARViewer";
import CustomButton from "./CustomButton";
import PollCard from "./PollCard";
import QuizCard from "./QuizCard";

interface CardProps {
  data: CardData;
  active: boolean;
}

const cdnUrl = "https://storage.googleapis.com/odeislands";

export const Card: React.FC<CardProps> = ({ data, active }) => {
  const router = useRouter();
  const [anim, setAnim] = useState(false);
  const [playing, setPlaying] = useState(true);
  const [imageLoad, setImageLoad] = useState(false);
  const [imageActive, setImageActive] = useState(false);
  const [playcanvasReady, setPlaycanvasReady] = useState(false);
  const [playcanvasError, setPlaycanvasError] = useState<string | null>(null);
  const [isAROpen, setIsAROpen] = useState(false);
  const { text, cta, video, image, playcanvas, ar, poll, quiz, theme } = data;
  const title = text?.title;
  const subtitle = text?.subtitle;
  const description = text?.description;
  const imageUrl = image?.url ? `${cdnUrl}/img/${image.url}` : "";
  const videoImmersive = video && video?.type === "immersive" ? true : false;
  const textShadow = theme?.shadow ? "0 4px 16px rgba(0,0,0,0.4)" : undefined;

  // Handle poll and quiz cards separately
  if (poll) {
    return (
      <PollCard
        data={poll}
        active={active}
        theme={theme}
      />
    );
  }

  if (quiz) {
    return (
      <QuizCard
        data={quiz}
        active={active}
        theme={theme}
      />
    );
  }

  useEffect(() => {
    // Image
    if (imageLoad && active) {
      setImageActive(true);
    }
    // Text and other animations
    if (active && !anim) {
      setAnim(true);
    }
    // Reset video playing state when card becomes active
    if (active) {
      setPlaying(true);
    }
    
    // Close AR when card becomes inactive
    if (!active && isAROpen) {
      setIsAROpen(false);
    }
  }, [active, anim, imageLoad, isAROpen]);

  return (
    <div
      className="relative w-full overflow-hidden flex-col items-center justify-center text-center h-screen"
      style={{
        backgroundColor: theme?.background || "black",
        height: "100dvh",
        minHeight: "-webkit-fill-available",
      }}
    >
      {/* Media Wrapper */}
      <div className="absolute inset-0 w-full h-full flex items-center justify-center">
        {/* Image */}
        {imageUrl && (
          <Image
            src={imageUrl}
            alt="Background"
            className="absolute w-full h-full object-cover"
            width={image?.width}
            height={image?.height}
            style={{
              opacity: imageActive ? 1 : 0,
              transition: imageActive ? "opacity 0.3s ease" : "none",
            }}
            priority
            onLoad={() => setImageLoad(true)}
          />
        )}
        {/* Video */}
        {video && video.url && (
          <>
            <Player
              video={{
                url: video.url,
                width: video.width,
                height: video.height,
                audio: video.audio,
                audioMuted: video.audioMuted,
              }}
              active={active && playing}
              className={`absolute ${
                videoImmersive && typeof window !== 'undefined' && window.innerWidth > window.innerHeight
                  ? "h-full w-auto"
                  : "w-full h-full object-cover"
              }`}
              muted={!video.audio}
              loop
              style={{
                opacity: playing ? 1 : 0.5,
                transition: "opacity 0.3s ease",
              }}
            />
            {/* Immmersive vid controls */}
            {videoImmersive && (
              <div
                className="absolute inset-0 w-full h-full flex items-center justify-center z-1 cursor-pointer"
                onClick={() => {
                  setPlaying(!playing);
                }}
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
        {/* PlayCanvas */}
        {playcanvas && (
          <PlayCanvasViewer
            playcanvas={playcanvas}
            active={active}
            className="absolute w-full h-full"
            onSceneReady={() => {
              setPlaycanvasReady(true);
            }}
            onUserInteraction={(event) => {
              console.log('PlayCanvas interaction:', event);
            }}
            onError={(error) => {
              setPlaycanvasError(error.message);
              console.error('PlayCanvas error:', error);
            }}
          />
        )}
      </div>

      {theme?.overlay && (
        <div
          className="absolute w-full h-full"
          style={{ background: theme.overlay }}
        />
      )}

      {/* Content */}
      <div
        className="relative flex flex-col items-center justify-center h-full px-6 text-center pb-16 sm:pb-0"
        style={{ mixBlendMode: theme?.mix || undefined }}
      >
        {title && (
          <h1
            className="text-7xl sm:text-[14rem] font-bold text-white mb-4 font-sans"
            style={{
              color: theme?.title || undefined,
              textShadow,
            }}
          >
            <AnimateText active={anim} delay={300}>
              {title}
            </AnimateText>
          </h1>
        )}
        {subtitle && (
          <h2
            className="w-full max-w-4xl text-4xl sm:text-6xl font-bold text-white mb-4 font-sans"
            style={{
              color: theme?.subtitle || undefined,
              textShadow,
            }}
          >
            <AnimateText active={anim} delay={title ? 600 : 300}>
              {subtitle}
            </AnimateText>
          </h2>
        )}
        {description && (
          <p
            className="w-full max-w-4xl text-lg md:text-3xl text-white leading-relaxed font-sans"
            style={{
              color: theme?.description || undefined,
              textShadow,
            }}
          >
            <AnimateText active={anim} delay={title || subtitle ? 900 : 600}>
              {description}
            </AnimateText>
          </p>
        )}
        {/* Action Buttons Container */}
        <div className="flex flex-col items-center space-y-4 mt-6">
          {/* AR Button */}
          {ar && (ar.glbUrl || ar.usdzUrl) && (
            <button
              onClick={() => {
                setPlaying(false); // Pause video when opening AR
                setIsAROpen(true);
              }}
              className={`flex items-center justify-center h-14 px-6 rounded-full cursor-pointer text-base font-semibold ${
                theme?.invert
                  ? "bg-black hover:bg-black/80 text-white"
                  : "bg-white hover:bg-white/80 text-black"
              }`}
              style={{
                backgroundColor: theme?.cta || undefined,
                boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                opacity: 0,
                animation: active ? "animButtonIn 0.6s 0.8s ease forwards" : "none",
              }}
              aria-label="View in AR"
            >
              <svg 
                className="w-5 h-5 mr-2" 
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path 
                  strokeLinecap="round" 
                  strokeLinejoin="round" 
                  strokeWidth={2} 
                  d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9v-9m0-9v9" 
                />
              </svg>
              View in AR
            </button>
          )}

          {/* Regular CTA Button */}
          {cta && (
            <button
              onClick={() => {
                const isExternal = cta.url.startsWith("http://") || cta.url.startsWith("https://");
                if (isExternal) {
                  window.open(cta.url, "_blank", "noopener,noreferrer");
                } else if (cta.url.startsWith("/")) {
                  router.push(cta.url);
                }
              }}
              className={`flex items-center justify-center h-14 px-6 rounded-full cursor-pointer text-base font-semibold ${
                theme?.invert
                  ? "bg-black hover:bg-black/80 text-white"
                  : "bg-white hover:bg-white/80 text-black"
              }`}
              style={{
                backgroundColor: theme?.cta || undefined,
                boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
                opacity: 0,
                animation: active ? `animButtonIn 0.6s ${ar ? '1.2s' : '1s'} ease forwards` : "none",
              }}
              aria-label={cta.title}
            >
              {cta.title}
            </button>
          )}
        </div>
      </div>

      {/* Custom Buttons */}
      {data.customButtons?.map((button) => (
        <CustomButton
          key={button.id}
          button={button}
          active={active}
          cardTheme={theme}
        />
      ))}

      {/* AR Viewer Modal */}
      {ar && (ar.glbUrl || ar.usdzUrl) && (
        <ARViewer 
          ar={ar}
          isOpen={isAROpen}
          onClose={() => {
            setIsAROpen(false);
            if (active) {
              setPlaying(true); // Resume video when closing AR
            }
          }}
          onVideoStateChange={setPlaying}
        />
      )}
    </div>
  );
};

export default Card;
