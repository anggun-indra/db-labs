import { expect, test } from '@playwright/test'

/**
 * Phase 8 PWA validation: the app shell is precached, so once the service
 * worker controls the page the app must re-open while fully offline.
 * registerType is 'prompt', so the worker registers on the first visit and
 * takes control on a later navigation; the browser may need one extra
 * navigation after registration settles, so we retry briefly. A hard
 * controller assertion guarantees the offline pass is served by the SW,
 * not by heuristic HTTP cache. Firestore data is intentionally NOT cached
 * (spec §30).
 */
test('app shell re-opens offline once the service worker is ready', async ({ page, context }) => {
  test.setTimeout(120_000)

  await page.goto('/')
  await expect(page.getByRole('menuitem', { name: /My Projects/ })).toBeVisible()

  // Wait until the worker finishes installing (~9.6 MiB precache).
  await page.waitForFunction(
    async () => {
      const reg = await navigator.serviceWorker.getRegistration()
      return reg?.active != null
    },
    undefined,
    // Headless Chrome throttles requestAnimationFrame — poll on an interval.
    { timeout: 30_000, polling: 500 }
  )

  // Let control attach; navigate again if the first reload raced registration.
  let controlled = false
  for (let attempt = 0; attempt < 5 && !controlled; attempt += 1) {
    if (attempt > 0) {
      await page.reload({ waitUntil: 'load' })
    }
    await page.waitForTimeout(1_500)
    controlled = await page.evaluate(() => navigator.serviceWorker.controller !== null)
  }
  expect(controlled).toBe(true)

  await context.setOffline(true)
  await page.reload()

  // The cached app shell renders without any network.
  await expect(page.getByRole('menuitem', { name: /My Projects/ })).toBeVisible()
  await expect(page.getByText(/Database Learning Lab/i).first()).toBeVisible()

  await context.setOffline(false)
})
