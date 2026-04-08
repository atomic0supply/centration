import { Button, Card } from '@/components/ui'
import type { Investment } from '@/types/investment'
import { INVESTMENT_TYPE_LABELS } from '@/types/investment'
import { formatCurrency, formatDate } from '@/utils/formatters'

interface PositionCardProps {
  investment: Investment
  onAddTransaction: (investment: Investment) => void
  onManageAlerts: (investment: Investment) => void
}

function tone(value: number): string {
  if (value > 0) return 'var(--success)'
  if (value < 0) return 'var(--error)'
  return 'var(--text-primary)'
}

export function PositionCard({ investment, onAddTransaction, onManageAlerts }: PositionCardProps) {
  return (
    <Card style={{ padding: 'var(--space-4)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', gap: 'var(--space-4)' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <h3 style={{ fontSize: 16, margin: 0 }}>{investment.displayTicker}</h3>
            {investment.stalePrice && (
              <span style={{ fontSize: 11, color: 'var(--warning)', border: '1px solid var(--warning)', borderRadius: 999, padding: '2px 6px' }}>
                Precio desactualizado
              </span>
            )}
          </div>
          <p style={{ margin: '4px 0 0', color: 'var(--text-secondary)', fontSize: 12 }}>
            {investment.symbol} · {INVESTMENT_TYPE_LABELS[investment.type]} · {investment.market}
          </p>
          <p style={{ margin: '4px 0 0', color: 'var(--text-muted)', fontSize: 12 }}>
            Última actualización:{' '}
            {investment.priceUpdatedAt ? formatDate(investment.priceUpdatedAt, { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'}
          </p>
        </div>

        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 18, fontWeight: 700 }}>{formatCurrency(investment.currentValue, investment.currency)}</div>
          <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
            Qty {investment.quantity.toFixed(4)} · Avg {formatCurrency(investment.avgBuyPrice, investment.currency)}
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', gap: 'var(--space-3)', marginTop: 'var(--space-4)' }}>
        <div>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 11 }}>Cost basis</p>
          <p style={{ margin: 0 }}>{formatCurrency(investment.costBasis, investment.currency)}</p>
        </div>
        <div>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 11 }}>Realized P&L</p>
          <p style={{ margin: 0, color: tone(investment.realizedPnl) }}>{formatCurrency(investment.realizedPnl, investment.currency)}</p>
        </div>
        <div>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 11 }}>Unrealized P&L</p>
          <p style={{ margin: 0, color: tone(investment.unrealizedPnl) }}>{formatCurrency(investment.unrealizedPnl, investment.currency)}</p>
        </div>
        <div>
          <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: 11 }}>ROI</p>
          <p style={{ margin: 0, color: tone(investment.roiPct) }}>{investment.roiPct.toFixed(2)}%</p>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 'var(--space-2)', marginTop: 'var(--space-4)' }}>
        <Button size="sm" variant="ghost" onClick={() => { onManageAlerts(investment); }}>Alertas</Button>
        <Button size="sm" onClick={() => { onAddTransaction(investment); }}>Nueva transacción</Button>
      </div>
    </Card>
  )
}
