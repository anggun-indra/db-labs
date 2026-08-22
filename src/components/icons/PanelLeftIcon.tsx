/**
 * PanelLeftIcon — the sidebar panel-toggle glyph used by the DeepSeek harness
 * (its IconPanelLeftOutline16): a rounded frame with a divided left panel.
 * Rendered from currentColor so it inherits the button's color.
 */
export function PanelLeftIcon({ size = 18 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      role="img"
      aria-hidden="true"
      style={{ display: 'block' }}
    >
      <rect x="3" y="4" width="18" height="16" rx="3" />
      <path d="M9 4v16" />
    </svg>
  )
}
