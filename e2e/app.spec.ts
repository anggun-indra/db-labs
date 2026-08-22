import { expect, test } from '@playwright/test'

/**
 * Phase 0/1 smoke flows (spec §46 quality gates, adapted to what exists so
 * far): the app boots, a project can be created, a table added, and the
 * state survives a reload thanks to local persistence.
 */

test.describe('app boot and project lifecycle', () => {
  test('shows the dashboard', async ({ page }) => {
    await page.goto('/')
    await expect(page.getByText('Database Learning Lab').first()).toBeVisible()
    await expect(page.getByRole('link', { name: /Open my projects/i })).toBeVisible()
  })

  test('creates a project and adds a table', async ({ page }) => {
    await page.goto('/projects')
    await page
      .getByRole('button', { name: /New project/i })
      .first()
      .click()
    const dialog = page.getByRole('dialog')
    await dialog.locator('input').fill('E2E Coffee Shop')
    await dialog.getByRole('button', { name: /Create/i }).click()

    // ERD editor opens
    await expect(page.getByLabel('Project name')).toHaveValue('E2E Coffee Shop')

    await page.getByRole('button', { name: /Add table/i }).click()
    await expect(page.getByTestId('table-node-header').first()).toBeVisible()

    // Reload keeps the project (local persistence acceptance, spec §53).
    await page.reload()
    await expect(page.getByLabel('Project name')).toHaveValue('E2E Coffee Shop')
    await expect(page.getByTestId('table-node-header').first()).toBeVisible()
  })

  test('undo removes an added table', async ({ page }) => {
    await page.goto('/projects')
    await page
      .getByRole('button', { name: /New project/i })
      .first()
      .click()
    const dialog = page.getByRole('dialog')
    await dialog.locator('input').fill('E2E Undo')
    await dialog.getByRole('button', { name: /Create/i }).click()

    await page.getByRole('button', { name: /Add table/i }).click()
    await expect(page.getByTestId('table-node-header')).toHaveCount(1)

    await page.getByRole('button', { name: 'Undo' }).click()
    await expect(page.getByTestId('table-node-header')).toHaveCount(0)
  })
})
