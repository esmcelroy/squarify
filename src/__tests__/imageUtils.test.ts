import { describe, it, expect } from 'vitest'
import { findMaxAspectRatio } from '../lib/imageUtils'
import type { UploadedPhoto } from '../types'

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
