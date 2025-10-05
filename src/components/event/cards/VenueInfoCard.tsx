"use client";

import { Info, Shield, Accessibility, Phone, ChevronRight } from "lucide-react";
import { EventCard } from "./EventCard";

export interface VenueInfoCardProps {
  sections: ("houseRules" | "accessibility" | "contacts")[];
  title?: string;
  subtitle?: string;
  image?: string;
  size?: "S" | "M" | "L";
  onSectionClick?: (section: string) => void;
  analyticsTag?: string;
}

export function VenueInfoCard({
  sections,
  title = "Venue Information",
  subtitle = "Know Before You Go",
  image,
  size = "M",
  onSectionClick,
  analyticsTag,
}: VenueInfoCardProps) {
  const sectionConfig = {
    houseRules: {
      icon: Shield,
      label: "House Rules",
      description: "Guidelines & policies",
    },
    accessibility: {
      icon: Accessibility,
      label: "Accessibility",
      description: "Access & facilities",
    },
    contacts: {
      icon: Phone,
      label: "Contacts",
      description: "Get help & support",
    },
  };

  return (
    <EventCard
      title={title}
      subtitle={subtitle}
      image={image}
      size={size}
      icon={<Info className="w-6 h-6" />}
      analyticsTag={analyticsTag || "venue-info-card"}
      theme="blue"
    >
      <div className="space-y-2">
        {sections.map((section) => {
          const config = sectionConfig[section];
          const SectionIcon = config.icon;

          return (
            <button
              key={section}
              onClick={() => onSectionClick?.(section)}
              className="w-full flex items-center gap-3 p-3 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 hover:border-blue-500/30 transition-all duration-200 text-left group"
            >
              <div className="w-10 h-10 rounded-lg bg-blue-500/20 flex items-center justify-center flex-shrink-0">
                <SectionIcon className="w-5 h-5 text-blue-400" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold text-white">
                  {config.label}
                </div>
                <div className="text-xs text-slate-400">
                  {config.description}
                </div>
              </div>

              <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-1 transition-all" />
            </button>
          );
        })}
      </div>
    </EventCard>
  );
}
