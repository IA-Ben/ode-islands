import { useEffect, useRef } from "react";
import Hls from "hls.js";

interface PlayerProps extends React.VideoHTMLAttributes<HTMLVideoElement> {
  video: {
    url: string;
    width: number;
    height: number;
    audio?: boolean;
    audioMuted?: boolean;
    controls?: boolean;
  };
  active?: boolean;
  className?: string;
  onEnd?: () => void;
}

const Player: React.FC<PlayerProps> = ({ video, active, onEnd, ...props }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const videoUrlRef = useRef<string>("");
  const cdnUrl = "https://storage.googleapis.com/odeislands";
  
  // Handle both full URLs and identifiers
  let videoUrl: string | null = null;
  if (video?.url) {
    if (video.url.startsWith('http')) {
      // It's already a full URL, just add /master.m3u8
      videoUrl = `${video.url}/master.m3u8`;
    } else {
      // It's an identifier, construct the full URL
      videoUrl = `${cdnUrl}/vid/${video.url}/master.m3u8`;
    }
  }
  
  // const posterUrl = videoUrl?.replace("/master.m3u8", "/poster.jpg") || "";

  // Load HLS video once when url updates
  useEffect(() => {
    if (!active || videoUrl === videoUrlRef.current) return;
    videoUrlRef.current = videoUrl || "";
    const videoEl = videoRef.current;
    if (!videoEl || !videoUrl) return;
    
    // Clear any existing source first
    videoEl.src = "";
    
    if (videoEl.canPlayType("application/vnd.apple.mpegurl")) {
      // Native HLS support (Safari)
      videoEl.src = videoUrl;
    } else if (Hls.isSupported()) {
      const hls = new Hls();
      hls.loadSource(videoUrl);
      hls.attachMedia(videoEl);
      hls.on(Hls.Events.ERROR, (_, data) => {
        console.error("HLS error", data);
      });
      
      // Cleanup function to destroy HLS instance
      return () => {
        hls.destroy();
      };
    } else {
      console.error("HLS not supported in this browser");
    }
  }, [videoUrl, active]);

  // Play or pause video based on playing prop
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    // Only attempt to play/pause if the video has a source loaded
    if (!videoEl.src) return;
    if (active) {
      // Wait for the video to be ready before playing
      const playPromise = videoEl.play();
      if (playPromise !== undefined) {
        playPromise.catch((err: Error) => {
          if (err.name !== "AbortError") {
            console.error("Error playing video:", err);
          }
        });
      }
    } else {
      videoEl.pause();
    }
  }, [active, video?.url]);

  // On video end, trigger onEnd callback
  useEffect(() => {
    const videoEl = videoRef.current;
    if (!videoEl) return;
    const handleEnded = () => {
      if (!active) return;
      if (onEnd) {
        onEnd();
      }
      // videoEl.currentTime = 0;
      // videoEl.pause();
    };
    videoEl.addEventListener("ended", handleEnded);
    return () => {
      videoEl.removeEventListener("ended", handleEnded);
    };
  }, [active, onEnd]);

  return (
    <video
      ref={videoRef}
      // poster={posterUrl}
      playsInline
      muted={video?.audioMuted || !video?.audio}
      width={video?.width}
      height={video?.height}
      {...props}
    />
  );
};

export default Player;
