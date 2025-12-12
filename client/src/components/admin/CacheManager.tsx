import { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Trash2, RefreshCw, AlertTriangle, CheckCircle } from 'lucide-react';
import { cacheManager } from '@/lib/cache-manager';
import { useToast } from '@/hooks/use-toast';

export function CacheManager() {
  const [isClearing, setIsClearing] = useState(false);
  const [cacheInfo, setCacheInfo] = useState<any>(null);
  const { toast } = useToast();

  const checkCacheStatus = async () => {
    try {
      if ('caches' in window) {
        const cacheNames = await caches.keys();
        const cacheStats = await Promise.all(
          cacheNames.map(async (name) => {
            const cache = await caches.open(name);
            const requests = await cache.keys();
            return { name, count: requests.length };
          })
        );
        setCacheInfo(cacheStats);
      }
    } catch (error) {
      console.error('Failed to check cache status:', error);
    }
  };

  const clearAllCaches = async () => {
    setIsClearing(true);
    try {
      await cacheManager.manualRefresh();
      toast({
        title: "Cache Cleared",
        description: "All caches have been cleared. The page will reload with the latest version.",
      });
    } catch (error) {
      toast({
        title: "Cache Clear Failed",
        description: "Failed to clear caches. Please try refreshing the page manually.",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  const forceUpdate = async () => {
    setIsClearing(true);
    try {
      await cacheManager.forceUpdate();
      toast({
        title: "Force Update",
        description: "Forcing application update. Please wait...",
      });
    } catch (error) {
      toast({
        title: "Update Failed",
        description: "Failed to force update. Please try refreshing manually.",
        variant: "destructive",
      });
    } finally {
      setIsClearing(false);
    }
  };

  const handleKeyboardShortcut = (e: KeyboardEvent) => {
    // Ctrl+Shift+R to force update
    if (e.ctrlKey && e.shiftKey && e.key === 'R') {
      e.preventDefault();
      forceUpdate();
    }
  };

  // Add keyboard listener
  useEffect(() => {
    document.addEventListener('keydown', handleKeyboardShortcut);
    return () => document.removeEventListener('keydown', handleKeyboardShortcut);
  }, []);

  // Auto-check cache status on mount
  useEffect(() => {
    checkCacheStatus();
  }, []);

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <RefreshCw className="h-5 w-5" />
          Cache Management
        </CardTitle>
        <p className="text-sm text-gray-600">
          Force updates and manage application caches for instant deployment visibility
        </p>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* Cache Status */}
        <div className="space-y-2">
          <h3 className="font-medium">Cache Status</h3>
          <Button 
            variant="outline" 
            size="sm" 
            onClick={checkCacheStatus}
            className="mb-2"
          >
            Refresh Status
          </Button>
          
          {cacheInfo ? (
            <div className="space-y-1">
              {cacheInfo.map((cache: any) => (
                <div key={cache.name} className="flex justify-between items-center p-2 bg-gray-50 rounded">
                  <span className="text-sm font-mono">{cache.name}</span>
                  <Badge variant="secondary">{cache.count} items</Badge>
                </div>
              ))}
              {cacheInfo.length === 0 && (
                <div className="flex items-center gap-2 text-green-600">
                  <CheckCircle className="h-4 w-4" />
                  <span className="text-sm">No active caches</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-sm text-gray-500">Click "Refresh Status" to check cache</p>
          )}
        </div>

        {/* Quick Actions */}
        <div className="space-y-3">
          <h3 className="font-medium">Quick Actions</h3>
          
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <Button 
              onClick={forceUpdate}
              disabled={isClearing}
              className="flex items-center gap-2"
              variant="default"
            >
              <RefreshCw className={`h-4 w-4 ${isClearing ? 'animate-spin' : ''}`} />
              Force Update
            </Button>

            <Button 
              onClick={clearAllCaches}
              disabled={isClearing}
              variant="destructive"
              className="flex items-center gap-2"
            >
              <Trash2 className="h-4 w-4" />
              Clear All Caches
            </Button>
          </div>
        </div>

        {/* Instructions */}
        <div className="p-3 bg-blue-50 rounded-lg">
          <h4 className="font-medium text-blue-800 mb-2">Usage Instructions</h4>
          <ul className="text-sm text-blue-700 space-y-1">
            <li>• <strong>Force Update:</strong> Checks for new deployment and updates if available</li>
            <li>• <strong>Clear All Caches:</strong> Removes all cached data and reloads the page</li>
            <li>• <strong>Keyboard Shortcut:</strong> Press Ctrl+Shift+R to force update</li>
          </ul>
        </div>

        {/* Warning */}
        <div className="flex items-start gap-2 p-3 bg-amber-50 rounded-lg">
          <AlertTriangle className="h-4 w-4 text-amber-600 mt-0.5" />
          <div className="text-sm text-amber-700">
            <strong>Note:</strong> Cache clearing will temporarily slow down the next page load as resources are re-downloaded from the server.
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

// Quick access component for development
export function QuickCacheActions() {
  return (
    <div className="fixed bottom-4 right-4 z-50">
      <Button
        onClick={() => cacheManager.manualRefresh()}
        size="sm"
        variant="outline"
        className="bg-white shadow-lg"
        title="Force cache refresh (Ctrl+Shift+R)"
      >
        <RefreshCw className="h-4 w-4" />
      </Button>
    </div>
  );
}