/**
 * Stack Auth helper for Express.js
 *
 * This is a lightweight wrapper around Stack Auth for Express routes.
 * Note: Stack Auth is primarily designed for Next.js, so this uses cookies directly.
 */

import { StackServerApp } from '@stackframe/stack';

// Create Stack Auth instance for Express
export const stackAuthExpress = new StackServerApp({
  tokenStore: 'nextjs-cookie',
});

/**
 * Get current user from Stack Auth in Express context
 * Note: This may not work as expected in Express since Stack Auth
 * is designed for Next.js Server Components
 */
export async function getStackUser() {
  try {
    return await stackAuthExpress.getUser();
  } catch (error) {
    console.error('Failed to get Stack user in Express:', error);
    return null;
  }
}
