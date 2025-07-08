import React, { useState, useEffect } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Wifi, WifiOff, RefreshCw } from 'lucide-react';
import { Button } from '@/components/ui/button';

export function OfflineIndicator() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  const [showOfflineMessage, setShowOfflineMessage] = useState(false);

  useEffect(() => {
    const handleOnline = () => {
      setIsOnline(true);
      setShowOfflineMessage(false);
      console.log('🌐 Back online');
    };

    const handleOffline = () => {
      setIsOnline(false);
      setShowOfflineMessage(true);
      console.log('📱 Gone offline');
    };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  const handleRetry = () => {
    if (navigator.onLine) {
      window.location.reload();
    }
  };

  // Only show briefly when going offline or coming back online
  if (isOnline && !showOfflineMessage) {
    return null;
  }

  // Auto-hide the message after 3 seconds when going back online
  if (isOnline && showOfflineMessage) {
    setTimeout(() => setShowOfflineMessage(false), 3000);
  }

  return (
    <div className="fixed top-2 right-2 z-50 w-64 md:w-72">
      <Card className={`border shadow-lg transition-all duration-300 ${
        isOnline 
          ? 'border-green-200 bg-green-50 dark:bg-green-900/20' 
          : 'border-amber-200 bg-amber-50 dark:bg-amber-900/20'
      }`}>
        <CardContent className="p-2.5">
          <div className="flex items-center gap-2">
            <div className={`flex-shrink-0 p-1 rounded-full ${
              isOnline 
                ? 'bg-green-100 dark:bg-green-800' 
                : 'bg-amber-100 dark:bg-amber-800'
            }`}>
              {isOnline ? (
                <Wifi className="h-3 w-3 text-green-600 dark:text-green-400" />
              ) : (
                <WifiOff className="h-3 w-3 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className={`text-xs font-medium ${
                isOnline 
                  ? 'text-green-800 dark:text-green-200' 
                  : 'text-amber-800 dark:text-amber-200'
              }`}>
                {isOnline ? 'Back Online' : 'Working Offline'}
              </p>
            </div>
            
            {!isOnline && (
              <Button
                onClick={handleRetry}
                variant="ghost"
                size="sm"
                className="h-6 w-6 p-0"
              >
                <RefreshCw className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook for checking online status
export function useOnlineStatus() {
  const [isOnline, setIsOnline] = useState(navigator.onLine);

  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  return isOnline;
}