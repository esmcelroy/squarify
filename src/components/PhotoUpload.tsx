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
      // HEIC files may have empty MIME type — check extension
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
        onClick={() => !isFull && inputRef.current?.click()}
        onDrop={onDrop}
        onDragOver={onDragOver}
        onDragLeave={onDragLeave}
        className={`border-2 border-dashed rounded-xl p-10 text-center transition-colors cursor-pointer select-none
          ${isFull ? 'border-gray-200 bg-gray-50 cursor-not-allowed opacity-60' :
            isDragging ? 'border-indigo-400 bg-indigo-50' : 'border-gray-300 bg-gray-50 hover:border-indigo-400 hover:bg-indigo-50'}`}
      >
        <div className="flex flex-col items-center gap-3">
          {isDragging ? (
            <ImagePlus className="w-10 h-10 text-indigo-500" />
          ) : (
            <Upload className="w-10 h-10 text-gray-400" />
          )}
          <div>
            <p className="text-sm font-medium text-gray-700">
              {isFull ? 'Maximum photos reached' : 'Drop photos here or click to browse'}
            </p>
            <p className="text-xs text-gray-500 mt-1">
              JPG, PNG, WebP, GIF, HEIC — up to {MAX_PHOTOS} photos ({currentCount}/{MAX_PHOTOS} added)
            </p>
          </div>
        </div>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept="image/jpeg,image/png,image/webp,image/gif,image/heic,image/heif,.heic,.heif"
          className="hidden"
          onChange={onInputChange}
        />
      </div>
      {error && (
        <div className="flex items-center gap-2 text-sm text-red-700 bg-red-50 border border-red-200 rounded-lg px-4 py-2">
          <AlertCircle className="w-4 h-4 shrink-0" />
          {error}
        </div>
      )}
    </div>
  );
}
