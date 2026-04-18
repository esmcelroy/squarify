import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { isHeicFile, convertHeicToJpeg, processFilesForHeic } from '../lib/heicUtils'

describe('isHeicFile', () => {
  it('detects HEIC by MIME type', async () => {
    const file = new File([''], 'photo.heic', { type: 'image/heic' })
    expect(await isHeicFile(file)).toBe(true)
  })

  it('detects HEIF by MIME type', async () => {
    const file = new File([''], 'photo.heif', { type: 'image/heif' })
    expect(await isHeicFile(file)).toBe(true)
  })

  it('detects HEIC by file extension when MIME type is empty', async () => {
    const file = new File([''], 'photo.heic', { type: '' })
    expect(await isHeicFile(file)).toBe(true)
  })

  it('detects HEIF by file extension when MIME type is empty', async () => {
    const file = new File([''], 'photo.HEIF', { type: '' })
    expect(await isHeicFile(file)).toBe(true)
  })

  it('returns false for JPEG files', async () => {
    const file = new File([''], 'photo.jpg', { type: 'image/jpeg' })
    expect(await isHeicFile(file)).toBe(false)
  })

  it('returns false for PNG files', async () => {
    const file = new File([''], 'photo.png', { type: 'image/png' })
    expect(await isHeicFile(file)).toBe(false)
  })

  it('detects HEIC by magic bytes when MIME and extension do not match', async () => {
    // Build a 12-byte buffer: offset 4-7 = 'ftyp', offset 8-11 = 'heic'
    const buf = new Uint8Array(12)
    const ftyp = [0x66, 0x74, 0x79, 0x70] // 'ftyp'
    const brand = [0x68, 0x65, 0x69, 0x63] // 'heic'
    buf.set(ftyp, 4)
    buf.set(brand, 8)
    const file = new File([buf], 'photo.dat', { type: 'application/octet-stream' })
    expect(await isHeicFile(file)).toBe(true)
  })

  it('detects mif1 brand via magic bytes', async () => {
    const buf = new Uint8Array(12)
    buf.set([0x66, 0x74, 0x79, 0x70], 4) // ftyp
    buf.set([0x6d, 0x69, 0x66, 0x31], 8) // mif1
    const file = new File([buf], 'photo.dat', { type: '' })
    expect(await isHeicFile(file)).toBe(true)
  })

  it('returns false when magic bytes are ftyp but unknown brand', async () => {
    const buf = new Uint8Array(12)
    buf.set([0x66, 0x74, 0x79, 0x70], 4) // ftyp
    buf.set([0x69, 0x73, 0x6f, 0x6d], 8) // isom (not HEIC)
    const file = new File([buf], 'photo.dat', { type: '' })
    expect(await isHeicFile(file)).toBe(false)
  })
})

// --- convertHeicToJpeg tests ---

const mockDecode = vi.fn().mockReturnValue([{
  get_width: () => 100,
  get_height: () => 100,
  display: vi.fn((imageData: ImageData, callback: (result: ImageData) => void) => {
    for (let i = 0; i < imageData.data.length; i += 4) {
      imageData.data[i] = 255
      imageData.data[i + 1] = 0
      imageData.data[i + 2] = 0
      imageData.data[i + 3] = 255
    }
    callback(imageData)
  }),
}])

vi.mock('libheif-js', () => {
  class MockHeifDecoder {
    decode(data: Uint8Array) { return mockDecode(data) }
  }
  return {
    default: { HeifDecoder: MockHeifDecoder },
  }
})

const originalCreateElement = document.createElement.bind(document)

function makeMockCanvas(toBlobResult: Blob | null = new Blob(['fake'], { type: 'image/jpeg' })) {
  const mockCtx = {
    putImageData: vi.fn(),
    createImageData: (w: number, h: number) => ({
      data: new Uint8ClampedArray(w * h * 4),
      width: w,
      height: h,
    }),
  }
  return {
    width: 0,
    height: 0,
    getContext: vi.fn(() => mockCtx),
    toBlob: vi.fn((cb: (b: Blob | null) => void) => cb(toBlobResult)),
  }
}

describe('convertHeicToJpeg', () => {
  let createElementSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    mockDecode.mockReturnValue([{
      get_width: () => 100,
      get_height: () => 100,
      display: vi.fn((imageData: ImageData, callback: (result: ImageData) => void) => {
        callback(imageData)
      }),
    }])
    const mockCanvas = makeMockCanvas()
    createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return mockCanvas as any
      return originalCreateElement(tag)
    })
  })

  afterEach(() => {
    createElementSpy.mockRestore()
  })

  it('converts a HEIC file and returns a JPEG File', async () => {
    const heicFile = new File([new Uint8Array(100)], 'photo.heic', { type: 'image/heic' })
    const result = await convertHeicToJpeg(heicFile)
    expect(result).toBeInstanceOf(File)
    expect(result.type).toBe('image/jpeg')
    expect(result.name).toBe('photo.jpg')
  })

  it('renames .HEIF extension to .jpg', async () => {
    const heifFile = new File([new Uint8Array(50)], 'image.HEIF', { type: 'image/heif' })
    const result = await convertHeicToJpeg(heifFile)
    expect(result.name).toBe('image.jpg')
  })

  it('throws when decoder returns no images', async () => {
    mockDecode.mockReturnValueOnce([])
    const file = new File([new Uint8Array(10)], 'bad.heic', { type: 'image/heic' })
    await expect(convertHeicToJpeg(file)).rejects.toThrow('Failed to decode HEIC file')
  })

  it('throws when canvas toBlob returns null', async () => {
    createElementSpy.mockRestore()
    const mockCanvas = makeMockCanvas(null)
    createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return mockCanvas as any
      return originalCreateElement(tag)
    })

    const file = new File([new Uint8Array(10)], 'photo.heic', { type: 'image/heic' })
    await expect(convertHeicToJpeg(file)).rejects.toThrow('Canvas toBlob failed')
  })
})

// --- processFilesForHeic tests ---
describe('processFilesForHeic', () => {
  let createElementSpy: ReturnType<typeof vi.spyOn>

  beforeEach(() => {
    mockDecode.mockReturnValue([{
      get_width: () => 100,
      get_height: () => 100,
      display: vi.fn((imageData: ImageData, callback: (result: ImageData) => void) => {
        callback(imageData)
      }),
    }])
    const mockCanvas = makeMockCanvas()
    createElementSpy = vi.spyOn(document, 'createElement').mockImplementation((tag: string) => {
      if (tag === 'canvas') return mockCanvas as any
      return originalCreateElement(tag)
    })
  })

  afterEach(() => {
    createElementSpy.mockRestore()
  })

  it('passes non-HEIC files through unchanged', async () => {
    const pngFile = new File(['pixels'], 'photo.png', { type: 'image/png' })
    const jpgFile = new File(['pixels'], 'photo.jpg', { type: 'image/jpeg' })
    const { converted, errors } = await processFilesForHeic([pngFile, jpgFile])
    expect(converted).toHaveLength(2)
    expect(converted[0]).toBe(pngFile)
    expect(converted[1]).toBe(jpgFile)
    expect(errors).toHaveLength(0)
  })

  it('converts HEIC files in a mixed array', async () => {
    const pngFile = new File(['pixels'], 'photo.png', { type: 'image/png' })
    const heicFile = new File([new Uint8Array(50)], 'photo.heic', { type: 'image/heic' })
    const { converted, errors } = await processFilesForHeic([pngFile, heicFile])
    expect(converted).toHaveLength(2)
    expect(converted[0]).toBe(pngFile)
    expect(converted[1].name).toBe('photo.jpg')
    expect(converted[1].type).toBe('image/jpeg')
    expect(errors).toHaveLength(0)
  })

  it('collects errors when conversion fails', async () => {
    mockDecode.mockReturnValueOnce([])

    const heicFile = new File([new Uint8Array(10)], 'bad.heic', { type: 'image/heic' })
    const { converted, errors } = await processFilesForHeic([heicFile])
    expect(converted).toHaveLength(0)
    expect(errors).toHaveLength(1)
    expect(errors[0].fileName).toBe('bad.heic')
    expect(errors[0].error).toContain('Failed to decode')
  })
})
