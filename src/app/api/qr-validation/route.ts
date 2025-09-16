import { NextRequest, NextResponse } from 'next/server';
import { db } from '../../../../server/db';
import { liveEvents, userProgress, fanScoreEvents } from '../../../../shared/schema';
import { eq, and } from 'drizzle-orm';
import { withAuth } from '../../../../server/auth';
import crypto from 'crypto';

// CRC32 implementation for offline QR validation
function crc32(data: string): number {
  const table = [];
  let crc = 0;
  
  // Generate CRC32 table
  for (let i = 0; i < 256; i++) {
    crc = i;
    for (let j = 0; j < 8; j++) {
      crc = (crc & 1) ? (0xEDB88320 ^ (crc >>> 1)) : (crc >>> 1);
    }
    table[i] = crc;
  }
  
  crc = 0xFFFFFFFF;
  
  for (let i = 0; i < data.length; i++) {
    crc = table[(crc ^ data.charCodeAt(i)) & 0xFF] ^ (crc >>> 8);
  }
  
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// Generate CRC32 checksum for QR code data (for offline validation)
function generateQRCRC(qrData: string): string {
  // Remove CRC field if present to calculate base checksum
  const baseData = qrData.replace(/\|CRC:[^|]*/, '');
  const checksum = crc32(baseData);
  return checksum.toString(16).padStart(8, '0').toUpperCase();
}

// QR Code format: E:<eventShort>|C:<chapter>|S:<seq>|V:1|H:<hmac>|T:<timestamp>|N:<nonce>|CRC:<checksum>

// QR Code Security Configuration
const QR_SECRET = process.env.QR_SECRET || (() => {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('QR_SECRET environment variable is required in production');
  }
  console.warn('⚠️  WARNING: QR_SECRET not set, using default for development only');
  return 'dev-qr-secret-change-in-production-with-256-bit-key';
})();

const QR_VALIDITY_WINDOW_MS = 5 * 60 * 1000; // 5 minutes validity window
const QR_REPLAY_CACHE = new Map<string, number>(); // In-memory replay protection (use Redis in production)

interface QRValidationRequest {
  qrData: string;
  eventId?: string; // Optional - for additional context validation
}

interface QRValidationResponse {
  success: boolean;
  message: string;
  isValid?: boolean;
  eventId?: string;
  chapterId?: string;
  sequenceId?: string;
  points?: number;
  alreadyCollected?: boolean;
  error?: string;
}

// Parse QR code format safely
function parseQRCode(qrData: string): {
  eventId: string;
  chapterId: string;
  sequenceId: string;
  version: string;
  hmac: string;
  timestamp?: string;
  nonce?: string;
  crc?: string;
} | null {
  try {
    if (!qrData.startsWith('E:')) {
      return null;
    }

    const parts = qrData.split('|');
    const parsed: any = {};

    for (const part of parts) {
      const [key, value] = part.split(':', 2);
      switch (key) {
        case 'E':
          parsed.eventId = value;
          break;
        case 'C':
          parsed.chapterId = value;
          break;
        case 'S':
          parsed.sequenceId = value;
          break;
        case 'V':
          parsed.version = value;
          break;
        case 'H':
          parsed.hmac = value;
          break;
        case 'T':
          parsed.timestamp = value;
          break;
        case 'N':
          parsed.nonce = value;
          break;
        case 'CRC':
          parsed.crc = value;
          break;
      }
    }

    // Validate required fields
    if (!parsed.eventId || !parsed.chapterId || !parsed.sequenceId || 
        !parsed.version || !parsed.hmac) {
      return null;
    }

    return parsed;
  } catch (error) {
    console.error('QR parsing error:', error);
    return null;
  }
}

// Cryptographically verify QR code integrity (HMAC + CRC)
function verifyQRIntegrity(parsedQR: any, originalQRData: string): { isValid: boolean; hasValidHmac: boolean; hasValidCrc: boolean } {
  try {
    // Reconstruct the data that should have been signed
    let dataToSign = `E:${parsedQR.eventId}|C:${parsedQR.chapterId}|S:${parsedQR.sequenceId}|V:${parsedQR.version}`;
    
    // Add timestamp and nonce if present
    if (parsedQR.timestamp) {
      dataToSign += `|T:${parsedQR.timestamp}`;
    }
    if (parsedQR.nonce) {
      dataToSign += `|N:${parsedQR.nonce}`;
    }

    // HMAC validation (primary security check)
    const expectedHmac = crypto
      .createHmac('sha256', QR_SECRET)
      .update(dataToSign)
      .digest('hex')
      .substring(0, 16); // Use first 16 chars to keep QR codes readable

    const hasValidHmac = parsedQR.hmac === expectedHmac;

    // CRC validation (for offline validation fallback)
    let hasValidCrc = true;
    if (parsedQR.crc) {
      const expectedCrc = generateQRCRC(originalQRData);
      hasValidCrc = parsedQR.crc.toUpperCase() === expectedCrc;
    }

    return {
      isValid: hasValidHmac && hasValidCrc,
      hasValidHmac,
      hasValidCrc
    };
  } catch (error) {
    console.error('QR integrity verification error:', error);
    return {
      isValid: false,
      hasValidHmac: false,
      hasValidCrc: false
    };
  }
}

// Check for replay attacks
function checkReplayProtection(parsedQR: any): { isValid: boolean; reason?: string } {
  try {
    // If timestamp is present, validate freshness
    if (parsedQR.timestamp) {
      const qrTimestamp = parseInt(parsedQR.timestamp, 10);
      const now = Date.now();
      
      if (isNaN(qrTimestamp)) {
        return { isValid: false, reason: 'Invalid timestamp format' };
      }

      // Check if QR code is within validity window
      if (Math.abs(now - qrTimestamp) > QR_VALIDITY_WINDOW_MS) {
        return { isValid: false, reason: 'QR code expired or timestamp invalid' };
      }
    }

    // Check nonce-based replay protection
    if (parsedQR.nonce) {
      const cacheKey = `${parsedQR.eventId}-${parsedQR.chapterId}-${parsedQR.sequenceId}-${parsedQR.nonce}`;
      
      if (QR_REPLAY_CACHE.has(cacheKey)) {
        return { isValid: false, reason: 'QR code already used (replay detected)' };
      }

      // Add to replay cache (with automatic cleanup)
      QR_REPLAY_CACHE.set(cacheKey, Date.now());
      
      // Clean up old entries periodically
      if (QR_REPLAY_CACHE.size % 100 === 0) {
        const cutoff = Date.now() - QR_VALIDITY_WINDOW_MS * 2;
        for (const [key, timestamp] of QR_REPLAY_CACHE.entries()) {
          if (timestamp < cutoff) {
            QR_REPLAY_CACHE.delete(key);
          }
        }
      }
    }

    return { isValid: true };
  } catch (error) {
    console.error('Replay protection check error:', error);
    return { isValid: false, reason: 'Security validation failed' };
  }
}

// Validate event context
async function validateEventContext(parsedQR: any, requestEventId?: string): Promise<{ isValid: boolean; reason?: string }> {
  try {
    // Verify event exists in database
    const event = await db
      .select({ id: liveEvents.id, isActive: liveEvents.isActive })
      .from(liveEvents)
      .where(eq(liveEvents.id, parsedQR.eventId))
      .limit(1);

    if (event.length === 0) {
      return { isValid: false, reason: 'Event not found' };
    }

    // Verify event is active
    if (!event[0].isActive) {
      return { isValid: false, reason: 'Event is not currently active' };
    }

    // If request specifies an event ID, make sure it matches
    if (requestEventId && requestEventId !== parsedQR.eventId) {
      return { isValid: false, reason: 'QR code is not valid for this event' };
    }

    return { isValid: true };
  } catch (error) {
    console.error('Event context validation error:', error);
    return { isValid: false, reason: 'Database validation failed' };
  }
}

// Check if user has already collected this chapter
async function checkAlreadyCollected(userId: string, eventId: string, chapterId: string): Promise<boolean> {
  try {
    const existing = await db
      .select({ id: userProgress.id })
      .from(userProgress)
      .where(
        and(
          eq(userProgress.userId, userId),
          eq(userProgress.chapterId, `${eventId}-${chapterId}`)
        )
      )
      .limit(1);

    return existing.length > 0;
  } catch (error) {
    console.error('Already collected check error:', error);
    return false;
  }
}

async function handlePOST(request: NextRequest) {
  try {
    const body: QRValidationRequest = await request.json();
    const { qrData, eventId: requestEventId } = body;
    const session = (request as any).session;

    if (!qrData) {
      return NextResponse.json({
        success: false,
        message: 'QR code data is required',
        isValid: false,
      } as QRValidationResponse, { status: 400 });
    }

    // Step 1: Parse QR code format
    const parsedQR = parseQRCode(qrData);
    if (!parsedQR) {
      return NextResponse.json({
        success: false,
        message: 'Invalid QR code format',
        isValid: false,
        error: 'INVALID_FORMAT',
      } as QRValidationResponse, { status: 400 });
    }

    // Step 2: Verify cryptographic integrity (HMAC + CRC)
    const integrityCheck = verifyQRIntegrity(parsedQR, qrData);
    if (!integrityCheck.isValid) {
      console.warn(`QR integrity check failed for user ${session.userId}: HMAC=${integrityCheck.hasValidHmac}, CRC=${integrityCheck.hasValidCrc}`);
      
      const errorType = !integrityCheck.hasValidHmac ? 'HMAC_FAILED' : 'CRC_FAILED';
      const message = !integrityCheck.hasValidHmac 
        ? 'QR code cryptographic signature verification failed'
        : 'QR code checksum verification failed';
        
      return NextResponse.json({
        success: false,
        message,
        isValid: false,
        error: errorType,
      } as QRValidationResponse, { status: 400 });
    }

    // Step 3: Check replay protection
    const replayCheck = checkReplayProtection(parsedQR);
    if (!replayCheck.isValid) {
      console.warn(`QR replay protection failed for user ${session.userId}: ${replayCheck.reason}`);
      return NextResponse.json({
        success: false,
        message: replayCheck.reason || 'QR code security validation failed',
        isValid: false,
        error: 'REPLAY_DETECTED',
      } as QRValidationResponse, { status: 400 });
    }

    // Step 4: Validate event context
    const eventValidation = await validateEventContext(parsedQR, requestEventId);
    if (!eventValidation.isValid) {
      return NextResponse.json({
        success: false,
        message: eventValidation.reason || 'Event validation failed',
        isValid: false,
        error: 'EVENT_INVALID',
      } as QRValidationResponse, { status: 400 });
    }

    // Step 5: Check if already collected
    const alreadyCollected = await checkAlreadyCollected(
      session.userId, 
      parsedQR.eventId, 
      parsedQR.chapterId
    );

    // Success response
    const response: QRValidationResponse = {
      success: true,
      message: 'QR code is valid',
      isValid: true,
      eventId: parsedQR.eventId,
      chapterId: parsedQR.chapterId,
      sequenceId: parsedQR.sequenceId,
      points: alreadyCollected ? 0 : 10, // Example points system
      alreadyCollected,
    };

    // Log successful validation
    console.log(`Valid QR validated for user ${session.userId}: ${parsedQR.eventId}-${parsedQR.chapterId}-${parsedQR.sequenceId}`);

    return NextResponse.json(response);

  } catch (error) {
    console.error('QR validation error:', error instanceof Error ? error.message : String(error));
    return NextResponse.json({
      success: false,
      message: 'Internal server error during QR validation',
      isValid: false,
      error: 'SERVER_ERROR',
    } as QRValidationResponse, { status: 500 });
  }
}

// Apply authentication middleware
export const POST = withAuth(handlePOST); // QR validation requires authentication