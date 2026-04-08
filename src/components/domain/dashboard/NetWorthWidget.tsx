import { useEffect } from 'react'

import { useAssetsStore } from '@/stores/assetsStore'
import { useInvestmentsStore } from '@/stores/investmentsStore'
import { useUserFinanceStore } from '@/stores/userFinanceStore'
import { formatCurrency } from '@/utils/formatters'

import styles from './widgets.module.css'

export function NetWorthWidget() {
  const { totals } = useInvestmentsStore()
  const { assets } = useAssetsStore()
  const { liquidCash, debts, init } = useUserFinanceStore()

  useEffect(() => {
    void init()
  }, [init])

  const { totalValue } = totals()
  const assetsValue = assets.reduce((sum, a) => sum + a.currentValue, 0)
  const netWorth = totalValue + assetsValue + liquidCash - debts
  const isPositive = netWorth >= 0

  return (
    <div className={styles.widget}>
      <div className={styles.header}>
        <span className={styles.title}>Patrimonio Neto</span>
        <span className={styles.icon}>🏛️</span>
      </div>

      <div className={`${styles.bigValue} ${isPositive ? styles.positive : styles.negative}`}>
        {formatCurrency(netWorth)}
      </div>

      <div className={styles.rows}>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Inversiones</span>
          <span className={styles.rowValue}>{formatCurrency(totalValue)}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Activos</span>
          <span className={styles.rowValue}>{formatCurrency(assetsValue)}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Liquidez</span>
          <span className={styles.rowValue}>{formatCurrency(liquidCash)}</span>
        </div>
        <div className={styles.row}>
          <span className={styles.rowLabel}>Deudas</span>
          <span className={`${styles.rowValue} ${styles.negative}`}>
            -{formatCurrency(debts)}
          </span>
        </div>
      </div>
    </div>
  )
}
