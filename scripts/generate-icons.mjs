/**
 * Generates placeholder PWA icons (solid rounded square) as valid PNG files,
 * dependency-free. Spec §30 asks for icon placeholders; real branding can
 * replace these later (spec §54: don't spend time on branding yet).
 *
 * Usage: node scripts/generate-icons.mjs
 */
import { deflateSync } from 'node:zlib'
import { mkdirSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')

// ---- minimal PNG encoder -------------------------------------------------

const CRC_TABLE = (() => {
  const table = new Uint32Array(256)
  for (let n = 0; n < 256; n++) {
    let c = n
    for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1
    table[n] = c >>> 0
  }
  return table
})()

function crc32(bytes) {
  let crc = 0xffffffff
  for (const b of bytes) crc = CRC_TABLE[(crc ^ b) & 0xff] ^ (crc >>> 8)
  return (crc ^ 0xffffffff) >>> 0
}

function chunk(type, data) {
  const len = Buffer.alloc(4)
  len.writeUInt32BE(data.length)
  const body = Buffer.concat([Buffer.from(type, 'ascii'), data])
  const crc = Buffer.alloc(4)
  crc.writeUInt32BE(crc32(body))
  return Buffer.concat([len, body, crc])
}

function encodePng(size, rgbaAt) {
  const sig = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])

  const ihdr = Buffer.alloc(13)
  ihdr.writeUInt32BE(size, 0)
  ihdr.writeUInt32BE(size, 4)
  ihdr[8] = 8 // bit depth
  ihdr[9] = 6 // color type RGBA
  ihdr[10] = 0
  ihdr[11] = 0
  ihdr[12] = 0

  // raw image: each scanline prefixed with filter byte 0
  const raw = Buffer.alloc(size * (size * 4 + 1))
  for (let y = 0; y < size; y++) {
    raw[y * (size * 4 + 1)] = 0
    for (let x = 0; x < size; x++) {
      const [r, g, b, a] = rgbaAt(x, y)
      const off = y * (size * 4 + 1) + 1 + x * 4
      raw[off] = r
      raw[off + 1] = g
      raw[off + 2] = b
      raw[off + 3] = a
    }
  }
  const idat = deflateSync(raw)

  return Buffer.concat([
    sig,
    chunk('IHDR', ihdr),
    chunk('IDAT', idat),
    chunk('IEND', Buffer.alloc(0))
  ])
}

// ---- icon design: dark-blue rounded square with a lighter "table" glyph ---

function makeIcon(size) {
  const bg = [0x1f, 0x3a, 0x5f, 255] // theme blue
  const fg = [0xe8, 0xf0, 0xfe, 255] // near white
  const transparent = [0, 0, 0, 0]
  const r = size * 0.18 // corner radius

  const insideRoundedSquare = (x, y) => {
    const cx = Math.min(Math.max(x, r), size - r)
    const cy = Math.min(Math.max(y, r), size - r)
    const dx = x - cx
    const dy = y - cy
    return dx * dx + dy * dy <= r * r || (x >= r && x <= size - r) || (y >= r && y <= size - r)
  }

  // simple "database table" glyph: rounded rect outline with two lines
  const m = size * 0.24 // glyph margin
  const glyph = (x, y) => {
    const inBox = x >= m && x <= size - m && y >= m * 1.15 && y <= size - m * 1.15
    const border = size * 0.035
    const inBorder =
      inBox &&
      (x <= m + border ||
        x >= size - m - border ||
        y <= m * 1.15 + border ||
        y >= size - m * 1.15 - border)
    const headerLine = inBox && y >= m * 1.15 + size * 0.14 && y <= m * 1.15 + size * 0.14 + border
    const midLine =
      inBox && x >= size * 0.42 && x <= size * 0.42 + border && y >= m * 1.15 + size * 0.14
    return inBorder || headerLine || midLine
  }

  return encodePng(size, (x, y) => {
    if (!insideRoundedSquare(x, y)) return transparent
    return glyph(x, y) ? fg : bg
  })
}

mkdirSync(root, { recursive: true })
for (const size of [192, 512]) {
  const file = join(root, `pwa-${size}x${size}.png`)
  writeFileSync(file, makeIcon(size))
  console.log(`wrote ${file}`)
}
