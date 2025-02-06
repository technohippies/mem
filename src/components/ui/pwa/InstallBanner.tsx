import { useEffect, useState } from 'react';
import { X } from '@phosphor-icons/react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

declare global {
  interface WindowEventMap {
    beforeinstallprompt: BeforeInstallPromptEvent;
  }
}

export function InstallBanner() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [dismissed, setDismissed] = useState(() => {
    return localStorage.getItem('pwa-install-dismissed') === 'true';
  });

  useEffect(() => {
    const handler = (e: BeforeInstallPromptEvent) => {
      // Prevent Chrome 67 and earlier from automatically showing the prompt
      e.preventDefault();
      // Stash the event so it can be triggered later
      setDeferredPrompt(e);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
    };
  }, []);

  const handleInstall = async () => {
    if (!deferredPrompt) return;

    // Show the install prompt
    deferredPrompt.prompt();

    // Wait for the user to respond to the prompt
    const { outcome } = await deferredPrompt.userChoice;
    
    if (outcome === 'accepted') {
      console.log('User accepted the install prompt');
    } else {
      console.log('User dismissed the install prompt');
    }

    // Clear the deferredPrompt for the next time
    setDeferredPrompt(null);
  };

  const handleDismiss = () => {
    setDismissed(true);
    localStorage.setItem('pwa-install-dismissed', 'true');
  };

  if (!deferredPrompt || dismissed) return null;

  return (
    <div className="sticky top-0 left-0 right-0 bg-neutral-900 text-neutral-100 p-2 flex items-center z-50 border-b border-neutral-800">
      {/* Left spacer to match right button width */}
      <div className="w-8" />
      
      {/* Centered text that acts as a button */}
      <div className="flex-1 flex justify-center">
        <button 
          onClick={handleInstall}
          className="text-blue-500 hover:text-blue-400 transition-colors font-medium"
        >
          Add to Homescreen
        </button>
      </div>

      {/* Right dismiss button */}
      <button 
        onClick={handleDismiss} 
        className="w-8 h-8 flex items-center justify-center hover:bg-neutral-800 rounded-full transition-colors"
        aria-label="Dismiss install banner"
      >
        <X size={20} />
      </button>
    </div>
  );
} 