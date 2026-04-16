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

export interface PaddingSettings {
  fillType: PaddingFillType;
  fillColor: string;
  fillImageDataUrl: string | null;
  fillImageStyle: 'cover' | 'contain' | 'tile';
}
