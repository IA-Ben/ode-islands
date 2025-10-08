/**
 * Centralized Configuration Management
 * 
 * This file manages all application configuration, environment variables,
 * and feature flags in a type-safe, centralized manner.
 */

export interface AppConfig {
  // Environment
  nodeEnv: 'development' | 'production' | 'test';
  port: number;
  isDevelopment: boolean;
  isProduction: boolean;
  
  // URLs and Domains
  baseUrl: string;
  cdnUrl: string;
  domain?: string;
  
  // Database
  databaseUrl: string;
  
  // Authentication & Security
  jwtSecret: string;
  sessionSecret: string;
  csrfSecret?: string;
  qrSecret?: string;
  
  // Media & Storage
  storage: {
    provider: 'google-cloud' | 'aws-s3' | 'local';
    hostname: string;
    bucketName: string;
    enableOptimization: boolean;
  };
  
  // Performance
  cache: {
    defaultTTL: number;
    longTTL: number;
    enableRedis: boolean;
    redisUrl?: string;
  };
  
  // Features Flags
  features: {
    enableAR: boolean;
    enableRealTimeUpdates: boolean;
    enableAnalytics: boolean;
    enableCertificates: boolean;
    enableNotifications: boolean;
    enableMemoryWallet: boolean;
    enableFanScoring: boolean;
    enableLiveEvents: boolean;
    dataSaverMode: boolean;
    mobileOptimizations: boolean;
    // Button System Feature Flags
    enableUnifiedButtons: boolean;
    enableButtonMonitoring: boolean;
    buttonSystemRolloutPercentage: number;
    enableEmergencyButtonDisable: boolean;
  };
  
  // Media Processing
  media: {
    ffmpegPreset: string;
    maxVideoQuality: '480p' | '720p' | '1080p' | '4k';
    enableTranscoding: boolean;
    adaptiveStreaming: boolean;
  };
  
  // Rate Limiting
  rateLimiting: {
    enableGlobal: boolean;
    loginAttempts: number;
    registrationAttempts: number;
    apiRequestsPerMinute: number;
    windowMs: number;
  };
  
  // WebSocket
  websocket: {
    enableAuthentication: boolean;
    heartbeatInterval: number;
    maxConnections: number;
  };
  
  // Analytics
  analytics: {
    enableRealTime: boolean;
    refreshInterval: number;
    maxDataPoints: number;
  };
}

/**
 * Load and validate configuration from environment variables
 */
function loadConfig(): AppConfig {
  const nodeEnv = (process.env.NODE_ENV as AppConfig['nodeEnv']) || 'development';
  const isDevelopment = nodeEnv === 'development';
  const isProduction = nodeEnv === 'production';
  
  // Check if we're in a server environment (Node.js vs browser)
  const isServerSide = typeof window === 'undefined';

  // Check if we're in build phase (next.config.ts import) - skip validation
  const isBuildPhase = process.env.NEXT_PHASE === 'phase-production-build' ||
                       process.env.VERCEL_ENV === undefined && isProduction;

  // Validate required environment variables (only on server-side runtime, not during build)
  if (isServerSide && !isBuildPhase) {
    const requiredEnvVars = ['DATABASE_URL'];
    if (isProduction) {
      requiredEnvVars.push('JWT_SECRET', 'SESSION_SECRET');
    }

    for (const envVar of requiredEnvVars) {
      if (!process.env[envVar]) {
        throw new Error(`Missing required environment variable: ${envVar}`);
      }
    }
  }
  
  // JWT Secret validation
  const jwtSecret = process.env.JWT_SECRET || 'development-secret-key-please-change-in-production';
  if (isProduction && jwtSecret.length < 32) {
    throw new Error('JWT_SECRET must be at least 32 characters long in production');
  }
  
  return {
    // Environment
    nodeEnv,
    port: parseInt(process.env.PORT || '5000', 10),
    isDevelopment,
    isProduction,
    
    // URLs and Domains
    baseUrl: process.env.BASE_URL || (isDevelopment ? 'http://localhost:5000' : 'https://your-domain.com'),
    cdnUrl: process.env.CDN_URL || 'https://storage.googleapis.com/odeislands',
    domain: process.env.DOMAIN,
    
    // Database (server-side only, fallback during build)
    databaseUrl: isServerSide ? (process.env.DATABASE_URL || '') : '',
    
    // Authentication & Security (server-side only for sensitive secrets)
    jwtSecret: isServerSide ? jwtSecret : '',
    sessionSecret: isServerSide ? (process.env.SESSION_SECRET || 'development-session-secret') : '',
    csrfSecret: isServerSide ? process.env.CSRF_SECRET : undefined,
    qrSecret: isServerSide ? process.env.QR_SECRET : undefined,
    
    // Media & Storage
    storage: {
      provider: (process.env.STORAGE_PROVIDER as AppConfig['storage']['provider']) || 'google-cloud',
      hostname: process.env.STORAGE_HOSTNAME || 'storage.googleapis.com',
      bucketName: process.env.STORAGE_BUCKET || 'odeislands',
      enableOptimization: process.env.ENABLE_MEDIA_OPTIMIZATION !== 'false',
    },
    
    // Performance
    cache: {
      defaultTTL: parseInt(process.env.CACHE_TTL || '120000', 10), // 2 minutes
      longTTL: parseInt(process.env.CACHE_LONG_TTL || '900000', 10), // 15 minutes
      enableRedis: process.env.ENABLE_REDIS === 'true',
      redisUrl: process.env.REDIS_URL,
    },
    
    // Feature Flags
    features: {
      enableAR: process.env.ENABLE_AR !== 'false',
      enableRealTimeUpdates: process.env.ENABLE_REALTIME !== 'false',
      enableAnalytics: process.env.ENABLE_ANALYTICS !== 'false',
      enableCertificates: process.env.ENABLE_CERTIFICATES !== 'false',
      enableNotifications: process.env.ENABLE_NOTIFICATIONS !== 'false',
      enableMemoryWallet: process.env.ENABLE_MEMORY_WALLET !== 'false',
      enableFanScoring: process.env.ENABLE_FAN_SCORING !== 'false',
      enableLiveEvents: process.env.ENABLE_LIVE_EVENTS !== 'false',
      dataSaverMode: process.env.ENABLE_DATA_SAVER === 'true',
      mobileOptimizations: process.env.ENABLE_MOBILE_OPTIMIZATIONS !== 'false',
      // Button System Feature Flags
      enableUnifiedButtons: process.env.ENABLE_UNIFIED_BUTTONS !== 'false',
      enableButtonMonitoring: process.env.ENABLE_BUTTON_MONITORING !== 'false',
      buttonSystemRolloutPercentage: parseInt(process.env.BUTTON_ROLLOUT_PERCENTAGE || '100', 10),
      enableEmergencyButtonDisable: process.env.ENABLE_EMERGENCY_BUTTON_DISABLE === 'true',
    },
    
    // Media Processing
    media: {
      ffmpegPreset: process.env.FFMPEG_PRESET || 'fast',
      maxVideoQuality: (process.env.MAX_VIDEO_QUALITY as AppConfig['media']['maxVideoQuality']) || '1080p',
      enableTranscoding: process.env.ENABLE_TRANSCODING !== 'false',
      adaptiveStreaming: process.env.ENABLE_ADAPTIVE_STREAMING !== 'false',
    },
    
    // Rate Limiting
    rateLimiting: {
      enableGlobal: process.env.ENABLE_RATE_LIMITING !== 'false',
      loginAttempts: parseInt(process.env.LOGIN_RATE_LIMIT || '5', 10),
      registrationAttempts: parseInt(process.env.REGISTRATION_RATE_LIMIT || '3', 10),
      apiRequestsPerMinute: parseInt(process.env.API_RATE_LIMIT || '100', 10),
      windowMs: parseInt(process.env.RATE_LIMIT_WINDOW || '900000', 10), // 15 minutes
    },
    
    // WebSocket
    websocket: {
      enableAuthentication: process.env.WS_ENABLE_AUTH === 'true',
      heartbeatInterval: parseInt(process.env.WS_HEARTBEAT_INTERVAL || '30000', 10),
      maxConnections: parseInt(process.env.WS_MAX_CONNECTIONS || '1000', 10),
    },
    
    // Analytics
    analytics: {
      enableRealTime: process.env.ANALYTICS_REALTIME !== 'false',
      refreshInterval: parseInt(process.env.ANALYTICS_REFRESH_INTERVAL || '60000', 10),
      maxDataPoints: parseInt(process.env.ANALYTICS_MAX_DATA_POINTS || '1000', 10),
    },
  };
}

// Singleton configuration instance
let configInstance: AppConfig | null = null;

/**
 * Get the application configuration
 * Throws an error if configuration is invalid
 */
export function getConfig(): AppConfig {
  if (!configInstance) {
    configInstance = loadConfig();
  }
  return configInstance;
}

/**
 * Reset configuration instance (useful for testing)
 */
export function resetConfig(): void {
  configInstance = null;
}

/**
 * Check if a feature is enabled
 */
export function isFeatureEnabled(feature: keyof AppConfig['features']): boolean | number {
  return getConfig().features[feature];
}

/**
 * Get environment-specific configuration values
 */
export const env = {
  isDevelopment: () => getConfig().isDevelopment,
  isProduction: () => getConfig().isProduction,
  getPort: () => getConfig().port,
  getDatabaseUrl: () => getConfig().databaseUrl,
  getCdnUrl: () => getConfig().cdnUrl,
  getBaseUrl: () => getConfig().baseUrl,
} as const;

export default getConfig;