// Client-side performance monitoring
interface PerformanceMetric {
  name: string;
  duration: number;
  timestamp: number;
  type: 'api' | 'render' | 'navigation';
}

class PerformanceMonitor {
  private metrics: PerformanceMetric[] = [];
  private observers: PerformanceObserver[] = [];
  
  constructor() {
    this.setupObservers();
  }
  
  private setupObservers() {
    // Monitor API calls
    if ('PerformanceObserver' in window) {
      const apiObserver = new PerformanceObserver((list) => {
        for (const entry of list.getEntries()) {
          if (entry.name.includes('/api/')) {
            this.recordMetric({
              name: entry.name,
              duration: entry.duration,
              timestamp: Date.now(),
              type: 'api'
            });
          }
        }
      });
      
      apiObserver.observe({ entryTypes: ['measure', 'navigation'] });
      this.observers.push(apiObserver);
    }
  }
  
  recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    // Keep only last 100 metrics
    if (this.metrics.length > 100) {
      this.metrics.shift();
    }
    
    // Log slow operations
    if (metric.duration > 1000) { // Over 1 second
      console.warn(`Slow ${metric.type} operation detected:`, {
        name: metric.name,
        duration: `${metric.duration.toFixed(2)}ms`
      });
    }
  }
  
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }
  
  getAverageApiTime(): number {
    const apiMetrics = this.metrics.filter(m => m.type === 'api');
    if (apiMetrics.length === 0) return 0;
    
    const total = apiMetrics.reduce((sum, metric) => sum + metric.duration, 0);
    return total / apiMetrics.length;
  }
  
  getSlowestOperations(count: number = 5): PerformanceMetric[] {
    return this.metrics
      .sort((a, b) => b.duration - a.duration)
      .slice(0, count);
  }
  
  cleanup() {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
    this.metrics = [];
  }
}

export const performanceMonitor = new PerformanceMonitor();

// Hook to measure React component render times
export function usePerformanceMonitor(componentName: string) {
  const startTime = performance.now();
  
  return {
    measureRender: () => {
      const endTime = performance.now();
      performanceMonitor.recordMetric({
        name: `Component: ${componentName}`,
        duration: endTime - startTime,
        timestamp: Date.now(),
        type: 'render'
      });
    }
  };
}

// API call wrapper with performance monitoring
export async function monitoredApiCall<T>(
  name: string,
  apiCall: () => Promise<T>
): Promise<T> {
  const startTime = performance.now();
  
  try {
    const result = await apiCall();
    const endTime = performance.now();
    
    performanceMonitor.recordMetric({
      name: `API: ${name}`,
      duration: endTime - startTime,
      timestamp: Date.now(),
      type: 'api'
    });
    
    return result;
  } catch (error) {
    const endTime = performance.now();
    
    performanceMonitor.recordMetric({
      name: `API Error: ${name}`,
      duration: endTime - startTime,
      timestamp: Date.now(),
      type: 'api'
    });
    
    throw error;
  }
}