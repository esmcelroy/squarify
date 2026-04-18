import type { Page } from '@playwright/test'

// Minimal valid 10x5 PNG (landscape)
export function createLandscapePng(): Buffer {
  return createPngBuffer(10, 5, [255, 0, 0]) // red
}

// Minimal valid 5x10 PNG (portrait)
export function createPortraitPng(): Buffer {
  return createPngBuffer(5, 10, [0, 0, 255]) // blue
}

// Creates a minimal valid PNG with given dimensions and solid color
function createPngBuffer(
  width: number,
  height: number,
  rgb: [number, number, number],
): Buffer {
  // Build raw scanlines: each row = filter byte (0) + RGB pixels
  const rawData: number[] = []
  for (let y = 0; y < height; y++) {
    rawData.push(0) // filter: none
    for (let x = 0; x < width; x++) {
      rawData.push(rgb[0], rgb[1], rgb[2])
    }
  }

  const deflated = deflateRaw(Buffer.from(rawData))

  const chunks: Buffer[] = []
  // Signature
  chunks.push(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]))
  // IHDR
  chunks.push(createChunk('IHDR', ihdrData(width, height)))
  // IDAT
  chunks.push(createChunk('IDAT', deflated))
  // IEND
  chunks.push(createChunk('IEND', Buffer.alloc(0)))

  return Buffer.concat(chunks)
}

function ihdrData(width: number, height: number): Buffer {
  const buf = Buffer.alloc(13)
  buf.writeUInt32BE(width, 0)
  buf.writeUInt32BE(height, 4)
  buf[8] = 8 // bit depth
  buf[9] = 2 // color type: RGB
  buf[10] = 0 // compression
  buf[11] = 0 // filter
  buf[12] = 0 // interlace
  return buf
}

function createChunk(type: string, data: Buffer): Buffer {
  const length = Buffer.alloc(4)
  length.writeUInt32BE(data.length, 0)
  const typeBytes = Buffer.from(type, 'ascii')
  const crcInput = Buffer.concat([typeBytes, data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(crcInput), 0)
  return Buffer.concat([length, typeBytes, data, crc])
}

function crc32(buf: Buffer): number {
  let crc = 0xffffffff
  for (let i = 0; i < buf.length; i++) {
    crc ^= buf[i]
    for (let j = 0; j < 8; j++) {
      crc = crc & 1 ? (crc >>> 1) ^ 0xedb88320 : crc >>> 1
    }
  }
  return (crc ^ 0xffffffff) >>> 0
}

// Minimal zlib deflate: stored blocks (no compression)
function deflateRaw(data: Buffer): Buffer {
  const chunks: Buffer[] = []
  // zlib header
  chunks.push(Buffer.from([0x78, 0x01]))

  const maxBlock = 65535
  let offset = 0
  while (offset < data.length) {
    const remaining = data.length - offset
    const blockSize = Math.min(remaining, maxBlock)
    const isLast = offset + blockSize >= data.length
    const header = Buffer.alloc(5)
    header[0] = isLast ? 0x01 : 0x00
    header.writeUInt16LE(blockSize, 1)
    header.writeUInt16LE(blockSize ^ 0xffff, 3)
    chunks.push(header)
    chunks.push(data.subarray(offset, offset + blockSize))
    offset += blockSize
  }

  // Adler-32 checksum
  let a = 1,
    b = 0
  for (let i = 0; i < data.length; i++) {
    a = (a + data[i]) % 65521
    b = (b + a) % 65521
  }
  const adler = Buffer.alloc(4)
  adler.writeUInt32BE((b << 16) | a, 0)
  chunks.push(adler)

  return Buffer.concat(chunks)
}

export async function uploadTestImage(
  page: Page,
  name: string,
  buffer: Buffer,
) {
  const fileInput = page.locator('input[type="file"]').first()
  await fileInput.setInputFiles({
    name,
    mimeType: 'image/png',
    buffer,
  })
}

export async function uploadMultipleTestImages(
  page: Page,
  files: Array<{ name: string; buffer: Buffer }>,
) {
  const fileInput = page.locator('input[type="file"]').first()
  await fileInput.setInputFiles(
    files.map((f) => ({
      name: f.name,
      mimeType: 'image/png',
      buffer: f.buffer,
    })),
  )
}
