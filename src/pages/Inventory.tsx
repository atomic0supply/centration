import { Card } from '@/components/ui'

export function Inventory() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>
          Hogar
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Inventario y gestión del hogar.
        </p>
      </div>
      <Card>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          El inventario de productos y gestión de habitaciones se implementará en la siguiente fase.
        </p>
      </Card>
    </div>
  )
}
