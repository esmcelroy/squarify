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

  if (!needsRatioPadding && border === 0 && !settings.maxDimension) {
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

  // Apply max dimension scaling
  let scale = 1;
  if (settings.maxDimension > 0) {
    const maxDim = Math.max(canvasWidth, canvasHeight);
    if (maxDim > settings.maxDimension) {
      scale = settings.maxDimension / maxDim;
      canvasWidth = Math.round(canvasWidth * scale);
      canvasHeight = Math.round(canvasHeight * scale);
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = canvasWidth;
  canvas.height = canvasHeight;

  const ctx = canvas.getContext('2d')!;

  // Draw background fill
  if (settings.fillType === 'gradient') {
    drawGradientFill(ctx, canvasWidth, canvasHeight, settings);
  } else if (settings.fillType === 'blur') {
    await drawBlurFill(ctx, photo.dataUrl, canvasWidth, canvasHeight, settings.blurAmount);
  } else if (settings.fillType === 'image' && settings.fillImageDataUrl) {
    await drawBackgroundImage(ctx, settings.fillImageDataUrl, canvasWidth, canvasHeight, settings.fillImageStyle);
  } else {
    ctx.fillStyle = settings.fillColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
  }

  // Draw the source image centered
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = photo.dataUrl;
  });

  const scaledPhotoWidth = Math.round(photo.width * scale);
  const scaledPhotoHeight = Math.round(photo.height * scale);
  const offsetX = Math.floor((canvasWidth - scaledPhotoWidth) / 2);
  const offsetY = Math.floor((canvasHeight - scaledPhotoHeight) / 2);
  ctx.drawImage(img, offsetX, offsetY, scaledPhotoWidth, scaledPhotoHeight);

  // Output in selected format
  const mimeType = `image/${settings.outputFormat}`;
  const quality = settings.outputFormat === 'png' ? undefined : settings.outputQuality;
  return canvas.toDataURL(mimeType, quality);
}

function drawGradientFill(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  settings: PaddingSettings
): void {
  let gradient: CanvasGradient;

  switch (settings.gradientDirection) {
    case 'horizontal':
      gradient = ctx.createLinearGradient(0, 0, width, 0);
      break;
    case 'vertical':
      gradient = ctx.createLinearGradient(0, 0, 0, height);
      break;
    case 'diagonal':
      gradient = ctx.createLinearGradient(0, 0, width, height);
      break;
    case 'radial':
      gradient = ctx.createRadialGradient(
        width / 2, height / 2, 0,
        width / 2, height / 2, Math.max(width, height) / 2
      );
      break;
  }

  gradient.addColorStop(0, settings.gradientColorStart);
  gradient.addColorStop(1, settings.gradientColorEnd);
  ctx.fillStyle = gradient;
  ctx.fillRect(0, 0, width, height);
}

async function drawBlurFill(
  ctx: CanvasRenderingContext2D,
  imageDataUrl: string,
  canvasWidth: number,
  canvasHeight: number,
  blurAmount: number
): Promise<void> {
  const img = new Image();
  await new Promise<void>((resolve, reject) => {
    img.onload = () => resolve();
    img.onerror = reject;
    img.src = imageDataUrl;
  });

  // Draw the source image scaled to cover the canvas, then apply blur
  ctx.save();
  ctx.filter = `blur(${blurAmount}px)`;

  const imgScale = Math.max(canvasWidth / img.width, canvasHeight / img.height);
  const scaledW = img.width * imgScale;
  const scaledH = img.height * imgScale;
  // Extend drawing area to prevent blur edge artifacts
  const extend = blurAmount * 2;
  ctx.drawImage(
    img,
    (canvasWidth - scaledW) / 2 - extend,
    (canvasHeight - scaledH) / 2 - extend,
    scaledW + extend * 2,
    scaledH + extend * 2
  );

  ctx.restore();
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
