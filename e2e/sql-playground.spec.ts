import { expect, test } from '@playwright/test'

/**
 * Phase 3 flows: run SQL against the local database, see results / affected
 * rows / errors, and inspect history. Uses the real Monaco editor and the
 * revamped modern database tools layout.
 */

async function createProjectWithDatabase(page: import('@playwright/test').Page, name: string) {
  await page.goto('/projects')
  await page
    .getByRole('button', { name: /New project/i })
    .first()
    .click()
  const dialog = page.getByRole('dialog')
  await dialog.locator('input').fill(name)
  await dialog.getByRole('button', { name: /Create/i }).click()
  await page.getByRole('button', { name: 'Add table' }).click()
  // Close the table inspector drawer so it does not cover the toolbar.
  await page.keyboard.press('Escape')
  await page.getByRole('button', { name: 'Database' }).click()
  await page
    .getByRole('button', { name: /Generate from ERD/i })
    .first()
    .click()
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
      (pid) =>
        localStorage.setItem(`dblab:sql-draft:${pid}`, 'SELECT id FROM table_1 ORDER BY id;'),
      projectId
    )
    await page.reload()
    await page.getByTestId('sql-editor').waitFor()
    await page.getByRole('button', { name: 'Run' }).click()
    await expect(page.getByText(/2 row\(s\) ·/)).toBeVisible()
    await expect(page.getByRole('cell', { name: '1', exact: true }).first()).toBeVisible()

    // History records both statements with status.
    await page
      .getByRole('tab', { name: /History/ })
      .first()
      .click()
    const historyPanel = page.getByRole('tabpanel', { name: /History/ }).first()
    await expect(historyPanel.getByText('SELECT id FROM table_1 ORDER BY id;')).toBeVisible()
    await expect(historyPanel.getByText('INSERT INTO table_1 (id) VALUES (1), (2);')).toBeVisible()
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

  test('visual data editor inserts a row with visible SQL and surfaces constraint errors in modal', async ({
    page
  }) => {
    await createProjectWithDatabase(page, 'E2E DataEditor')
    await page.getByRole('button', { name: 'SQL Playground' }).click()

    // Switch to Table Data & Schema workspace tab
    await page.getByRole('tab', { name: /Table Data & Schema/ }).click()
    await page.getByRole('button', { name: 'Add row' }).click()

    const modal = page.getByRole('dialog')
    await expect(modal).toBeVisible()
    await modal.getByRole('textbox').first().fill('1')
    await expect(modal.getByTestId('mutation-sql')).toContainText(
      'INSERT INTO table_1 (id) VALUES (1);'
    )
    await modal.getByRole('button', { name: 'Insert row' }).click()

    // The row shows up and the generated SQL stays visible for learning.
    await expect(page.getByRole('cell', { name: '1', exact: true }).first()).toBeVisible()
    await expect(page.getByText(/Last generated mutation SQL/)).toBeVisible()

    // Now attempt to add another row with duplicate PK '1'
    await page.getByRole('button', { name: 'Add row' }).click()
    await expect(modal).toBeVisible()
    await modal.getByRole('textbox').first().fill('1')
    await modal.getByRole('button', { name: 'Insert row' }).click()

    // Modal must NOT close silently, but must show the SQLite error with hint & execution metrics
    await expect(modal).toBeVisible()
    await expect(modal.getByText(/UNIQUE constraint failed|PRIMARY KEY/i)).toBeVisible()
    await expect(modal.getByTestId('modal-error-hint')).toBeVisible()

    // Fix the value in modal to '2' and resubmit
    await modal.getByRole('textbox').first().fill('2')
    await modal.getByRole('button', { name: 'Insert row' }).click()

    // Modal closes and row '2' is visible in data table
    await expect(modal).not.toBeVisible()
    await expect(page.getByRole('cell', { name: '2', exact: true }).first()).toBeVisible()
  })

  test('provides intelligent autocomplete for tables and columns', async ({ page }) => {
    await createProjectWithDatabase(page, 'E2E Autocomplete')
    await page.getByRole('button', { name: 'SQL Playground' }).click()
    await expect(page.getByTestId('sql-editor')).toBeVisible()

    // Type query and trigger table suggestion after FROM
    await page.locator('.monaco-editor .view-lines').first().click()
    await page.keyboard.type('SELECT * FROM tab')

    const suggestWidget = page.locator('.suggest-widget')
    await expect(suggestWidget).toBeVisible()
    await expect(suggestWidget.getByText('table_1').first()).toBeVisible()

    // Accept table suggestion with Enter
    await page.keyboard.press('Enter')

    // Now test dot navigation: type ` WHERE table_1.`
    await page.keyboard.type(' WHERE table_1.')
    await expect(suggestWidget).toBeVisible()
    await expect(suggestWidget.getByText('id').first()).toBeVisible()
    await page.keyboard.press('Enter')
    await page.keyboard.type(' = 1;')

    // Run the query constructed via autocomplete
    await page.getByRole('button', { name: 'Run' }).click()
    await expect(page.getByText(/0 row\(s\)/).first()).toBeVisible()

    // Test alias autocomplete: `SELECT t.id FROM table_1 t WHERE t.`
    await page.getByRole('button', { name: 'Clear' }).click()
    await page.locator('.monaco-editor .view-lines').first().click()
    await page.keyboard.type('SELECT * FROM table_1 t WHERE t.')
    await expect(suggestWidget).toBeVisible()
    await expect(suggestWidget.getByText('id').first()).toBeVisible()
    await page.keyboard.press('Enter')
    await page.keyboard.type(' IS NOT NULL;')
    await page.getByRole('button', { name: 'Run' }).click()
    await expect(page.getByText(/0 row\(s\)/).first()).toBeVisible()
  })

  test('displays clear error messages, execution time, and educational hints on invalid INSERT', async ({
    page
  }) => {
    await createProjectWithDatabase(page, 'E2E Insert Error')
    await page.getByRole('button', { name: 'SQL Playground' }).click()
    await expect(page.getByTestId('sql-editor')).toBeVisible()

    // 1. Run a valid INSERT first
    await page.locator('.monaco-editor .view-lines').first().click()
    await page.keyboard.type('INSERT INTO table_1 (id) VALUES (1);')
    await page.getByRole('button', { name: 'Run' }).click()
    await expect(page.getByText('1 row(s) affected')).toBeVisible()
    await expect(page.getByText(/ms/).first()).toBeVisible()

    // 2. Run a duplicate PRIMARY KEY INSERT -> should show Execution Error, code, execution time, and hint
    await page.getByRole('button', { name: 'Clear' }).click()
    await page.locator('.monaco-editor .view-lines').first().click()
    await page.keyboard.type('INSERT INTO table_1 (id) VALUES (1);')
    await page.getByRole('button', { name: 'Run' }).click()

    await expect(page.getByText('Execution Error')).toBeVisible()
    await expect(page.getByText(/UNIQUE constraint failed|PRIMARY KEY/i)).toBeVisible()
    await expect(page.getByTestId('error-hint')).toBeVisible()

    // 3. Run an INSERT with non-existent column -> shows clear error and educational hint
    await page.getByRole('button', { name: 'Clear' }).click()
    await page.locator('.monaco-editor .view-lines').first().click()
    await page.keyboard.type('INSERT INTO table_1 (non_existent_col) VALUES (99);')
    await page.getByRole('button', { name: 'Run' }).click()

    await expect(page.getByText('Execution Error')).toBeVisible()
    await expect(
      page.getByText(/has no column named non_existent_col|no such column/i)
    ).toBeVisible()
    await expect(page.getByTestId('error-hint')).toContainText('non_existent_col')
  })

  test('switches active table in Table Workspace and updates Data Grid, structure, and DDL', async ({
    page
  }) => {
    // Create project with 2 tables
    await page.goto('/projects')
    await page
      .getByRole('button', { name: /New project/i })
      .first()
      .click()
    const dialog = page.getByRole('dialog')
    await dialog.locator('input').fill('E2E Table Switch')
    await dialog.getByRole('button', { name: /Create/i }).click()

    // Add first table (table_1)
    await page.getByRole('button', { name: 'Add table' }).click()
    await page.keyboard.press('Escape')

    // Add second table (table_2)
    await page.getByRole('button', { name: 'Add table' }).click()
    await page.keyboard.press('Escape')

    // Generate database
    await page.getByRole('button', { name: 'Database' }).click()
    await page
      .getByRole('button', { name: /Generate from ERD/i })
      .first()
      .click()
    await page.getByRole('button', { name: 'Create database' }).click()
    await expect(page.getByText('Tables (2)')).toBeVisible()

    // Open SQL Playground
    await page.getByRole('button', { name: 'SQL Playground' }).click()
    await expect(page.getByTestId('database-explorer')).toBeVisible()

    // Switch to Table Data & Schema workspace tab
    await page.getByRole('tab', { name: /Table Data & Schema/ }).click()

    // Add row to table_1 (id: 100)
    await page.getByRole('button', { name: 'Add row' }).click()
    const modal = page.getByRole('dialog')
    await modal.getByRole('textbox').first().fill('100')
    await modal.getByRole('button', { name: 'Insert row' }).click()
    await expect(modal).not.toBeVisible()
    await expect(page.getByRole('cell', { name: '100', exact: true })).toBeVisible()

    // Switch table via Database Explorer sidebar (click table_2)
    await page.getByText('table_2').first().click()

    // The data grid should now reflect table_2 (empty initially, not showing '100')
    await expect(page.getByRole('cell', { name: '100', exact: true })).not.toBeVisible()

    // Add row to table_2 (id: 200)
    await page.getByRole('button', { name: 'Add row' }).click()
    await modal.getByRole('textbox').first().fill('200')
    await modal.getByRole('button', { name: 'Insert row' }).click()
    await expect(modal).not.toBeVisible()
    await expect(page.getByRole('cell', { name: '200', exact: true })).toBeVisible()

    // Switch back to table_1 via Database Explorer sidebar
    await page.getByText('table_1').first().click()

    // Row '100' is visible again in table_1, and row '200' is not in table_1
    await expect(page.getByRole('cell', { name: '100', exact: true })).toBeVisible()
    await expect(page.getByRole('cell', { name: '200', exact: true })).not.toBeVisible()
  })
})
