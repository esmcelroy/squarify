import React, { useRef } from 'react';
import type { PaddingSettings } from '../types';
import { ASPECT_RATIO_PRESETS } from '../types';
import { Palette, Image as ImageIcon, Wand2 } from 'lucide-react';

interface PaddingSettingsPanelProps {
  settings: PaddingSettings;
  onChange: (settings: PaddingSettings) => void;
  onProcess: () => void;
  isProcessing: boolean;
  hasPhotos: boolean;
}

export function PaddingSettingsPanel({ settings, onChange, onProcess, isProcessing, hasPhotos }: PaddingSettingsPanelProps) {
  const bgImageInputRef = useRef<HTMLInputElement>(null);

  const update = (partial: Partial<PaddingSettings>) => onChange({ ...settings, ...partial });

  const handleBgImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update({ fillImageDataUrl: reader.result as string });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-5">
      <h2 className="font-semibold text-gray-800 text-base">Padding Settings</h2>

      {/* Fill type selector */}
      <div className="flex gap-2">
        <button
          onClick={() => update({ fillType: 'color' })}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-colors
            ${settings.fillType === 'color'
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'}`}
        >
          <Palette className="w-4 h-4" /> Solid Color
        </button>
        <button
          onClick={() => update({ fillType: 'image' })}
          className={`flex-1 flex items-center justify-center gap-2 py-2 px-3 rounded-lg border text-sm font-medium transition-colors
            ${settings.fillType === 'image'
              ? 'bg-indigo-600 border-indigo-600 text-white'
              : 'border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600'}`}
        >
          <ImageIcon className="w-4 h-4" /> Background Image
        </button>
      </div>

      {/* Color picker */}
      {settings.fillType === 'color' && (
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600 font-medium w-16 shrink-0">Color</label>
          <div className="flex items-center gap-2 flex-1">
            <input
              type="color"
              value={settings.fillColor}
              onChange={e => update({ fillColor: e.target.value })}
              className="h-9 w-14 rounded cursor-pointer border border-gray-200"
            />
            <input
              type="text"
              value={settings.fillColor}
              onChange={e => {
                const val = e.target.value;
                if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) update({ fillColor: val });
              }}
              className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm font-mono focus:outline-none focus:ring-2 focus:ring-indigo-300"
              maxLength={7}
              placeholder="#ffffff"
            />
          </div>
        </div>
      )}

      {/* Background image */}
      {settings.fillType === 'image' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600 font-medium w-16 shrink-0">Image</label>
            <div className="flex items-center gap-2 flex-1">
              {settings.fillImageDataUrl && (
                <img
                  src={settings.fillImageDataUrl}
                  alt="Background"
                  className="h-10 w-16 object-cover rounded border border-gray-200 shrink-0"
                />
              )}
              <button
                onClick={() => bgImageInputRef.current?.click()}
                className="flex-1 border border-dashed border-gray-300 rounded-lg px-3 py-2 text-sm text-gray-500 hover:border-indigo-400 hover:text-indigo-500 transition-colors text-center"
              >
                {settings.fillImageDataUrl ? 'Change image' : 'Upload image'}
              </button>
              <input
                ref={bgImageInputRef}
                type="file"
                accept="image/*"
                className="hidden"
                onChange={handleBgImageFile}
              />
            </div>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600 font-medium w-16 shrink-0">Style</label>
            <div className="flex gap-2 flex-1">
              {(['cover', 'contain', 'tile'] as const).map(style => (
                <button
                  key={style}
                  onClick={() => update({ fillImageStyle: style })}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-medium capitalize transition-colors
                    ${settings.fillImageStyle === style
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-gray-200 text-gray-600 hover:border-indigo-300'}`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Aspect ratio selector */}
      <div className="space-y-2">
        <label className="text-sm text-gray-600 font-medium">Target Aspect Ratio</label>
        <div className="grid grid-cols-2 gap-1.5">
          {ASPECT_RATIO_PRESETS.map(preset => (
            <button
              key={preset.value}
              onClick={() => update({ aspectRatio: preset.value })}
              className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-colors
                ${settings.aspectRatio === preset.value
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'border-gray-200 text-gray-600 hover:border-indigo-300'}`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Border padding */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-600 font-medium">Border Padding</label>
          <span className="text-xs text-gray-500 font-mono">{settings.borderPadding}px</span>
        </div>
        <input
          type="range"
          min={0}
          max={200}
          step={5}
          value={settings.borderPadding}
          onChange={e => update({ borderPadding: Number(e.target.value) })}
          className="w-full accent-indigo-600"
        />
        <div className="flex justify-between text-xs text-gray-400">
          <span>0</span>
          <span>200px</span>
        </div>
      </div>

      {/* Process button */}
      <button
        onClick={onProcess}
        disabled={!hasPhotos || isProcessing}
        className="w-full flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-medium py-2.5 rounded-lg transition-colors text-sm"
      >
        {isProcessing ? (
          <>
            <span className="inline-block w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
            Processing…
          </>
        ) : (
          <>
            <Wand2 className="w-4 h-4" />
            Process Images
          </>
        )}
      </button>
    </div>
  );
}
