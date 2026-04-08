import type { ReactElement } from 'react'
import type { DataOrigin } from '@/types/ticket'

interface DataOriginBadgeProps {
  origin: DataOrigin
  size?: 'sm' | 'md'
  showLabel?: boolean
}

const config: Record<
  DataOrigin,
  { label: string; color: string; bg: string; border: string; icon: ReactElement }
> = {
  ai: {
    label: 'IA',
    color: 'var(--accent-light)',
    bg: 'var(--accent-bg)',
    border: 'var(--accent-border)',
    icon: (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" />
      </svg>
    ),
  },
  scanned: {
    label: 'Escaneado',
    color: 'var(--info)',
    bg: 'var(--info-bg)',
    border: 'var(--info-border)',
    icon: (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
        <circle cx="12" cy="13" r="4" />
      </svg>
    ),
  },
  manual: {
    label: 'Manual',
    color: 'var(--text-secondary)',
    bg: 'rgba(255,255,255,0.06)',
    border: 'var(--border)',
    icon: (
      <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
      </svg>
    ),
  },
}

export function DataOriginBadge({ origin, size = 'sm', showLabel = false }: DataOriginBadgeProps) {
  const { label, color, bg, border, icon } = config[origin]
  const isSm = size === 'sm'

  return (
    <span
      title={label}
      style={{
        display: 'inline-flex',
        alignItems: 'center',
        gap: 4,
        padding: isSm ? '2px 6px' : '3px 8px',
        borderRadius: 'var(--radius-full)',
        background: bg,
        border: `1px solid ${border}`,
        color,
        fontSize: isSm ? 10 : 11,
        fontWeight: 600,
        letterSpacing: '0.03em',
        flexShrink: 0,
        lineHeight: 1,
      }}
    >
      {icon}
      {showLabel && <span>{label}</span>}
    </span>
  )
}
