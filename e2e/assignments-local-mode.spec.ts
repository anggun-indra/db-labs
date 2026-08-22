import { expect, test } from '@playwright/test'

/**
 * Phase 6 in LOCAL MODE: assignments degrade gracefully — the page
 * explains itself, navigation works, everything else stays usable.
 */
test('assignments page explains local mode', async ({ page }) => {
  await page.goto('/assignments')
  await expect(page.getByTestId('assignments-local-mode')).toBeVisible()
  await expect(page.getByText(/Assignments need cloud sync/i)).toBeVisible()
})

test('assignments nav item is enabled and navigates', async ({ page }) => {
  await page.goto('/')
  await page.getByRole('menuitem', { name: /Assignments/ }).click()
  await expect(page).toHaveURL(/\/assignments$/)
  await expect(page.getByTestId('assignments-local-mode')).toBeVisible()
})
