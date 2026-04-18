import { useState } from 'react';
import { Download, Trash2, Crown, Eye, EyeOff, Copy, Check, Share2 } from 'lucide-react';
import type { UploadedPhoto } from '../types';

interface PhotoGridProps {
  photos: UploadedPhoto[];
  maxAspectRatio: number;
  onRemove: (id: string) => void;
  isProcessed: boolean;
  outputFormat: string;
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

async function copyToClipboard(dataUrl: string): Promise<boolean> {
  try {
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    // Clipboard API requires PNG for images
    const pngBlob = blob.type === 'image/png' ? blob : await convertToPngBlob(dataUrl);
    await navigator.clipboard.write([
      new ClipboardItem({ 'image/png': pngBlob }),
    ]);
    return true;
  } catch {
    return false;
  }
}

function convertToPngBlob(dataUrl: string): Promise<Blob> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d')!;
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(blob => {
        if (blob) resolve(blob);
        else reject(new Error('Failed to convert to PNG'));
      }, 'image/png');
    };
    img.onerror = reject;
    img.src = dataUrl;
  });
}

async function shareImage(dataUrl: string, filename: string): Promise<boolean> {
  try {
    if (!navigator.share || !navigator.canShare) return false;
    const res = await fetch(dataUrl);
    const blob = await res.blob();
    const file = new File([blob], filename, { type: blob.type });
    if (!navigator.canShare({ files: [file] })) return false;
    await navigator.share({ files: [file] });
    return true;
  } catch {
    return false;
  }
}

const supportsShare = typeof navigator !== 'undefined' && !!navigator.share && !!navigator.canShare;

export function PhotoGrid({ photos, maxAspectRatio, onRemove, isProcessed, outputFormat }: PhotoGridProps) {
  const [showOriginal, setShowOriginal] = useState<Record<string, boolean>>({});
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (photos.length === 0) return null;

  const togglePreview = (id: string) => {
    setShowOriginal(prev => ({ ...prev, [id]: !prev[id] }));
  };

  const handleCopy = async (id: string, dataUrl: string) => {
    const ok = await copyToClipboard(dataUrl);
    if (ok) {
      setCopiedId(id);
      setTimeout(() => setCopiedId(null), 2000);
    }
  };

  const ext = outputFormat === 'jpeg' ? 'jpg' : outputFormat;

  return (
    <div className="grid grid-cols-1 xs:grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 md:gap-4">
      {photos.map((photo, idx) => {
        const isDominant = Math.abs(photo.aspectRatio - maxAspectRatio) < 0.001;
        const viewingOriginal = showOriginal[photo.id] ?? false;
        const displayUrl = isProcessed && photo.paddedDataUrl && !viewingOriginal
          ? photo.paddedDataUrl
          : photo.dataUrl;
        const filename = `squarify-${String(idx + 1).padStart(2, '0')}.${ext}`;

        return (
          <div key={photo.id} className="group relative bg-gray-100 dark:bg-gray-800 rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700 hover:border-indigo-300 dark:hover:border-indigo-600 transition-colors">
            {/* Image */}
            <div className="relative aspect-square flex items-center justify-center overflow-hidden bg-[repeating-conic-gradient(#e5e7eb_0%_25%,#f9fafb_0%_50%)] dark:bg-[repeating-conic-gradient(#374151_0%_25%,#1f2937_0%_50%)] bg-[length:16px_16px]">
              <img
                src={displayUrl}
                alt={photo.file.name}
                className="max-w-full max-h-full object-contain"
              />
              {/* Before/After label */}
              {isProcessed && photo.paddedDataUrl && (
                <span className="absolute bottom-2 left-2 text-xs font-medium bg-black/60 text-white px-2 py-0.5 rounded-full">
                  {viewingOriginal ? 'Original' : 'Padded'}
                </span>
              )}
            </div>

            {/* Badges */}
            {isDominant && (
              <div className="absolute top-2 left-2 flex items-center gap-1 bg-amber-400 text-amber-900 text-xs font-semibold px-2 py-0.5 rounded-full shadow">
                <Crown className="w-3 h-3" /> Widest
              </div>
            )}

            {/* Info bar with action buttons */}
            <div className="px-3 py-2 bg-white dark:bg-gray-900 border-t border-gray-200 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="min-w-0 flex-1">
                  <p className="text-xs text-gray-500 dark:text-gray-400 truncate" title={photo.file.name}>{photo.file.name}</p>
                  <p className="text-xs text-gray-400 dark:text-gray-500">{photo.width} × {photo.height}</p>
                </div>
                {isProcessed && photo.paddedDataUrl && (
                  <div className="flex items-center gap-1 ml-2 shrink-0">
                    <button
                      onClick={() => handleCopy(photo.id, photo.paddedDataUrl!)}
                      title="Copy to clipboard"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors"
                    >
                      {copiedId === photo.id ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    </button>
                    {supportsShare && (
                      <button
                        onClick={() => shareImage(photo.paddedDataUrl!, filename)}
                        title="Share"
                        className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors"
                      >
                        <Share2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                    <button
                      onClick={() => downloadDataUrl(photo.paddedDataUrl!, filename)}
                      title="Download"
                      className="p-1.5 rounded-lg text-gray-400 hover:text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-950 transition-colors"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Action overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 focus-within:opacity-100 transition-opacity flex items-center justify-center gap-2">
              {isProcessed && photo.paddedDataUrl && (
                <button
                  onClick={() => togglePreview(photo.id)}
                  title={viewingOriginal ? 'Show padded' : 'Show original'}
                  className="p-2 bg-white rounded-full text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors shadow"
                >
                  {viewingOriginal ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
              )}
              <button
                onClick={() => onRemove(photo.id)}
                title="Remove"
                className="p-2 bg-white rounded-full text-gray-700 hover:bg-red-50 hover:text-red-600 transition-colors shadow"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        );
      })}
    </div>
  );
}
