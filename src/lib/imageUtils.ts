import type { UploadedPhoto, PaddingSettings, WatermarkSettings, WatermarkPosition, PatternSettings } from '../types';

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
  } else if (settings.fillType === 'pattern' && settings.pattern) {
    drawPatternFill(ctx, canvasWidth, canvasHeight, settings.pattern);
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

  // Draw drop shadow behind the photo if enabled
  if (settings.shadow?.enabled) {
    ctx.save();
    ctx.shadowColor = settings.shadow.color;
    ctx.shadowBlur = settings.shadow.blur;
    ctx.shadowOffsetX = settings.shadow.offsetX;
    ctx.shadowOffsetY = settings.shadow.offsetY;
    ctx.fillStyle = 'rgba(0,0,0,1)';
    ctx.fillRect(offsetX, offsetY, scaledPhotoWidth, scaledPhotoHeight);
    ctx.restore();
  }

  ctx.drawImage(img, offsetX, offsetY, scaledPhotoWidth, scaledPhotoHeight);

  // Draw watermark if enabled
  if (settings.watermark?.enabled && settings.watermark.text.trim()) {
    drawWatermark(ctx, canvasWidth, canvasHeight, settings.watermark);
  }

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

export function drawWatermark(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  watermark: WatermarkSettings
): void {
  const text = watermark.text.trim();
  if (!text) return;

  ctx.save();
  ctx.globalAlpha = watermark.opacity;
  ctx.fillStyle = watermark.color;
  ctx.font = `${watermark.fontSize}px sans-serif`;

  const metrics = ctx.measureText(text);
  const textHeight = watermark.fontSize;
  const padding = Math.max(canvasWidth, canvasHeight) * 0.02;

  const { x, y } = getWatermarkPosition(
    watermark.position,
    canvasWidth,
    canvasHeight,
    metrics.width,
    textHeight,
    padding
  );

  ctx.fillText(text, x, y);
  ctx.restore();
}

export function getWatermarkPosition(
  position: WatermarkPosition,
  canvasWidth: number,
  canvasHeight: number,
  textWidth: number,
  textHeight: number,
  padding: number
): { x: number; y: number } {
  let x: number;
  let y: number;

  // Horizontal
  if (position.includes('left')) {
    x = padding;
  } else if (position.includes('right')) {
    x = canvasWidth - textWidth - padding;
  } else {
    x = (canvasWidth - textWidth) / 2;
  }

  // Vertical
  if (position.includes('top')) {
    y = textHeight + padding;
  } else if (position.includes('bottom')) {
    y = canvasHeight - padding;
  } else {
    y = (canvasHeight + textHeight) / 2;
  }

  return { x, y };
}

export function drawPatternFill(
  ctx: CanvasRenderingContext2D,
  canvasWidth: number,
  canvasHeight: number,
  pattern: PatternSettings
): void {
  const baseSize = 20 * pattern.scale;

  // Fill background with color1
  ctx.fillStyle = pattern.color1;
  ctx.fillRect(0, 0, canvasWidth, canvasHeight);

  ctx.fillStyle = pattern.color2;

  switch (pattern.type) {
    case 'dots': {
      const spacing = baseSize * 2;
      const radius = baseSize * 0.4;
      for (let y = spacing / 2; y < canvasHeight; y += spacing) {
        for (let x = spacing / 2; x < canvasWidth; x += spacing) {
          ctx.beginPath();
          ctx.arc(x, y, radius, 0, Math.PI * 2);
          ctx.fill();
        }
      }
      break;
    }
    case 'stripes': {
      const stripeWidth = baseSize;
      for (let x = 0; x < canvasWidth; x += stripeWidth * 2) {
        ctx.fillRect(x, 0, stripeWidth, canvasHeight);
      }
      break;
    }
    case 'checkerboard': {
      const cellSize = baseSize;
      for (let y = 0; y < canvasHeight; y += cellSize) {
        for (let x = 0; x < canvasWidth; x += cellSize) {
          const col = Math.floor(x / cellSize);
          const row = Math.floor(y / cellSize);
          if ((col + row) % 2 === 1) {
            ctx.fillRect(x, y, cellSize, cellSize);
          }
        }
      }
      break;
    }
    case 'diagonal-lines': {
      const lineWidth = baseSize * 0.5;
      const spacing = baseSize * 2;
      ctx.save();
      ctx.strokeStyle = pattern.color2;
      ctx.lineWidth = lineWidth;
      const maxDim = Math.max(canvasWidth, canvasHeight) * 2;
      for (let i = -maxDim; i < maxDim; i += spacing) {
        ctx.beginPath();
        ctx.moveTo(i, 0);
        ctx.lineTo(i + maxDim, maxDim);
        ctx.stroke();
      }
      ctx.restore();
      break;
    }
  }
}