import { ProgressRing, SkeletonCard } from '@/components/ui'

export function Dashboard() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>
          Dashboard
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          Bienvenido de vuelta — aquí tienes tu resumen del día.
        </p>
      </div>

      {/* Metric cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: 'var(--space-4)' }}>
        {[
          { label: 'Gastos este mes', value: '€1,240', sub: '+12% vs anterior', ring: 68, color: 'var(--accent-light)' },
          { label: 'Presupuesto restante', value: '€760', sub: 'de €2,000', ring: 38, color: 'var(--success)' },
          { label: 'Tareas hogar', value: '3 pendientes', sub: '7 completadas', ring: 70, color: 'var(--info)' },
        ].map((m) => (
          <div
            key={m.label}
            style={{
              background: 'var(--surface)',
              border: '1px solid var(--border)',
              borderRadius: 'var(--radius-lg)',
              padding: 'var(--space-5)',
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--space-4)',
            }}
          >
            <ProgressRing value={m.ring} size={64} strokeWidth={5} color={m.color} />
            <div>
              <p style={{ fontSize: 12, color: 'var(--text-muted)', marginBottom: 2 }}>{m.label}</p>
              <p style={{ fontSize: 18, fontWeight: 700 }}>{m.value}</p>
              <p style={{ fontSize: 12, color: 'var(--text-secondary)' }}>{m.sub}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Skeleton placeholders for upcoming widgets */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: 'var(--space-4)' }}>
        <SkeletonCard />
        <SkeletonCard />
      </div>
    </div>
  )
}
