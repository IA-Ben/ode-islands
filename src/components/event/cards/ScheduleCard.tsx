"use client";

import { Calendar, Clock, Bell, BellOff } from "lucide-react";
import { useState } from "react";
import { EventCard } from "./EventCard";

export interface TimelineEvent {
  id: string;
  title: string;
  time: string;
  endTime?: string;
  isLive?: boolean;
  isNext?: boolean;
}

export interface ScheduleCardProps {
  timeline: TimelineEvent[];
  nowNext?: boolean;
  notify?: boolean;
  title?: string;
  subtitle?: string;
  image?: string;
  size?: "S" | "M" | "L";
  onEventClick?: (event: TimelineEvent) => void;
  onNotifyToggle?: (enabled: boolean) => void;
  analyticsTag?: string;
}

export function ScheduleCard({
  timeline,
  nowNext = true,
  notify = false,
  title = "Schedule",
  subtitle = "Event Timeline",
  image,
  size = "M",
  onEventClick,
  onNotifyToggle,
  analyticsTag,
}: ScheduleCardProps) {
  const [notifyEnabled, setNotifyEnabled] = useState(notify);

  const handleNotifyToggle = () => {
    const newValue = !notifyEnabled;
    setNotifyEnabled(newValue);
    onNotifyToggle?.(newValue);
  };

  const upcomingEvents = nowNext ? timeline.slice(0, 3) : timeline;

  return (
    <EventCard
      title={title}
      subtitle={subtitle}
      image={image}
      size={size}
      icon={<Calendar className="w-6 h-6" />}
      analyticsTag={analyticsTag || "schedule-card"}
      theme="blue"
    >
      <div className="space-y-2">
        {upcomingEvents.map((event) => (
          <button
            key={event.id}
            onClick={() => onEventClick?.(event)}
            className={`w-full flex items-start gap-3 p-3 rounded-lg border transition-all duration-200 text-left ${
              event.isLive
                ? "bg-red-500/10 border-red-500/30 hover:border-red-500/50"
                : event.isNext
                ? "bg-blue-500/10 border-blue-500/30 hover:border-blue-500/50"
                : "bg-white/5 border-white/10 hover:bg-white/10 hover:border-blue-500/30"
            }`}
          >
            <div className={`flex-shrink-0 w-10 h-10 rounded-lg flex items-center justify-center ${
              event.isLive ? "bg-red-500/20" : event.isNext ? "bg-blue-500/20" : "bg-white/10"
            }`}>
              <Clock className={`w-5 h-5 ${
                event.isLive ? "text-red-400" : event.isNext ? "text-blue-400" : "text-slate-400"
              }`} />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2 mb-1">
                {event.isLive && (
                  <span className="flex items-center gap-1 px-2 py-0.5 rounded-full bg-red-500 text-white text-xs font-semibold">
                    <span className="w-1.5 h-1.5 rounded-full bg-white animate-pulse" />
                    LIVE
                  </span>
                )}
                {event.isNext && !event.isLive && (
                  <span className="px-2 py-0.5 rounded-full bg-blue-500 text-white text-xs font-semibold">
                    UP NEXT
                  </span>
                )}
              </div>

              <div className="text-sm font-semibold text-white mb-1">
                {event.title}
              </div>

              <div className="text-xs text-slate-400">
                {event.time}{event.endTime && ` - ${event.endTime}`}
              </div>
            </div>
          </button>
        ))}
      </div>

      {onNotifyToggle && (
        <button
          onClick={handleNotifyToggle}
          className={`w-full flex items-center justify-center gap-2 px-4 py-3 rounded-xl font-semibold transition-all duration-200 ${
            notifyEnabled
              ? "bg-blue-600 text-white hover:bg-blue-700"
              : "bg-white/10 text-white hover:bg-white/15"
          }`}
        >
          {notifyEnabled ? (
            <>
              <Bell className="w-5 h-5" />
              <span>Notifications On</span>
            </>
          ) : (
            <>
              <BellOff className="w-5 h-5" />
              <span>Notify Me</span>
            </>
          )}
        </button>
      )}
    </EventCard>
  );
}
