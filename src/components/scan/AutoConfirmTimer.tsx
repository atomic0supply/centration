import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'

import { Button } from '@/components/ui'
import { ProgressRing } from '@/components/ui/ProgressRing'

interface AutoConfirmTimerProps {
  seconds?: number
  onConfirm: () => void
  onCancel: () => void
}

export function AutoConfirmTimer({ seconds = 5, onConfirm, onCancel }: AutoConfirmTimerProps) {
  const [remaining, setRemaining] = useState(seconds)

  useEffect(() => {
    if (remaining <= 0) {
      onConfirm()
      return
    }
    const t = setTimeout(() => { setRemaining((r) => r - 1) }, 1000)
    return () => { clearTimeout(t) }
  }, [remaining, onConfirm])

  const value = (remaining / seconds) * 100

  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: 'var(--space-2)',
        padding: 'var(--space-4)',
        borderTop: '1px solid var(--border)',
      }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-3)' }}>
        <ProgressRing
          value={value}
          size={44}
          strokeWidth={4}
          color="var(--accent-light)"
          trackColor="rgba(255,255,255,0.08)"
          showLabel
          label={String(remaining)}
          animated={false}
        />
        <div>
          <p style={{ fontSize: 13, fontWeight: 500, color: 'var(--text-primary)' }}>
            Guardando automáticamente…
          </p>
          <p style={{ fontSize: 12, color: 'var(--text-muted)' }}>
            Toca Cancelar para revisar
          </p>
        </div>
      </div>

      <Button variant="ghost" size="sm" onClick={onCancel}>
        Cancelar
      </Button>
    </motion.div>
  )
}
