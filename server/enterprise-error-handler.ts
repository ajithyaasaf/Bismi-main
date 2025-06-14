/**
 * Enterprise-grade error handling and monitoring system
 * Provides structured error logging, alerting, and recovery mechanisms
 */

export interface ErrorContext {
  userId?: string;
  endpoint?: string;
  method?: string;
  userAgent?: string;
  ip?: string;
  timestamp: Date;
  requestId?: string;
  environment: string;
}

export interface ErrorMetrics {
  errorCount: number;
  errorRate: number;
  lastError?: Date;
  commonErrors: Record<string, number>;
  criticalErrors: number;
}

export class EnterpriseErrorHandler {
  private static instance: EnterpriseErrorHandler | null = null;
  private errorMetrics: ErrorMetrics = {
    errorCount: 0,
    errorRate: 0,
    commonErrors: {},
    criticalErrors: 0
  };
  private errorHistory: Array<{ error: Error; context: ErrorContext; timestamp: Date }> = [];
  private readonly maxHistorySize = 1000;

  static getInstance(): EnterpriseErrorHandler {
    if (!this.instance) {
      this.instance = new EnterpriseErrorHandler();
    }
    return this.instance;
  }

  logError(error: Error, context: ErrorContext, severity: 'low' | 'medium' | 'high' | 'critical' = 'medium'): void {
    const errorEntry = {
      error,
      context,
      timestamp: new Date(),
      severity
    };

    // Update metrics
    this.updateMetrics(error, severity);

    // Log to console with structured format
    this.logToConsole(error, context, severity);

    // Store in history
    this.storeInHistory(errorEntry);

    // Handle critical errors
    if (severity === 'critical') {
      this.handleCriticalError(error, context);
    }
  }

  private updateMetrics(error: Error, severity: string): void {
    this.errorMetrics.errorCount++;
    this.errorMetrics.lastError = new Date();
    
    if (severity === 'critical') {
      this.errorMetrics.criticalErrors++;
    }

    // Track common error types
    const errorType = error.constructor.name;
    this.errorMetrics.commonErrors[errorType] = (this.errorMetrics.commonErrors[errorType] || 0) + 1;

    // Calculate error rate (errors per minute over last 10 minutes)
    const tenMinutesAgo = new Date(Date.now() - 10 * 60 * 1000);
    const recentErrors = this.errorHistory.filter(entry => entry.timestamp > tenMinutesAgo);
    this.errorMetrics.errorRate = recentErrors.length / 10;
  }

  private logToConsole(error: Error, context: ErrorContext, severity: string): void {
    const logLevel = severity === 'critical' ? 'error' : severity === 'high' ? 'error' : 'warn';
    
    const structuredLog = {
      severity,
      message: error.message,
      name: error.name,
      stack: error.stack,
      context,
      timestamp: new Date().toISOString()
    };

    console[logLevel](`[${severity.toUpperCase()}] Enterprise Error:`, JSON.stringify(structuredLog, null, 2));
  }

  private storeInHistory(errorEntry: any): void {
    this.errorHistory.push(errorEntry);
    
    // Maintain history size limit
    if (this.errorHistory.length > this.maxHistorySize) {
      this.errorHistory = this.errorHistory.slice(-this.maxHistorySize);
    }
  }

  private handleCriticalError(error: Error, context: ErrorContext): void {
    console.error('🚨 CRITICAL ERROR DETECTED:', {
      error: error.message,
      context,
      timestamp: new Date().toISOString()
    });

    // In a real enterprise environment, you would:
    // - Send alerts to monitoring systems (PagerDuty, Slack, etc.)
    // - Log to external services (Sentry, LogRocket, etc.)
    // - Trigger recovery procedures
  }

  getMetrics(): ErrorMetrics {
    return { ...this.errorMetrics };
  }

  getErrorHistory(limit: number = 50): Array<any> {
    return this.errorHistory.slice(-limit);
  }

  clearHistory(): void {
    this.errorHistory = [];
    this.errorMetrics = {
      errorCount: 0,
      errorRate: 0,
      commonErrors: {},
      criticalErrors: 0
    };
  }

  // Health check for error handler itself
  getHealthStatus(): { healthy: boolean; details: any } {
    const isHealthy = this.errorMetrics.errorRate < 10 && this.errorMetrics.criticalErrors === 0;
    
    return {
      healthy: isHealthy,
      details: {
        errorRate: this.errorMetrics.errorRate,
        criticalErrors: this.errorMetrics.criticalErrors,
        totalErrors: this.errorMetrics.errorCount,
        historySize: this.errorHistory.length
      }
    };
  }
}

// Express middleware for automatic error handling
export const enterpriseErrorMiddleware = (error: any, req: any, res: any, next: any) => {
  const errorHandler = EnterpriseErrorHandler.getInstance();
  
  const context: ErrorContext = {
    endpoint: req.path,
    method: req.method,
    userAgent: req.get('User-Agent'),
    ip: req.ip || req.connection.remoteAddress,
    timestamp: new Date(),
    requestId: req.headers['x-request-id'] || `req_${Date.now()}`,
    environment: process.env.NODE_ENV || 'production'
  };

  // Determine severity based on error type and status
  let severity: 'low' | 'medium' | 'high' | 'critical' = 'medium';
  
  if (error.status >= 500 || error.message.includes('Firebase') || error.message.includes('Database')) {
    severity = 'critical';
  } else if (error.status >= 400) {
    severity = 'medium';
  }

  errorHandler.logError(error, context, severity);

  // Send appropriate response
  const statusCode = error.status || 500;
  const message = process.env.NODE_ENV === 'production' 
    ? 'Internal server error' 
    : error.message;

  res.status(statusCode).json({
    error: message,
    requestId: context.requestId,
    timestamp: context.timestamp.toISOString(),
    ...(process.env.NODE_ENV !== 'production' && { stack: error.stack })
  });
};

export const errorHandler = EnterpriseErrorHandler.getInstance();