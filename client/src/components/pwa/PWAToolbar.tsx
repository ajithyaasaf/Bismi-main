import React from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  Download, 
  Wifi, 
  WifiOff, 
  RefreshCw, 
  Settings, 
  RotateCcw,
  Clock,
  CheckCircle2
} from 'lucide-react';
import { useInstallPrompt } from './InstallPrompt';
import { useOnlineStatus } from './OfflineIndicator';
import { useOfflineManager } from '@/lib/offline-manager';

interface PWAToolbarProps {
  className?: string;
}

export function PWAToolbar({ className = '' }: PWAToolbarProps) {
  const { canInstall, install } = useInstallPrompt();
  const isOnline = useOnlineStatus();
  const { queueLength, syncInProgress, sync, clear } = useOfflineManager();

  const handleInstall = async () => {
    const success = await install();
    if (success) {
      console.log('App installed from toolbar');
    }
  };

  const handleSync = () => {
    if (isOnline) {
      sync();
    }
  };

  const handleRefresh = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.getRegistration().then(registration => {
        if (registration) {
          registration.update().then(() => {
            window.location.reload();
          });
        }
      });
    } else {
      window.location.reload();
    }
  };

  return (
    <Card className={`border border-gray-200 dark:border-gray-700 ${className}`}>
      <CardContent className="p-3">
        <div className="flex items-center justify-between gap-3">
          {/* Connection Status */}
          <div className="flex items-center gap-2">
            <div className={`p-1.5 rounded-full ${
              isOnline 
                ? 'bg-green-100 dark:bg-green-900' 
                : 'bg-red-100 dark:bg-red-900'
            }`}>
              {isOnline ? (
                <Wifi className="h-3 w-3 text-green-600 dark:text-green-400" />
              ) : (
                <WifiOff className="h-3 w-3 text-red-600 dark:text-red-400" />
              )}
            </div>
            <span className="text-xs font-medium">
              {isOnline ? 'Online' : 'Offline'}
            </span>
            
            {/* Queue Status */}
            {queueLength > 0 && (
              <Badge variant="secondary" className="text-xs">
                <Clock className="h-3 w-3 mr-1" />
                {queueLength} queued
              </Badge>
            )}
          </div>

          {/* Actions */}
          <div className="flex items-center gap-2">
            {/* Sync Button */}
            {queueLength > 0 && isOnline && (
              <Button
                onClick={handleSync}
                disabled={syncInProgress}
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
              >
                <RotateCcw className={`h-3 w-3 mr-1 ${syncInProgress ? 'animate-spin' : ''}`} />
                Sync
              </Button>
            )}

            {/* Install Button */}
            {canInstall && (
              <Button
                onClick={handleInstall}
                size="sm"
                variant="outline"
                className="h-7 px-2 text-xs"
              >
                <Download className="h-3 w-3 mr-1" />
                Install
              </Button>
            )}

            {/* Refresh Button */}
            <Button
              onClick={handleRefresh}
              size="sm"
              variant="ghost"
              className="h-7 w-7 p-0"
            >
              <RefreshCw className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Sync Status */}
        {syncInProgress && (
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
              <RotateCcw className="h-3 w-3 animate-spin" />
              <span>Syncing {queueLength} actions...</span>
            </div>
          </div>
        )}

        {/* Offline Notice */}
        {!isOnline && (
          <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-800">
            <p className="text-xs text-amber-600 dark:text-amber-400">
              Changes will sync when connection is restored
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

// Compact version for mobile
export function PWAStatusBar() {
  const isOnline = useOnlineStatus();
  const { queueLength, syncInProgress } = useOfflineManager();

  // Only show when there are queued actions or actively syncing
  if (isOnline && queueLength === 0 && !syncInProgress) {
    return null;
  }

  return (
    <div className="bg-blue-50 dark:bg-blue-900/20 border-b border-blue-200 dark:border-blue-800 px-3 py-1.5">
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          {!isOnline ? (
            <WifiOff className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          ) : (
            <Clock className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400" />
          )}
          <span className="text-xs text-blue-800 dark:text-blue-200">
            {!isOnline ? 'Working offline' : 
             syncInProgress ? 'Syncing changes...' : 
             `${queueLength} changes pending`}
          </span>
        </div>
        
        {syncInProgress && (
          <RotateCcw className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 animate-spin" />
        )}
      </div>
    </div>
  );
}