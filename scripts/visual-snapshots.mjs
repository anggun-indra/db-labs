/**
 * Visual regression snapshots for the dsw UI adoption.
 * Usage: npm run build && node scripts/visual-snapshots.mjs
 * Captures key pages in light and dark mode into docs/design/screenshots/.
 * Requires the production build (vite preview serves dist/).
 */
import { mkdirSync } from 'node:fs'
import { spawn } from 'node:child_process'
import { chromium } from '@playwright/test'

const PORT = 4173
const BASE = `http://localhost:${PORT}`
const OUT = new URL('../docs/design/screenshots/', import.meta.url).pathname
mkdirSync(OUT, { recursive: true })

const preview = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--strictPort'], {
  stdio: 'ignore',
  detached: true
})

let ready = false
for (let i = 0; i < 40 && !ready; i++) {
  try {
    const res = await fetch(BASE)
    ready = res.ok
  } catch {
    await new Promise((r) => setTimeout(r, 250))
  }
}
if (!ready) {
  process.kill(-preview.pid)
  console.error('vite preview did not come up on port', PORT)
  process.exit(1)
}

async function setMode(page, mode) {
  await page.evaluate((m) => localStorage.setItem('dblab:ui-theme', m), mode)
  await page.reload({ waitUntil: 'networkidle' })
  await page.waitForTimeout(450)
}

async function createProject(page, name) {
  await page.goto(`${BASE}/projects`, { waitUntil: 'networkidle' })
  await page.waitForTimeout(300)
  await page.getByRole('button', { name: /New project/i }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.locator('input').fill(name)
  await dialog.getByRole('button', { name: /Create/i }).click()
  await page.waitForTimeout(800)
}

const captured = []
try {
  const browser = await chromium.launch()
  const page = await browser.newPage({ viewport: { width: 1360, height: 850 } })
  await page.goto(BASE, { waitUntil: 'networkidle' })

  for (const mode of ['light', 'dark']) {
    await setMode(page, mode)

    await page.goto(`${BASE}/`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${OUT}dashboard-${mode}.png` })

    await page.goto(`${BASE}/settings`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${OUT}settings-${mode}.png` })

    await page.goto(`${BASE}/profile`, { waitUntil: 'networkidle' })
    await page.waitForTimeout(400)
    await page.screenshot({ path: `${OUT}profile-${mode}.png` })

    await createProject(page, `Visual ${mode}`)
    await page.screenshot({ path: `${OUT}erd-${mode}.png` })

    captured.push(`dashboard-${mode}`, `settings-${mode}`, `profile-${mode}`, `erd-${mode}`)
  }

  await browser.close()
} finally {
  try {
    process.kill(-preview.pid)
  } catch {
    preview.kill()
  }
}

console.log('Captured:', captured.join(', '))
