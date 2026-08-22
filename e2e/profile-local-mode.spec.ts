import { expect, test } from '@playwright/test'

/**
 * Phase 4 e2e in LOCAL MODE (no Firebase configured in CI): the app must
 * remain fully usable, the Profile page must explain local mode, and
 * navigation/sign-in scaffolding must be present without breaking anything.
 */

test.describe('Phase 4 — local mode behavior', () => {
  test('profile page explains local mode and offers no sign-in', async ({ page }) => {
    await page.goto('/profile')
    await expect(page.getByTestId('profile-local-mode')).toBeVisible()
    await expect(page.getByRole('button', { name: /Sign in with Google/i })).toHaveCount(0)
    await expect(page.getByText(/local mode/i).first()).toBeVisible()
  })

  test('header shows local mode tag and no user chip', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('local mode', { exact: true })).toBeVisible()
    // No header sign-in chip in local mode (dashboard marketing copy aside).
    await expect(page.locator('header').getByText('Sign in', { exact: true })).toHaveCount(0)
  })

  test('profile nav item is enabled and navigates', async ({ page }) => {
    await page.goto('/')
    await page.getByRole('menuitem', { name: /Profile/ }).click()
    await expect(page).toHaveURL(/\/profile$/)
    await expect(page.getByTestId('profile-local-mode')).toBeVisible()
  })

  test('projects still work end-to-end in local mode', async ({ page }) => {
    await page.goto('/projects')
    await page.getByRole('button', { name: /New project/i }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog.locator('input').fill('P4 Local')
    await dialog.getByRole('button', { name: /Create/i }).click()
    await expect(page).toHaveURL(/\/erd$/)
    // Editor loads without auth; local-first is unaffected by Phase 4.
    await expect(page.getByRole('button', { name: 'Add table' })).toBeVisible()
  })
})
