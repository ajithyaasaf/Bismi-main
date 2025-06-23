import { queryClient } from './queryClient';

/**
 * Intelligent cache invalidation strategy
 * Reduces over-invalidation while ensuring data consistency
 */

export class CacheStrategy {
  /**
   * Invalidate caches based on entity relationships
   */
  static async invalidateRelatedCaches(entity: string, entityId?: string, operation?: string) {
    const invalidationMap = {
      supplier: [
        ['/api/suppliers'],
        ['/api/inventory'], // Suppliers linked to inventory
        ['/api/reports'], // Reports include supplier data
        ['dashboard-batch'] // Dashboard shows supplier metrics
      ],
      
      customer: [
        ['/api/customers'],
        ['/api/orders'], // Orders linked to customers
        ['/api/reports'], // Reports include customer data
        ['dashboard-batch'] // Dashboard shows customer metrics
      ],
      
      inventory: [
        ['/api/inventory'],
        ['/api/reports'], // Reports include inventory data
        ['dashboard-batch'] // Dashboard shows stock levels
      ],
      
      order: [
        ['/api/orders'],
        ['/api/customers'], // Customer pending amounts affected
        ['/api/inventory'], // Stock levels affected
        ['/api/reports'], // Sales reports affected
        ['dashboard-batch'] // Dashboard shows recent orders
      ],
      
      transaction: [
        ['/api/transactions'],
        ['/api/suppliers'], // Supplier pending amounts affected
        ['/api/customers'], // Customer pending amounts affected
        ['/api/reports'], // Financial reports affected
        ['dashboard-batch'] // Dashboard shows financial metrics
      ],
      
      payment: [
        ['/api/transactions'],
        ['/api/suppliers'], // Supplier pending amounts affected
        ['/api/customers'], // Customer pending amounts affected
        ['/api/reports'], // Financial reports affected
        ['dashboard-batch'] // Dashboard shows financial metrics
      ]
    };

    const cachesToInvalidate = invalidationMap[entity as keyof typeof invalidationMap] || [];
    
    // Add entity-specific caches if ID provided
    if (entityId) {
      if (entity === 'customer') {
        cachesToInvalidate.push(['/api/customers', entityId]);
        cachesToInvalidate.push([`/api/customers/${entityId}/whatsapp`]);
      } else if (entity === 'supplier') {
        cachesToInvalidate.push(['/api/suppliers', entityId]);
      } else if (entity === 'order') {
        cachesToInvalidate.push(['/api/orders', entityId]);
      }
    }

    // Batch invalidate all related caches
    await Promise.all(
      cachesToInvalidate.map(queryKey => 
        queryClient.invalidateQueries({ queryKey })
      )
    );

    console.log(`Cache invalidated for ${entity}${entityId ? ` (${entityId})` : ''}: ${cachesToInvalidate.length} cache keys`);
  }

  /**
   * Smart cache prefetching for related data
   */
  static async prefetchRelatedData(entity: string, entityId: string) {
    try {
      if (entity === 'customer') {
        // Prefetch customer orders when viewing customer details
        queryClient.prefetchQuery({
          queryKey: ['/api/orders', { customerId: entityId }],
          staleTime: 1000 * 60 * 2 // 2 minutes
        });
      }
      
      if (entity === 'supplier') {
        // Prefetch supplier inventory when viewing supplier details
        queryClient.prefetchQuery({
          queryKey: ['/api/inventory', { supplierId: entityId }],
          staleTime: 1000 * 60 * 2 // 2 minutes
        });
      }
    } catch (error) {
      console.warn('Cache prefetch failed:', error);
    }
  }

  /**
   * Cache warming for frequently accessed data
   */
  static async warmCache() {
    const criticalQueries = [
      { queryKey: ['/api/customers'], staleTime: 1000 * 60 * 5 },
      { queryKey: ['/api/suppliers'], staleTime: 1000 * 60 * 5 },
      { queryKey: ['/api/inventory'], staleTime: 1000 * 60 * 3 },
      { queryKey: ['dashboard-batch'], staleTime: 1000 * 60 * 2 }
    ];

    // Prefetch critical data in parallel
    await Promise.allSettled(
      criticalQueries.map(query => 
        queryClient.prefetchQuery(query)
      )
    );

    console.log('Cache warmed with critical data');
  }

  /**
   * Selective cache refresh for specific scenarios
   */
  static async refreshSpecificCache(scenario: string, context?: any) {
    switch (scenario) {
      case 'payment_processed':
        // Only refresh financial-related caches
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['/api/transactions'] }),
          queryClient.invalidateQueries({ queryKey: ['/api/customers'] }),
          queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] }),
          queryClient.invalidateQueries({ queryKey: ['dashboard-batch'] })
        ]);
        break;
        
      case 'stock_updated':
        // Only refresh inventory-related caches
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['/api/inventory'] }),
          queryClient.invalidateQueries({ queryKey: ['dashboard-batch'] })
        ]);
        break;
        
      case 'order_created':
        // Refresh order and customer caches
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: ['/api/orders'] }),
          queryClient.invalidateQueries({ queryKey: ['/api/customers'] }),
          queryClient.invalidateQueries({ queryKey: ['/api/inventory'] }),
          queryClient.invalidateQueries({ queryKey: ['dashboard-batch'] })
        ]);
        break;
    }
  }

  /**
   * Cache size management
   */
  static manageCacheSize() {
    const cacheSize = queryClient.getQueryCache().getAll().length;
    
    if (cacheSize > 100) {
      // Remove old queries to prevent memory issues
      queryClient.getQueryCache().clear();
      console.log('Cache cleared due to size limit');
    }
  }

  /**
   * Background cache maintenance
   */
  static startBackgroundMaintenance() {
    // Run cache maintenance every 10 minutes
    setInterval(() => {
      this.manageCacheSize();
    }, 10 * 60 * 1000);
    
    // Warm critical caches every 5 minutes
    setInterval(() => {
      this.warmCache();
    }, 5 * 60 * 1000);
  }
}

// Export optimized cache invalidation functions for common operations
export const optimizedCacheInvalidation = {
  async supplier(supplierId?: string, operation?: string) {
    await CacheStrategy.invalidateRelatedCaches('supplier', supplierId, operation);
  },

  async customer(customerId?: string, operation?: string) {
    await CacheStrategy.invalidateRelatedCaches('customer', customerId, operation);
  },

  async order(orderId?: string, operation?: string) {
    await CacheStrategy.invalidateRelatedCaches('order', orderId, operation);
  },

  async inventory(inventoryId?: string, operation?: string) {
    await CacheStrategy.invalidateRelatedCaches('inventory', inventoryId, operation);
  },

  async payment(entityId?: string, entityType?: string) {
    await CacheStrategy.invalidateRelatedCaches('payment', entityId);
  },

  async transaction(transactionId?: string) {
    await CacheStrategy.invalidateRelatedCaches('transaction', transactionId);
  }
};