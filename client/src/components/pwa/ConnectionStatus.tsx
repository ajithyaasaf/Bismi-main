import React from 'react';
import { Wifi, WifiOff } from 'lucide-react';
import { useOnlineStatus } from './OfflineIndicator';

export function ConnectionStatus() {
  const isOnline = useOnlineStatus();

  return (
    <div className={`inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-medium transition-all duration-200 ${
      isOnline 
        ? 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400' 
        : 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400'
    }`}>
      {isOnline ? (
        <Wifi className="h-3 w-3" />
      ) : (
        <WifiOff className="h-3 w-3" />
      )}
      <span className="hidden sm:inline">
        {isOnline ? 'Online' : 'Offline'}
      </span>
    </div>
  );
}