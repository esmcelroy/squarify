import { Download, Trash2, Crown } from 'lucide-react';
import type { UploadedPhoto } from '../types';

interface PhotoGridProps {
  photos: UploadedPhoto[];
  maxAspectRatio: number;
  onRemove: (id: string) => void;
  isProcessed: boolean;
}

function downloadDataUrl(dataUrl: string, filename: string) {
  const a = document.createElement('a');
  a.href = dataUrl;
  a.download = filename;
  a.click();
}

export function PhotoGrid({ photos, maxAspectRatio, onRemove, isProcessed }: PhotoGridProps) {
  if (photos.length === 0) return null;

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
      {photos.map((photo, idx) => {
        const isDominant = Math.abs(photo.aspectRatio - maxAspectRatio) < 0.001;
        const displayUrl = isProcessed && photo.paddedDataUrl ? photo.paddedDataUrl : photo.dataUrl;
        const filename = `squarify-${String(idx + 1).padStart(2, '0')}.png`;

        return (
          <div key={photo.id} className="group relative bg-gray-100 rounded-xl overflow-hidden border border-gray-200 hover:border-indigo-300 transition-colors">
            {/* Image */}
            <div className="relative aspect-square flex items-center justify-center overflow-hidden bg-[repeating-conic-gradient(#e5e7eb_0%_25%,#f9fafb_0%_50%)] bg-[length:16px_16px]">
              <img
                src={displayUrl}
                alt={photo.file.name}
                className="max-w-full max-h-full object-contain"
              />
            </div>

            {/* Badges */}
            {isDominant && (
              <div className="absolute top-2 left-2 flex items-center gap-1 bg-amber-400 text-amber-900 text-xs font-semibold px-2 py-0.5 rounded-full shadow">
                <Crown className="w-3 h-3" /> Widest
              </div>
            )}

            {/* Info bar */}
            <div className="px-3 py-2 bg-white border-t border-gray-200">
              <p className="text-xs text-gray-500 truncate" title={photo.file.name}>{photo.file.name}</p>
              <p className="text-xs text-gray-400">{photo.width} × {photo.height}</p>
            </div>

            {/* Action overlay */}
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
              {isProcessed && photo.paddedDataUrl && (
                <button
                  onClick={() => downloadDataUrl(photo.paddedDataUrl!, filename)}
                  title="Download"
                  className="p-2 bg-white rounded-full text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors shadow"
                >
                  <Download className="w-4 h-4" />
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
