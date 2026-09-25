'use client';

import React, { useState, useEffect } from 'react';
import { Download, CheckCircle2, Share, PlusSquare, X, Smartphone } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

export const InstallPWAButton: React.FC = () => {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [isInstallable, setIsInstallable] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [showIOSModal, setShowIOSModal] = useState(false);
  const [installed, setInstalled] = useState(false);

  useEffect(() => {
    // Check standalone / installed mode
    const checkStandalone = () => {
      const isStandaloneMode =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true ||
        document.referrer.includes('android-app://');

      setIsStandalone(isStandaloneMode);
    };

    checkStandalone();

    // Check iOS
    const ua = window.navigator.userAgent.toLowerCase();
    const iosDevice = /iphone|ipad|ipod/.test(ua);
    setIsIOS(iosDevice);

    // Listen for beforeinstallprompt
    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      setDeferredPrompt(e as BeforeInstallPromptEvent);
      setIsInstallable(true);
    };

    const handleAppInstalled = () => {
      setInstalled(true);
      setIsInstallable(false);
      setDeferredPrompt(null);
    };

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('appinstalled', handleAppInstalled);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('appinstalled', handleAppInstalled);
    };
  }, []);

  const handleInstallClick = async () => {
    if (deferredPrompt) {
      await deferredPrompt.prompt();
      const choice = await deferredPrompt.userChoice;
      if (choice.outcome === 'accepted') {
        setInstalled(true);
        setIsInstallable(false);
      }
      setDeferredPrompt(null);
    } else if (isIOS) {
      setShowIOSModal(true);
    } else {
      // Fallback instructions for browsers that require menu option or already have prompt cached
      alert(
        'To download/install Cultus as an App:\n\n1. Look for the Install icon in your browser address bar (top right).\n2. Or click the Browser Menu (⋮ or ⋯) and select "Install Cultus" or "Add to Home Screen".'
      );
    }
  };

  if (isStandalone || installed) {
    return (
      <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/20">
        <CheckCircle2 className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Installed</span>
      </span>
    );
  }

  return (
    <>
      <button
        onClick={handleInstallClick}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-semibold bg-[#1e3a5f] hover:bg-[#022448] dark:bg-[#5ce3e6] dark:hover:bg-[#38c9cd] text-white dark:text-[#070f1c] shadow-sm transition-all transform active:scale-95 cursor-pointer"
        title="Download Cultus as an App"
      >
        <Download className="w-3.5 h-3.5 animate-bounce" />
        <span>Download App</span>
      </button>

      {/* iOS Instructions Modal */}
      {showIOSModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
          <div className="relative w-full max-w-sm bg-white dark:bg-[#0d1829] border border-[#e2e6ea] dark:border-[#5ce3e6]/20 rounded-3xl p-6 shadow-2xl">
            <button
              onClick={() => setShowIOSModal(false)}
              className="absolute top-4 right-4 p-1.5 rounded-full text-slate-400 hover:text-slate-600 dark:hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-2xl bg-[#1e3a5f]/10 dark:bg-[#5ce3e6]/10 text-[#1e3a5f] dark:text-[#5ce3e6] flex items-center justify-center">
                <Smartphone className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-semibold text-base text-slate-900 dark:text-white">
                  Install Cultus on iOS
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Add to home screen for native app experience
                </p>
              </div>
            </div>

            <div className="space-y-3.5 text-xs text-slate-700 dark:text-slate-300">
              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                <div className="p-1.5 rounded-lg bg-blue-500/10 text-blue-500 mt-0.5">
                  <Share className="w-4 h-4" />
                </div>
                <div>
                  <strong className="block text-slate-900 dark:text-white">Step 1</strong>
                  Tap the <span className="font-semibold text-blue-500">Share</span> button at the bottom of Safari.
                </div>
              </div>

              <div className="flex items-start gap-3 p-2.5 rounded-xl bg-slate-50 dark:bg-slate-800/50 border border-slate-200/60 dark:border-slate-700/60">
                <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-500 mt-0.5">
                  <PlusSquare className="w-4 h-4" />
                </div>
                <div>
                  <strong className="block text-slate-900 dark:text-white">Step 2</strong>
                  Scroll down and select <span className="font-semibold text-emerald-500">Add to Home Screen</span>.
                </div>
              </div>
            </div>

            <button
              onClick={() => setShowIOSModal(false)}
              className="mt-5 w-full py-2.5 rounded-xl bg-[#1e3a5f] text-white font-medium text-xs dark:bg-[#5ce3e6] dark:text-[#070f1c]"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
