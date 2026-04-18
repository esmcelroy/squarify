export interface UploadedPhoto {
  id: string;
  file: File;
  dataUrl: string;
  width: number;
  height: number;
  aspectRatio: number; // width / height
  paddedDataUrl: string | null;
}

export type PaddingFillType = 'color' | 'image';

export type AspectRatioPreset = 'auto' | '1:1' | '4:3' | '3:4' | '16:9' | '9:16' | '3:2' | '2:3';

export const ASPECT_RATIO_PRESETS: { label: string; value: AspectRatioPreset; ratio: number | null }[] = [
  { label: 'Auto (widest)', value: 'auto', ratio: null },
  { label: '1:1 Square', value: '1:1', ratio: 1 },
  { label: '4:3', value: '4:3', ratio: 4 / 3 },
  { label: '3:4', value: '3:4', ratio: 3 / 4 },
  { label: '3:2', value: '3:2', ratio: 3 / 2 },
  { label: '2:3', value: '2:3', ratio: 2 / 3 },
  { label: '16:9', value: '16:9', ratio: 16 / 9 },
  { label: '9:16', value: '9:16', ratio: 9 / 16 },
];

export interface PaddingSettings {
  fillType: PaddingFillType;
  fillColor: string;
  fillImageDataUrl: string | null;
  fillImageStyle: 'cover' | 'contain' | 'tile';
  aspectRatio: AspectRatioPreset;
  borderPadding: number; // pixels of uniform border around the image
}
