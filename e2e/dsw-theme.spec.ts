import { expect, test } from '@playwright/test'

/**
 * Regression guard for the DeepSeek (dsw) UI adoption: the computed colors
 * of the shell must resolve to the dsw palette in both modes, and the
 * Appearance picker must persist via the data-ds-dark-theme body attribute.
 * Anchor values come from @deepseek-ai/dsh-client-ui-theme (see
 * docs/design/reference/dsw-theme-extracted.css).
 */

const LIGHT = {
  bodyBg: 'rgb(255, 255, 255)', // neutral-bluish-00
  sidebarBg: 'rgb(249, 250, 251)', // neutral-bluish-50 (--dsw-specific-sidebar-fill)
  headerBg: 'rgb(255, 255, 255)',
  logoText: 'rgb(15, 17, 21)' // neutral-bluish-1000
}

const DARK = {
  bodyBg: 'rgb(21, 21, 23)', // neutral-bluish-950
  sidebarBg: 'rgb(27, 27, 28)', // neutral-bluish-900
  headerBg: 'rgb(21, 21, 23)',
  logoText: 'rgb(249, 250, 251)' // neutral-bluish-50
}

async function shellColors(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const el = (sel: string) => {
      const node = document.querySelector(sel)
      return node ? getComputedStyle(node) : null
    }
    return {
      bodyBg: getComputedStyle(document.body).backgroundColor,
      sidebarBg: el('.app-sider')?.backgroundColor ?? '',
      headerBg: el('.app-header')?.backgroundColor ?? '',
      logoText: el('.app-logo__text')?.color ?? ''
    }
  })
}

test.describe('dsw design system regression', () => {
  test('light mode resolves the dsw palette', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('dblab:ui-theme', 'light'))
    await page.goto('/')
    const colors = await shellColors(page)
    expect(colors.bodyBg).toBe(LIGHT.bodyBg)
    expect(colors.sidebarBg).toBe(LIGHT.sidebarBg)
    expect(colors.headerBg).toBe(LIGHT.headerBg)
    expect(colors.logoText).toBe(LIGHT.logoText)
    const attr = await page.evaluate(() => document.body.getAttribute('data-ds-dark-theme'))
    expect(attr).toBeNull()
  })

  test('dark mode resolves the dsw palette', async ({ page }) => {
    await page.addInitScript(() => localStorage.setItem('dblab:ui-theme', 'dark'))
    await page.goto('/')
    const colors = await shellColors(page)
    expect(colors.bodyBg).toBe(DARK.bodyBg)
    expect(colors.sidebarBg).toBe(DARK.sidebarBg)
    expect(colors.headerBg).toBe(DARK.headerBg)
    expect(colors.logoText).toBe(DARK.logoText)
    const attr = await page.evaluate(() => document.body.getAttribute('data-ds-dark-theme'))
    expect(attr).toBe('true')
  })

  test('Appearance picker switches theme and persists', async ({ page }) => {
    await page.goto('/settings')
    await page.evaluate(() => localStorage.setItem('dblab:ui-theme', 'light'))
    await page.reload()
    await page.getByRole('radio', { name: 'Dark' }).click()
    await expect
      .poll(() => page.evaluate(() => document.body.getAttribute('data-ds-dark-theme')))
      .toBe('true')
    const colors = await shellColors(page)
    expect(colors.bodyBg).toBe(DARK.bodyBg)

    await page.reload()
    await expect
      .poll(() => page.evaluate(() => localStorage.getItem('dblab:ui-theme')))
      .toBe('dark')
    expect(await page.evaluate(() => document.body.getAttribute('data-ds-dark-theme'))).toBe('true')
  })

  test('settings panel matches dsh geometry', async ({ page }) => {
    await page.goto('/settings')
    const geometry = await page.evaluate(() => {
      const panel = document.querySelector('.dsw-settings__panel')
      const rail = document.querySelector('.dsw-settings__rail')
      const cell = document.querySelector('.dsw-settings__nav-cell')
      return {
        panelRadius: panel ? getComputedStyle(panel).borderRadius : '',
        railWidth: rail ? getComputedStyle(rail).width : '',
        cellHeight: cell ? getComputedStyle(cell).height : ''
      }
    })
    expect(geometry.panelRadius).toBe('24px')
    expect(geometry.railWidth).toBe('188px')
    expect(geometry.cellHeight).toBe('40px')
  })

  test('sidebar menu icons render at the dsw nav size (16px)', async ({ page }) => {
    await page.goto('/')
    const sizes = await page.evaluate(() =>
      [...document.querySelectorAll('.app-sider .ant-menu-item .anticon')].map((el) =>
        Math.round(parseFloat(getComputedStyle(el).fontSize))
      )
    )
    expect(sizes.length).toBeGreaterThan(0)
    for (const size of sizes) expect(size).toBe(16)
  })

  test('ERD toolbar stays reachable while the inspector drawer is open', async ({ page }) => {
    await page.goto('/projects')
    await page.getByRole('button', { name: /New project/i }).first().click()
    const dialog = page.getByRole('dialog')
    await dialog.locator('input').fill('Toolbar Reachability')
    await dialog.getByRole('button', { name: /Create/i }).click()
    await page.getByRole('button', { name: 'Add table' }).click()
    await expect(page.locator('.erd-toolbar--avoid-inspector')).toBeVisible()
    // Toolbar actions must not sit under the mask-less drawer.
    await expect(page.getByRole('button', { name: 'Database' })).toBeVisible()
  })

  test('sidebar: DBLab brand, 280px rail, collapse toggle, Settings at the bottom', async ({
    page
  }) => {
    await page.goto('/')
    // Brand renamed to DBLab.
    await expect(page.locator('.app-logo__text')).toHaveText('DBLab')
    // Harness-width rail (280px).
    const siderWidth = await page.evaluate(() =>
      Math.round(document.querySelector('.app-sider')!.getBoundingClientRect().width)
    )
    expect(siderWidth).toBe(280)
    // Settings lives in the foot area, not in the menu.
    await expect(page.locator('.app-sider__settings')).toBeVisible()
    expect(await page.locator('.ant-menu-item').filter({ hasText: 'Settings' }).count()).toBe(0)
    // Collapse to the 56px rail and expand again via the brand button.
    await page.getByRole('button', { name: 'Collapse sidebar' }).click()
    await expect
      .poll(() =>
        page.evaluate(() =>
          Math.round(document.querySelector('.app-sider')!.getBoundingClientRect().width)
        )
      )
      .toBe(56)
    await page.getByRole('button', { name: 'Expand sidebar' }).click()
    await expect
      .poll(() =>
        page.evaluate(() =>
          Math.round(document.querySelector('.app-sider')!.getBoundingClientRect().width)
        )
      )
      .toBe(280)
  })

  test('header shows the Database Management Labs title and a version tag', async ({ page }) => {
    await page.goto('/')
    await expect(page.locator('.app-header__title')).toHaveText('Database Management Labs')
    const version = await page.locator('.app-header__version').textContent()
    expect((version ?? '').trim()).toMatch(/^v\d+\.\d+\.\d+$/)
    // The same tag is reported in Settings > General.
    await page.goto('/settings')
    await expect(page.getByText(`v${version!.trim().slice(1)}`).first()).toBeVisible()
  })
})
