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
      className={`bg-white/5 border backdrop-blur-sm transition-all duration-300 hover:bg-white/10 cursor-pointer ${
        isSelected 
          ? 'border-white/30 ring-2 ring-white/20' 
          : 'border-white/10 hover:border-white/20'
      }`}
      onClick={onSelect}
    >
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <CardTitle className="text-white text-lg line-clamp-2">
            {event.title}
          </CardTitle>
          <span 
            className={`px-2 py-1 rounded-full text-xs font-medium border ${statusInfo.color} ${statusInfo.bgColor} ${statusInfo.borderColor} whitespace-nowrap ml-2`}
          >
            {statusInfo.status}
          </span>
        </div>
      </CardHeader>
      
      <CardContent className="pt-0">
        {/* Description */}
        {event.description && (
          <p className="text-white/60 text-sm mb-4 line-clamp-3">
            {event.description}
          </p>
        )}

        {/* Event timing */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center text-sm text-white/60">
            <span className="mr-2">🗓️</span>
            <span>Starts: {formatDate(event.startTime)}</span>
          </div>
          <div className="flex items-center text-sm text-white/60">
            <span className="mr-2">⏰</span>
            <span>Duration: {duration}h</span>
          </div>
        </div>

        {/* Progress bar for active events */}
        {event.isActive && (
          <div className="mb-4">
            <div className="flex justify-between text-xs text-white/60 mb-1">
              <span>Event Progress</span>
              <span>Live</span>
            </div>
            <div className="w-full bg-white/10 rounded-full h-2">
              <div 
                className="h-2 rounded-full"
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
          <div className="flex gap-2 mt-4">
            {!event.isActive && onActivate && (
              <Button
                size="sm"
                onClick={(e) => {
                  e.stopPropagation();
                  onActivate();
                }}
                className="bg-green-600 hover:bg-green-700 text-white border-0 text-xs flex-1"
              >
                🟢 Activate
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
                className="border-red-500/40 text-red-400 hover:bg-red-500/10 text-xs flex-1"
              >
                ⏹️ Stop
              </Button>
            )}
          </div>
        )}

        {/* Participant action buttons */}
        {!isAdmin && event.isActive && (
          <div className="flex gap-2 mt-4">
            <Button
              size="sm"
              style={{ backgroundColor: theme.colors.primary, color: theme.colors.background }}
              className="text-xs flex-1"
              onClick={(e) => {
                e.stopPropagation();
                onSelect();
              }}
            >
              Join Event
            </Button>
          </div>
        )}

        {/* Event stats preview */}
        <div className="flex justify-between text-xs text-white/40 mt-4 pt-3 border-t border-white/10">
          <span>📊 Interactive</span>
          <span>💬 Q&A Ready</span>
          <span>🎯 Live Polls</span>
        </div>
      </CardContent>
    </Card>
  );
}