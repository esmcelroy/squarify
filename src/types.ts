export interface UploadedPhoto {
  id: string;
  file: File;
  dataUrl: string;
  width: number;
  height: number;
  aspectRatio: number; // width / height
  paddedDataUrl: string | null;
}

export type PaddingFillType = 'color' | 'image' | 'gradient' | 'blur' | 'pattern';
export type OutputFormat = 'png' | 'jpeg' | 'webp';
export type GradientDirection = 'horizontal' | 'vertical' | 'diagonal' | 'radial';
export type WatermarkPosition = 'top-left' | 'top-center' | 'top-right' | 'center' | 'bottom-left' | 'bottom-center' | 'bottom-right';
export type PatternType = 'dots' | 'stripes' | 'checkerboard' | 'diagonal-lines';

export interface PatternSettings {
  type: PatternType;
  color1: string;
  color2: string;
  scale: number; // 1-10, multiplier for pattern size
}

export interface WatermarkSettings {
  enabled: boolean;
  text: string;
  fontSize: number;
  color: string;
  opacity: number; // 0-1
  position: WatermarkPosition;
}

export interface ShadowSettings {
  enabled: boolean;
  color: string;
  blur: number;
  offsetX: number;
  offsetY: number;
}

export type AspectRatioPreset = 'auto' | '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | '3:2' | '2:3' | 'custom';

export const ASPECT_RATIO_PRESETS: { label: string; value: AspectRatioPreset; ratio: number | null }[] = [
  { label: 'Auto (widest)', value: 'auto', ratio: null },
  { label: '1:1 Square', value: '1:1', ratio: 1 },
  { label: '4:3', value: '4:3', ratio: 4 / 3 },
  { label: '3:4', value: '3:4', ratio: 3 / 4 },
  { label: '3:2', value: '3:2', ratio: 3 / 2 },
  { label: '2:3', value: '2:3', ratio: 2 / 3 },
  { label: '16:9', value: '16:9', ratio: 16 / 9 },
  { label: '9:16', value: '9:16', ratio: 9 / 16 },
  { label: 'Custom', value: 'custom', ratio: null },
];

export interface PaddingSettings {
  fillType: PaddingFillType;
  fillColor: string;
  fillImageDataUrl: string | null;
  fillImageStyle: 'cover' | 'contain' | 'tile';
  aspectRatio: AspectRatioPreset;
  customRatioWidth: number;
  customRatioHeight: number;
  borderPadding: number;
  outputFormat: OutputFormat;
  outputQuality: number; // 0-1, only for JPEG/WebP
  maxDimension: number; // 0 = no limit
  gradientDirection: GradientDirection;
  gradientColorStart: string;
  gradientColorEnd: string;
  blurAmount: number; // px blur radius for blur fill
  pattern: PatternSettings;
  watermark: WatermarkSettings;
  shadow: ShadowSettings;
}
