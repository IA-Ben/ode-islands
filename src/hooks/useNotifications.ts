'use client';

/**
 * BACKWARD COMPATIBILITY LAYER
 * 
 * This file maintains backward compatibility for existing components
 * that use the old useNotifications hook. New code should use
 * useUnifiedNotifications from @/hooks/useUnifiedNotifications
 */

import { useNotificationsLegacy } from './useNotifications.legacy';

/**
 * Legacy useNotifications hook - delegates to unified system
 * @deprecated Use useUnifiedNotifications instead for new code
 */
export const useNotifications = () => {
  return useNotificationsLegacy();
};

export default useNotifications;