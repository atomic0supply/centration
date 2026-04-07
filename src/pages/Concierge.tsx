import { Card } from '@/components/ui'

export function Concierge() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>
          Conserje IA
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Tu asistente personal inteligente.
        </p>
      </div>
      <Card>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          El chat con IA y procesamiento de consultas se implementará en la siguiente fase.
        </p>
      </Card>
    </div>
  )
}
