import React, { useRef } from 'react';
import type { PaddingSettings, PaddingFillType, GradientDirection, OutputFormat } from '../types';
import { ASPECT_RATIO_PRESETS } from '../types';
import { Palette, Image as ImageIcon, Wand2, Blend, Sparkles } from 'lucide-react';

interface PaddingSettingsPanelProps {
  settings: PaddingSettings;
  onChange: (settings: PaddingSettings) => void;
  onProcess: () => void;
  isProcessing: boolean;
  hasPhotos: boolean;
}

const FILL_TYPES: { value: PaddingFillType; label: string; icon: typeof Palette }[] = [
  { value: 'color', label: 'Color', icon: Palette },
  { value: 'image', label: 'Image', icon: ImageIcon },
  { value: 'gradient', label: 'Gradient', icon: Blend },
  { value: 'blur', label: 'Blur', icon: Sparkles },
];

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
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-5 space-y-5 max-h-[calc(100vh-120px)] overflow-y-auto">
      <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-base">Padding Settings</h2>

      {/* Fill type selector */}
      <div className="grid grid-cols-4 gap-1.5">
        {FILL_TYPES.map(({ value, label, icon: Icon }) => (
          <button
            key={value}
            onClick={() => update({ fillType: value })}
            className={`flex flex-col items-center gap-1 py-2 px-1 rounded-lg border text-xs font-medium transition-colors
              ${settings.fillType === value
                ? 'bg-indigo-600 border-indigo-600 text-white'
                : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-indigo-300 hover:text-indigo-600'}`}
          >
            <Icon className="w-4 h-4" />
            {label}
          </button>
        ))}
      </div>

      {/* Color picker */}
      {settings.fillType === 'color' && (
        <div className="flex items-center gap-3">
          <label className="text-sm text-gray-600 dark:text-gray-400 font-medium w-16 shrink-0">Color</label>
          <div className="flex items-center gap-2 flex-1">
            <input
              type="color"
              value={settings.fillColor}
              onChange={e => update({ fillColor: e.target.value })}
              className="h-9 w-14 rounded cursor-pointer border border-gray-200 dark:border-gray-600"
            />
            <input
              type="text"
              value={settings.fillColor}
              onChange={e => {
                const val = e.target.value;
                if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) update({ fillColor: val });
              }}
              className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-300"
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
            <label className="text-sm text-gray-600 dark:text-gray-400 font-medium w-16 shrink-0">Image</label>
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
                className="flex-1 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm text-gray-500 dark:text-gray-400 hover:border-indigo-400 hover:text-indigo-500 transition-colors text-center"
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
            <label className="text-sm text-gray-600 dark:text-gray-400 font-medium w-16 shrink-0">Style</label>
            <div className="flex gap-2 flex-1">
              {(['cover', 'contain', 'tile'] as const).map(style => (
                <button
                  key={style}
                  onClick={() => update({ fillImageStyle: style })}
                  className={`flex-1 py-1.5 rounded-lg border text-xs font-medium capitalize transition-colors
                    ${settings.fillImageStyle === style
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-indigo-300'}`}
                >
                  {style}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Gradient settings */}
      {settings.fillType === 'gradient' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600 dark:text-gray-400 font-medium w-16 shrink-0">Direction</label>
            <div className="grid grid-cols-4 gap-1.5 flex-1">
              {(['horizontal', 'vertical', 'diagonal', 'radial'] as GradientDirection[]).map(dir => (
                <button
                  key={dir}
                  onClick={() => update({ gradientDirection: dir })}
                  className={`py-1.5 rounded-lg border text-xs font-medium capitalize transition-colors
                    ${settings.gradientDirection === dir
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-indigo-300'}`}
                >
                  {dir === 'horizontal' ? '↔' : dir === 'vertical' ? '↕' : dir === 'diagonal' ? '↗' : '◎'}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600 dark:text-gray-400 font-medium w-16 shrink-0">Start</label>
            <input
              type="color"
              value={settings.gradientColorStart}
              onChange={e => update({ gradientColorStart: e.target.value })}
              className="h-8 w-12 rounded cursor-pointer border border-gray-200 dark:border-gray-600"
            />
            <label className="text-sm text-gray-600 dark:text-gray-400 font-medium w-10 shrink-0 text-center">End</label>
            <input
              type="color"
              value={settings.gradientColorEnd}
              onChange={e => update({ gradientColorEnd: e.target.value })}
              className="h-8 w-12 rounded cursor-pointer border border-gray-200 dark:border-gray-600"
            />
          </div>
        </div>
      )}

      {/* Blur settings */}
      {settings.fillType === 'blur' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-600 dark:text-gray-400 font-medium">Blur Amount</label>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{settings.blurAmount}px</span>
          </div>
          <input
            type="range"
            min={5}
            max={100}
            step={5}
            value={settings.blurAmount}
            onChange={e => update({ blurAmount: Number(e.target.value) })}
            className="w-full accent-indigo-600"
          />
        </div>
      )}

      {/* Aspect ratio selector */}
      <div className="space-y-2">
        <label className="text-sm text-gray-600 dark:text-gray-400 font-medium">Target Aspect Ratio</label>
        <div className="grid grid-cols-3 gap-1.5">
          {ASPECT_RATIO_PRESETS.map(preset => (
            <button
              key={preset.value}
              onClick={() => update({ aspectRatio: preset.value })}
              className={`py-1.5 px-2 rounded-lg border text-xs font-medium transition-colors
                ${settings.aspectRatio === preset.value
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-indigo-300'}`}
            >
              {preset.label}
            </button>
          ))}
        </div>
      </div>

      {/* Custom ratio inputs */}
      {settings.aspectRatio === 'custom' && (
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400 font-medium w-16 shrink-0">Ratio</label>
          <input
            type="number"
            min={1}
            max={100}
            value={settings.customRatioWidth}
            onChange={e => update({ customRatioWidth: Math.max(1, Number(e.target.value)) })}
            className="w-16 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm text-center bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <span className="text-sm text-gray-400 font-bold">:</span>
          <input
            type="number"
            min={1}
            max={100}
            value={settings.customRatioHeight}
            onChange={e => update({ customRatioHeight: Math.max(1, Number(e.target.value)) })}
            className="w-16 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm text-center bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">= {(settings.customRatioWidth / settings.customRatioHeight).toFixed(3)}</span>
        </div>
      )}

      {/* Border padding */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-600 dark:text-gray-400 font-medium">Border Padding</label>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{settings.borderPadding}px</span>
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
      </div>

      {/* Output format */}
      <div className="space-y-2">
        <label className="text-sm text-gray-600 dark:text-gray-400 font-medium">Output Format</label>
        <div className="flex gap-2">
          {(['png', 'jpeg', 'webp'] as OutputFormat[]).map(fmt => (
            <button
              key={fmt}
              onClick={() => update({ outputFormat: fmt })}
              className={`flex-1 py-1.5 rounded-lg border text-xs font-medium uppercase transition-colors
                ${settings.outputFormat === fmt
                  ? 'bg-indigo-600 border-indigo-600 text-white'
                  : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-indigo-300'}`}
            >
              {fmt}
            </button>
          ))}
        </div>
      </div>

      {/* Quality slider (JPEG/WebP only) */}
      {settings.outputFormat !== 'png' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <label className="text-sm text-gray-600 dark:text-gray-400 font-medium">Quality</label>
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{Math.round(settings.outputQuality * 100)}%</span>
          </div>
          <input
            type="range"
            min={0.1}
            max={1}
            step={0.05}
            value={settings.outputQuality}
            onChange={e => update({ outputQuality: Number(e.target.value) })}
            className="w-full accent-indigo-600"
          />
        </div>
      )}

      {/* Max dimension */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-600 dark:text-gray-400 font-medium">Max Dimension</label>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{settings.maxDimension === 0 ? 'None' : `${settings.maxDimension}px`}</span>
        </div>
        <input
          type="range"
          min={0}
          max={4000}
          step={100}
          value={settings.maxDimension}
          onChange={e => update({ maxDimension: Number(e.target.value) })}
          className="w-full accent-indigo-600"
        />
        <div className="flex justify-between text-xs text-gray-400 dark:text-gray-500">
          <span>No limit</span>
          <span>4000px</span>
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
