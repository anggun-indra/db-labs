import { theme as antdTheme, type ThemeConfig } from 'antd'

/**
 * Maps the DeepSeek design tokens (src/styles/dsw/tokens.css, extracted from
 * @deepseek-ai/dsh-client-ui-theme) onto Ant Design so the component library
 * renders with the harness look in both light and dark mode.
 *
 * Anchor values (from the dsw static palette):
 *   light: bg #ffffff (neutral-bluish-00), text #0f1115 (bluish-1000),
 *          primary deepseek-500 #4176e6, borders rgba(0,0,0,.10/.04)
 *   dark:  bg #151517 (bluish-950), text #f9fafb (bluish-50),
 *          primary deepseek-450 #5686fe, borders rgba(255,255,255,.12/.06)
 */

export const DSW_FONT_FAMILY =
  '-apple-system, BlinkMacSystemFont, "Segoe UI", "PingFang SC", "Hiragino Sans GB", "Microsoft YaHei", "Helvetica Neue", Helvetica, Arial, sans-serif'

export function buildDswThemeConfig(isDark: boolean): ThemeConfig {
  return {
    algorithm: isDark ? antdTheme.darkAlgorithm : antdTheme.defaultAlgorithm,
    token: {
      colorPrimary: isDark ? '#5686fe' : '#4176e6',
      colorInfo: isDark ? '#5686fe' : '#4176e6',
      colorLink: isDark ? '#5686fe' : '#4176e6',
      colorBgBase: isDark ? '#151517' : '#ffffff',
      colorTextBase: isDark ? '#f9fafb' : '#0f1115',
      colorTextSecondary: isDark ? '#cfd3d6' : '#61666b',
      colorTextTertiary: isDark ? '#adb2b8' : '#81858c',
      colorBorder: isDark ? 'rgba(255,255,255,0.12)' : 'rgba(0,0,0,0.10)',
      colorBorderSecondary: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.04)',
      colorSuccess: isDark ? '#4ed17e' : '#22c55e',
      colorWarning: isDark ? '#f7ad31' : '#f59e0b',
      colorError: isDark ? '#ff5555' : '#bb0000',
      borderRadius: 8,
      borderRadiusLG: 12,
      fontFamily: DSW_FONT_FAMILY,
      controlHeight: 34,
      boxShadow: isDark
        ? '0 2px 4px 0 rgba(0,0,0,0.35)'
        : '0 2px 4px 0 rgba(0,0,0,0.05)',
      boxShadowSecondary: isDark
        ? '0 4px 12px 0 rgba(0,0,0,0.4)'
        : '0 4px 12px 0 rgba(0,0,0,0.05), 0 2px 8px 0 rgba(0,0,0,0.04)'
    },
    components: {
      Layout: {
        headerBg: 'transparent',
        siderBg: 'transparent',
        bodyBg: 'transparent',
        headerHeight: 52,
        headerPadding: '0 20px'
      },
      Menu: {
        itemBg: 'transparent',
        subMenuItemBg: 'transparent',
        itemSelectedBg: isDark ? 'rgba(38,49,72,0.45)' : 'rgba(38,49,72,0.10)',
        itemSelectedColor: isDark ? '#f9fafb' : '#0f1115',
        itemHoverBg: isDark ? 'rgba(255,255,255,0.06)' : 'rgba(15,17,21,0.05)',
        itemBorderRadius: 8,
        iconSize: 16
      },
      Card: {
        borderRadiusLG: 12
      },
      Button: {
        borderRadius: 8,
        controlHeight: 34
      },
      Modal: {
        borderRadiusLG: 12
      }
    }
  }
}
