import { apiRequest } from './queryClient';
import { offlineManager } from './offline-manager';

export interface OfflineResponse {
  success: boolean;
  data?: any;
  error?: string;
  isOffline?: boolean;
  actionId?: string;
}

export async function offlineApiRequest(
  method: string,
  endpoint: string,
  data?: unknown
): Promise<OfflineResponse> {
  // Check if we're online and can make the request immediately
  if (navigator.onLine) {
    try {
      const response = await apiRequest(method, endpoint, data);
      if (response.ok) {
        const responseData = await response.json();
        return {
          success: true,
          data: responseData,
          isOffline: false
        };
      } else {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }
    } catch (error) {
      // If online request fails, fallback to offline queue
      console.log('Online request failed, queueing for offline sync:', error);
    }
  }

  // Queue the action for offline sync
  const actionType = method.toLowerCase() === 'post' ? 'CREATE' : 
                    method.toLowerCase() === 'put' ? 'UPDATE' : 'DELETE';
  
  const actionId = offlineManager.queueAction(actionType, endpoint, data);
  
  return {
    success: true,
    data: data, // Return the original data for immediate UI updates
    isOffline: true,
    actionId,
    error: 'Queued for offline sync'
  };
}

export function createOfflineOrderData(orderData: any) {
  // Create a temporary order object for immediate UI display
  return {
    ...orderData,
    id: `offline-${Date.now()}`,
    createdAt: new Date().toISOString(),
    status: 'pending_sync',
    isOffline: true
  };
}

export function isOfflineOrder(order: any): boolean {
  return order.id?.startsWith('offline-') || order.status === 'pending_sync' || order.isOffline;
}