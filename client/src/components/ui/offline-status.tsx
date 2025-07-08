import React from 'react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Clock, Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { useOfflineManager } from '@/lib/offline-manager';

export function OfflineStatus() {
  const { isOnline, queueLength, syncInProgress } = useOfflineManager();

  if (isOnline && queueLength === 0) {
    return null;
  }

  return (
    <Card className="mb-4 border-amber-200 bg-amber-50 dark:border-amber-800 dark:bg-amber-900/20">
      <CardContent className="p-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            {isOnline ? (
              <Wifi className="h-4 w-4 text-green-600" />
            ) : (
              <WifiOff className="h-4 w-4 text-amber-600" />
            )}
            <span className="text-sm font-medium">
              {isOnline ? 'Online' : 'Offline Mode'}
            </span>
          </div>
          
          {queueLength > 0 && (
            <div className="flex items-center gap-2">
              {syncInProgress ? (
                <RefreshCw className="h-4 w-4 text-blue-600 animate-spin" />
              ) : (
                <Clock className="h-4 w-4 text-amber-600" />
              )}
              <Badge variant="secondary" className="text-xs">
                {queueLength} pending
              </Badge>
            </div>
          )}
        </div>
        
        {!isOnline && (
          <p className="mt-2 text-xs text-amber-700 dark:text-amber-300">
            Your actions are being saved and will sync when you're back online.
          </p>
        )}
      </CardContent>
    </Card>
  );
}

export function OrderOfflineIndicator({ isOffline }: { isOffline: boolean }) {
  if (!isOffline) return null;

  return (
    <Badge variant="outline" className="text-xs border-amber-300 text-amber-700 bg-amber-50">
      <Clock className="h-3 w-3 mr-1" />
      Pending Sync
    </Badge>
  );
}