import { expect, test } from '@playwright/test'

/**
 * Phase 2 flows: ERD -> DDL preview -> real local SQLite database that
 * survives a reload (OPFS/IndexedDB persistence).
 */

test.describe('SQLite generation', () => {
  test('generates a database from an ERD and reopens it after reload', async ({ page }) => {
    // Create a project and give it one table (template has an INTEGER PK).
    await page.goto('/projects')
    await page.getByRole('button', { name: /New project/i }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog.locator('input').fill('E2E SQLite')
    await dialog.getByRole('button', { name: /Create/i }).click()
    await expect(page.getByLabel('Project name')).toHaveValue('E2E SQLite')
    await page.getByRole('button', { name: 'Add table' }).click()

    // Open the database page and generate the schema.
    await page.getByRole('button', { name: 'Database' }).click()
    await expect(page.locator('.ant-result-title')).toHaveText('No database yet')
    await page.getByRole('button', { name: /Generate from ERD/i }).first().click()

    const preview = page.getByTestId('ddl-preview-code')
    await expect(preview).toContainText('CREATE TABLE table_1')
    await expect(preview).toContainText('id INTEGER PRIMARY KEY')

    await page.getByRole('button', { name: 'Create database' }).click()

    // Schema explorer shows the table with its CREATE TABLE statement.
    await expect(page.getByText('Tables (1)')).toBeVisible()
    await page.getByRole('button', { name: /table_1/ }).first().click()
    await expect(page.getByText('CREATE TABLE statement')).toBeVisible()

    // Reload keeps the database (local persistence acceptance).
    await page.reload()
    await expect(page.getByText('Tables (1)')).toBeVisible()
    await expect(page.getByText(/open ·/)).toBeVisible()
  })

  test('rebuild warns about existing data', async ({ page }) => {
    await page.goto('/projects')
    await page.getByRole('button', { name: /New project/i }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog.locator('input').fill('E2E Rebuild')
    await dialog.getByRole('button', { name: /Create/i }).click()
    await page.getByRole('button', { name: 'Add table' }).click()

    await page.getByRole('button', { name: 'Database' }).click()
    await page.getByRole('button', { name: /Generate from ERD/i }).first().click()
    await page.getByRole('button', { name: 'Create database' }).click()
    await expect(page.getByText('Tables (1)')).toBeVisible()

    await page.getByRole('button', { name: /Rebuild from ERD/i }).click()
    await expect(
      page.getByText('Rebuilding recreates the schema from the ERD and will remove existing data.')
    ).toBeVisible()
    await page.getByRole('button', { name: 'Cancel' }).click()
  })
})
