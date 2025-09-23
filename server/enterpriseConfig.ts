/**
 * Enterprise Configuration Module
 * 
 * Centralized configuration for enterprise features with graceful degradation
 * when ENTERPRISE_MODE is disabled.
 */

export interface EnterpriseConfig {
  isEnabled: boolean;
  mode: 'full' | 'degraded' | 'disabled';
  reason?: string;
}

/**
 * Check if enterprise mode is enabled
 * Defaults to degraded mode for safety
 */
function getEnterpriseConfig(): EnterpriseConfig {
  const enterpriseMode = process.env.ENTERPRISE_MODE?.toLowerCase();
  
  switch (enterpriseMode) {
    case 'true':
    case '1':
    case 'enabled':
    case 'full':
      return {
        isEnabled: true,
        mode: 'full'
      };
    
    case 'false':
    case '0':
    case 'disabled':
      return {
        isEnabled: false,
        mode: 'disabled',
        reason: 'Enterprise mode explicitly disabled'
      };
    
    default:
      // Default to degraded mode for safety
      return {
        isEnabled: false,
        mode: 'degraded',
        reason: 'Enterprise mode not configured - running in degraded mode'
      };
  }
}

export const enterpriseConfig = getEnterpriseConfig();

/**
 * Check if enterprise features should be enabled
 */
export function isEnterpriseEnabled(): boolean {
  return enterpriseConfig.isEnabled;
}

/**
 * Check if running in degraded mode
 */
export function isDegradedMode(): boolean {
  return enterpriseConfig.mode === 'degraded';
}

/**
 * Get current enterprise status for health checks
 */
export function getEnterpriseStatus() {
  if (enterpriseConfig.isEnabled) {
    return {
      status: 'healthy',
      mode: 'full',
      features: 'all_enabled'
    };
  } else if (enterpriseConfig.mode === 'degraded') {
    return {
      status: 'degraded',
      mode: 'degraded',
      features: 'limited',
      reason: enterpriseConfig.reason || 'Enterprise features unavailable'
    };
  } else {
    return {
      status: 'disabled',
      mode: 'disabled',
      features: 'none',
      reason: enterpriseConfig.reason || 'Enterprise features disabled'
    };
  }
}

console.info(`🏢 Enterprise mode: ${enterpriseConfig.mode}${enterpriseConfig.reason ? ` (${enterpriseConfig.reason})` : ''}`);