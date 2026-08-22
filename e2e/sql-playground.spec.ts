import { expect, test } from '@playwright/test'

/**
 * Phase 3 flows: run SQL against the local database, see results / affected
 * rows / errors, and inspect history. Uses the real Monaco editor.
 */

async function createProjectWithDatabase(page: import('@playwright/test').Page, name: string) {
  await page.goto('/projects')
  await page.getByRole('button', { name: /New project/i }).first().click()
  const dialog = page.getByRole('dialog')
  await dialog.locator('input').fill(name)
  await dialog.getByRole('button', { name: /Create/i }).click()
  await page.getByRole('button', { name: 'Add table' }).click()
  // Close the table inspector drawer so it does not cover the toolbar.
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Database' }).click()
  await page.getByRole('button', { name: /Generate from ERD/i }).first().click()
  await page.getByRole('button', { name: 'Create database' }).click()
  await expect(page.getByText('Tables (1)')).toBeVisible()
}

test.describe('SQL Playground', () => {
  test('runs mutations and selects, shows affected rows, results and history', async ({ page }) => {
    await createProjectWithDatabase(page, 'E2E Playground')
    await page.getByRole('button', { name: 'SQL Playground' }).click()
    await expect(page.getByTestId('sql-editor')).toBeVisible()

    // INSERT via Monaco, then run.
    await page.locator('.monaco-editor .view-lines').first().click()
    await page.keyboard.type('INSERT INTO table_1 (id) VALUES (1), (2);')
    await page.getByRole('button', { name: 'Run' }).click()
    await expect(page.getByText('2 row(s) affected')).toBeVisible()

    // SELECT shows a result table with timing. The draft is seeded through
    // localStorage, which also proves per-project draft restoration.
    const projectId = page.url().split('/')[4]
    await page.evaluate(
      (pid) => localStorage.setItem(`dblab:sql-draft:${pid}`, 'SELECT id FROM table_1 ORDER BY id;'),
      projectId
    )
    await page.reload()
    await page.getByTestId('sql-editor').waitFor()
    await page.getByRole('button', { name: 'Run' }).click()
    await expect(page.getByText(/2 row\(s\) ·/)).toBeVisible()
    await expect(page.getByRole('cell', { name: '1', exact: true }).first()).toBeVisible()

    // History records both statements with status.
    await page.getByRole('tab', { name: /History/ }).click()
    const historyPanel = page.getByRole('tabpanel', { name: /History/ })
    await expect(historyPanel.getByText('SELECT id FROM table_1 ORDER BY id;')).toBeVisible()
    await expect(
      historyPanel.getByText('INSERT INTO table_1 (id) VALUES (1), (2);')
    ).toBeVisible()
  })

  test('runs only the selection and explains errors', async ({ page }) => {
    await createProjectWithDatabase(page, 'E2E Selection')
    await page.getByRole('button', { name: 'SQL Playground' }).click()
    await expect(page.getByTestId('sql-editor')).toBeVisible()

    await page.locator('.monaco-editor .view-lines').first().click()
    await page.keyboard.type('SELECT * FROM missing_table;\nSELECT 40 + 2 AS answer;')

    // Select the second line only, run it; the first statement is skipped.
    await page.keyboard.press('End')
    await page.keyboard.down('Shift')
    await page.keyboard.press('Home')
    await page.keyboard.up('Shift')
    await page.getByRole('button', { name: 'Run' }).click()
    await expect(page.getByRole('cell', { name: '42' })).toBeVisible()

    // Run the whole script (no selection): the failing statement produces
    // an educational hint.
    await page.locator('.monaco-editor .view-lines').first().click()
    await page.getByRole('button', { name: 'Run' }).click()
    await expect(page.getByText(/no such table: missing_table/i)).toBeVisible()
    await expect(page.getByTestId('error-hint')).toContainText('missing_table')
  })

  test('visual data editor inserts a row with visible SQL', async ({ page }) => {
    await createProjectWithDatabase(page, 'E2E DataEditor')
    await page.getByRole('button', { name: 'SQL Playground' }).click()

    await page.getByRole('tab', { name: 'Data editor' }).click()
    await page.getByRole('button', { name: 'Add row' }).click()

    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible()
    await modal.getByPlaceholder('empty = NULL').fill('1')
    await expect(modal.getByTestId('mutation-sql')).toContainText(
      'INSERT INTO table_1 (id) VALUES (1);'
    )
    await modal.getByRole('button', { name: 'Insert row' }).click()

    // The row shows up and the generated SQL stays visible for learning.
    await expect(page.getByRole('cell', { name: '1', exact: true }).first()).toBeVisible()
    await expect(page.getByText(/Last generated mutation SQL/)).toBeVisible()
  })
})
