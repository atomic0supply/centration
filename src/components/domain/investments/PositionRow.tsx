import { Button, Card } from '@/components/ui'
import type { Investment } from '@/types/investment'
import { formatCurrency, formatDate } from '@/utils/formatters'

import styles from './PositionRow.module.css'

interface PositionRowProps {
  investment: Investment
  onAddTransaction: (investment: Investment) => void
  onEditAlerts: (investment: Investment) => void
  onDelete: (investment: Investment) => void
}

function formatSigned(value: number, currency: string): string {
  const sign = value > 0 ? '+' : ''
  return `${sign}${formatCurrency(value, currency)}`
}

function pnlClassName(value: number): string {
  if (value > 0) return styles.positive
  if (value < 0) return styles.negative
  return ''
}

export function PositionRow({
  investment,
  onAddTransaction,
  onEditAlerts,
  onDelete,
}: PositionRowProps) {
  return (
    <Card className={styles.row}>
      <div className={styles.main}>
        <div className={styles.symbolWrap}>
          <div className={styles.symbol}>{investment.displayTicker}</div>
          <div className={styles.meta}>
            {investment.type.toUpperCase()} · {investment.market}
          </div>
          {investment.stalePrice && (
            <span className={styles.staleBadge} data-testid="stale-badge">
              Precio desactualizado
            </span>
          )}
        </div>

        <div className={styles.metrics}>
          <div>
            <div className={styles.metricLabel}>Cantidad</div>
            <div className={styles.metricValue}>{investment.quantity.toFixed(6).replace(/\.?(0+)$/, '')}</div>
          </div>
          <div>
            <div className={styles.metricLabel}>Precio medio</div>
            <div className={styles.metricValue}>{formatCurrency(investment.avgBuyPrice, investment.currency)}</div>
          </div>
          <div>
            <div className={styles.metricLabel}>Valor actual</div>
            <div className={styles.metricValue}>{formatCurrency(investment.currentValue, investment.currency)}</div>
          </div>
          <div>
            <div className={styles.metricLabel}>P&L realizado</div>
            <div className={`${styles.metricValue} ${pnlClassName(investment.realizedPnl)}`}>
              {formatSigned(investment.realizedPnl, investment.currency)}
            </div>
          </div>
          <div>
            <div className={styles.metricLabel}>P&L no realizado</div>
            <div className={`${styles.metricValue} ${pnlClassName(investment.unrealizedPnl)}`}>
              {formatSigned(investment.unrealizedPnl, investment.currency)}
            </div>
          </div>
          <div>
            <div className={styles.metricLabel}>P&L total</div>
            <div className={`${styles.metricValue} ${pnlClassName(investment.totalPnl)}`}>
              {formatSigned(investment.totalPnl, investment.currency)}
            </div>
          </div>
          <div>
            <div className={styles.metricLabel}>ROI</div>
            <div className={`${styles.metricValue} ${pnlClassName(investment.roiPct)}`}>
              {investment.roiPct.toFixed(2)}%
            </div>
          </div>
        </div>
      </div>

      <div className={styles.footer}>
        <div className={styles.updated}>
          Actualizado:{' '}
          {investment.priceUpdatedAt
            ? formatDate(investment.priceUpdatedAt, {
                day: '2-digit',
                month: '2-digit',
                hour: '2-digit',
                minute: '2-digit',
              })
            : '—'}
        </div>
        <div className={styles.actions}>
          <Button size="sm" variant="secondary" onClick={() => { onAddTransaction(investment); }}>
            Añadir tx
          </Button>
          <Button size="sm" variant="ghost" onClick={() => { onEditAlerts(investment); }}>
            Alertas
          </Button>
          <Button size="sm" variant="danger" onClick={() => { onDelete(investment); }}>
            Eliminar
          </Button>
        </div>
      </div>
    </Card>
  )
}
