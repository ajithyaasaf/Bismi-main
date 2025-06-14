/**
 * Production configuration management for enterprise deployment
 * Handles environment-specific settings, security, and performance optimization
 */

export interface ProductionConfig {
  firebase: {
    maxRetries: number;
    timeout: number;
    enableHealthCheck: boolean;
    connectionPooling: boolean;
  };
  monitoring: {
    enableMetrics: boolean;
    metricsHistorySize: number;
    healthCheckInterval: number;
    alertThresholds: {
      responseTime: number;
      errorRate: number;
      memoryUsage: number;
      healthScore: number;
    };
  };
  security: {
    enableCors: boolean;
    allowedOrigins: string[];
    enableRateLimiting: boolean;
    maxRequestsPerMinute: number;
  };
  performance: {
    enableCaching: boolean;
    cacheTimeout: number;
    enableCompression: boolean;
    maxPayloadSize: string;
  };
  logging: {
    level: 'error' | 'warn' | 'info' | 'debug';
    enableStructuredLogging: boolean;
    enableErrorTracking: boolean;
  };
}

export class ProductionConfigManager {
  private static instance: ProductionConfigManager | null = null;
  private config: ProductionConfig;

  private constructor() {
    this.config = this.loadConfiguration();
  }

  static getInstance(): ProductionConfigManager {
    if (!this.instance) {
      this.instance = new ProductionConfigManager();
    }
    return this.instance;
  }

  private loadConfiguration(): ProductionConfig {
    const isProduction = process.env.NODE_ENV === 'production';
    const isVercel = !!process.env.VERCEL;

    return {
      firebase: {
        maxRetries: parseInt(process.env.FIREBASE_MAX_RETRIES || '3'),
        timeout: parseInt(process.env.FIREBASE_TIMEOUT || (isVercel ? '8000' : '10000')),
        enableHealthCheck: process.env.FIREBASE_HEALTH_CHECK !== 'false',
        connectionPooling: isProduction
      },
      monitoring: {
        enableMetrics: process.env.DISABLE_MONITORING !== 'true',
        metricsHistorySize: parseInt(process.env.METRICS_HISTORY_SIZE || '10000'),
        healthCheckInterval: parseInt(process.env.HEALTH_CHECK_INTERVAL || '60000'),
        alertThresholds: {
          responseTime: parseInt(process.env.ALERT_RESPONSE_TIME || '2000'),
          errorRate: parseFloat(process.env.ALERT_ERROR_RATE || '5'),
          memoryUsage: parseInt(process.env.ALERT_MEMORY_MB || '512'),
          healthScore: parseInt(process.env.ALERT_HEALTH_SCORE || '70')
        }
      },
      security: {
        enableCors: true,
        allowedOrigins: process.env.ALLOWED_ORIGINS?.split(',') || ['*'],
        enableRateLimiting: isProduction,
        maxRequestsPerMinute: parseInt(process.env.RATE_LIMIT_RPM || '100')
      },
      performance: {
        enableCaching: isProduction,
        cacheTimeout: parseInt(process.env.CACHE_TIMEOUT || '300'),
        enableCompression: isProduction,
        maxPayloadSize: process.env.MAX_PAYLOAD_SIZE || '10mb'
      },
      logging: {
        level: (process.env.LOG_LEVEL as any) || (isProduction ? 'warn' : 'info'),
        enableStructuredLogging: isProduction,
        enableErrorTracking: process.env.DISABLE_ERROR_TRACKING !== 'true'
      }
    };
  }

  getConfig(): ProductionConfig {
    return { ...this.config };
  }

  getFirebaseConfig() {
    return this.config.firebase;
  }

  getMonitoringConfig() {
    return this.config.monitoring;
  }

  getSecurityConfig() {
    return this.config.security;
  }

  getPerformanceConfig() {
    return this.config.performance;
  }

  getLoggingConfig() {
    return this.config.logging;
  }

  isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
  }

  isVercelEnvironment(): boolean {
    return !!process.env.VERCEL;
  }

  shouldEnableFeature(feature: string): boolean {
    const envVar = `ENABLE_${feature.toUpperCase()}`;
    return process.env[envVar] !== 'false';
  }

  getEnvironmentInfo() {
    return {
      nodeEnv: process.env.NODE_ENV,
      platform: this.isVercelEnvironment() ? 'vercel' : 'custom',
      region: process.env.VERCEL_REGION || 'unknown',
      deployment: process.env.VERCEL_GIT_COMMIT_SHA?.substring(0, 7) || 'local',
      timestamp: new Date().toISOString()
    };
  }

  validateConfiguration(): { valid: boolean; issues: string[] } {
    const issues: string[] = [];

    // Validate Firebase configuration
    if (!process.env.FIREBASE_PROJECT_ID && !process.env.FIREBASE_SERVICE_ACCOUNT_KEY) {
      issues.push('Missing Firebase configuration');
    }

    // Validate timeouts
    if (this.config.firebase.timeout < 1000) {
      issues.push('Firebase timeout too low (minimum 1000ms recommended)');
    }

    // Validate monitoring settings
    if (this.config.monitoring.metricsHistorySize < 100) {
      issues.push('Metrics history size too low');
    }

    // Validate security settings
    if (this.config.security.enableRateLimiting && this.config.security.maxRequestsPerMinute < 10) {
      issues.push('Rate limit too restrictive');
    }

    return {
      valid: issues.length === 0,
      issues
    };
  }

  logConfiguration(): void {
    const sensitiveKeys = ['FIREBASE_PRIVATE_KEY', 'FIREBASE_SERVICE_ACCOUNT_KEY'];
    const envInfo = this.getEnvironmentInfo();
    const validation = this.validateConfiguration();

    console.log('🔧 Production Configuration Loaded:', {
      environment: envInfo,
      config: {
        firebase: {
          ...this.config.firebase,
          hasCredentials: !!(process.env.FIREBASE_PROJECT_ID || process.env.FIREBASE_SERVICE_ACCOUNT_KEY)
        },
        monitoring: this.config.monitoring,
        security: {
          ...this.config.security,
          allowedOrigins: this.config.security.allowedOrigins.length > 3 ? 
            `${this.config.security.allowedOrigins.slice(0, 3).join(', ')}...` : 
            this.config.security.allowedOrigins.join(', ')
        },
        performance: this.config.performance,
        logging: this.config.logging
      },
      validation
    });

    if (!validation.valid) {
      console.warn('⚠️  Configuration Issues:', validation.issues);
    }
  }
}

export const productionConfig = ProductionConfigManager.getInstance();