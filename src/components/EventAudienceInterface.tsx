"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import QRScanner from './QRScanner';

// Types for the Event audience experience
interface ShowSession {
  id: string;
  eventId: string;
  startTime: Date;
  showClock: number; // Local monotonic timer in seconds
  isActive: boolean;
}

interface ShowCue {
  id: string;
  type: 'TEXT' | 'QR_PROMPT' | 'POLL' | 'TASK' | 'KEEPSAKE' | 'BROADCAST' | 'PAUSE' | 'RESUME';
  timecode: string; // "00:12:34.500"
  openOffsetMs: number;
  closeOffsetMs: number;
  priority: number;
  payload: any;
  unlockRules?: any[];
}

interface HeartbeatMessage {
  type: 'heartbeat';
  payload: {
    serverTimecode: number;
    timestamp: number;
  };
}

interface CueMessage {
  type: 'cue';
  payload: ShowCue;
}

interface EventAudienceProps {
  eventId: string;
  userId: string;
  theme: any;
}

export default function EventAudienceInterface({ eventId, userId, theme }: EventAudienceProps) {
  // Session state
  const [session, setSession] = useState<ShowSession | null>(null);
  const [currentCue, setCurrentCue] = useState<ShowCue | null>(null);
  const [nextCue, setNextCue] = useState<ShowCue | null>(null);
  const [isHeadsUpMode, setIsHeadsUpMode] = useState(false);
  const [cueQueue, setCueQueue] = useState<ShowCue[]>([]);
  
  // Timing and sync
  const [serverTimecode, setServerTimecode] = useState(0);
  const [localClock, setLocalClock] = useState(0);
  const [driftCorrection, setDriftCorrection] = useState(0);
  const [lastHeartbeat, setLastHeartbeat] = useState(0);
  const [isOffline, setIsOffline] = useState(false);
  
  // QR Scanner
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  
  // References for timers
  const localClockRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartTime = useRef<number>(Date.now());

  // WebSocket connection for real-time sync
  const wsUrl = typeof window !== 'undefined' 
    ? `${window.location.protocol === 'https:' ? 'wss:' : 'ws:'}//${window.location.host}/ws`
    : null;

  const { connectionStatus, sendMessage } = useWebSocket(wsUrl, {
    onMessage: handleWebSocketMessage,
    reconnectInterval: 3000,
    maxReconnectAttempts: 10,
  });

  // WebSocket message handler
  function handleWebSocketMessage(message: any) {
    switch (message.type) {
      case 'heartbeat':
        handleHeartbeat(message as HeartbeatMessage);
        break;
      case 'cue':
        handleCue(message as CueMessage);
        break;
      case 'session_start':
        handleSessionStart(message.payload);
        break;
      case 'session_end':
        handleSessionEnd();
        break;
      case 'pause_audience':
        setIsHeadsUpMode(true);
        break;
      case 'resume_audience':
        setIsHeadsUpMode(false);
        break;
    }
  }

  // Handle server heartbeat for timecode sync
  const handleHeartbeat = useCallback((message: HeartbeatMessage) => {
    const now = Date.now();
    const { serverTimecode: newServerTimecode, timestamp } = message.payload;
    
    // Calculate round-trip time and adjust for latency
    const rtt = now - timestamp;
    const adjustedServerTime = newServerTimecode + (rtt / 2000); // Convert to seconds
    
    setServerTimecode(adjustedServerTime);
    setLastHeartbeat(now);
    
    // Calculate drift correction (max ±250ms/min as per spec)
    const expectedLocalTime = (now - sessionStartTime.current) / 1000;
    const drift = adjustedServerTime - expectedLocalTime;
    const maxDriftPerSecond = 250 / (60 * 1000); // 250ms per minute
    const correctedDrift = Math.max(-maxDriftPerSecond, Math.min(maxDriftPerSecond, drift));
    
    setDriftCorrection(correctedDrift);
    setIsOffline(false);
    
    // Reset heartbeat timeout
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
    }
    
    // Set offline if no heartbeat for >10s (as per spec)
    heartbeatTimeoutRef.current = setTimeout(() => {
      setIsOffline(true);
      console.warn('Heartbeat missing >10s, switching to local clock fallback');
    }, 10000);
  }, []);

  // Handle incoming cues
  const handleCue = useCallback((message: CueMessage) => {
    const cue = message.payload;
    setCueQueue(prev => [...prev, cue]);
  }, []);

  // Handle session start
  const handleSessionStart = useCallback((payload: any) => {
    const newSession: ShowSession = {
      id: payload.sessionId,
      eventId: payload.eventId,
      startTime: new Date(payload.startTime),
      showClock: 0,
      isActive: true,
    };
    
    setSession(newSession);
    sessionStartTime.current = Date.now();
    
    // Start local clock
    if (localClockRef.current) {
      clearInterval(localClockRef.current);
    }
    
    localClockRef.current = setInterval(() => {
      setLocalClock(prev => prev + 1);
    }, 1000);
  }, []);

  // Handle session end
  const handleSessionEnd = useCallback(() => {
    setSession(null);
    setCurrentCue(null);
    setNextCue(null);
    setCueQueue([]);
    
    if (localClockRef.current) {
      clearInterval(localClockRef.current);
      localClockRef.current = null;
    }
    
    if (heartbeatTimeoutRef.current) {
      clearTimeout(heartbeatTimeoutRef.current);
      heartbeatTimeoutRef.current = null;
    }
  }, []);

  // Process cue queue based on timecode
  useEffect(() => {
    if (!session || cueQueue.length === 0) return;

    const currentTime = isOffline ? localClock : serverTimecode;
    
    // Find cues that should be active now
    const activeCues = cueQueue.filter(cue => {
      const cueTime = parseTimecode(cue.timecode);
      const openTime = cueTime + (cue.openOffsetMs / 1000);
      const closeTime = cueTime + (cue.closeOffsetMs / 1000);
      
      return currentTime >= openTime && currentTime <= closeTime;
    });

    // Set current cue (highest priority)
    if (activeCues.length > 0) {
      const priorityCue = activeCues.reduce((highest, current) => 
        current.priority > highest.priority ? current : highest
      );
      setCurrentCue(priorityCue);
    } else {
      setCurrentCue(null);
    }

    // Find next upcoming cue
    const upcomingCues = cueQueue.filter(cue => {
      const cueTime = parseTimecode(cue.timecode);
      const openTime = cueTime + (cue.openOffsetMs / 1000);
      return currentTime < openTime;
    });

    if (upcomingCues.length > 0) {
      const nextUpcoming = upcomingCues.reduce((earliest, current) => {
        const earliestTime = parseTimecode(earliest.timecode) + (earliest.openOffsetMs / 1000);
        const currentTime = parseTimecode(current.timecode) + (current.openOffsetMs / 1000);
        return currentTime < earliestTime ? current : earliest;
      });
      setNextCue(nextUpcoming);
    } else {
      setNextCue(null);
    }
  }, [session, cueQueue, serverTimecode, localClock, isOffline]);

  // Parse timecode "00:12:34.500" to seconds
  const parseTimecode = (timecode: string): number => {
    const [time, ms] = timecode.split('.');
    const [hours, minutes, seconds] = time.split(':').map(Number);
    return hours * 3600 + minutes * 60 + seconds + (parseInt(ms || '0') / 1000);
  };

  // Format time display
  const formatTime = (seconds: number): string => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    return `${h.toString().padStart(2, '0')}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (localClockRef.current) {
        clearInterval(localClockRef.current);
      }
      if (heartbeatTimeoutRef.current) {
        clearTimeout(heartbeatTimeoutRef.current);
      }
    };
  }, []);

  // Handle QR scan results
  const handleQRResult = useCallback(async (result: { text: string }) => {
    setIsQRScannerOpen(false);
    
    try {
      // Parse QR code format: E:<eventShort>|C:<chapter>|S:<seq>|V:1|H:<crc>
      const qrCode = result.text;
      console.log('QR scanned:', qrCode);
      
      // Validate QR format (basic validation)
      if (qrCode.startsWith('E:') && qrCode.includes('|C:')) {
        // TODO: Validate against offline dictionary and CRC
        // For now, simulate successful chapter stamp collection
        
        // Extract chapter info
        const parts = qrCode.split('|');
        const eventPart = parts.find(p => p.startsWith('E:'))?.substring(2);
        const chapterPart = parts.find(p => p.startsWith('C:'))?.substring(2);
        
        if (chapterPart) {
          // Award chapter stamp (integrate with existing Memory Wallet system)
          await collectChapterStamp(chapterPart);
          
          // Show success feedback
          // TODO: Add toast notification
          console.log(`Chapter stamp collected: ${chapterPart}`);
        }
      } else {
        // Invalid QR code
        console.warn('Invalid QR code format');
        // TODO: Show error feedback
      }
    } catch (error) {
      console.error('QR processing error:', error);
      // TODO: Show error feedback
    }
  }, []);

  // Collect chapter stamp using existing Memory Wallet system
  const collectChapterStamp = async (chapterId: string) => {
    try {
      // This would integrate with the existing useMemoryCollection hook
      // For now, simulate the API call
      const response = await fetch('/api/memory-wallet/collect', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          // TODO: Add CSRF token
        },
        credentials: 'include',
        body: JSON.stringify({
          sourceType: 'chapter',
          sourceId: chapterId,
          title: `Chapter ${chapterId} Stamp`,
          description: `Collected during live event`,
          category: 'chapter_stamp',
          collectionTrigger: 'qr_scan',
          collectionContext: {
            scanTime: Date.now(),
            eventId: eventId,
          }
        })
      });

      if (response.ok) {
        console.log('Chapter stamp saved successfully');
        // TODO: Show success animation/feedback
      }
    } catch (error) {
      console.error('Failed to save chapter stamp:', error);
    }
  };

  // Handle QR scanner errors
  const handleQRError = useCallback((error: string) => {
    console.error('QR scanner error:', error);
    setIsQRScannerOpen(false);
    // TODO: Show error feedback to user
  }, []);

  // Join event session on mount
  useEffect(() => {
    if (connectionStatus === 'open') {
      sendMessage({
        type: 'join_event',
        payload: { eventId, userId }
      });
    }
  }, [connectionStatus, eventId, userId, sendMessage]);

  // Heads-up mode (minimal UI for quiet moments)
  if (isHeadsUpMode) {
    return (
      <div className="fixed inset-0 bg-black flex items-center justify-center">
        {currentCue && (
          <div className="text-center text-white/60 text-sm">
            {currentCue.payload?.message || 'Please keep phones down'}
          </div>
        )}
      </div>
    );
  }

  // Main audience interface (low-light theme)
  return (
    <div className="fixed inset-0 bg-black text-white overflow-hidden">
      {/* Now/Next rail - fixed at top */}
      <div className="fixed top-0 left-0 right-0 z-50 bg-black/90 backdrop-blur-sm border-b border-white/10">
        <div className="flex items-center justify-between px-4 py-3">
          {/* Connection status */}
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${
              connectionStatus === 'open' && !isOffline ? 'bg-green-400' : 'bg-red-400'
            }`}></div>
            <span className="text-xs text-white/60">
              {isOffline ? 'Offline' : connectionStatus === 'open' ? 'Live' : 'Connecting...'}
            </span>
          </div>

          {/* Show clock */}
          {session && (
            <div className="text-center">
              <div className="text-lg font-mono">
                {formatTime(isOffline ? localClock : serverTimecode)}
              </div>
              <div className="text-xs text-white/60">Show Time</div>
            </div>
          )}

          {/* Next cue indicator */}
          <div className="text-right min-w-0">
            {nextCue && (
              <div className="text-xs text-white/60 truncate">
                Next: {nextCue.type}
              </div>
            )}
          </div>
        </div>

        {/* Now/Next details */}
        <div className="grid grid-cols-2 gap-4 px-4 pb-3">
          {/* Now */}
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-xs text-white/60 mb-1">NOW</div>
            {currentCue ? (
              <div className="text-sm font-medium">{currentCue.type}</div>
            ) : (
              <div className="text-sm text-white/40">No active cue</div>
            )}
          </div>

          {/* Next */}
          <div className="bg-white/5 rounded-lg p-3">
            <div className="text-xs text-white/60 mb-1">NEXT</div>
            {nextCue ? (
              <div className="text-sm font-medium">{nextCue.type}</div>
            ) : (
              <div className="text-sm text-white/40">No upcoming cue</div>
            )}
          </div>
        </div>
      </div>

      {/* Main content area */}
      <div className="pt-32 pb-24 px-4 h-full overflow-y-auto">
        {session ? (
          <div className="space-y-6">
            {/* Current cue display */}
            {currentCue && (
              <Card className="bg-white/5 border-white/10 backdrop-blur-sm">
                <CardContent className="p-6">
                  <CueRenderer cue={currentCue} theme={theme} onOpenQRScanner={() => setIsQRScannerOpen(true)} />
                </CardContent>
              </Card>
            )}

            {/* Waiting state */}
            {!currentCue && (
              <div className="text-center py-12">
                <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
                  <div className="w-8 h-8 border-2 border-white/20 rounded-full"></div>
                </div>
                <h3 className="text-xl font-medium mb-2">Ready for the Show</h3>
                <p className="text-white/60">
                  Keep your phone ready for interactive moments
                </p>
              </div>
            )}
          </div>
        ) : (
          <div className="text-center py-12">
            <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
              <div className="w-8 h-8 border-2 border-white/40 border-t-transparent rounded-full animate-spin"></div>
            </div>
            <h3 className="text-xl font-medium mb-2">Joining Event</h3>
            <p className="text-white/60">
              Connecting to the live experience...
            </p>
          </div>
        )}
      </div>

      {/* Bottom action bar */}
      <div className="fixed bottom-0 left-0 right-0 bg-black/90 backdrop-blur-sm border-t border-white/10 p-4">
        <div className="flex items-center justify-between">
          {/* Large Scan button */}
          <Button
            size="lg"
            className="flex-1 mr-4 bg-white/10 hover:bg-white/20 text-white border-white/20 text-lg py-6"
            onClick={() => setIsQRScannerOpen(true)}
          >
            <svg className="w-6 h-6 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12h4.01M12 12v4.01M12 16.01h4.01M16.01 20.01h4.01M16.01 20.01h4.01" />
            </svg>
            Scan Chapter
          </Button>

          {/* Compact Help button */}
          <Button
            variant="ghost"
            size="lg"
            className="text-white/60 hover:text-white hover:bg-white/10 px-6 py-6"
            onClick={() => {
              // TODO: Implement help system
              console.log('Open help');
            }}
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </Button>
        </div>
      </div>

      {/* QR Scanner overlay */}
      <QRScanner
        isOpen={isQRScannerOpen}
        onClose={() => setIsQRScannerOpen(false)}
        onResult={handleQRResult}
        onError={handleQRError}
      />
    </div>
  );
}

// Component to render different cue types
function CueRenderer({ cue, theme, onOpenQRScanner }: { cue: ShowCue; theme: any; onOpenQRScanner: () => void }) {
  switch (cue.type) {
    case 'TEXT':
      return (
        <div className="text-center">
          <h3 className="text-xl font-medium mb-4" style={{ color: theme.colors.primary }}>
            {cue.payload?.title || 'Message'}
          </h3>
          <p className="text-white/80 text-lg leading-relaxed">
            {cue.payload?.message}
          </p>
          {cue.payload?.imageUrl && (
            <img 
              src={cue.payload.imageUrl} 
              alt=""
              className="mt-4 mx-auto max-w-full h-auto rounded-lg"
            />
          )}
        </div>
      );

    case 'QR_PROMPT':
      return (
        <div className="text-center">
          <h3 className="text-xl font-medium mb-4" style={{ color: theme.colors.primary }}>
            Chapter Moment
          </h3>
          <p className="text-white/80 text-lg mb-6">
            Scan the QR code on stage to collect this chapter stamp
          </p>
          <Button 
            size="lg"
            className="bg-white/10 hover:bg-white/20 text-white border-white/20"
            onClick={onOpenQRScanner}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M12 12h4.01M12 12v4.01M12 16.01h4.01M16.01 20.01h4.01M16.01 20.01h4.01" />
            </svg>
            Scan Now
          </Button>
        </div>
      );

    case 'POLL':
      return (
        <div>
          <h3 className="text-xl font-medium mb-4" style={{ color: theme.colors.primary }}>
            {cue.payload?.question || 'Quick Poll'}
          </h3>
          <div className="space-y-3">
            {cue.payload?.options?.map((option: string, index: number) => (
              <Button
                key={index}
                variant="outline"
                className="w-full text-left justify-start bg-white/5 border-white/20 text-white hover:bg-white/10 py-4 text-lg"
                onClick={() => console.log('Vote for option:', option)}
              >
                {option}
              </Button>
            ))}
          </div>
        </div>
      );

    case 'KEEPSAKE':
      return (
        <div className="text-center">
          <h3 className="text-xl font-medium mb-4" style={{ color: theme.colors.primary }}>
            Capture This Moment
          </h3>
          <p className="text-white/80 text-lg mb-6">
            Take a themed photo to remember this part of the show
          </p>
          <Button 
            size="lg"
            style={{ backgroundColor: theme.colors.primary, color: theme.colors.background }}
            onClick={() => console.log('Open camera for keepsake')}
          >
            <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            Take Photo
          </Button>
        </div>
      );

    case 'BROADCAST':
      return (
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-red-500/20 flex items-center justify-center">
            <svg className="w-8 h-8 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </div>
          <h3 className="text-xl font-medium mb-4 text-red-400">
            {cue.payload?.title || 'Important Message'}
          </h3>
          <p className="text-white/90 text-lg leading-relaxed">
            {cue.payload?.message}
          </p>
        </div>
      );

    default:
      return (
        <div className="text-center">
          <p className="text-white/60">Unknown cue type: {cue.type}</p>
        </div>
      );
  }
}