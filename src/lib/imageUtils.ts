import type { UploadedPhoto, PaddingSettings } from '../types';

export function getImageDimensions(dataUrl: string): Promise<{ width: number; height: number }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
    img.onerror = reject;
    img.src = dataUrl;
  });
}

export function findMaxAspectRatio(photos: UploadedPhoto[]): number {
  if (photos.length === 0) return 1;
  return Math.max(...photos.map(p => p.aspectRatio));
}

export async function padImageToAspectRatio(
  photo: UploadedPhoto,
  targetAspectRatio: number,
  settings: PaddingSettings
): Promise<string> {
  const border = settings.borderPadding || 0;
  const needsRatioPadding = Math.abs(photo.aspectRatio - targetAspectRatio) >= 0.001;

  if (!needsRatioPadding && border === 0) {
    return photo.dataUrl;
  }

  let canvasWidth: number;
  let canvasHeight: number;

  if (photo.aspectRatio < targetAspectRatio) {
    canvasHeight = photo.height;
    canvasWidth = Math.round(photo.height * targetAspectRatio);
  } else if (photo.aspectRatio > targetAspectRatio) {
    canvasWidth = photo.width;
    canvasHeight = Math.round(photo.width / targetAspectRatio);
  } else {
    canvasWidth = photo.width;
    canvasHeight = photo.height;
  }

  // Add border padding
  canvasWidth += border * 2;
  canvasHeight += border * 2;

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext('2d')!;

  if (settings.fillType === 'color' || !settings.fillImageDataUrl) {
    ctx.fillStyle = settings.fillColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  } else {
    await drawBackgroundImage(ctx, settings.fillImageDataUrl, canvasWidth, canvasHeight, settings.fillImageStyle);
  }

  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = photo.dataUrl;
  });

  const offsetX = Math.floor((canvasWidth - photo.width) / 2);
  const offsetY = Math.floor((canvasHeight - photo.height) / 2);
  ctx.drawImage(img, offsetX, offsetY, photo.width, photo.height);

  return canvas.toDataURL('image/png');
}

async function drawBackgroundImage(
  ctx: CanvasRenderingContext2D,
  imageDataUrl: string,
  canvasWidth: number,
  canvasHeight: number,
  style: 'cover' | 'contain' | 'tile'
): Promise<void> {
  const bgImg = new Image();
  await new Promise<void>((resolve, reject) => {
    bgImg.onload = () => resolve();
    bgImg.onerror = reject;
    bgImg.src = imageDataUrl;
  });

  if (style === 'tile') {
    const pattern = ctx.createPattern(bgImg, 'repeat');
    if (pattern) {
      ctx.fillStyle = pattern;
      ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
  } else if (style === 'cover') {
    const scale = Math.max(canvasWidth / bgImg.width, canvasHeight / bgImg.height);
    const scaledW = bgImg.width * scale;
    const scaledH = bgImg.height * scale;
    ctx.drawImage(bgImg, (canvasWidth - scaledW) / 2, (canvasHeight - scaledH) / 2, scaledW, scaledH);
  } else {
    const scale = Math.min(canvasWidth / bgImg.width, canvasHeight / bgImg.height);
    const scaledW = bgImg.width * scale;
    const scaledH = bgImg.height * scale;
    ctx.drawImage(bgImg, (canvasWidth - scaledW) / 2, (canvasHeight - scaledH) / 2, scaledW, scaledH);
  }
}
