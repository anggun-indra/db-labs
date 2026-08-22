/**
 * AppLogo — the DBLab brand mark (inline SVG so it stays crisp at any size
 * and inherits nothing theme-dependent; the gradient tile is the brand
 * surface in both light and dark, like the dsh brandMark).
 */
export function AppLogo({ size = 24 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="DBLab logo"
      style={{ flex: 'none', display: 'block' }}
    >
      <defs>
        <linearGradient id="dblab-bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#5686fe" />
          <stop offset="1" stopColor="#4176e6" />
        </linearGradient>
        <linearGradient id="dblab-shine" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffffff" stopOpacity={0.28} />
          <stop offset="1" stopColor="#ffffff" stopOpacity={0} />
        </linearGradient>
      </defs>
      <rect x="2" y="2" width="60" height="60" rx="16" fill="url(#dblab-bg)" />
      <rect x="2" y="2" width="60" height="30" rx="16" fill="url(#dblab-shine)" />
      <g
        fill="none"
        stroke="#ffffff"
        strokeWidth={3.4}
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <ellipse cx="29" cy="19" rx="13" ry="5.2" />
        <path d="M16 19v12.6c0 2.9 5.8 5.2 13 5.2s13-2.3 13-5.2V19" />
        <path d="M16 31.6v12.6c0 2.9 5.8 5.2 13 5.2s13-2.3 13-5.2V31.6" />
      </g>
      <g>
        <path
          d="M44 24l7-5"
          stroke="#ffffff"
          strokeWidth={2.2}
          strokeLinecap="round"
          opacity={0.85}
        />
        <path
          d="M44 36l8 3.4"
          stroke="#ffffff"
          strokeWidth={2.2}
          strokeLinecap="round"
          opacity={0.85}
        />
        <circle cx="53.4" cy="17.4" r="3.6" fill="#ffffff" />
        <circle cx="54.6" cy="40.4" r="3.6" fill="#ffffff" />
        <circle cx="53.4" cy="17.4" r="1.3" fill="#4176e6" />
        <circle cx="54.6" cy="40.4" r="1.3" fill="#4176e6" />
      </g>
    </svg>
  )
}
