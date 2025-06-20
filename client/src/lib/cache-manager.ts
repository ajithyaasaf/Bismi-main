import { queryClient } from './queryClient';

/**
 * Centralized cache management for dynamic pending amount updates
 * Ensures all components refresh when financial data changes
 */

// Invalidate all customer-related cache keys
export async function invalidateCustomerCache(customerId?: string) {
  const invalidations = [
    queryClient.invalidateQueries({ queryKey: ['/api/customers'] }),
    queryClient.invalidateQueries({ queryKey: ['/api/orders'] }),
    queryClient.invalidateQueries({ queryKey: ['/api/reports'] })
  ];

  if (customerId) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId] }),
      queryClient.invalidateQueries({ queryKey: ['/api/orders', customerId] }),
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${customerId}/whatsapp`] })
    );
  }

  await Promise.all(invalidations);
}

// Invalidate all supplier-related cache keys
export async function invalidateSupplierCache(supplierId?: string) {
  const invalidations = [
    queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] }),
    queryClient.invalidateQueries({ queryKey: ['/api/transactions'] }),
    queryClient.invalidateQueries({ queryKey: ['/api/inventory'] }),
    queryClient.invalidateQueries({ queryKey: ['/api/reports'] })
  ];

  if (supplierId) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: ['/api/suppliers', supplierId] })
    );
  }

  await Promise.all(invalidations);
}

// Invalidate all order-related cache keys
export async function invalidateOrderCache(customerId?: string) {
  const invalidations = [
    queryClient.invalidateQueries({ queryKey: ['/api/orders'] }),
    queryClient.invalidateQueries({ queryKey: ['/api/customers'] }),
    queryClient.invalidateQueries({ queryKey: ['/api/inventory'] }),
    queryClient.invalidateQueries({ queryKey: ['/api/reports'] })
  ];

  if (customerId) {
    invalidations.push(
      queryClient.invalidateQueries({ queryKey: ['/api/customers', customerId] }),
      queryClient.invalidateQueries({ queryKey: [`/api/customers/${customerId}/whatsapp`] })
    );
  }

  await Promise.all(invalidations);
}

// Invalidate all financial/dashboard cache keys
export async function invalidateDashboardCache() {
  await Promise.all([
    queryClient.invalidateQueries({ queryKey: ['/api/customers'] }),
    queryClient.invalidateQueries({ queryKey: ['/api/suppliers'] }),
    queryClient.invalidateQueries({ queryKey: ['/api/orders'] }),
    queryClient.invalidateQueries({ queryKey: ['/api/transactions'] }),
    queryClient.invalidateQueries({ queryKey: ['/api/inventory'] }),
    queryClient.invalidateQueries({ queryKey: ['/api/reports'] })
  ]);
}

// Force refresh all components after payment operations
export async function refreshAllData() {
  await queryClient.refetchQueries();
}