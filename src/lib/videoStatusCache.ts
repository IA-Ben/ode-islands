/**
 * Client-side video status cache to avoid redundant API calls
 * Caches video transcoding status for 5-10 minutes
 */

interface CachedVideoStatus {
  videoId: string;
  status: 'completed' | 'ready' | 'processing' | 'error';
  has_portrait?: boolean;
  timestamp: number;
}

const CACHE_TTL = 7 * 60 * 1000; // 7 minutes cache
const cache = new Map<string, CachedVideoStatus>();

export async function getVideoStatus(videoId: string): Promise<{
  status: string;
  has_portrait?: boolean;
}> {
  // Check cache first
  const cached = cache.get(videoId);
  const now = Date.now();

  if (cached && (now - cached.timestamp) < CACHE_TTL) {
    console.log(`[Cache HIT] Video status for ${videoId}:`, cached.status);
    return {
      status: cached.status,
      has_portrait: cached.has_portrait
    };
  }

  // Cache miss or expired - fetch from API
  console.log(`[Cache MISS] Fetching video status for ${videoId}`);
  try {
    const response = await fetch(`/api/video-status/${videoId}`);
    const data = await response.json();

    // Cache the result
    cache.set(videoId, {
      videoId,
      status: data.status,
      has_portrait: data.has_portrait,
      timestamp: now
    });

    return data;
  } catch (err) {
    console.error('Video status fetch error:', err);
    // Return ready status as fallback
    return { status: 'ready' };
  }
}

/**
 * Batch fetch video statuses - more efficient than individual requests
 */
export async function getBatchVideoStatus(videoIds: string[]): Promise<Record<string, {
  status: string;
  has_portrait?: boolean;
}>> {
  const now = Date.now();
  const uncachedIds: string[] = [];
  const results: Record<string, { status: string; has_portrait?: boolean }> = {};

  // Check cache for each video
  videoIds.forEach((videoId) => {
    const cached = cache.get(videoId);
    if (cached && (now - cached.timestamp) < CACHE_TTL) {
      console.log(`[Cache HIT] Batch video status for ${videoId}:`, cached.status);
      results[videoId] = {
        status: cached.status,
        has_portrait: cached.has_portrait
      };
    } else {
      uncachedIds.push(videoId);
    }
  });

  // Fetch uncached videos in batch
  if (uncachedIds.length > 0) {
    console.log(`[Batch MISS] Fetching ${uncachedIds.length} video statuses`);
    try {
      const response = await fetch('/api/video-status/batch', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoIds: uncachedIds })
      });

      const data = await response.json();

      if (data.success && data.statuses) {
        // Cache and add to results
        Object.entries(data.statuses).forEach(([videoId, status]: [string, any]) => {
          cache.set(videoId, {
            videoId,
            status: status.status,
            has_portrait: status.has_portrait,
            timestamp: now
          });

          results[videoId] = {
            status: status.status,
            has_portrait: status.has_portrait
          };
        });
      }
    } catch (err) {
      console.error('Batch video status fetch error:', err);
      // Return ready status as fallback for uncached videos
      uncachedIds.forEach((videoId) => {
        results[videoId] = { status: 'ready' };
      });
    }
  }

  return results;
}

export function clearVideoStatusCache(videoId?: string) {
  if (videoId) {
    cache.delete(videoId);
    console.log(`Cleared cache for video ${videoId}`);
  } else {
    cache.clear();
    console.log('Cleared all video status cache');
  }
}

export function getCacheSize(): number {
  return cache.size;
}
