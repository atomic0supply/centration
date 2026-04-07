import { Card } from '@/components/ui'

export function Scan() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>
          Escanear
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Captura tickets, facturas y productos.
        </p>
      </div>
      <Card>
        <p style={{ color: 'var(--text-muted)', fontSize: 14 }}>
          El escáner de cámara y OCR se implementará en la siguiente fase.
        </p>
      </Card>
    </div>
  )
}
