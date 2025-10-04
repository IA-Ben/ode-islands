/**
 * Pub/Sub Video Transcoding Publisher
 * 
 * Alternative to direct HTTP invocation of Cloud Run transcoder.
 * Provides better scalability, automatic retries, and decoupling.
 */

import { PubSub } from '@google-cloud/pubsub';

const USE_PUBSUB = process.env.USE_PUBSUB_TRANSCODING === 'true';
const PUBSUB_TOPIC = process.env.PUBSUB_TRANSCODING_TOPIC || 'video-transcode-requests';
const CLOUD_RUN_URL = process.env.CLOUD_RUN_TRANSCODER_URL;

let pubsubClient: PubSub | null = null;

/**
 * Get or initialize Pub/Sub client
 */
function getPubSubClient(): PubSub {
  if (!pubsubClient) {
    pubsubClient = new PubSub();
  }
  return pubsubClient;
}

/**
 * Trigger video transcoding via Pub/Sub
 */
export async function triggerTranscodingViaPubSub(
  videoId: string,
  inputUri: string
): Promise<void> {
  const client = getPubSubClient();
  const topic = client.topic(PUBSUB_TOPIC);

  const message = {
    videoId,
    inputUri,
    timestamp: new Date().toISOString()
  };

  const dataBuffer = Buffer.from(JSON.stringify(message));

  try {
    const messageId = await topic.publishMessage({ data: dataBuffer });
    console.log(`✅ Published transcoding request to Pub/Sub: ${messageId}`);
    console.log(`   Video ID: ${videoId}, Input: ${inputUri}`);
  } catch (error) {
    console.error('❌ Failed to publish to Pub/Sub:', error);
    throw new Error(`Pub/Sub publish failed: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Trigger video transcoding via direct HTTP (fallback)
 */
export async function triggerTranscodingViaHTTP(
  videoId: string,
  inputUri: string
): Promise<void> {
  if (!CLOUD_RUN_URL) {
    throw new Error('CLOUD_RUN_TRANSCODER_URL not configured');
  }

  const response = await fetch(`${CLOUD_RUN_URL}/process`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      video_id: videoId,
      input_uri: inputUri
    })
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Cloud Run invocation failed: ${response.status} - ${errorText}`);
  }

  console.log(`✅ Triggered transcoding via HTTP for video: ${videoId}`);
}

/**
 * Trigger video transcoding (auto-selects method based on config)
 */
export async function triggerTranscoding(
  videoId: string,
  inputUri: string
): Promise<{ method: 'pubsub' | 'http' }> {
  try {
    if (USE_PUBSUB) {
      await triggerTranscodingViaPubSub(videoId, inputUri);
      return { method: 'pubsub' };
    } else {
      await triggerTranscodingViaHTTP(videoId, inputUri);
      return { method: 'http' };
    }
  } catch (error) {
    console.error('❌ Transcoding trigger failed:', error);
    throw error;
  }
}

/**
 * Health check for transcoding service
 */
export async function checkTranscodingServiceHealth(): Promise<{
  healthy: boolean;
  method: 'pubsub' | 'http';
  details?: any;
}> {
  try {
    if (USE_PUBSUB) {
      // Check Pub/Sub topic exists
      const client = getPubSubClient();
      const topic = client.topic(PUBSUB_TOPIC);
      const [exists] = await topic.exists();
      
      return {
        healthy: exists,
        method: 'pubsub',
        details: { topic: PUBSUB_TOPIC, exists }
      };
    } else {
      // Check Cloud Run health endpoint
      if (!CLOUD_RUN_URL) {
        return { healthy: false, method: 'http', details: { error: 'URL not configured' } };
      }

      const response = await fetch(`${CLOUD_RUN_URL}/health`);
      const data = await response.json();
      
      return {
        healthy: response.ok,
        method: 'http',
        details: data
      };
    }
  } catch (error) {
    return {
      healthy: false,
      method: USE_PUBSUB ? 'pubsub' : 'http',
      details: { error: error instanceof Error ? error.message : 'Unknown error' }
    };
  }
}
