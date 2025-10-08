/**
 * Stack Auth helper for Express.js and WebSocket server contexts
 *
 * Note: src/stack/server.tsx uses "server-only" which prevents it from being
 * imported in Express/WebSocket contexts. This file provides the same functionality
 * without the "server-only" restriction.
 */

import { StackServerApp } from '@stackframe/stack';

// Create Stack Auth instance for server contexts (Express, WebSocket)
export const stackServerApp = new StackServerApp({
  tokenStore: 'nextjs-cookie',
});

/**
 * Get current user from Stack Auth
 */
export async function getStackUser() {
  try {
    return await stackServerApp.getUser();
  } catch (error) {
    console.error('Failed to get Stack user:', error);
    return null;
  }
}
