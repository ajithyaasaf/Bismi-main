/**
 * Enterprise monitoring and metrics collection system
 * Provides real-time performance monitoring, alerting, and analytics
 */

export interface PerformanceMetrics {
  requestCount: number;
  averageResponseTime: number;
  minResponseTime: number;
  maxResponseTime: number;
  activeConnections: number;
  memoryUsage: NodeJS.MemoryUsage;
  cpuUsage: number;
  uptime: number;
}

export interface EndpointMetrics {
  path: string;
  method: string;
  count: number;
  averageTime: number;
  successRate: number;
  lastAccessed: Date;
}

export class EnterpriseMonitoring {
  private static instance: EnterpriseMonitoring | null = null;
  private startTime = Date.now();
  private requestMetrics: Array<{ path: string; method: string; time: number; status: number; timestamp: Date }> = [];
  private readonly maxMetricsHistory = 10000;

  static getInstance(): EnterpriseMonitoring {
    if (!this.instance) {
      this.instance = new EnterpriseMonitoring();
    }
    return this.instance;
  }

  recordRequest(path: string, method: string, responseTime: number, statusCode: number): void {
    this.requestMetrics.push({
      path,
      method,
      time: responseTime,
      status: statusCode,
      timestamp: new Date()
    });

    // Maintain history limit
    if (this.requestMetrics.length > this.maxMetricsHistory) {
      this.requestMetrics = this.requestMetrics.slice(-this.maxMetricsHistory);
    }
  }

  getPerformanceMetrics(): PerformanceMetrics {
    const now = Date.now();
    const oneMinuteAgo = new Date(now - 60000);
    const recentRequests = this.requestMetrics.filter(m => m.timestamp > oneMinuteAgo);
    
    const responseTimes = recentRequests.map(m => m.time);
    const memUsage = process.memoryUsage();

    return {
      requestCount: recentRequests.length,
      averageResponseTime: responseTimes.length > 0 ? responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length : 0,
      minResponseTime: responseTimes.length > 0 ? Math.min(...responseTimes) : 0,
      maxResponseTime: responseTimes.length > 0 ? Math.max(...responseTimes) : 0,
      activeConnections: recentRequests.length,
      memoryUsage: memUsage,
      cpuUsage: process.cpuUsage().user / 1000000, // Convert to seconds
      uptime: now - this.startTime
    };
  }

  getEndpointMetrics(): EndpointMetrics[] {
    const endpointMap = new Map<string, { times: number[]; statuses: number[]; lastAccessed: Date }>();

    this.requestMetrics.forEach(metric => {
      const key = `${metric.method} ${metric.path}`;
      if (!endpointMap.has(key)) {
        endpointMap.set(key, { times: [], statuses: [], lastAccessed: metric.timestamp });
      }
      const data = endpointMap.get(key)!;
      data.times.push(metric.time);
      data.statuses.push(metric.status);
      if (metric.timestamp > data.lastAccessed) {
        data.lastAccessed = metric.timestamp;
      }
    });

    return Array.from(endpointMap.entries()).map(([endpoint, data]) => {
      const [method, path] = endpoint.split(' ', 2);
      const successCount = data.statuses.filter(s => s < 400).length;
      
      return {
        path,
        method,
        count: data.times.length,
        averageTime: data.times.reduce((a, b) => a + b, 0) / data.times.length,
        successRate: (successCount / data.statuses.length) * 100,
        lastAccessed: data.lastAccessed
      };
    }).sort((a, b) => b.count - a.count);
  }

  getHealthScore(): { score: number; details: any } {
    const metrics = this.getPerformanceMetrics();
    const endpoints = this.getEndpointMetrics();
    
    let score = 100;
    const issues = [];

    // Check response time
    if (metrics.averageResponseTime > 2000) {
      score -= 20;
      issues.push('High average response time');
    }

    // Check memory usage
    const memoryUsageMB = metrics.memoryUsage.rss / 1024 / 1024;
    if (memoryUsageMB > 512) {
      score -= 15;
      issues.push('High memory usage');
    }

    // Check error rates
    const overallSuccessRate = endpoints.reduce((acc, ep) => acc + ep.successRate, 0) / endpoints.length || 100;
    if (overallSuccessRate < 95) {
      score -= 25;
      issues.push('Low success rate');
    }

    return {
      score: Math.max(0, score),
      details: {
        responseTime: metrics.averageResponseTime,
        memoryUsage: memoryUsageMB,
        successRate: overallSuccessRate,
        issues
      }
    };
  }

  generateReport(): any {
    const metrics = this.getPerformanceMetrics();
    const endpoints = this.getEndpointMetrics();
    const health = this.getHealthScore();

    return {
      timestamp: new Date().toISOString(),
      uptime: metrics.uptime,
      performance: {
        requestsPerMinute: metrics.requestCount,
        averageResponseTime: `${metrics.averageResponseTime.toFixed(2)}ms`,
        memoryUsage: `${(metrics.memoryUsage.rss / 1024 / 1024).toFixed(2)}MB`,
        cpuUsage: `${metrics.cpuUsage.toFixed(2)}s`
      },
      topEndpoints: endpoints.slice(0, 10),
      healthScore: health.score,
      recommendations: this.generateRecommendations(metrics, endpoints, health)
    };
  }

  private generateRecommendations(metrics: PerformanceMetrics, endpoints: EndpointMetrics[], health: any): string[] {
    const recommendations = [];

    if (metrics.averageResponseTime > 1000) {
      recommendations.push('Consider optimizing database queries or adding caching');
    }

    if (metrics.memoryUsage.rss / 1024 / 1024 > 256) {
      recommendations.push('Monitor memory usage and consider optimization');
    }

    const slowEndpoints = endpoints.filter(ep => ep.averageTime > 2000);
    if (slowEndpoints.length > 0) {
      recommendations.push(`Optimize slow endpoints: ${slowEndpoints.map(ep => ep.path).join(', ')}`);
    }

    if (health.details.successRate < 98) {
      recommendations.push('Investigate error patterns and improve error handling');
    }

    return recommendations;
  }

  clearMetrics(): void {
    this.requestMetrics = [];
    this.startTime = Date.now();
  }
}

// Express middleware for automatic monitoring
export const monitoringMiddleware = (req: any, res: any, next: any) => {
  const monitoring = EnterpriseMonitoring.getInstance();
  const startTime = Date.now();

  res.on('finish', () => {
    const responseTime = Date.now() - startTime;
    monitoring.recordRequest(req.path, req.method, responseTime, res.statusCode);
  });

  next();
};

export const monitoring = EnterpriseMonitoring.getInstance();