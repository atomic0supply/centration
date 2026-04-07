import { AnimatePresence, motion } from 'framer-motion'

interface ScannerOverlayProps {
  active: boolean
  progress?: number
}

function CornerBracket({
  position,
}: {
  position: 'tl' | 'tr' | 'bl' | 'br'
}) {
  const isTop = position[0] === 't'
  const isLeft = position[1] === 'l'
  const size = 24
  const thickness = 2.5

  return (
    <motion.div
      style={{
        position: 'absolute',
        width: size,
        height: size,
        ...(isTop ? { top: 14 } : { bottom: 14 }),
        ...(isLeft ? { left: 14 } : { right: 14 }),
        borderTop: isTop ? `${thickness}px solid var(--accent-light)` : 'none',
        borderBottom: !isTop ? `${thickness}px solid var(--accent-light)` : 'none',
        borderLeft: isLeft ? `${thickness}px solid var(--accent-light)` : 'none',
        borderRight: !isLeft ? `${thickness}px solid var(--accent-light)` : 'none',
        filter: 'drop-shadow(0 0 5px rgba(159, 103, 255, 0.8))',
      }}
      animate={{ opacity: [1, 0.55, 1] }}
      transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
    />
  )
}

export function ScannerOverlay({ active, progress }: ScannerOverlayProps) {
  return (
    <AnimatePresence>
      {active && (
        <motion.div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: 'inherit',
            overflow: 'hidden',
            pointerEvents: 'none',
          }}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.25 }}
        >
          {/* Dark tint */}
          <div
            style={{
              position: 'absolute',
              inset: 0,
              background: 'rgba(0, 0, 0, 0.45)',
            }}
          />

          {/* Corner brackets */}
          <CornerBracket position="tl" />
          <CornerBracket position="tr" />
          <CornerBracket position="bl" />
          <CornerBracket position="br" />

          {/* Laser sweep line */}
          <motion.div
            style={{
              position: 'absolute',
              left: '6%',
              right: '6%',
              height: 2,
              background:
                'linear-gradient(90deg, transparent, rgba(159,103,255,0.5) 15%, var(--accent-light) 50%, rgba(159,103,255,0.5) 85%, transparent)',
              boxShadow: '0 0 16px 5px rgba(159, 103, 255, 0.55)',
            }}
            animate={{ top: ['7%', '93%'] }}
            transition={{
              duration: 1.6,
              repeat: Infinity,
              repeatType: 'reverse',
              ease: 'easeInOut',
            }}
          />

          {/* Status label */}
          <div
            style={{
              position: 'absolute',
              bottom: 14,
              left: 0,
              right: 0,
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 6,
            }}
          >
            <motion.div
              style={{
                width: 6,
                height: 6,
                borderRadius: '50%',
                background: 'var(--accent-light)',
                boxShadow: '0 0 8px var(--accent-light)',
              }}
              animate={{ opacity: [1, 0.3, 1] }}
              transition={{ duration: 0.8, repeat: Infinity }}
            />
            <span
              style={{
                fontSize: 12,
                fontWeight: 500,
                color: 'white',
                fontFamily: 'var(--font-sans)',
                textShadow: '0 1px 6px rgba(0,0,0,0.9)',
                letterSpacing: '0.02em',
              }}
            >
              {(progress ?? 0) < 100 ? `Subiendo ${progress ?? 0}%` : 'Procesando…'}
            </span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
