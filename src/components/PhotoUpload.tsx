import React, { useCallback, useRef, useState } from 'react';
import { Upload, ImagePlus, AlertCircle } from 'lucide-react';

interface PhotoUploadProps {
  onPhotosAdded: (files: File[]) => void;
  currentCount: number;
}

const MAX_PHOTOS = 20;
const ACCEPTED_TYPES = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/heic', 'image/heif'];

export function PhotoUpload({ onPhotosAdded, currentCount }: PhotoUploadProps) {
  const [isDragging, setIsDragging] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const showError = (msg: string) => {
    setError(msg);
    setTimeout(() => setError(null), 4000);
  };

  const handleFiles = useCallback((files: File[]) => {
    const validFiles = files.filter(f => {
      if (ACCEPTED_TYPES.includes(f.type)) return true;
      const ext = f.name.split('.').pop()?.toLowerCase();
      return ext === 'heic' || ext === 'heif';
    });
    const invalidCount = files.length - validFiles.length;
    if (invalidCount > 0) {
      showError(`${invalidCount} file(s) skipped — only JPG, PNG, WebP, GIF, and HEIC are supported.`);
    }
    const remaining = MAX_PHOTOS - currentCount;
    if (validFiles.length > remaining) {
      showError(`Only ${remaining} more photo(s) can be added (max ${MAX_PHOTOS}).`);
      onPhotosAdded(validFiles.slice(0, remaining));
    } else {
      if (validFiles.length > 0) onPhotosAdded(validFiles);
    }
  }, [currentCount, onPhotosAdded]);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    handleFiles(Array.from(e.dataTransfer.files));
  }, [handleFiles]);

  const onDragOver = (e: React.DragEvent) => { e.preventDefault(); setIsDragging(true); };
  const onDragLeave = () => setIsDragging(false);

  const onInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) handleFiles(Array.from(e.target.files));
    e.target.value = '';
  };

  const isFull = currentCount >= MAX_PHOTOS;

  return (
    <div className="space-y-3">
      <div
        role="button"
        tabIndex={isFull ? -1 : 0}
        aria-label={isFull ? 'Maximum photos reached' : 'Drop photos here or click to browse'}
        aria-disabled={isFull}
        onClick={() => !isFull && inputRef.current?.click()}
        onKeyDown={(e) => {
          if (!isFull && (e.key === 'Enter' || e.key === ' ')) {
            e.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`border-2 border-dashed rounded-xl p-6 md:p-10 text-center transition-colors cursor-pointer select-none
          ${isFull ? 'border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 cursor-not-allowed opacity-60' :
            isDragging ? 'border-indigo-400 bg-indigo-50 dark:bg-indigo-950' : 'border-gray-300 dark:border-gray-600 bg-gray-50 dark:bg-gray-800 hover:border-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950'}`}
      >
        <div className="flex flex-col items-center gap-3">
          {isDragging ? (
            <ImagePlus className="w-10 h-10 text-indigo-500" />
          ) : (
            <Upload className="w-10 h-10 text-gray-400 dark:text-gray-500" />
          )}
          <div>
            <p className="text-sm font-medium text-gray-700 dark:text-gray-300">
              {isFull ? 'Maximum photos reached' : 'Drop photos here or click to browse'}
            </p>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
              JPG, PNG, WebP, GIF, HEIC — up to {MAX_PHOTOS} photos ({currentCount}/{MAX_PHOTOS} added)
            </p>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          aria-label="Upload photos"
          accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
          className="hidden"
          onChange={onInputChange}
        />
      </div>
      {error && (
        <div role="alert" className="flex items-center gap-2 text-sm text-red-700 dark:text-red-400 bg-red-50 dark:bg-red-950 border border-red-200 dark:border-red-800 rounded-lg px-4 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
