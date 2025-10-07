"use client";

import { useState, useEffect, useRef } from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

interface FeatureReelItem {
  type: "chapter" | "teaser" | "ar" | "drop";
  cardId: string;
  headline?: string;
  subcopy?: string;
  badge?: string;
  imageUrl?: string;
}

interface FeatureReelProps {
  items: FeatureReelItem[];
  autoScroll?: boolean;
  autoScrollInterval?: number;
  onItemClick: (item: FeatureReelItem) => void;
}

export default function FeatureReel({
  items,
  autoScroll = true,
  autoScrollInterval = 5000,
  onItemClick
}: FeatureReelProps) {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isHovered, setIsHovered] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!autoScroll || isHovered || items.length <= 1) return;

    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % items.length);
    }, autoScrollInterval);

    return () => clearInterval(interval);
  }, [autoScroll, autoScrollInterval, items.length, isHovered]);

  const goToPrevious = () => {
    setCurrentIndex((prev) => (prev - 1 + items.length) % items.length);
  };

  const goToNext = () => {
    setCurrentIndex((prev) => (prev + 1) % items.length);
  };

  const goToIndex = (index: number) => {
    setCurrentIndex(index);
  };

  if (items.length === 0) return null;

  return (
    <div
      className="relative w-full group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      {/* Feature Cards Container */}
      <div
        ref={containerRef}
        className="relative h-[400px] md:h-[500px] overflow-hidden rounded-3xl"
      >
        {items.map((item, index) => (
          <div
            key={item.cardId}
            className={`absolute inset-0 transition-all duration-700 ${
              index === currentIndex
                ? "opacity-100 translate-x-0"
                : index < currentIndex
                ? "opacity-0 -translate-x-full"
                : "opacity-0 translate-x-full"
            }`}
          >
            <div
              className="relative w-full h-full cursor-pointer group"
              onClick={() => onItemClick(item)}
            >
              {/* Background Image */}
              {item.imageUrl && (
                <>
                  <img
                    src={item.imageUrl}
                    alt={item.headline || "Feature"}
                    className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                  />
                  <div className="absolute inset-0 bg-gradient-to-t from-black via-black/40 to-transparent" />
                </>
              )}

              {/* Content */}
              <div className="absolute bottom-0 left-0 right-0 p-8 md:p-12">
                {/* Badge */}
                {item.badge && (
                  <div className="mb-4">
                    <span className="inline-block px-4 py-2 rounded-full bg-fuchsia-600 text-white text-sm font-bold uppercase tracking-wide">
                      {item.badge}
                    </span>
                  </div>
                )}

                {/* Headline */}
                {item.headline && (
                  <h3 className="text-3xl md:text-5xl font-bold text-white mb-4 drop-shadow-2xl">
                    {item.headline}
                  </h3>
                )}

                {/* Subcopy */}
                {item.subcopy && (
                  <p className="text-lg md:text-xl text-white/90 mb-6 max-w-2xl drop-shadow-xl">
                    {item.subcopy}
                  </p>
                )}

                {/* CTA Hint */}
                <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/10 backdrop-blur-sm border border-white/20 text-white font-medium group-hover:bg-white/20 transition-all">
                  <span>Explore</span>
                  <ChevronRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Navigation Arrows */}
      {items.length > 1 && (
        <>
          <button
            onClick={goToPrevious}
            className="absolute left-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm border border-white/20 text-white transition-all duration-300 opacity-0 group-hover:opacity-100"
            aria-label="Previous feature"
          >
            <ChevronLeft className="w-6 h-6" />
          </button>
          <button
            onClick={goToNext}
            className="absolute right-4 top-1/2 -translate-y-1/2 p-3 rounded-full bg-black/50 hover:bg-black/70 backdrop-blur-sm border border-white/20 text-white transition-all duration-300 opacity-0 group-hover:opacity-100"
            aria-label="Next feature"
          >
            <ChevronRight className="w-6 h-6" />
          </button>
        </>
      )}

      {/* Dots Indicator */}
      {items.length > 1 && (
        <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex items-center gap-2">
          {items.map((_, index) => (
            <button
              key={index}
              onClick={() => goToIndex(index)}
              className={`transition-all duration-300 rounded-full ${
                index === currentIndex
                  ? "w-8 h-2 bg-fuchsia-500"
                  : "w-2 h-2 bg-white/40 hover:bg-white/60"
              }`}
              aria-label={`Go to feature ${index + 1}`}
            />
          ))}
        </div>
      )}
    </div>
  );
}
