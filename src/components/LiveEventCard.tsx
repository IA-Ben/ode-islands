"use client";

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface LiveEvent {
  id: string;
  title: string;
  description?: string;
  startTime: string;
  endTime: string;
  isActive: boolean;
  settings?: string;
  createdBy?: string;
  createdAt: string;
}

interface LiveEventCardProps {
  event: LiveEvent;
  isSelected: boolean;
  onSelect: () => void;
  onActivate?: () => void;
  onDeactivate?: () => void;
  isAdmin: boolean;
  theme: any;
  isPastEvent?: boolean;
}

export default function LiveEventCard({ 
  event, 
  isSelected, 
  onSelect, 
  onActivate, 
  onDeactivate, 
  isAdmin, 
  theme,
  isPastEvent = false
}: LiveEventCardProps) {
  
  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString() + ' ' + date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const getEventStatus = () => {
    const now = new Date();
    const start = new Date(event.startTime);
    const end = new Date(event.endTime);

    if (event.isActive) {
      return { status: 'Active', color: 'text-green-400', bgColor: 'bg-green-500/20', borderColor: 'border-green-500/30' };
    } else if (now < start) {
      return { status: 'Upcoming', color: 'text-blue-400', bgColor: 'bg-blue-500/20', borderColor: 'border-blue-500/30' };
    } else if (now > end) {
      return { status: 'Ended', color: 'text-gray-400', bgColor: 'bg-gray-500/20', borderColor: 'border-gray-500/30' };
    } else {
      return { status: 'Ready', color: 'text-yellow-400', bgColor: 'bg-yellow-500/20', borderColor: 'border-yellow-500/30' };
    }
  };

  const statusInfo = getEventStatus();
  const duration = Math.ceil((new Date(event.endTime).getTime() - new Date(event.startTime).getTime()) / (1000 * 60 * 60));

  return (
    <Card 
      className={`bg-white/5 border backdrop-blur-sm transition-all duration-300 hover:bg-white/8 cursor-pointer group ${
        isSelected 
          ? 'border-white/30 ring-2 ring-white/15 shadow-lg' 
          : 'border-white/10 hover:border-white/25'
      }`}
      onClick={onSelect}
    >
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between mb-3">
          <CardTitle className="text-white text-xl font-bold line-clamp-2 group-hover:text-white/90 transition-colors">
            {event.title}
          </CardTitle>
          <div 
            className={`px-3 py-1 rounded-lg text-xs font-semibold uppercase tracking-wide ${statusInfo.color} ${statusInfo.bgColor} ${statusInfo.borderColor} border whitespace-nowrap ml-3`}
          >
            {statusInfo.status}
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Description */}
        {event.description && (
          <p className="text-white/70 text-base mb-6 line-clamp-3 leading-relaxed">
            {event.description}
          </p>
        )}

        {/* Event timing */}
        <div className="space-y-3 mb-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-white/40 rounded-full mr-3"></div>
              <span className="text-white/60 text-sm font-medium">Start Time</span>
            </div>
            <span className="text-white font-semibold">{formatDate(event.startTime)}</span>
          </div>
          <div className="flex items-center justify-between">
            <div className="flex items-center">
              <div className="w-2 h-2 bg-white/40 rounded-full mr-3"></div>
              <span className="text-white/60 text-sm font-medium">Duration</span>
            </div>
            <span className="text-white font-semibold">{duration}h</span>
          </div>
        </div>

        {/* Progress bar for active events */}
        {event.isActive && (
          <div className="mb-6">
            <div className="flex justify-between items-center mb-3">
              <span className="text-white/70 font-medium">Event Progress</span>
              <div className="flex items-center gap-2">
                <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
                <span className="text-green-400 font-semibold text-sm uppercase tracking-wide">Live</span>
              </div>
            </div>
            <div className="w-full bg-white/10 rounded-full h-3 shadow-inner">
              <div 
                className="h-3 rounded-full transition-all duration-1000 ease-out shadow-sm"
                style={{ 
                  backgroundColor: theme.colors.primary,
                  width: (() => {
                    const now = new Date().getTime();
                    const start = new Date(event.startTime).getTime();
                    const end = new Date(event.endTime).getTime();
                    const progress = Math.min(Math.max((now - start) / (end - start) * 100, 0), 100);
                    return `${progress}%`;
                  })()
                }}
              />
            </div>
          </div>
        )}

        {/* Action buttons for admins */}
        {isAdmin && !isPastEvent && (
          <div className="flex gap-3 mt-6">
            {!event.isActive && onActivate && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onActivate();
                }}
                className="bg-green-500 hover:bg-green-600 text-white border-0 font-semibold flex-1 py-2"
              >
                Activate Event
              </Button>
            )}
            
            {event.isActive && onDeactivate && (
              <Button
                size="sm"
                variant="outline"
                onClick={(e) => {
                  e.stopPropagation();
                  onDeactivate();
                }}
                className="border-red-500/40 text-red-400 hover:bg-red-500/10 hover:border-red-500/60 font-semibold flex-1 py-2"
              >
                Stop Event
              </Button>
            )}
          </div>
        )}

        {/* Participant action buttons */}
        {!isAdmin && event.isActive && (
          <div className="flex gap-3 mt-6">
            <Button
              size="sm"
              style={{ backgroundColor: theme.colors.primary, color: theme.colors.background }}
              className="font-semibold flex-1 py-2"
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
            >
              Join Live Event
            </Button>
          </div>
        )}

        {/* Event features preview */}
        <div className="flex justify-between items-center mt-6 pt-4 border-t border-white/10">
          <div className="flex items-center gap-4 text-xs text-white/60">
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-blue-400 rounded-full"></div>
              <span className="font-medium">Interactive</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-green-400 rounded-full"></div>
              <span className="font-medium">Q&A</span>
            </div>
            <div className="flex items-center gap-1">
              <div className="w-1.5 h-1.5 bg-purple-400 rounded-full"></div>
              <span className="font-medium">Polls</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}