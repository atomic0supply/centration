import { Card } from '@/components/ui'

export function Ledger() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>
          Ledger
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Registro de gastos e ingresos.
        </p>
      </div>
      <Card>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          Las transacciones y gráficas se implementarán en la siguiente fase.
        </p>
      </Card>
    </div>
  )
}
