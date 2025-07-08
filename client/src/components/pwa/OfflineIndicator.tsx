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

  if (isOnline && !showOfflineMessage) {
    return null;
  }

  return (
    <div className="fixed top-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-80">
      <Card className={`border-2 shadow-lg ${
        isOnline 
          ? 'border-green-200 bg-green-50 dark:bg-green-900/20' 
          : 'border-amber-200 bg-amber-50 dark:bg-amber-900/20'
      }`}>
        <CardContent className="p-3">
          <div className="flex items-center gap-3">
            <div className={`flex-shrink-0 p-1.5 rounded-full ${
              isOnline 
                ? 'bg-green-100 dark:bg-green-800' 
                : 'bg-amber-100 dark:bg-amber-800'
            }`}>
              {isOnline ? (
                <Wifi className="h-4 w-4 text-green-600 dark:text-green-400" />
              ) : (
                <WifiOff className="h-4 w-4 text-amber-600 dark:text-amber-400" />
              )}
            </div>
            
            <div className="flex-1 min-w-0">
              <p className={`text-sm font-medium ${
                isOnline 
                  ? 'text-green-800 dark:text-green-200' 
                  : 'text-amber-800 dark:text-amber-200'
              }`}>
                {isOnline ? 'Back Online' : 'You\'re Offline'}
              </p>
              <p className={`text-xs ${
                isOnline 
                  ? 'text-green-600 dark:text-green-400' 
                  : 'text-amber-600 dark:text-amber-400'
              }`}>
                {isOnline 
                  ? 'Internet connection restored' 
                  : 'Some features may be limited'
                }
              </p>
            </div>
            
            {!isOnline && (
              <Button
                onClick={handleRetry}
                variant="ghost"
                size="sm"
                className="h-7 px-2 text-xs"
              >
                <RefreshCw className="h-3 w-3 mr-1" />
                Retry
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