import { useState, useCallback } from 'react';
import JSZip from 'jszip';
import { PhotoUpload } from './components/PhotoUpload';
import { PaddingSettingsPanel } from './components/PaddingSettingsPanel';
import { PhotoGrid } from './components/PhotoGrid';
import { useLocalStorage } from './hooks/useLocalStorage';
import type { UploadedPhoto, PaddingSettings } from './types';
import { getImageDimensions, findMaxAspectRatio, padImageToAspectRatio } from './lib/imageUtils';
import { processFilesForHeic } from './lib/heicUtils';
import { Download, Trash2, Layers } from 'lucide-react';

const DEFAULT_SETTINGS: PaddingSettings = {
  fillType: 'color',
  fillColor: '#ffffff',
  fillImageDataUrl: null,
  fillImageStyle: 'cover',
};

function readFileAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function App() {
  const [photos, setPhotos] = useState<UploadedPhoto[]>([]);
  const [settings, setSettings] = useLocalStorage<PaddingSettings>('squarify-settings', DEFAULT_SETTINGS);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isProcessed, setIsProcessed] = useState(false);
  const [progress, setProgress] = useState(0);

  const maxAspectRatio = findMaxAspectRatio(photos);

  const handlePhotosAdded = useCallback(async (files: File[]) => {
    // Convert any HEIC/HEIF files to JPEG first
    const { converted, errors } = await processFilesForHeic(files);
    if (errors.length > 0) {
      console.warn('HEIC conversion errors:', errors);
    }

    const newPhotos: UploadedPhoto[] = [];
    for (const file of converted) {
      const dataUrl = await readFileAsDataUrl(file);
      const { width, height } = await getImageDimensions(dataUrl);
      newPhotos.push({
        id: `${file.name}-${Date.now()}-${Math.random()}`,
        file,
        dataUrl,
        width,
        height,
        aspectRatio: width / height,
        paddedDataUrl: null,
      });
    }
    setPhotos(prev => [...prev, ...newPhotos]);
    setIsProcessed(false);
  }, []);

  const handleRemove = useCallback((id: string) => {
    setPhotos(prev => prev.filter(p => p.id !== id));
    setIsProcessed(false);
  }, []);

  const handleClearAll = () => {
    setPhotos([]);
    setIsProcessed(false);
  };

  const handleProcess = async () => {
    if (photos.length === 0) return;
    setIsProcessing(true);
    setProgress(0);
    const target = findMaxAspectRatio(photos);
    const processed: UploadedPhoto[] = [];
    for (let i = 0; i < photos.length; i++) {
      const paddedDataUrl = await padImageToAspectRatio(photos[i], target, settings);
      processed.push({ ...photos[i], paddedDataUrl });
      setProgress(Math.round(((i + 1) / photos.length) * 100));
    }
    setPhotos(processed);
    setIsProcessing(false);
    setIsProcessed(true);
  };

  const handleDownloadAll = async () => {
    const processedPhotos = photos.filter(p => p.paddedDataUrl);
    if (processedPhotos.length === 0) return;

    const zip = new JSZip();
    processedPhotos.forEach((photo, idx) => {
      const base64 = photo.paddedDataUrl!.split(',')[1];
      zip.file(`squarify-${String(idx + 1).padStart(2, '0')}.png`, base64, { base64: true });
    });

    const blob = await zip.generateAsync({ type: 'blob' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'squarify-images.zip';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-4 py-4">
        <div className="max-w-6xl mx-auto flex items-center gap-3">
          <div className="bg-indigo-600 text-white rounded-xl p-2">
            <Layers className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg font-bold text-gray-900 leading-tight">Squarify</h1>
            <p className="text-xs text-gray-500">Pad photos to a uniform aspect ratio</p>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 py-6 space-y-6">
        {/* Upload + Settings */}
        <div className="grid grid-cols-1 md:grid-cols-[1fr_320px] gap-6 items-start">
          <div className="space-y-4">
            <PhotoUpload onPhotosAdded={handlePhotosAdded} currentCount={photos.length} />

            {/* Stats bar */}
            {photos.length > 0 && (
              <div className="flex items-center justify-between text-sm text-gray-600 bg-white border border-gray-200 rounded-lg px-4 py-2">
                <span>{photos.length} photo{photos.length !== 1 ? 's' : ''} · Max ratio: <span className="font-mono font-medium">{maxAspectRatio.toFixed(3)}</span></span>
                <button onClick={handleClearAll} className="flex items-center gap-1 text-xs text-red-500 hover:text-red-700 transition-colors">
                  <Trash2 className="w-3 h-3" /> Clear all
                </button>
              </div>
            )}
          </div>

          <PaddingSettingsPanel
            settings={settings}
            onChange={s => { setSettings(s); setIsProcessed(false); }}
            onProcess={handleProcess}
            isProcessing={isProcessing}
            hasPhotos={photos.length > 0}
          />
        </div>

        {/* Progress */}
        {isProcessing && (
          <div className="space-y-2">
            <div className="flex justify-between text-xs text-gray-600">
              <span>Processing images…</span>
              <span>{progress}%</span>
            </div>
            <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-indigo-500 rounded-full transition-all duration-200"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Download all */}
        {isProcessed && photos.some(p => p.paddedDataUrl) && (
          <div className="flex justify-end">
            <button
              onClick={handleDownloadAll}
              className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2 px-5 rounded-lg text-sm transition-colors"
            >
              <Download className="w-4 h-4" />
              Download All as ZIP
            </button>
          </div>
        )}

        {/* Photo grid */}
        <PhotoGrid
          photos={photos}
          maxAspectRatio={maxAspectRatio}
          onRemove={handleRemove}
          isProcessed={isProcessed}
        />
      </main>
    </div>
  );
}
