import { expect, test } from '@playwright/test'

/**
 * Phase 5 in LOCAL MODE: cloud snapshots must not appear without Firebase.
 * The Database page keeps working; the snapshot panel simply stays hidden.
 */
test('database page hides the snapshot panel in local mode', async ({ page }) => {
  await page.goto('/projects')
  await page.getByRole('button', { name: /New project/i }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.locator('input').fill('P5 Local')
  await dialog.getByRole('button', { name: /Create/i }).click()
  await expect(page).toHaveURL(/\/erd$/)

  await page.getByRole('button', { name: 'Add table' }).click()
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Database' }).click()

  const generate = page.getByRole('button', { name: /Generate/i }).first()
  await generate.click()
  await page.getByRole('button', { name: /Create database/i }).click()
  await expect(page.getByText('Tables (1)')).toBeVisible()

  await expect(page.getByTestId('snapshot-panel')).toHaveCount(0)
})
