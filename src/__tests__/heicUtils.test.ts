import { describe, it, expect } from 'vitest'
import { isHeicFile } from '../lib/heicUtils'

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
})
