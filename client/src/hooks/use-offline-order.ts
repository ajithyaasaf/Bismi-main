import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { offlineApiRequest, createOfflineOrderData } from '@/lib/offline-api';
import { useToast } from '@/hooks/use-toast';

export function useOfflineOrder() {
  const [isCreating, setIsCreating] = useState(false);
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const createOrderMutation = useMutation({
    mutationFn: async (orderData: any) => {
      setIsCreating(true);
      return await offlineApiRequest('POST', '/api/orders', orderData);
    },
    onSuccess: (response, orderData) => {
      const customerName = orderData.customerName || 'customer';
      
      if (response.isOffline) {
        toast({
          title: "Order queued for sync",
          description: `Order for ${customerName} created offline and will sync when online`,
          variant: "default"
        });
      } else {
        toast({
          title: "Order created",
          description: `Order for ${customerName} has been created successfully`
        });
      }

      // Invalidate cache to trigger refresh
      queryClient.invalidateQueries({ queryKey: ['/api/orders'] });
      queryClient.invalidateQueries({ queryKey: ['/api/customers'] });
      queryClient.invalidateQueries({ queryKey: ['/api/inventory'] });
    },
    onError: (error) => {
      toast({
        title: "Error creating order",
        description: "There was an error creating the order",
        variant: "destructive"
      });
      console.error('Order creation error:', error);
    },
    onSettled: () => {
      setIsCreating(false);
    }
  });

  return {
    createOrder: createOrderMutation.mutate,
    isCreating: isCreating || createOrderMutation.isPending,
    error: createOrderMutation.error
  };
}