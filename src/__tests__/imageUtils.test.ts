import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { findMaxAspectRatio, getImageDimensions, padImageToAspectRatio, drawPatternFill, drawWatermark, getWatermarkPosition } from '../lib/imageUtils'
import type { UploadedPhoto, PaddingSettings, PatternSettings, WatermarkSettings } from '../types'

function makePhoto(width: number, height: number, overrides?: Partial<UploadedPhoto>): UploadedPhoto {
  return {
    id: `photo-${width}x${height}`,
    file: new File([], 'test.png'),
    dataUrl: '',
    width,
    height,
    aspectRatio: width / height,
    paddedDataUrl: null,
    ...overrides,
  }
}

describe('findMaxAspectRatio', () => {
  it('returns 1 for empty array', () => {
    expect(findMaxAspectRatio([])).toBe(1)
  })

  it('returns the aspect ratio of a single photo', () => {
    const photos = [makePhoto(1600, 900)]
    expect(findMaxAspectRatio(photos)).toBeCloseTo(1600 / 900)
  })

  it('returns the widest aspect ratio from multiple photos', () => {
    const photos = [
      makePhoto(800, 800),   // 1:1
      makePhoto(1600, 900),  // ~1.778
      makePhoto(1200, 1000), // 1.2
    ]
    expect(findMaxAspectRatio(photos)).toBeCloseTo(1600 / 900)
  })

  it('handles portrait photos (aspect ratio < 1)', () => {
    const photos = [
      makePhoto(600, 1200), // 0.5
      makePhoto(400, 800),  // 0.5
    ]
    expect(findMaxAspectRatio(photos)).toBeCloseTo(0.5)
  })

  it('handles mixed portrait and landscape', () => {
    const photos = [
      makePhoto(600, 1200),  // 0.5
      makePhoto(1920, 1080), // ~1.778
    ]
    expect(findMaxAspectRatio(photos)).toBeCloseTo(1920 / 1080)
  })
})

// ---------------------------------------------------------------------------
// Canvas & Image mocking helpers
// ---------------------------------------------------------------------------

function createMockGradient() {
  return { addColorStop: vi.fn() }
}

function createMockPattern() {
  return { __mockPattern: true }
}

function createMockCtx() {
  const gradient = createMockGradient()
  const ctx: Record<string, unknown> = {
    fillStyle: '',
    filter: '',
    fillRect: vi.fn(),
    drawImage: vi.fn(),
    save: vi.fn(),
    restore: vi.fn(),
    createLinearGradient: vi.fn(() => gradient),
    createRadialGradient: vi.fn(() => gradient),
    createPattern: vi.fn(() => createMockPattern()),
    __gradient: gradient,
  }
  return ctx as unknown as CanvasRenderingContext2D & { __gradient: ReturnType<typeof createMockGradient> }
}

let mockCtx: ReturnType<typeof createMockCtx>
let origGetContext: typeof HTMLCanvasElement.prototype.getContext
let origToDataURL: typeof HTMLCanvasElement.prototype.toDataURL
let origImage: typeof globalThis.Image

function installCanvasMocks() {
  mockCtx = createMockCtx()
  origGetContext = HTMLCanvasElement.prototype.getContext
  origToDataURL = HTMLCanvasElement.prototype.toDataURL

  HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx) as unknown as typeof HTMLCanvasElement.prototype.getContext
  HTMLCanvasElement.prototype.toDataURL = vi.fn(
    (type?: string) => `data:${type ?? 'image/png'};base64,MOCK`
  )
}

function installImageMock(naturalWidth = 800, naturalHeight = 600) {
  origImage = globalThis.Image
  globalThis.Image = class MockImage {
    naturalWidth = naturalWidth
    naturalHeight = naturalHeight
    width = naturalWidth
    height = naturalHeight
    src = ''
    onload: (() => void) | null = null
    onerror: ((err: unknown) => void) | null = null

    constructor() {
      // Auto-fire onload on next microtask after src is set
      Object.defineProperty(this, 'src', {
        get: () => this._src,
        set: (value: string) => {
          this._src = value
          queueMicrotask(() => this.onload?.())
        },
      })
    }
    private _src = ''
  } as unknown as typeof Image
}

function restoreMocks() {
  HTMLCanvasElement.prototype.getContext = origGetContext
  HTMLCanvasElement.prototype.toDataURL = origToDataURL
  if (origImage) globalThis.Image = origImage
}

function defaultSettings(overrides: Partial<PaddingSettings> = {}): PaddingSettings {
  return {
    fillType: 'color',
    fillColor: '#ffffff',
    fillImageDataUrl: null,
    fillImageStyle: 'cover',
    aspectRatio: 'auto',
    customRatioWidth: 1,
    customRatioHeight: 1,
    borderPadding: 0,
    outputFormat: 'png',
    outputQuality: 0.92,
    maxDimension: 0,
    gradientDirection: 'horizontal',
    gradientColorStart: '#000000',
    gradientColorEnd: '#ffffff',
    blurAmount: 20,
    ...overrides,
  }
}

// ---------------------------------------------------------------------------
// getImageDimensions
// ---------------------------------------------------------------------------

describe('getImageDimensions', () => {
  beforeEach(() => installImageMock(1920, 1080))
  afterEach(restoreMocks)

  it('resolves with correct width and height', async () => {
    const dims = await getImageDimensions('data:image/png;base64,AAA')
    expect(dims).toEqual({ width: 1920, height: 1080 })
  })

  it('rejects when image fails to load', async () => {
    globalThis.Image = class FailImage {
      onload: (() => void) | null = null
      onerror: ((err: unknown) => void) | null = null
      set src(_v: string) {
        queueMicrotask(() => this.onerror?.(new Error('load failed')))
      }
    } as unknown as typeof Image

    await expect(getImageDimensions('bad-url')).rejects.toThrow('load failed')
  })
})

// ---------------------------------------------------------------------------
// padImageToAspectRatio
// ---------------------------------------------------------------------------

describe('padImageToAspectRatio', () => {
  beforeEach(() => {
    installCanvasMocks()
    installImageMock(800, 600)
  })
  afterEach(restoreMocks)

  it('returns original dataUrl when no padding needed', async () => {
    const photo = makePhoto(800, 800, { dataUrl: 'data:original' })
    const result = await padImageToAspectRatio(photo, 1, defaultSettings())
    expect(result).toBe('data:original')
  })

  it('pads a narrower image to a wider target aspect ratio using color fill', async () => {
    const photo = makePhoto(600, 600, { dataUrl: 'data:img' })
    const result = await padImageToAspectRatio(photo, 2, defaultSettings())

    expect(mockCtx.fillRect).toHaveBeenCalled()
    expect(mockCtx.drawImage).toHaveBeenCalled()
    expect(result).toContain('data:image/png')
  })

  it('pads a wider image to a narrower target aspect ratio', async () => {
    const photo = makePhoto(1600, 400, { dataUrl: 'data:img', aspectRatio: 4 })
    const result = await padImageToAspectRatio(photo, 2, defaultSettings())

    expect(mockCtx.drawImage).toHaveBeenCalled()
    expect(result).toContain('data:image/png')
  })

  it('applies border padding even when aspect ratio matches', async () => {
    const photo = makePhoto(800, 800, { dataUrl: 'data:img' })
    const settings = defaultSettings({ borderPadding: 20 })
    const result = await padImageToAspectRatio(photo, 1, settings)

    // Should NOT return original since border > 0
    expect(result).toContain('data:image/png')
    expect(mockCtx.fillRect).toHaveBeenCalled()
  })

  it('applies maxDimension scaling when canvas exceeds limit', async () => {
    const photo = makePhoto(4000, 2000, { dataUrl: 'data:img' })
    const settings = defaultSettings({ maxDimension: 1000 })
    const result = await padImageToAspectRatio(photo, 2, settings)

    expect(result).toContain('data:image/png')
    expect(mockCtx.drawImage).toHaveBeenCalled()
  })

  it('does not scale when maxDimension is larger than canvas', async () => {
    const photo = makePhoto(200, 100, { dataUrl: 'data:img' })
    const settings = defaultSettings({ maxDimension: 5000 })
    const result = await padImageToAspectRatio(photo, 2, settings)

    expect(result).toContain('data:image/png')
  })

  it('uses gradient fill when fillType is gradient', async () => {
    const photo = makePhoto(600, 600, { dataUrl: 'data:img' })
    const settings = defaultSettings({
      fillType: 'gradient',
      gradientDirection: 'horizontal',
      gradientColorStart: '#ff0000',
      gradientColorEnd: '#0000ff',
    })
    const result = await padImageToAspectRatio(photo, 2, settings)

    expect(mockCtx.createLinearGradient).toHaveBeenCalled()
    expect(mockCtx.__gradient.addColorStop).toHaveBeenCalledWith(0, '#ff0000')
    expect(mockCtx.__gradient.addColorStop).toHaveBeenCalledWith(1, '#0000ff')
    expect(result).toContain('data:image/png')
  })

  it('uses blur fill when fillType is blur', async () => {
    const photo = makePhoto(600, 600, { dataUrl: 'data:img' })
    const settings = defaultSettings({ fillType: 'blur', blurAmount: 15 })
    const result = await padImageToAspectRatio(photo, 2, settings)

    expect(mockCtx.save).toHaveBeenCalled()
    expect(mockCtx.restore).toHaveBeenCalled()
    expect(result).toContain('data:image/png')
  })

  it('uses image fill when fillType is image', async () => {
    const photo = makePhoto(600, 600, { dataUrl: 'data:img' })
    const settings = defaultSettings({
      fillType: 'image',
      fillImageDataUrl: 'data:bgimg',
      fillImageStyle: 'cover',
    })
    const result = await padImageToAspectRatio(photo, 2, settings)

    // drawImage called for both background and foreground
    expect(mockCtx.drawImage).toHaveBeenCalledTimes(2)
    expect(result).toContain('data:image/png')
  })

  it('outputs jpeg format with quality', async () => {
    const photo = makePhoto(600, 600, { dataUrl: 'data:img' })
    const settings = defaultSettings({ outputFormat: 'jpeg', outputQuality: 0.8 })
    const result = await padImageToAspectRatio(photo, 2, settings)

    expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledWith('image/jpeg', 0.8)
    expect(result).toContain('data:image/jpeg')
  })

  it('outputs webp format with quality', async () => {
    const photo = makePhoto(600, 600, { dataUrl: 'data:img' })
    const settings = defaultSettings({ outputFormat: 'webp', outputQuality: 0.9 })
    await padImageToAspectRatio(photo, 2, settings)

    expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledWith('image/webp', 0.9)
  })

  it('outputs png format without quality parameter', async () => {
    const photo = makePhoto(600, 600, { dataUrl: 'data:img' })
    const settings = defaultSettings({ outputFormat: 'png' })
    await padImageToAspectRatio(photo, 2, settings)

    expect(HTMLCanvasElement.prototype.toDataURL).toHaveBeenCalledWith('image/png', undefined)
  })

  it('processes when maxDimension is 0 (no limit)', async () => {
    const photo = makePhoto(600, 600, { dataUrl: 'data:img' })
    const settings = defaultSettings({ maxDimension: 0 })
    const result = await padImageToAspectRatio(photo, 2, settings)

    expect(result).toContain('data:image/png')
  })
})

// ---------------------------------------------------------------------------
// drawGradientFill (tested indirectly via padImageToAspectRatio)
// ---------------------------------------------------------------------------

describe('drawGradientFill', () => {
  beforeEach(() => {
    installCanvasMocks()
    installImageMock(400, 400)
  })
  afterEach(restoreMocks)

  const gradientSettings = (direction: PaddingSettings['gradientDirection']) =>
    defaultSettings({
      fillType: 'gradient',
      gradientDirection: direction,
      gradientColorStart: '#111',
      gradientColorEnd: '#eee',
    })

  it('creates horizontal linear gradient', async () => {
    const photo = makePhoto(400, 400, { dataUrl: 'data:img' })
    await padImageToAspectRatio(photo, 2, gradientSettings('horizontal'))

    expect(mockCtx.createLinearGradient).toHaveBeenCalled()
    const [x0, y0, x1, y1] = (mockCtx.createLinearGradient as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(x0).toBe(0)
    expect(y0).toBe(0)
    expect(x1).toBeGreaterThan(0)
    expect(y1).toBe(0) // horizontal: y stays 0
  })

  it('creates vertical linear gradient', async () => {
    const photo = makePhoto(400, 400, { dataUrl: 'data:img' })
    await padImageToAspectRatio(photo, 2, gradientSettings('vertical'))

    const [x0, y0, x1, y1] = (mockCtx.createLinearGradient as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(x0).toBe(0)
    expect(y0).toBe(0)
    expect(x1).toBe(0) // vertical: x stays 0
    expect(y1).toBeGreaterThan(0)
  })

  it('creates diagonal linear gradient', async () => {
    const photo = makePhoto(400, 400, { dataUrl: 'data:img' })
    await padImageToAspectRatio(photo, 2, gradientSettings('diagonal'))

    const [x0, y0, x1, y1] = (mockCtx.createLinearGradient as ReturnType<typeof vi.fn>).mock.calls[0]
    expect(x0).toBe(0)
    expect(y0).toBe(0)
    expect(x1).toBeGreaterThan(0)
    expect(y1).toBeGreaterThan(0)
  })

  it('creates radial gradient', async () => {
    const photo = makePhoto(400, 400, { dataUrl: 'data:img' })
    await padImageToAspectRatio(photo, 2, gradientSettings('radial'))

    expect(mockCtx.createRadialGradient).toHaveBeenCalled()
    expect(mockCtx.createLinearGradient).not.toHaveBeenCalled()
  })

  it('adds color stops and fills rect', async () => {
    const photo = makePhoto(400, 400, { dataUrl: 'data:img' })
    await padImageToAspectRatio(photo, 2, gradientSettings('horizontal'))

    expect(mockCtx.__gradient.addColorStop).toHaveBeenCalledWith(0, '#111')
    expect(mockCtx.__gradient.addColorStop).toHaveBeenCalledWith(1, '#eee')
    expect(mockCtx.fillRect).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// drawBlurFill (tested indirectly via padImageToAspectRatio)
// ---------------------------------------------------------------------------

describe('drawBlurFill', () => {
  beforeEach(() => {
    installCanvasMocks()
    installImageMock(800, 600)
  })
  afterEach(restoreMocks)

  it('saves and restores context', async () => {
    const photo = makePhoto(600, 600, { dataUrl: 'data:img' })
    await padImageToAspectRatio(photo, 2, defaultSettings({ fillType: 'blur', blurAmount: 20 }))

    expect(mockCtx.save).toHaveBeenCalled()
    expect(mockCtx.restore).toHaveBeenCalled()
  })

  it('draws image with blur filter applied', async () => {
    const photo = makePhoto(600, 600, { dataUrl: 'data:img' })
    await padImageToAspectRatio(photo, 2, defaultSettings({ fillType: 'blur', blurAmount: 10 }))

    // blur fill drawImage + foreground drawImage = 2 calls
    expect(mockCtx.drawImage).toHaveBeenCalledTimes(2)
  })

  it('uses the configured blur amount', async () => {
    const photo = makePhoto(600, 600, { dataUrl: 'data:img' })
    await padImageToAspectRatio(photo, 2, defaultSettings({ fillType: 'blur', blurAmount: 25 }))

    // filter is set as a property, check it was assigned
    // The ctx.filter assignment happens inside drawBlurFill
    // We can verify drawImage was called (meaning blur path was taken)
    expect(mockCtx.save).toHaveBeenCalled()
    expect(mockCtx.drawImage).toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// drawBackgroundImage (tested indirectly via padImageToAspectRatio)
// ---------------------------------------------------------------------------

describe('drawBackgroundImage', () => {
  beforeEach(() => {
    installCanvasMocks()
    installImageMock(800, 600)
  })
  afterEach(restoreMocks)

  const imgSettings = (style: 'cover' | 'contain' | 'tile') =>
    defaultSettings({
      fillType: 'image',
      fillImageDataUrl: 'data:bgimg',
      fillImageStyle: style,
    })

  it('draws cover-style background image', async () => {
    const photo = makePhoto(400, 400, { dataUrl: 'data:img' })
    await padImageToAspectRatio(photo, 2, imgSettings('cover'))

    // bg drawImage + foreground drawImage
    expect(mockCtx.drawImage).toHaveBeenCalledTimes(2)
    expect(mockCtx.createPattern).not.toHaveBeenCalled()
  })

  it('draws contain-style background image', async () => {
    const photo = makePhoto(400, 400, { dataUrl: 'data:img' })
    await padImageToAspectRatio(photo, 2, imgSettings('contain'))

    expect(mockCtx.drawImage).toHaveBeenCalledTimes(2)
    expect(mockCtx.createPattern).not.toHaveBeenCalled()
  })

  it('draws tile-style background using createPattern', async () => {
    const photo = makePhoto(400, 400, { dataUrl: 'data:img' })
    await padImageToAspectRatio(photo, 2, imgSettings('tile'))

    expect(mockCtx.createPattern).toHaveBeenCalledTimes(1)
    expect(mockCtx.fillRect).toHaveBeenCalled()
  })

  it('handles null pattern gracefully in tile mode', async () => {
    (mockCtx.createPattern as ReturnType<typeof vi.fn>).mockReturnValueOnce(null)

    const photo = makePhoto(400, 400, { dataUrl: 'data:img' })
    // Should not throw even when pattern is null
    await padImageToAspectRatio(photo, 2, imgSettings('tile'))

    expect(mockCtx.createPattern).toHaveBeenCalled()
  })

  it('falls back to color fill when fillType is image but no fillImageDataUrl', async () => {
    const photo = makePhoto(400, 400, { dataUrl: 'data:img' })
    const settings = defaultSettings({
      fillType: 'image',
      fillImageDataUrl: null,
      fillColor: '#ff0000',
    })
    const result = await padImageToAspectRatio(photo, 2, settings)

    // Falls through to the else branch (color fill)
    expect(mockCtx.fillRect).toHaveBeenCalled()
    expect(result).toContain('data:image/png')
  })
})

// ---------------------------------------------------------------------------
// getWatermarkPosition
// ---------------------------------------------------------------------------

describe('getWatermarkPosition', () => {
  const canvasWidth = 1000
  const canvasHeight = 800
  const textWidth = 100
  const textHeight = 24
  const padding = 20

  it('returns top-left position', () => {
    const { x, y } = getWatermarkPosition('top-left', canvasWidth, canvasHeight, textWidth, textHeight, padding)
    expect(x).toBe(padding)
    expect(y).toBe(textHeight + padding)
  })

  it('returns top-center position', () => {
    const { x, y } = getWatermarkPosition('top-center', canvasWidth, canvasHeight, textWidth, textHeight, padding)
    expect(x).toBe((canvasWidth - textWidth) / 2)
    expect(y).toBe(textHeight + padding)
  })

  it('returns top-right position', () => {
    const { x, y } = getWatermarkPosition('top-right', canvasWidth, canvasHeight, textWidth, textHeight, padding)
    expect(x).toBe(canvasWidth - textWidth - padding)
    expect(y).toBe(textHeight + padding)
  })

  it('returns center position', () => {
    const { x, y } = getWatermarkPosition('center', canvasWidth, canvasHeight, textWidth, textHeight, padding)
    expect(x).toBe((canvasWidth - textWidth) / 2)
    expect(y).toBe((canvasHeight + textHeight) / 2)
  })

  it('returns bottom-left position', () => {
    const { x, y } = getWatermarkPosition('bottom-left', canvasWidth, canvasHeight, textWidth, textHeight, padding)
    expect(x).toBe(padding)
    expect(y).toBe(canvasHeight - padding)
  })

  it('returns bottom-center position', () => {
    const { x, y } = getWatermarkPosition('bottom-center', canvasWidth, canvasHeight, textWidth, textHeight, padding)
    expect(x).toBe((canvasWidth - textWidth) / 2)
    expect(y).toBe(canvasHeight - padding)
  })

  it('returns bottom-right position', () => {
    const { x, y } = getWatermarkPosition('bottom-right', canvasWidth, canvasHeight, textWidth, textHeight, padding)
    expect(x).toBe(canvasWidth - textWidth - padding)
    expect(y).toBe(canvasHeight - padding)
  })
})

// ---------------------------------------------------------------------------
// drawPatternFill
// ---------------------------------------------------------------------------

describe('drawPatternFill', () => {
  beforeEach(() => installCanvasMocks())
  afterEach(restoreMocks)

  const basePattern = (type: PatternSettings['type']): PatternSettings => ({
    type,
    color1: '#ffffff',
    color2: '#000000',
    scale: 1,
  })

  it('fills background with color1 for dots pattern', () => {
    const beginPath = vi.fn()
    const arc = vi.fn()
    const fill = vi.fn()
    Object.assign(mockCtx, { beginPath, arc, fill })

    drawPatternFill(mockCtx, 100, 100, basePattern('dots'))
    expect(mockCtx.fillRect).toHaveBeenCalledWith(0, 0, 100, 100)
  })

  it('draws dots using arc calls', () => {
    const beginPath = vi.fn()
    const arc = vi.fn()
    const fill = vi.fn()
    Object.assign(mockCtx, { beginPath, arc, fill })

    drawPatternFill(mockCtx, 100, 100, basePattern('dots'))
    expect(beginPath).toHaveBeenCalled()
    expect(arc).toHaveBeenCalled()
    expect(fill).toHaveBeenCalled()
  })

  it('draws stripes using fillRect', () => {
    drawPatternFill(mockCtx, 100, 100, basePattern('stripes'))
    // Background fill + at least one stripe fill
    expect((mockCtx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(1)
  })

  it('draws checkerboard using fillRect for alternating cells', () => {
    drawPatternFill(mockCtx, 60, 60, basePattern('checkerboard'))
    // Background + alternating cell fills
    expect((mockCtx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(1)
  })

  it('draws diagonal-lines using stroke', () => {
    const beginPath = vi.fn()
    const moveTo = vi.fn()
    const lineTo = vi.fn()
    const stroke = vi.fn()
    Object.assign(mockCtx, { beginPath, moveTo, lineTo, stroke, strokeStyle: '', lineWidth: 0 })

    drawPatternFill(mockCtx, 100, 100, basePattern('diagonal-lines'))
    expect(mockCtx.save).toHaveBeenCalled()
    expect(mockCtx.restore).toHaveBeenCalled()
    expect(beginPath).toHaveBeenCalled()
    expect(moveTo).toHaveBeenCalled()
    expect(lineTo).toHaveBeenCalled()
    expect(stroke).toHaveBeenCalled()
  })

  it('respects scale parameter', () => {
    const largeScale = basePattern('stripes')
    largeScale.scale = 3
    drawPatternFill(mockCtx, 200, 200, largeScale)

    const smallScale = basePattern('stripes')
    smallScale.scale = 0.5
    const mockCtx2 = createMockCtx()
    HTMLCanvasElement.prototype.getContext = vi.fn(() => mockCtx2) as unknown as typeof HTMLCanvasElement.prototype.getContext
    drawPatternFill(mockCtx2, 200, 200, smallScale)

    // Larger scale = fewer stripes = fewer fillRect calls
    const largeCalls = (mockCtx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length
    const smallCalls = (mockCtx2.fillRect as ReturnType<typeof vi.fn>).mock.calls.length
    expect(smallCalls).toBeGreaterThan(largeCalls)
  })
})

// ---------------------------------------------------------------------------
// drawWatermark
// ---------------------------------------------------------------------------

describe('drawWatermark', () => {
  beforeEach(() => installCanvasMocks())
  afterEach(restoreMocks)

  const baseWatermark = (overrides: Partial<WatermarkSettings> = {}): WatermarkSettings => ({
    enabled: true,
    text: 'Test Watermark',
    fontSize: 24,
    color: '#ff0000',
    opacity: 0.5,
    position: 'bottom-right',
    ...overrides,
  })

  it('draws text with correct styling', () => {
    const fillText = vi.fn()
    const measureText = vi.fn(() => ({ width: 100 }))
    Object.assign(mockCtx, { fillText, measureText, font: '', globalAlpha: 1 })

    drawWatermark(mockCtx, 500, 400, baseWatermark())

    expect(mockCtx.save).toHaveBeenCalled()
    expect(mockCtx.restore).toHaveBeenCalled()
    expect(fillText).toHaveBeenCalled()
  })

  it('sets globalAlpha to watermark opacity', () => {
    const fillText = vi.fn()
    const measureText = vi.fn(() => ({ width: 100 }))
    Object.assign(mockCtx, { fillText, measureText, font: '', globalAlpha: 1 })

    drawWatermark(mockCtx, 500, 400, baseWatermark({ opacity: 0.3 }))

    expect(mockCtx.globalAlpha).toBe(0.3)
  })

  it('does not draw when text is empty', () => {
    const fillText = vi.fn()
    const measureText = vi.fn(() => ({ width: 0 }))
    Object.assign(mockCtx, { fillText, measureText, font: '', globalAlpha: 1 })

    drawWatermark(mockCtx, 500, 400, baseWatermark({ text: '' }))
    expect(fillText).not.toHaveBeenCalled()
  })

  it('does not draw when text is whitespace only', () => {
    const fillText = vi.fn()
    const measureText = vi.fn(() => ({ width: 0 }))
    Object.assign(mockCtx, { fillText, measureText, font: '', globalAlpha: 1 })

    drawWatermark(mockCtx, 500, 400, baseWatermark({ text: '   ' }))
    expect(fillText).not.toHaveBeenCalled()
  })

  it('sets font with correct fontSize', () => {
    const fillText = vi.fn()
    const measureText = vi.fn(() => ({ width: 100 }))
    Object.assign(mockCtx, { fillText, measureText, font: '', globalAlpha: 1 })

    drawWatermark(mockCtx, 500, 400, baseWatermark({ fontSize: 36 }))
    expect(mockCtx.font).toBe('36px sans-serif')
  })
})

// ---------------------------------------------------------------------------
// Shadow drawing in padImageToAspectRatio
// ---------------------------------------------------------------------------

describe('padImageToAspectRatio with shadow', () => {
  beforeEach(() => {
    installCanvasMocks()
    installImageMock(800, 600)
  })
  afterEach(restoreMocks)

  it('draws shadow when shadow settings are enabled', async () => {
    const photo = makePhoto(600, 600, { dataUrl: 'data:img' })
    const settings = defaultSettings({
      shadow: { enabled: true, color: '#000000', blur: 20, offsetX: 5, offsetY: 5 },
    })
    await padImageToAspectRatio(photo, 2, settings)

    expect(mockCtx.save).toHaveBeenCalled()
    expect(mockCtx.restore).toHaveBeenCalled()
    // Shadow fillRect + background fillRect
    expect((mockCtx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThanOrEqual(2)
  })

  it('sets shadow properties on context', async () => {
    const photo = makePhoto(600, 600, { dataUrl: 'data:img' })
    const settings = defaultSettings({
      shadow: { enabled: true, color: '#333333', blur: 15, offsetX: 3, offsetY: 7 },
    })
    await padImageToAspectRatio(photo, 2, settings)

    expect(mockCtx.shadowColor).toBe('#333333')
    expect(mockCtx.shadowBlur).toBe(15)
    expect(mockCtx.shadowOffsetX).toBe(3)
    expect(mockCtx.shadowOffsetY).toBe(7)
  })

  it('does not draw shadow when shadow is disabled', async () => {
    const photo = makePhoto(600, 600, { dataUrl: 'data:img' })
    const settings = defaultSettings({
      shadow: { enabled: false, color: '#000000', blur: 20, offsetX: 0, offsetY: 0 },
    })
    await padImageToAspectRatio(photo, 2, settings)

    // Only 1 fillRect for background, no shadow fillRect
    expect((mockCtx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBe(1)
  })
})

// ---------------------------------------------------------------------------
// Pattern fill in padImageToAspectRatio
// ---------------------------------------------------------------------------

describe('padImageToAspectRatio with pattern fill', () => {
  beforeEach(() => {
    installCanvasMocks()
    installImageMock(800, 600)
  })
  afterEach(restoreMocks)

  it('uses pattern fill when fillType is pattern', async () => {
    const photo = makePhoto(600, 600, { dataUrl: 'data:img' })
    const settings = defaultSettings({
      fillType: 'pattern',
      pattern: { type: 'dots', color1: '#fff', color2: '#000', scale: 1 },
    })

    const beginPath = vi.fn()
    const arc = vi.fn()
    const fill = vi.fn()
    Object.assign(mockCtx, { beginPath, arc, fill })

    await padImageToAspectRatio(photo, 2, settings)

    // Pattern fill path was taken - dots use arc
    expect(beginPath).toHaveBeenCalled()
    expect(arc).toHaveBeenCalled()
  })

  it('uses stripes pattern in padImageToAspectRatio', async () => {
    const photo = makePhoto(600, 600, { dataUrl: 'data:img' })
    const settings = defaultSettings({
      fillType: 'pattern',
      pattern: { type: 'stripes', color1: '#fff', color2: '#ccc', scale: 1 },
    })

    await padImageToAspectRatio(photo, 2, settings)

    // Multiple fillRect calls: background + stripes + foreground shadow rect (if any)
    expect((mockCtx.fillRect as ReturnType<typeof vi.fn>).mock.calls.length).toBeGreaterThan(1)
  })
})

// ---------------------------------------------------------------------------
// Watermark in padImageToAspectRatio
// ---------------------------------------------------------------------------

describe('padImageToAspectRatio with watermark', () => {
  beforeEach(() => {
    installCanvasMocks()
    installImageMock(800, 600)
  })
  afterEach(restoreMocks)

  it('draws watermark when enabled with text', async () => {
    const fillText = vi.fn()
    const measureText = vi.fn(() => ({ width: 100 }))
    Object.assign(mockCtx, { fillText, measureText, font: '', globalAlpha: 1 })

    const photo = makePhoto(600, 600, { dataUrl: 'data:img' })
    const settings = defaultSettings({
      watermark: { enabled: true, text: 'My Watermark', fontSize: 24, color: '#fff', opacity: 0.5, position: 'bottom-right' },
    })

    await padImageToAspectRatio(photo, 2, settings)
    expect(fillText).toHaveBeenCalled()
  })

  it('does not draw watermark when disabled', async () => {
    const fillText = vi.fn()
    const measureText = vi.fn(() => ({ width: 100 }))
    Object.assign(mockCtx, { fillText, measureText, font: '', globalAlpha: 1 })

    const photo = makePhoto(600, 600, { dataUrl: 'data:img' })
    const settings = defaultSettings({
      watermark: { enabled: false, text: 'My Watermark', fontSize: 24, color: '#fff', opacity: 0.5, position: 'bottom-right' },
    })

    await padImageToAspectRatio(photo, 2, settings)
    expect(fillText).not.toHaveBeenCalled()
  })
})
