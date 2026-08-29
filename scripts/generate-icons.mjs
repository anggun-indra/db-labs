import { chromium } from 'playwright'
import { readFileSync, writeFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = join(dirname(fileURLToPath(import.meta.url)), '..', 'public')
const svgContent = readFileSync(join(root, 'favicon.svg'), 'utf-8')

async function main() {
  const browser = await chromium.launch({ headless: true })

  // 1. Generate standard icons (transparent / rounded square tile as in SVG)
  const sizes = [
    { name: 'pwa-192x192.png', size: 192 },
    { name: 'pwa-512x512.png', size: 512 },
    { name: 'apple-touch-icon.png', size: 180 }
  ]

  for (const { name, size } of sizes) {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 2
    })

    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body { width: ${size}px; height: ${size}px; background: transparent; overflow: hidden; display: flex; align-items: center; justify-content: center; }
            svg { width: 100%; height: 100%; display: block; }
          </style>
        </head>
        <body>
          ${svgContent}
        </body>
      </html>
    `)

    const buffer = await page.screenshot({ omitBackground: true, type: 'png' })
    const outPath = join(root, name)
    writeFileSync(outPath, buffer)
    console.log(`Generated standard icon: ${name} (${size}x${size}, ${buffer.length} bytes)`)
    await page.close()
  }

  // 2. Generate maskable icons (padded inside 80% safe zone with solid background)
  const maskableSizes = [
    { name: 'pwa-maskable-192x192.png', size: 192 },
    { name: 'pwa-maskable-512x512.png', size: 512 }
  ]

  for (const { name, size } of maskableSizes) {
    const page = await browser.newPage({
      viewport: { width: size, height: size },
      deviceScaleFactor: 2
    })

    await page.setContent(`
      <!DOCTYPE html>
      <html>
        <head>
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            html, body {
              width: ${size}px;
              height: ${size}px;
              background: #1f3a5f;
              overflow: hidden;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .icon-wrap {
              width: 80%;
              height: 80%;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            svg { width: 100%; height: 100%; display: block; }
          </style>
        </head>
        <body>
          <div class="icon-wrap">
            ${svgContent}
          </div>
        </body>
      </html>
    `)

    const buffer = await page.screenshot({ omitBackground: false, type: 'png' })
    const outPath = join(root, name)
    writeFileSync(outPath, buffer)
    console.log(`Generated maskable icon: ${name} (${size}x${size}, ${buffer.length} bytes)`)
    await page.close()
  }

  await browser.close()
  console.log('All PWA icons generated successfully!')
}

main().catch((err) => {
  console.error('Failed to generate icons:', err)
  process.exit(1)
})
