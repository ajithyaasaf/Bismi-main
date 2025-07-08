import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { X, Download, Smartphone, Monitor } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  readonly platforms: string[];
  readonly userChoice: Promise<{
    outcome: 'accepted' | 'dismissed';
    platform: string;
  }>;
  prompt(): Promise<void>;
}

interface InstallPromptProps {
  onInstall?: () => void;
  onDismiss?: () => void;
}

export function InstallPrompt({ onInstall, onDismiss }: InstallPromptProps) {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [showPrompt, setShowPrompt] = useState(false);
  const [isInstalling, setIsInstalling] = useState(false);
  const [isInstalled, setIsInstalled] = useState(false);

  useEffect(() => {
    // Check if app is already installed
    const checkInstalled = () => {
      if (window.matchMedia('(display-mode: standalone)').matches) {
        setIsInstalled(true);
        return;
      }
      
      // Check if running as PWA
      if ((navigator as any).standalone) {
        setIsInstalled(true);
        return;
      }
    };

    checkInstalled();

    // Listen for beforeinstallprompt event
    const handleBeforeInstallPrompt = (e: Event) => {
      const event = e as BeforeInstallPromptEvent;
      console.log('💾 Install prompt available');
      
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      
      // Store the event for later use
      setDeferredPrompt(event);
      
      // Show custom install prompt after a delay
      setTimeout(() => {
        if (!isInstalled) {
          setShowPrompt(true);
        }
      }, 3000); // Show after 3 seconds
    };

    // Listen for app installed event
    const handleAppInstalled = () => {
      console.log('✅ PWA installed successfully');
      setIsInstalled(true);
      setShowPrompt(false);
      setDeferredPrompt(null);
      onInstall?.();
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, [isInstalled, onInstall]);

  const handleInstallClick = async () => {
    if (!deferredPrompt) return;

    setIsInstalling(true);

    try {
      // Show the install prompt
      await deferredPrompt.prompt();
      
      // Wait for user choice
      const choiceResult = await deferredPrompt.userChoice;
      
      console.log(`User choice: ${choiceResult.outcome}`);
      
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      } else {
        console.log('User dismissed the install prompt');
      }
      
      // Reset the deferred prompt
      setDeferredPrompt(null);
      setShowPrompt(false);
    } catch (error) {
      console.error('Install prompt failed:', error);
    } finally {
      setIsInstalling(false);
    }
  };

  const handleDismiss = () => {
    setShowPrompt(false);
    onDismiss?.();
    
    // Don't show again for this session
    sessionStorage.setItem('pwa-install-dismissed', 'true');
  };

  // Don't show if already installed or dismissed
  if (isInstalled || !showPrompt || !deferredPrompt) {
    return null;
  }

  // Check if user already dismissed this session
  if (sessionStorage.getItem('pwa-install-dismissed')) {
    return null;
  }

  return (
    <div className="fixed bottom-4 left-4 right-4 z-50 md:left-auto md:right-4 md:w-96">
      <Card className="border-2 border-primary/20 shadow-lg bg-white dark:bg-gray-900">
        <CardContent className="p-4">
          <div className="flex items-start gap-3">
            <div className="flex-shrink-0 p-2 bg-primary/10 rounded-lg">
              <Smartphone className="h-5 w-5 text-primary" />
            </div>
            
            <div className="flex-1 min-w-0">
              <h3 className="font-semibold text-sm mb-1">
                Install Bismi Shop
              </h3>
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                Add to your home screen for quick access and offline use
              </p>
              
              <div className="flex gap-2">
                <Button
                  onClick={handleInstallClick}
                  disabled={isInstalling}
                  size="sm"
                  className="h-8 px-3 text-xs"
                >
                  <Download className="h-3 w-3 mr-1" />
                  {isInstalling ? 'Installing...' : 'Install'}
                </Button>
                
                <Button
                  onClick={handleDismiss}
                  variant="ghost"
                  size="sm"
                  className="h-8 px-3 text-xs"
                >
                  Later
                </Button>
              </div>
            </div>
            
            <Button
              onClick={handleDismiss}
              variant="ghost"
              size="sm"
              className="h-6 w-6 p-0 flex-shrink-0"
            >
              <X className="h-3 w-3" />
            </Button>
          </div>
          
          {/* Benefits */}
          <div className="mt-3 pt-3 border-t border-gray-100 dark:border-gray-800">
            <div className="grid grid-cols-2 gap-3 text-xs">
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Monitor className="h-3 w-3" />
                <span>Works offline</span>
              </div>
              <div className="flex items-center gap-2 text-gray-600 dark:text-gray-400">
                <Smartphone className="h-3 w-3" />
                <span>Native app feel</span>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

// Hook for manual install trigger
export function useInstallPrompt() {
  const [canInstall, setCanInstall] = useState(false);
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);

  useEffect(() => {
    const handleBeforeInstallPrompt = (e: Event) => {
      const event = e as BeforeInstallPromptEvent;
      e.preventDefault();
      setDeferredPrompt(event);
      setCanInstall(true);
    };

    const handleAppInstalled = () => {
      setCanInstall(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const install = async () => {
    if (!deferredPrompt) return false;

    try {
      await deferredPrompt.prompt();
      const choiceResult = await deferredPrompt.userChoice;
      
      setDeferredPrompt(null);
      setCanInstall(false);
      
      return choiceResult.outcome === 'accepted';
    } catch (error) {
      console.error('Install failed:', error);
      return false;
    }
  };

  return { canInstall, install };
}