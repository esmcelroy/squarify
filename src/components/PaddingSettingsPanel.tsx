import React, { useRef } from 'react';
import type { PaddingSettings, PaddingFillType, GradientDirection, OutputFormat, WatermarkPosition, PatternType } from '../types';
import { ASPECT_RATIO_PRESETS } from '../types';
import { Palette, Image as ImageIcon, Wand2, Blend, Sparkles, Type, Layers, Grid3x3, Pipette, ChevronRight, RotateCcw } from 'lucide-react';

interface PaddingSettingsPanelProps {
  settings: PaddingSettings;
  onChange: (settings: PaddingSettings) => void;
  defaultSettings?: PaddingSettings;
  // Optional: when omitted, the process button is not rendered (App.tsx handles it)
  onProcess?: () => void;
  isProcessing?: boolean;
  hasPhotos?: boolean;
}

const FILL_TYPES: { value: PaddingFillType; label: string; icon: typeof Palette }[] = [
  { value: 'color', label: 'Color', icon: Palette },
  { value: 'image', label: 'Image', icon: ImageIcon },
  { value: 'gradient', label: 'Gradient', icon: Blend },
  { value: 'blur', label: 'Blur', icon: Sparkles },
  { value: 'pattern', label: 'Pattern', icon: Grid3x3 },
];

export function PaddingSettingsPanel({ settings, onChange, defaultSettings, onProcess, isProcessing, hasPhotos }: PaddingSettingsPanelProps) {
  const bgImageInputRef = useRef<HTMLInputElement>(null);

  // Ensure watermark and shadow have defaults for backward compatibility
  const watermark = settings.watermark ?? { enabled: false, text: '', fontSize: 48, color: '#ffffff', opacity: 0.5, position: 'bottom-right' as WatermarkPosition };
  const shadow = settings.shadow ?? { enabled: false, color: '#000000', blur: 20, offsetX: 0, offsetY: 4 };
  const pattern = settings.pattern ?? { type: 'dots' as PatternType, color1: '#ffffff', color2: '#e5e7eb', scale: 2 };
  const safeSettings = { ...settings, watermark, shadow, pattern };

  const update = (partial: Partial<PaddingSettings>) => onChange({ ...safeSettings, ...partial });

  const handleBgImageFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => update({ fillImageDataUrl: reader.result as string });
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl p-4 md:p-5 space-y-4 md:space-y-5 md:max-h-[calc(100vh-120px)] overflow-y-auto">
      <div className="flex items-center justify-between">
        <h2 className="font-semibold text-gray-800 dark:text-gray-200 text-base">Padding Settings</h2>
        {defaultSettings && (
          <button
            onClick={() => onChange(defaultSettings)}
            className="flex items-center gap-1 text-xs text-gray-400 dark:text-gray-500 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            aria-label="Reset settings"
            title="Reset to defaults"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            Reset
          </button>
        )}
      </div>

      {/* Fill Type section */}
      <details open className="group">
        <summary className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-gray-700 dark:text-gray-300 py-1 list-none [&::-webkit-details-marker]:hidden">
          <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90 text-gray-400 dark:text-gray-500 shrink-0" />
          Fill Type
        </summary>
        <div className="mt-3 space-y-4">

      {/* Fill type selector */}
      <div className="grid grid-cols-5 gap-1 md:gap-1.5">
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
              aria-label="Fill color"
              value={settings.fillColor}
              onChange={e => update({ fillColor: e.target.value })}
              className="h-9 w-14 rounded cursor-pointer border border-gray-200 dark:border-gray-600"
            />
            <input
              type="text"
              aria-label="Fill color hex"
              value={settings.fillColor}
              onChange={e => {
                const val = e.target.value;
                if (/^#[0-9A-Fa-f]{0,6}$/.test(val)) update({ fillColor: val });
              }}
              className="flex-1 border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm font-mono bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-300"
              maxLength={7}
              placeholder="#ffffff"
            />
            {'EyeDropper' in window && (
              <button
                onClick={async () => {
                  try {
                    const eyeDropper = new (window as unknown as { EyeDropper: new () => { open: () => Promise<{ sRGBHex: string }> } }).EyeDropper();
                    const result = await eyeDropper.open();
                    update({ fillColor: result.sRGBHex });
                  } catch { /* user cancelled */ }
                }}
                className="h-9 w-9 flex items-center justify-center rounded-lg border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-indigo-300 hover:text-indigo-600 transition-colors shrink-0"
                aria-label="Pick color from screen"
                title="Pick color from screen"
              >
                <Pipette className="w-4 h-4" />
              </button>
            )}
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
                aria-label="Upload background image"
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
              aria-label="Gradient start color"
              value={settings.gradientColorStart}
              onChange={e => update({ gradientColorStart: e.target.value })}
              className="h-8 w-12 rounded cursor-pointer border border-gray-200 dark:border-gray-600"
            />
            <label className="text-sm text-gray-600 dark:text-gray-400 font-medium w-10 shrink-0 text-center">End</label>
            <input
              type="color"
              aria-label="Gradient end color"
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
            aria-label="Blur amount"
            min={5}
            max={100}
            step={5}
            value={settings.blurAmount}
            onChange={e => update({ blurAmount: Number(e.target.value) })}
            className="w-full accent-indigo-600"
          />
        </div>
      )}

      {/* Pattern settings */}
      {settings.fillType === 'pattern' && (
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <label className="text-sm text-gray-600 dark:text-gray-400 font-medium w-16 shrink-0">Style</label>
            <div className="grid grid-cols-2 gap-1.5 flex-1">
              {(['dots', 'stripes', 'checkerboard', 'diagonal-lines'] as PatternType[]).map(pt => (
                <button
                  key={pt}
                  onClick={() => update({ pattern: { ...pattern, type: pt } })}
                  className={`py-1.5 rounded-lg border text-xs font-medium capitalize transition-colors
                    ${pattern.type === pt
                      ? 'bg-indigo-600 border-indigo-600 text-white'
                      : 'border-gray-200 dark:border-gray-600 text-gray-600 dark:text-gray-400 hover:border-indigo-300'}`}
                >
                  {pt.replace('-', ' ')}
                </button>
              ))}
            </div>
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-500 dark:text-gray-400 w-16 shrink-0">Color 1</label>
            <input
              type="color"
              aria-label="Pattern color 1"
              value={pattern.color1}
              onChange={e => update({ pattern: { ...pattern, color1: e.target.value } })}
              className="h-8 w-12 rounded cursor-pointer border border-gray-200 dark:border-gray-600"
            />
            <label className="text-xs text-gray-500 dark:text-gray-400 w-16 shrink-0 text-center">Color 2</label>
            <input
              type="color"
              aria-label="Pattern color 2"
              value={pattern.color2}
              onChange={e => update({ pattern: { ...pattern, color2: e.target.value } })}
              className="h-8 w-12 rounded cursor-pointer border border-gray-200 dark:border-gray-600"
            />
          </div>
          <div className="flex items-center gap-3">
            <label className="text-xs text-gray-500 dark:text-gray-400 w-16 shrink-0">Scale</label>
            <input
              type="range"
              aria-label="Pattern scale"
              min={1}
              max={10}
              step={0.5}
              value={pattern.scale}
              onChange={e => update({ pattern: { ...pattern, scale: Number(e.target.value) } })}
              className="flex-1 accent-indigo-600"
            />
            <span className="text-xs text-gray-500 dark:text-gray-400 font-mono w-8 text-right">{pattern.scale}×</span>
          </div>
        </div>
      )}

        </div>
      </details>

      {/* Aspect Ratio section */}
      <details open className="group">
        <summary className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-gray-700 dark:text-gray-300 py-1 list-none [&::-webkit-details-marker]:hidden">
          <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90 text-gray-400 dark:text-gray-500 shrink-0" />
          Aspect Ratio
        </summary>
        <div className="mt-3 space-y-4">

      {/* Aspect ratio selector */}      <div className="space-y-2">
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

        {/* Social media presets */}
        <div className="pt-2">
          <p className="text-xs text-gray-400 dark:text-gray-500 mb-1.5">Social Media Presets</p>
          <div className="grid grid-cols-2 gap-1.5">
            {([
              { label: 'IG Post', w: 1, h: 1, dim: 1080 },
              { label: 'IG Story', w: 9, h: 16, dim: 1080 },
              { label: 'Facebook', w: 1200, h: 630, dim: 1200 },
              { label: 'X / Twitter', w: 16, h: 9, dim: 1200 },
              { label: 'LinkedIn', w: 1200, h: 627, dim: 1200 },
              { label: 'YouTube', w: 16, h: 9, dim: 1280 },
            ] as const).map(({ label, w, h, dim }) => (
              <button
                key={label}
                onClick={() => update({
                  aspectRatio: 'custom',
                  customRatioWidth: w,
                  customRatioHeight: h,
                  maxDimension: dim,
                })}
                className="py-1.5 px-2 rounded-lg border border-gray-200 dark:border-gray-600 text-xs font-medium text-gray-600 dark:text-gray-400 hover:border-indigo-300 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>
      {settings.aspectRatio === 'custom' && (
        <div className="flex items-center gap-2">
          <label className="text-sm text-gray-600 dark:text-gray-400 font-medium w-16 shrink-0">Ratio</label>
          <input
            type="number"
            aria-label="Custom ratio width"
            min={1}
            max={100}
            value={settings.customRatioWidth}
            onChange={e => update({ customRatioWidth: Math.max(1, Number(e.target.value)) })}
            className="w-16 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm text-center bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <span className="text-sm text-gray-400 font-bold">:</span>
          <input
            type="number"
            aria-label="Custom ratio height"
            min={1}
            max={100}
            value={settings.customRatioHeight}
            onChange={e => update({ customRatioHeight: Math.max(1, Number(e.target.value)) })}
            className="w-16 border border-gray-200 dark:border-gray-600 rounded-lg px-2 py-1.5 text-sm text-center bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-300"
          />
          <span className="text-xs text-gray-400 dark:text-gray-500 ml-1">= {(settings.customRatioWidth / settings.customRatioHeight).toFixed(3)}</span>
        </div>
      )}

        </div>
      </details>

      {/* Output section */}
      <details className="group">
        <summary className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-gray-700 dark:text-gray-300 py-1 list-none [&::-webkit-details-marker]:hidden">
          <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90 text-gray-400 dark:text-gray-500 shrink-0" />
          Output
        </summary>
        <div className="mt-3 space-y-4">

      {/* Border padding */}
      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-600 dark:text-gray-400 font-medium">Border Padding</label>
          <span className="text-xs text-gray-500 dark:text-gray-400 font-mono">{settings.borderPadding}px</span>
        </div>
        <input
          type="range"
          aria-label="Border padding"
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
            aria-label="Output quality"
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
          aria-label="Max dimension"
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

        </div>
      </details>

      {/* Effects section */}
      <details className="group">
        <summary className="flex items-center gap-2 cursor-pointer select-none text-sm font-medium text-gray-700 dark:text-gray-300 py-1 list-none [&::-webkit-details-marker]:hidden">
          <ChevronRight className="w-4 h-4 transition-transform group-open:rotate-90 text-gray-400 dark:text-gray-500 shrink-0" />
          Effects
        </summary>
        <div className="mt-3 space-y-4">

      {/* Watermark */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1.5">
            <Type className="w-4 h-4" />
            Watermark
          </label>
          <button
            onClick={() => update({ watermark: { ...watermark, enabled: !watermark.enabled } })}
            className={`relative w-9 h-5 rounded-full transition-colors ${watermark.enabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            aria-label="Toggle watermark"
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${watermark.enabled ? 'translate-x-4' : ''}`} />
          </button>
        </div>
        {watermark.enabled && (
          <div className="space-y-3 pl-1">
            <input
              type="text"
              aria-label="Watermark text"
              value={watermark.text}
              onChange={e => update({ watermark: { ...watermark, text: e.target.value } })}
              placeholder="Enter watermark text…"
              className="w-full border border-gray-200 dark:border-gray-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-indigo-300"
            />
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-500 dark:text-gray-400 w-12 shrink-0">Size</label>
              <input
                type="range"
                aria-label="Watermark font size"
                min={12}
                max={120}
                step={2}
                value={watermark.fontSize}
                onChange={e => update({ watermark: { ...watermark, fontSize: Number(e.target.value) } })}
                className="flex-1 accent-indigo-600"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono w-10 text-right">{watermark.fontSize}px</span>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-500 dark:text-gray-400 w-12 shrink-0">Color</label>
              <input
                type="color"
                aria-label="Watermark color"
                value={watermark.color}
                onChange={e => update({ watermark: { ...watermark, color: e.target.value } })}
                className="h-8 w-10 rounded cursor-pointer border border-gray-200 dark:border-gray-600"
              />
              <label className="text-xs text-gray-500 dark:text-gray-400 w-12 shrink-0 text-center">Opacity</label>
              <input
                type="range"
                aria-label="Watermark opacity"
                min={0.1}
                max={1}
                step={0.05}
                value={watermark.opacity}
                onChange={e => update({ watermark: { ...watermark, opacity: Number(e.target.value) } })}
                className="flex-1 accent-indigo-600"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono w-10 text-right">{Math.round(watermark.opacity * 100)}%</span>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-500 dark:text-gray-400 w-12 shrink-0">Position</label>
              <div className="grid grid-cols-3 gap-1 flex-1">
                {(['top-left', 'top-center', 'top-right', 'bottom-left', 'bottom-center', 'bottom-right'] as WatermarkPosition[]).map(pos => (
                  <button
                    key={pos}
                    onClick={() => update({ watermark: { ...watermark, position: pos } })}
                    className={`py-1 rounded text-[10px] font-medium capitalize transition-colors
                      ${watermark.position === pos
                        ? 'bg-indigo-600 text-white'
                        : 'border border-gray-200 dark:border-gray-600 text-gray-500 dark:text-gray-400 hover:border-indigo-300'}`}
                  >
                    {pos.replace('-', ' ')}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Drop Shadow */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-600 dark:text-gray-400 font-medium flex items-center gap-1.5">
            <Layers className="w-4 h-4" />
            Drop Shadow
          </label>
          <button
            onClick={() => update({ shadow: { ...shadow, enabled: !shadow.enabled } })}
            className={`relative w-9 h-5 rounded-full transition-colors ${shadow.enabled ? 'bg-indigo-600' : 'bg-gray-300 dark:bg-gray-600'}`}
            aria-label="Toggle drop shadow"
          >
            <span className={`absolute top-0.5 left-0.5 w-4 h-4 bg-white rounded-full transition-transform ${shadow.enabled ? 'translate-x-4' : ''}`} />
          </button>
        </div>
        {shadow.enabled && (
          <div className="space-y-3 pl-1">
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-500 dark:text-gray-400 w-12 shrink-0">Color</label>
              <input
                type="color"
                aria-label="Shadow color"
                value={shadow.color}
                onChange={e => update({ shadow: { ...shadow, color: e.target.value } })}
                className="h-8 w-10 rounded cursor-pointer border border-gray-200 dark:border-gray-600"
              />
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-500 dark:text-gray-400 w-12 shrink-0">Blur</label>
              <input
                type="range"
                aria-label="Shadow blur"
                min={0}
                max={50}
                step={1}
                value={shadow.blur}
                onChange={e => update({ shadow: { ...shadow, blur: Number(e.target.value) } })}
                className="flex-1 accent-indigo-600"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono w-10 text-right">{shadow.blur}px</span>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-500 dark:text-gray-400 w-12 shrink-0">Offset X</label>
              <input
                type="range"
                aria-label="Shadow offset X"
                min={-30}
                max={30}
                step={1}
                value={shadow.offsetX}
                onChange={e => update({ shadow: { ...shadow, offsetX: Number(e.target.value) } })}
                className="flex-1 accent-indigo-600"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono w-10 text-right">{shadow.offsetX}px</span>
            </div>
            <div className="flex items-center gap-3">
              <label className="text-xs text-gray-500 dark:text-gray-400 w-12 shrink-0">Offset Y</label>
              <input
                type="range"
                aria-label="Shadow offset Y"
                min={-30}
                max={30}
                step={1}
                value={shadow.offsetY}
                onChange={e => update({ shadow: { ...shadow, offsetY: Number(e.target.value) } })}
                className="flex-1 accent-indigo-600"
              />
              <span className="text-xs text-gray-500 dark:text-gray-400 font-mono w-10 text-right">{shadow.offsetY}px</span>
            </div>
          </div>
        )}
      </div>

        </div>
      </details>

      {/* Process button — only rendered when props are provided (backward compat) */}
      {onProcess && (
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
      )}
    </div>
  );
}
