import { Card } from '@/components/ui'
import { formatCurrency } from '@/utils/formatters'

import styles from './NetWorthCard.module.css'

interface NetWorthCardProps {
  investmentsValue: number
  assetsValue?: number
  liquidCash: number
  debts: number
}

export function NetWorthCard({
  investmentsValue,
  assetsValue = 0,
  liquidCash,
  debts,
}: NetWorthCardProps) {
  const netWorth = investmentsValue + assetsValue + liquidCash - debts

  return (
    <Card className={styles.card}>
      <div className={styles.header}>Patrimonio neto</div>
      <div className={styles.net}>{formatCurrency(netWorth)}</div>

      <div className={styles.rows}>
        <div>
          <span>Inversiones</span>
          <strong>{formatCurrency(investmentsValue)}</strong>
        </div>
        <div>
          <span>Activos físicos</span>
          <strong>{formatCurrency(assetsValue)}</strong>
        </div>
        <div>
          <span>Liquidez</span>
          <strong>{formatCurrency(liquidCash)}</strong>
        </div>
        <div>
          <span>Deudas</span>
          <strong>-{formatCurrency(debts)}</strong>
        </div>
      </div>
    </Card>
  )
}
