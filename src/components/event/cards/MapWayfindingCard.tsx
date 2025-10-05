"use client";

import { MapPin, Navigation, Map } from "lucide-react";
import { EventCard } from "./EventCard";

export interface MapZone {
  id: string;
  name: string;
  type: "stage" | "food" | "merch" | "restroom" | "entrance" | "other";
}

export interface MapPin {
  id: string;
  label: string;
  zone: string;
}

export interface MapWayfindingCardProps {
  zones: MapZone[];
  pins: MapPin[];
  youAreHere?: {
    zone: string;
    description: string;
  };
  title?: string;
  subtitle?: string;
  image?: string;
  size?: "S" | "M" | "L";
  onClick?: () => void;
  analyticsTag?: string;
}

export function MapWayfindingCard({
  zones,
  pins,
  youAreHere,
  title = "Venue Map",
  subtitle = "Navigate the Venue",
  image,
  size = "M",
  onClick,
  analyticsTag,
}: MapWayfindingCardProps) {
  const zoneTypeIcons = {
    stage: "🎭",
    food: "🍔",
    merch: "🛍️",
    restroom: "🚻",
    entrance: "🚪",
    other: "📍",
  };

  return (
    <EventCard
      title={title}
      subtitle={subtitle}
      image={image}
      size={size}
      icon={<Map className="w-6 h-6" />}
      onClick={onClick}
      analyticsTag={analyticsTag || "map-wayfinding-card"}
      theme="blue"
    >
      {youAreHere && (
        <div className="flex items-center gap-2 p-3 rounded-lg bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/20">
          <Navigation className="w-4 h-4 text-blue-400 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-xs font-semibold text-blue-300">
              You are here
            </div>
            <div className="text-xs text-slate-400">
              {youAreHere.description}
            </div>
          </div>
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {zones.slice(0, 4).map((zone) => (
          <div
            key={zone.id}
            className="flex items-center gap-2 p-2 rounded-lg bg-white/5 border border-white/10"
          >
            <span className="text-lg">{zoneTypeIcons[zone.type]}</span>
            <div className="flex-1 min-w-0">
              <div className="text-xs font-medium text-white truncate">
                {zone.name}
              </div>
            </div>
          </div>
        ))}
      </div>

      {zones.length > 4 && (
        <div className="text-xs text-center text-slate-400">
          + {zones.length - 4} more zones
        </div>
      )}

      <button
        onClick={onClick}
        className="w-full px-4 py-3 rounded-xl bg-gradient-to-br from-blue-600 to-blue-700 text-white font-semibold hover:from-blue-700 hover:to-blue-800 transition-all duration-200 shadow-lg shadow-blue-500/25"
      >
        Open Map
      </button>
    </EventCard>
  );
}
