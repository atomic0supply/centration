import { forwardRef, type HTMLAttributes, type ReactNode } from 'react'

export interface GlassmorphismCardProps extends HTMLAttributes<HTMLDivElement> {
  children: ReactNode
  intensity?: 'subtle' | 'medium' | 'strong'
  accentBorder?: boolean
}

const intensityMap = {
  subtle: { bg: 'rgba(255,255,255,0.03)', blur: '8px', border: 'rgba(255,255,255,0.08)' },
  medium: { bg: 'rgba(255,255,255,0.06)', blur: '12px', border: 'rgba(255,255,255,0.12)' },
  strong: { bg: 'rgba(255,255,255,0.10)', blur: '20px', border: 'rgba(255,255,255,0.18)' },
}

export const GlassmorphismCard = forwardRef<HTMLDivElement, GlassmorphismCardProps>(
  ({ children, intensity = 'medium', accentBorder = false, style, className = '', ...props }, ref) => {
    const { bg, blur, border } = intensityMap[intensity]

    return (
      <div
        ref={ref}
        className={className}
        style={{
          background: bg,
          backdropFilter: `blur(${blur})`,
          WebkitBackdropFilter: `blur(${blur})`,
          border: `1px solid ${accentBorder ? 'var(--accent-border)' : border}`,
          borderRadius: 'var(--radius-xl)',
          boxShadow: accentBorder ? 'var(--shadow-glow)' : 'var(--shadow-md)',
          ...style,
        }}
        {...props}
      >
        {children}
      </div>
    )
  },
)

GlassmorphismCard.displayName = 'GlassmorphismCard'
