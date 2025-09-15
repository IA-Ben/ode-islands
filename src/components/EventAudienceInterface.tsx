"use client";

import { useState, useEffect, useCallback, useRef } from 'react';
import { useWebSocket } from '@/hooks/useWebSocket';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import QRScanner from './QRScanner';
import { getCsrfToken, fetchCsrfToken } from '@/lib/csrfUtils';

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
    serverTime: number;
  };
  timestamp: number;
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
  const [displayTimecode, setDisplayTimecode] = useState(0); // Smooth interpolated timecode for display
  const [lastServerUpdate, setLastServerUpdate] = useState(0); // When we last got server timecode
  
  // QR Scanner
  const [isQRScannerOpen, setIsQRScannerOpen] = useState(false);
  
  // CSRF and offline handling
  const [csrfToken, setCsrfToken] = useState<string | null>(null);
  const [offlineQueue, setOfflineQueue] = useState<any[]>([]);
  const [feedback, setFeedback] = useState<{ type: 'success' | 'error' | 'info'; message: string } | null>(null);
  
  // Response state management
  const [pollResponses, setPollResponses] = useState<Map<string, { selectedOption: string; isSubmitting: boolean; submitted: boolean; error?: string }>>(new Map());
  const [taskCompletions, setTaskCompletions] = useState<Map<string, { completed: boolean; isSubmitting: boolean; submitted: boolean; error?: string }>>(new Map());
  const [keepsakeCaptures, setKeepsakeCaptures] = useState<Map<string, { captured: boolean; isSubmitting: boolean; submitted: boolean; error?: string }>>(new Map());
  
  // References for timers
  const localClockRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const sessionStartTime = useRef<number>(Date.now());
  const interpolationRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRequestRef = useRef<NodeJS.Timeout | null>(null);

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
    const { serverTimecode: newServerTimecode, serverTime } = message.payload;
    
    // Use serverTime from payload, which is the actual server timestamp
    const serverTimestamp = serverTime;
    
    // Calculate round-trip time and adjust for latency
    const rtt = now - serverTimestamp;
    const adjustedServerTime = newServerTimecode + (rtt / 2000); // Convert to seconds
    
    // Apply drift correction to the server timecode
    const correctedTimecode = adjustedServerTime + driftCorrection;
    
    setServerTimecode(correctedTimecode);
    setDisplayTimecode(correctedTimecode); // Update display immediately
    setLastHeartbeat(now);
    setLastServerUpdate(now);
    
    // Calculate drift correction (max ±250ms/min as per spec)
    const expectedLocalTime = (now - sessionStartTime.current) / 1000;
    const drift = adjustedServerTime - expectedLocalTime;
    const maxDriftPerSecond = 250 / (60 * 1000); // 250ms per minute
    const newDriftCorrection = Math.max(-maxDriftPerSecond, Math.min(maxDriftPerSecond, drift));
    
    setDriftCorrection(newDriftCorrection);
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
    
    console.log(`Heartbeat: server=${newServerTimecode}s, corrected=${correctedTimecode}s, drift=${newDriftCorrection}s`);
  }, [driftCorrection]);

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
    
    if (interpolationRef.current) {
      clearInterval(interpolationRef.current);
      interpolationRef.current = null;
    }
    
    if (heartbeatRequestRef.current) {
      clearInterval(heartbeatRequestRef.current);
      heartbeatRequestRef.current = null;
    }
  }, []);

  // Process cue queue based on timecode
  useEffect(() => {
    if (!session || cueQueue.length === 0) return;

    const currentTime = isOffline ? localClock : displayTimecode;
    
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

  // Fetch CSRF token on mount (for authenticated users)
  useEffect(() => {
    const initCSRF = async () => {
      try {
        // First try to get from cookie
        let token = getCsrfToken();
        
        if (!token) {
          // If not in cookie, fetch from API (only works for authenticated users)
          try {
            token = await fetchCsrfToken();
          } catch (error) {
            // Anonymous users won't have CSRF tokens, that's ok
            console.log('No CSRF token available (anonymous user)');
          }
        }
        
        setCsrfToken(token);
      } catch (error) {
        console.error('CSRF token initialization error:', error);
      }
    };

    initCSRF();
  }, []);

  // Show feedback message with auto-hide
  const showFeedback = useCallback((type: 'success' | 'error' | 'info', message: string) => {
    setFeedback({ type, message });
    setTimeout(() => setFeedback(null), 5000); // Hide after 5 seconds
  }, []);

  // Queue failed requests for offline processing
  const queueForOffline = useCallback((data: any) => {
    setOfflineQueue(prev => {
      const updated = [...prev, { ...data, queuedAt: Date.now() }];
      // Store in localStorage for persistence
      try {
        localStorage.setItem('event-offline-queue', JSON.stringify(updated));
      } catch (error) {
        console.warn('Failed to store offline queue:', error);
      }
      return updated;
    });
  }, []);

  // Process offline queue when connection is restored
  const processOfflineQueue = useCallback(async () => {
    if (offlineQueue.length === 0) return;

    console.log(`Processing ${offlineQueue.length} queued requests`);
    const processed: any[] = [];
    
    for (const item of offlineQueue) {
      try {
        const headers: HeadersInit = {
          'Content-Type': 'application/json',
        };

        if (csrfToken) {
          headers['X-CSRF-Token'] = csrfToken;
        }

        const response = await fetch('/api/memory-wallet/collect', {
          method: 'POST',
          headers,
          credentials: 'include',
          body: JSON.stringify(item)
        });

        if (response.ok || response.status === 409) {
          processed.push(item);
          console.log('Processed queued chapter stamp:', item.sourceId);
        }
      } catch (error) {
        console.error('Failed to process queued item:', error);
        break; // Stop processing if we hit network issues
      }
    }

    if (processed.length > 0) {
      setOfflineQueue(prev => {
        const updated = prev.filter(item => !processed.includes(item));
        try {
          localStorage.setItem('event-offline-queue', JSON.stringify(updated));
        } catch (error) {
          console.warn('Failed to update offline queue:', error);
        }
        return updated;
      });
      
      showFeedback('success', `${processed.length} queued chapter stamps processed`);
    }
  }, [offlineQueue, csrfToken, showFeedback]);

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
        
        // Extract chapter info
        const parts = qrCode.split('|');
        const eventPart = parts.find(p => p.startsWith('E:'))?.substring(2);
        const chapterPart = parts.find(p => p.startsWith('C:'))?.substring(2);
        
        if (chapterPart) {
          // Award chapter stamp (integrate with existing Memory Wallet system)
          const success = await collectChapterStamp(chapterPart, qrCode);
          
          if (success) {
            showFeedback('success', `Chapter ${chapterPart} stamp collected!`);
          } else {
            showFeedback('info', 'Chapter stamp queued for when you\'re online');
          }
        }
      } else {
        // Invalid QR code
        console.warn('Invalid QR code format');
        showFeedback('error', 'Invalid QR code format');
      }
    } catch (error) {
      console.error('QR processing error:', error);
      showFeedback('error', 'Failed to process QR code');
    }
  }, [showFeedback]);

  // Collect chapter stamp using existing Memory Wallet system
  const collectChapterStamp = async (chapterId: string, qrCode: string): Promise<boolean> => {
    const stampData = {
      sourceType: 'chapter',
      sourceId: chapterId,
      title: `Chapter ${chapterId} Stamp`,
      description: `Collected during live event via QR scan`,
      category: 'chapter_stamp',
      collectionTrigger: 'qr_scan',
      collectionContext: {
        scanTime: Date.now(),
        eventId: eventId,
        qrCode: qrCode,
        timecode: serverTimecode
      }
    };

    try {
      // Prepare headers
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      // Add CSRF token if available (for authenticated users)
      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }

      const response = await fetch('/api/memory-wallet/collect', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(stampData)
      });

      if (response.ok) {
        console.log('Chapter stamp saved successfully');
        // Process any queued items if we're back online
        processOfflineQueue();
        return true;
      } else if (response.status === 401) {
        // Authentication required - queue for later or suggest login
        queueForOffline(stampData);
        return false;
      } else if (response.status === 409) {
        // Already collected - treat as success
        const errorData = await response.json();
        console.log('Chapter stamp already collected:', errorData.message);
        showFeedback('info', 'Chapter stamp already in your collection');
        return true;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to save chapter stamp:', error);
      
      // Queue for offline processing
      queueForOffline(stampData);
      return false;
    }
  };

  // Submit poll response
  const submitPollResponse = useCallback(async (cueId: string, pollId: string, selectedOption: string): Promise<boolean> => {
    // Update submission state
    setPollResponses(prev => new Map(prev.set(cueId, {
      selectedOption,
      isSubmitting: true,
      submitted: false
    })));

    const responseData = {
      pollId,
      selectedOption,
      metadata: {
        cueId,
        timecode: serverTimecode,
        eventId: eventId,
        submissionType: 'poll_response'
      }
    };

    try {
      // Try WebSocket first if available
      if (connectionStatus === 'open') {
        sendMessage({
          type: 'cue_response',
          payload: responseData
        });
      }

      // Always submit via HTTP API as well for reliability
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }

      const response = await fetch('/api/polls/responses', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify({ pollId, selectedOption })
      });

      if (response.ok) {
        const result = await response.json();
        setPollResponses(prev => new Map(prev.set(cueId, {
          selectedOption,
          isSubmitting: false,
          submitted: true
        })));
        
        let feedbackMessage = 'Vote recorded successfully!';
        if (result.isCorrect === true) {
          feedbackMessage += ' Correct answer! 🎉';
        } else if (result.isCorrect === false) {
          feedbackMessage += ' Thanks for participating!';
        }
        
        showFeedback('success', feedbackMessage);
        processOfflineQueue();
        return true;
      } else if (response.status === 400) {
        const errorData = await response.json();
        if (errorData.message.includes('already responded')) {
          setPollResponses(prev => new Map(prev.set(cueId, {
            selectedOption,
            isSubmitting: false,
            submitted: true
          })));
          showFeedback('info', 'You already voted in this poll');
          return true;
        } else {
          throw new Error(errorData.message);
        }
      } else if (response.status === 401) {
        // Authentication required - queue for later
        queueForOffline(responseData);
        setPollResponses(prev => new Map(prev.set(cueId, {
          selectedOption,
          isSubmitting: false,
          submitted: false,
          error: 'Authentication required'
        })));
        showFeedback('info', 'Vote queued - please log in to submit');
        return false;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to submit poll response:', error);
      
      // Queue for offline processing
      queueForOffline(responseData);
      setPollResponses(prev => new Map(prev.set(cueId, {
        selectedOption,
        isSubmitting: false,
        submitted: false,
        error: 'Connection failed'
      })));
      showFeedback('info', 'Vote queued for when you\'re online');
      return false;
    }
  }, [serverTimecode, eventId, connectionStatus, sendMessage, csrfToken, showFeedback, queueForOffline, processOfflineQueue]);

  // Submit keepsake capture
  const submitKeepsakeCapture = useCallback(async (cueId: string, title: string, description: string): Promise<boolean> => {
    // Update submission state
    setKeepsakeCaptures(prev => new Map(prev.set(cueId, {
      captured: false,
      isSubmitting: true,
      submitted: false
    })));

    const keepsakeData = {
      sourceType: 'keepsake',
      sourceId: cueId,
      title,
      description,
      category: 'keepsake_moment',
      collectionTrigger: 'cue_prompt',
      collectionContext: {
        cueId,
        captureTime: Date.now(),
        eventId: eventId,
        timecode: serverTimecode
      }
    };

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }

      const response = await fetch('/api/memory-wallet/collect', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(keepsakeData)
      });

      if (response.ok) {
        setKeepsakeCaptures(prev => new Map(prev.set(cueId, {
          captured: true,
          isSubmitting: false,
          submitted: true
        })));
        showFeedback('success', 'Moment captured and saved to your memory wallet!');
        processOfflineQueue();
        return true;
      } else if (response.status === 401) {
        queueForOffline(keepsakeData);
        setKeepsakeCaptures(prev => new Map(prev.set(cueId, {
          captured: false,
          isSubmitting: false,
          submitted: false,
          error: 'Authentication required'
        })));
        showFeedback('info', 'Keepsake queued - please log in to save');
        return false;
      } else if (response.status === 409) {
        setKeepsakeCaptures(prev => new Map(prev.set(cueId, {
          captured: true,
          isSubmitting: false,
          submitted: true
        })));
        showFeedback('info', 'This moment is already in your collection');
        return true;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to submit keepsake:', error);
      
      queueForOffline(keepsakeData);
      setKeepsakeCaptures(prev => new Map(prev.set(cueId, {
        captured: false,
        isSubmitting: false,
        submitted: false,
        error: 'Connection failed'
      })));
      showFeedback('info', 'Keepsake queued for when you\'re online');
      return false;
    }
  }, [eventId, serverTimecode, csrfToken, showFeedback, queueForOffline, processOfflineQueue]);

  // Complete task
  const completeTask = useCallback(async (cueId: string, taskType: string, completionData: any): Promise<boolean> => {
    // Update submission state
    setTaskCompletions(prev => new Map(prev.set(cueId, {
      completed: false,
      isSubmitting: true,
      submitted: false
    })));

    const taskData = {
      sourceType: 'task',
      sourceId: cueId,
      title: `${taskType} Task Completed`,
      description: `Completed ${taskType} task during live event`,
      category: 'task_completion',
      collectionTrigger: 'task_completion',
      collectionContext: {
        cueId,
        taskType,
        completionTime: Date.now(),
        eventId: eventId,
        timecode: serverTimecode,
        completionData
      }
    };

    try {
      const headers: HeadersInit = {
        'Content-Type': 'application/json',
      };

      if (csrfToken) {
        headers['X-CSRF-Token'] = csrfToken;
      }

      const response = await fetch('/api/memory-wallet/collect', {
        method: 'POST',
        headers,
        credentials: 'include',
        body: JSON.stringify(taskData)
      });

      if (response.ok) {
        setTaskCompletions(prev => new Map(prev.set(cueId, {
          completed: true,
          isSubmitting: false,
          submitted: true
        })));
        showFeedback('success', `${taskType} task completed! 🎉`);
        processOfflineQueue();
        return true;
      } else if (response.status === 401) {
        queueForOffline(taskData);
        setTaskCompletions(prev => new Map(prev.set(cueId, {
          completed: false,
          isSubmitting: false,
          submitted: false,
          error: 'Authentication required'
        })));
        showFeedback('info', 'Task completion queued - please log in to save');
        return false;
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      console.error('Failed to submit task completion:', error);
      
      queueForOffline(taskData);
      setTaskCompletions(prev => new Map(prev.set(cueId, {
        completed: false,
        isSubmitting: false,
        submitted: false,
        error: 'Connection failed'
      })));
      showFeedback('info', 'Task completion queued for when you\'re online');
      return false;
    }
  }, [eventId, serverTimecode, csrfToken, showFeedback, queueForOffline, processOfflineQueue]);

  // Load offline queue from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem('event-offline-queue');
      if (stored) {
        const queue = JSON.parse(stored);
        setOfflineQueue(queue);
      }
    } catch (error) {
      console.warn('Failed to load offline queue:', error);
    }
  }, []);

  // Handle QR scanner errors
  const handleQRError = useCallback((error: string) => {
    console.error('QR scanner error:', error);
    setIsQRScannerOpen(false);
    // TODO: Show error feedback to user
  }, []);

  // Start smooth timecode interpolation
  const startTimecodeInterpolation = useCallback(() => {
    if (interpolationRef.current) {
      clearInterval(interpolationRef.current);
    }
    
    interpolationRef.current = setInterval(() => {
      if (isOffline) {
        // Use local clock when offline
        setDisplayTimecode(localClock);
      } else if (lastServerUpdate > 0) {
        // Interpolate between server updates
        const timeSinceUpdate = (Date.now() - lastServerUpdate) / 1000;
        const interpolatedTime = serverTimecode + timeSinceUpdate;
        setDisplayTimecode(interpolatedTime);
      }
    }, 100); // Update display every 100ms for smooth animation
  }, [isOffline, localClock, lastServerUpdate, serverTimecode]);

  // Start periodic heartbeat requests
  const startPeriodicHeartbeatRequests = useCallback(() => {
    if (heartbeatRequestRef.current) {
      clearInterval(heartbeatRequestRef.current);
    }
    
    heartbeatRequestRef.current = setInterval(() => {
      if (connectionStatus === 'open' && session) {
        sendMessage({
          type: 'heartbeat_request',
          payload: { eventId }
        });
      }
    }, 5000); // Request heartbeat every 5 seconds
  }, [connectionStatus, session, eventId, sendMessage]);

  // Manage timecode interpolation lifecycle
  useEffect(() => {
    if (session) {
      startTimecodeInterpolation();
      startPeriodicHeartbeatRequests();
    } else {
      // Stop interpolation when no session
      if (interpolationRef.current) {
        clearInterval(interpolationRef.current);
        interpolationRef.current = null;
      }
      if (heartbeatRequestRef.current) {
        clearInterval(heartbeatRequestRef.current);
        heartbeatRequestRef.current = null;
      }
    }
    
    return () => {
      if (interpolationRef.current) {
        clearInterval(interpolationRef.current);
        interpolationRef.current = null;
      }
      if (heartbeatRequestRef.current) {
        clearInterval(heartbeatRequestRef.current);
        heartbeatRequestRef.current = null;
      }
    };
  }, [session, startTimecodeInterpolation, startPeriodicHeartbeatRequests]);

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
                {formatTime(isOffline ? localClock : displayTimecode)}
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
                  <CueRenderer 
                    cue={currentCue} 
                    theme={theme} 
                    onOpenQRScanner={() => setIsQRScannerOpen(true)}
                    onSubmitPollResponse={submitPollResponse}
                    onSubmitKeepsake={submitKeepsakeCapture}
                    onCompleteTask={completeTask}
                    pollResponse={pollResponses.get(currentCue.id)}
                    keepsakeCapture={keepsakeCaptures.get(currentCue.id)}
                    taskCompletion={taskCompletions.get(currentCue.id)}
                  />
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

      {/* Feedback overlay */}
      {feedback && (
        <div className="fixed top-24 left-4 right-4 z-40">
          <Card className={`${
            feedback.type === 'success' ? 'bg-green-500/20 border-green-500/40' :
            feedback.type === 'error' ? 'bg-red-500/20 border-red-500/40' :
            'bg-blue-500/20 border-blue-500/40'
          } backdrop-blur-sm`}>
            <CardContent className="p-4">
              <div className="flex items-center justify-between">
                <p className={`text-sm ${
                  feedback.type === 'success' ? 'text-green-300' :
                  feedback.type === 'error' ? 'text-red-300' :
                  'text-blue-300'
                }`}>
                  {feedback.message}
                </p>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setFeedback(null)}
                  className="text-white/60 hover:text-white p-1 h-auto"
                >
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </Button>
              </div>
              
              {/* Show offline queue status */}
              {offlineQueue.length > 0 && (
                <p className="text-xs text-white/40 mt-2">
                  {offlineQueue.length} item(s) queued for when online
                </p>
              )}
            </CardContent>
          </Card>
        </div>
      )}

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
interface CueRendererProps {
  cue: ShowCue;
  theme: any;
  onOpenQRScanner: () => void;
  onSubmitPollResponse: (cueId: string, pollId: string, selectedOption: string) => Promise<boolean>;
  onSubmitKeepsake: (cueId: string, title: string, description: string) => Promise<boolean>;
  onCompleteTask: (cueId: string, taskType: string, completionData: any) => Promise<boolean>;
  pollResponse?: { selectedOption: string; isSubmitting: boolean; submitted: boolean; error?: string };
  keepsakeCapture?: { captured: boolean; isSubmitting: boolean; submitted: boolean; error?: string };
  taskCompletion?: { completed: boolean; isSubmitting: boolean; submitted: boolean; error?: string };
}

function CueRenderer({ 
  cue, 
  theme, 
  onOpenQRScanner, 
  onSubmitPollResponse, 
  onSubmitKeepsake, 
  onCompleteTask,
  pollResponse,
  keepsakeCapture,
  taskCompletion
}: CueRendererProps) {
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
      const isSubmitted = pollResponse?.submitted;
      const isSubmitting = pollResponse?.isSubmitting;
      const selectedOption = pollResponse?.selectedOption;
      
      return (
        <div>
          <h3 className="text-xl font-medium mb-4" style={{ color: theme.colors.primary }}>
            {cue.payload?.question || 'Quick Poll'}
          </h3>
          
          {/* Show quiz feedback if it's a quiz */}
          {cue.payload?.correctAnswer && isSubmitted && (
            <div className={`mb-4 p-3 rounded-lg ${selectedOption === cue.payload.correctAnswer 
              ? 'bg-green-500/20 border border-green-500/40' 
              : 'bg-orange-500/20 border border-orange-500/40'
            }`}>
              <p className={`text-sm ${selectedOption === cue.payload.correctAnswer ? 'text-green-300' : 'text-orange-300'}`}>
                {selectedOption === cue.payload.correctAnswer 
                  ? '✓ Correct! Well done!' 
                  : `✗ The correct answer was: ${cue.payload.correctAnswer}`
                }
              </p>
              {cue.payload?.explanation && (
                <p className="text-white/70 text-sm mt-2">{cue.payload.explanation}</p>
              )}
            </div>
          )}
          
          <div className="space-y-3">
            {cue.payload?.options?.map((option: string, index: number) => {
              const isSelected = selectedOption === option;
              const isDisabled = isSubmitting || isSubmitted;
              
              return (
                <Button
                  key={index}
                  variant={isSelected ? "default" : "outline"}
                  disabled={isDisabled}
                  className={`w-full text-left justify-start py-4 text-lg transition-all ${
                    isSelected 
                      ? 'bg-white/20 border-white/40 text-white' 
                      : isDisabled
                        ? 'bg-white/5 border-white/10 text-white/40 cursor-not-allowed'
                        : 'bg-white/5 border-white/20 text-white hover:bg-white/10'
                  }`}
                  onClick={() => {
                    if (!isDisabled && cue.payload?.pollId) {
                      onSubmitPollResponse(cue.id, cue.payload.pollId, option);
                    }
                  }}
                >
                  <div className="flex items-center justify-between w-full">
                    <span>{option}</span>
                    {isSelected && (
                      <span className="text-sm ml-2">
                        {isSubmitting ? '⏳' : isSubmitted ? '✓' : ''}
                      </span>
                    )}
                  </div>
                </Button>
              );
            })}
          </div>
          
          {isSubmitting && (
            <p className="text-center text-white/60 text-sm mt-4">
              💫 Submitting your vote...
            </p>
          )}
          
          {isSubmitted && !isSubmitting && (
            <p className="text-center text-green-300 text-sm mt-4">
              ✓ Vote submitted successfully!
            </p>
          )}
          
          {pollResponse?.error && (
            <p className="text-center text-orange-300 text-sm mt-4">
              ⚠️ {pollResponse.error} - queued for retry
            </p>
          )}
        </div>
      );

    case 'KEEPSAKE':
      const isCaptured = keepsakeCapture?.captured;
      const isCapturing = keepsakeCapture?.isSubmitting;
      
      return (
        <div className="text-center">
          <h3 className="text-xl font-medium mb-4" style={{ color: theme.colors.primary }}>
            {cue.payload?.title || 'Capture This Moment'}
          </h3>
          <p className="text-white/80 text-lg mb-6">
            {cue.payload?.description || 'Save this special moment to your memory wallet'}
          </p>
          
          {cue.payload?.imageUrl && (
            <img 
              src={cue.payload.imageUrl} 
              alt="Keepsake moment"
              className="mx-auto max-w-full h-48 object-cover rounded-lg mb-6"
            />
          )}
          
          <Button 
            size="lg"
            disabled={isCapturing || isCaptured}
            style={{ 
              backgroundColor: isCaptured ? '#10b981' : theme.colors.primary, 
              color: theme.colors.background 
            }}
            onClick={() => {
              if (!isCapturing && !isCaptured) {
                const title = cue.payload?.title || 'Event Moment';
                const description = cue.payload?.description || 'A special moment from the live event';
                onSubmitKeepsake(cue.id, title, description);
              }
            }}
          >
            {isCapturing ? (
              <>
                <div className="w-5 h-5 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                Capturing...
              </>
            ) : isCaptured ? (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Captured!
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
                </svg>
                Capture Moment
              </>
            )}
          </Button>
          
          {isCaptured && (
            <p className="text-green-300 text-sm mt-4">
              ✓ Moment saved to your memory wallet!
            </p>
          )}
          
          {keepsakeCapture?.error && (
            <p className="text-orange-300 text-sm mt-4">
              ⚠️ {keepsakeCapture.error} - queued for retry
            </p>
          )}
        </div>
      );

    case 'TASK':
      const isCompleted = taskCompletion?.completed;
      const isCompletingTask = taskCompletion?.isSubmitting;
      const taskType = cue.payload?.taskType || 'motion';
      
      return (
        <div className="text-center">
          <h3 className="text-xl font-medium mb-4" style={{ color: theme.colors.primary }}>
            {cue.payload?.title || `${taskType.charAt(0).toUpperCase() + taskType.slice(1)} Challenge`}
          </h3>
          <p className="text-white/80 text-lg mb-6">
            {cue.payload?.description || `Complete this ${taskType} task to earn points!`}
          </p>
          
          {/* Task-specific content */}
          {taskType === 'motion' && (
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-blue-500/20 flex items-center justify-center">
                <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                </svg>
              </div>
              <p className="text-white/70 text-sm">
                {cue.payload?.instructions || 'Stand up and wave your hands in the air!'}
              </p>
            </div>
          )}
          
          {taskType === 'audio' && (
            <div className="mb-6">
              <div className="w-20 h-20 mx-auto mb-4 rounded-full bg-purple-500/20 flex items-center justify-center">
                <svg className="w-10 h-10 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                </svg>
              </div>
              <p className="text-white/70 text-sm">
                {cue.payload?.instructions || 'Cheer loudly and make some noise!'}
              </p>
            </div>
          )}
          
          <Button 
            size="lg"
            disabled={isCompletingTask || isCompleted}
            style={{ 
              backgroundColor: isCompleted ? '#10b981' : theme.colors.primary, 
              color: theme.colors.background 
            }}
            onClick={() => {
              if (!isCompletingTask && !isCompleted) {
                onCompleteTask(cue.id, taskType, {
                  instructions: cue.payload?.instructions,
                  completedAt: Date.now()
                });
              }
            }}
          >
            {isCompletingTask ? (
              <>
                <div className="w-5 h-5 mr-2 border-2 border-current border-t-transparent rounded-full animate-spin"></div>
                Completing...
              </>
            ) : isCompleted ? (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
                Completed!
              </>
            ) : (
              <>
                <svg className="w-5 h-5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4" />
                </svg>
                Complete Task
              </>
            )}
          </Button>
          
          {isCompleted && (
            <p className="text-green-300 text-sm mt-4">
              ✓ Task completed! Points awarded!
            </p>
          )}
          
          {taskCompletion?.error && (
            <p className="text-orange-300 text-sm mt-4">
              ⚠️ {taskCompletion.error} - queued for retry
            </p>
          )}
        </div>
      );
      
    case 'BROADCAST':
      const urgencyLevel = cue.payload?.urgency || 'medium';
      const urgencyColors = {
        low: { bg: 'bg-blue-500/20', border: 'border-blue-500/40', text: 'text-blue-400', icon: 'text-blue-400' },
        medium: { bg: 'bg-yellow-500/20', border: 'border-yellow-500/40', text: 'text-yellow-400', icon: 'text-yellow-400' },
        high: { bg: 'bg-orange-500/20', border: 'border-orange-500/40', text: 'text-orange-400', icon: 'text-orange-400' },
        critical: { bg: 'bg-red-500/20', border: 'border-red-500/40', text: 'text-red-400', icon: 'text-red-400' }
      };
      const colors = urgencyColors[urgencyLevel as keyof typeof urgencyColors] || urgencyColors.medium;
      
      return (
        <div className={`text-center p-4 rounded-lg border ${colors.bg} ${colors.border}`}>
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-black/20 flex items-center justify-center">
            <svg className={`w-8 h-8 ${colors.icon}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 5.882V19.24a1.76 1.76 0 01-3.417.592l-2.147-6.15M18 13a3 3 0 100-6M5.436 13.683A4.001 4.001 0 017 6h1.832c4.1 0 7.625-1.234 9.168-3v14c-1.543-1.766-5.067-3-9.168-3H7a3.988 3.988 0 01-1.564-.317z" />
            </svg>
          </div>
          <h3 className={`text-xl font-medium mb-4 ${colors.text}`}>
            {cue.payload?.title || 'Important Announcement'}
          </h3>
          <p className="text-white/90 text-lg leading-relaxed">
            {cue.payload?.message}
          </p>
          
          {urgencyLevel === 'critical' && (
            <div className="mt-4 animate-pulse">
              <p className="text-red-300 text-sm font-medium">
                ⚠️ URGENT: Please pay attention to this message
              </p>
            </div>
          )}
        </div>
      );

    default:
      return (
        <div className="text-center">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-white/5 flex items-center justify-center">
            <svg className="w-8 h-8 text-white/40" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8.228 9c.549-1.165 2.03-2 3.772-2 2.21 0 4 1.343 4 3 0 1.4-1.278 2.575-3.006 2.907-.542.104-.994.54-.994 1.093m0 3h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <h3 className="text-lg font-medium mb-2 text-white/60">Unknown Cue Type</h3>
          <p className="text-white/40 text-sm">Cue type '{cue.type}' is not yet supported</p>
          {cue.payload?.message && (
            <p className="text-white/60 text-sm mt-4">{cue.payload.message}</p>
          )}
        </div>
      );
  }
}