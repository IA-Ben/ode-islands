import React from "react";
import type { CardData } from '@/@typings';

interface FooterProps {
  index: number;
  currentCard: CardData;
  totalCards: number;
  interacted: boolean;
  onFirst: () => void;
  onNext: () => void;
}

export const Footer: React.FC<FooterProps> = ({
  index,
  currentCard,
  totalCards,
  interacted,
  onFirst,
  onNext,
}) => {
  const isLast = index >= totalCards - 1;
  const progress = index / (totalCards - 1);
  const circumference = 2 * Math.PI * 18;
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - progress * circumference;

  const invert = currentCard?.theme?.invert ?? false;
  const cta = currentCard?.ctaStart || "Start Chapter";

  return (
    <footer className="fixed bottom-0 left-0 right-0 flex items-center justify-center h-28 px-6 z-1">
      {/* Start */}
      {!interacted && (
        <button
          onClick={onNext}
          className={`absolute flex items-center justify-center h-14 px-6 rounded-full cursor-pointer text-base font-semibold ${
            invert
              ? "bg-black hover:bg-black/80 text-white"
              : "bg-white hover:bg-white/80 text-black"
          }`}
          style={{
            backgroundColor: currentCard?.theme?.ctaStart || undefined,
            boxShadow: "0 4px 16px rgba(0,0,0,0.4)",
            opacity: 0,
            animation: "animButtonIn 0.6s 1s ease forwards",
          }}
          aria-label="Start"
        >
          {cta}
        </button>
      )}

      {/* Next */}
      {interacted && (
        <button
          onClick={isLast ? onFirst : onNext}
          className={`absolute flex items-center justify-center w-12 h-12 rounded-full cursor-pointer ${
            invert
              ? "bg-black/10 hover:bg-black/20"
              : "bg-white/10 hover:bg-white/20"
          }`}
          aria-label="Next or First Card"
        >
          {/* Progress */}
          <svg
            className="absolute inset-0 w-12 h-12 transform -rotate-90"
            viewBox="0 0 40 40"
          >
            <circle
              cx="20"
              cy="20"
              r="18"
              fill="none"
              stroke={invert ? "#000" : "#fff"}
              strokeWidth="2"
              strokeDasharray={strokeDasharray}
              strokeDashoffset={strokeDashoffset}
              strokeLinecap="round"
              style={{
                transition: "stroke-dashoffset 0.3s ease",
              }}
            />
          </svg>

          {/* Arrow Icon */}
          <svg
            className={`w-6 h-6 transform group-hover:scale-110 transition-transform duration-200 relative ${
              invert ? "text-black" : "text-white"
            }`}
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
            style={{
              transform: isLast ? "rotate(180deg)" : "none",
              transition: "transform 0.15s ease",
            }}
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M19 9l-7 7-7-7"
            />
          </svg>
        </button>
      )}
    </footer>
  );
};

export default Footer;
