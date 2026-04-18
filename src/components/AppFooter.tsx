import { useState, useEffect, useRef, useCallback } from 'react';
import { Info, Upload, Sliders, Wand2, Download, X } from 'lucide-react';

function GitHubIcon({ className }: { className?: string }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z" />
    </svg>
  );
}

export function AppFooter() {
  const [aboutOpen, setAboutOpen] = useState(false);
  const dialogRef = useRef<HTMLDivElement>(null);
  const triggerRef = useRef<HTMLButtonElement>(null);

  const closeDialog = useCallback(() => {
    setAboutOpen(false);
    triggerRef.current?.focus();
  }, []);

  // Focus trap and Escape key handler
  useEffect(() => {
    if (!aboutOpen) return;

    // Focus the dialog on open
    const dialog = dialogRef.current;
    if (dialog) {
      const closeBtn = dialog.querySelector<HTMLElement>('[aria-label="Close about dialog"]');
      closeBtn?.focus();
    }

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        closeDialog();
        return;
      }

      if (e.key === 'Tab' && dialog) {
        const focusable = dialog.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        );
        const first = focusable[0];
        const last = focusable[focusable.length - 1];

        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault();
            last?.focus();
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault();
            first?.focus();
          }
        }
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [aboutOpen, closeDialog]);

  return (
    <>
      <footer className="border-t border-gray-200 dark:border-gray-800 mt-12 py-6">
        <div className="max-w-6xl mx-auto px-4 flex items-center justify-between">
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Squarify
          </p>
          <div className="flex items-center gap-4">
            <button
              ref={triggerRef}
              onClick={() => setAboutOpen(true)}
              className="flex items-center gap-1.5 text-sm text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
            >
              <Info className="w-4 h-4" />
              About
            </button>
            <a
              href="https://github.com/esmcelroy/squarify"
              target="_blank"
              rel="noopener noreferrer"
              className="text-gray-500 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
              aria-label="View source on GitHub"
            >
              <GitHubIcon className="w-5 h-5" />
            </a>
          </div>
        </div>
      </footer>

      {/* About modal */}
      {aboutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" onClick={closeDialog} role="dialog" aria-modal="true" aria-label="About Squarify">
          <div
            ref={dialogRef}
            className="bg-white dark:bg-gray-900 rounded-2xl shadow-xl max-w-lg w-full p-6 space-y-4"
            onClick={e => e.stopPropagation()}
          >
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold text-gray-900 dark:text-gray-100">About Squarify</h2>
              <button onClick={closeDialog} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors" aria-label="Close about dialog">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-sm text-gray-600 dark:text-gray-400">
              A free, privacy-first photo padding tool that runs entirely in your browser. No uploads to any server — your photos never leave your device.
            </p>

            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-gray-800 dark:text-gray-200">How to use</h3>
              <div className="space-y-2 text-sm text-gray-600 dark:text-gray-400">
                <div className="flex items-start gap-3">
                  <Upload className="w-4 h-4 mt-0.5 text-indigo-500 shrink-0" />
                  <p><strong className="text-gray-800 dark:text-gray-200">Upload photos</strong> — drag and drop or click to browse. Supports JPEG, PNG, WebP, and HEIC.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Sliders className="w-4 h-4 mt-0.5 text-indigo-500 shrink-0" />
                  <p><strong className="text-gray-800 dark:text-gray-200">Configure</strong> — choose fill type (color, image, gradient, blur, pattern), aspect ratio, and effects like watermark or shadow.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Wand2 className="w-4 h-4 mt-0.5 text-indigo-500 shrink-0" />
                  <p><strong className="text-gray-800 dark:text-gray-200">Process</strong> — click Process Images to pad all photos to a uniform aspect ratio.</p>
                </div>
                <div className="flex items-start gap-3">
                  <Download className="w-4 h-4 mt-0.5 text-indigo-500 shrink-0" />
                  <p><strong className="text-gray-800 dark:text-gray-200">Export</strong> — download individually, as ZIP, copy to clipboard, or share. Supports PNG, JPEG, and WebP formats.</p>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-gray-200 dark:border-gray-700">
              <p className="text-xs text-gray-400 dark:text-gray-500">
                Built with React, Vite, and Tailwind CSS. Works offline as a PWA.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
