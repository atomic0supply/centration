import { useState } from 'react'

import { Button, Input } from '@/components/ui'
import type { InvestmentCurrency, InvestmentType } from '@/types/investment'

import styles from './InvestmentForm.module.css'

export interface InvestmentFormData {
  symbol: string
  displayTicker: string
  type: InvestmentType
  market: string
  currency: InvestmentCurrency
}

interface InvestmentFormProps {
  onSubmit: (data: InvestmentFormData) => Promise<void> | void
  onCancel: () => void
  loading?: boolean
}

export function InvestmentForm({ onSubmit, onCancel, loading }: InvestmentFormProps) {
  const [symbol, setSymbol] = useState('')
  const [displayTicker, setDisplayTicker] = useState('')
  const [type, setType] = useState<InvestmentType>('stock')
  const [market, setMarket] = useState('US')
  const [currency, setCurrency] = useState<InvestmentCurrency>('USD')

  const canSubmit = symbol.trim().length > 0 && displayTicker.trim().length > 0

  return (
    <form
      className={styles.form}
      onSubmit={(e) => {
        e.preventDefault()
        if (!canSubmit) return
        void onSubmit({
          symbol: symbol.trim(),
          displayTicker: displayTicker.trim(),
          type,
          market: market.trim(),
          currency,
        })
      }}
    >
      <Input
        label="Símbolo Finnhub"
        placeholder="AAPL o BINANCE:BTCUSDT"
        value={symbol}
        onChange={(e) => {
          setSymbol(e.target.value)
          if (!displayTicker) setDisplayTicker(e.target.value)
        }}
      />

      <Input
        label="Ticker visible"
        placeholder="AAPL"
        value={displayTicker}
        onChange={(e) => { setDisplayTicker(e.target.value); }}
      />

      <div className={styles.row}>
        <label className={styles.field}>
          <span className={styles.label}>Tipo</span>
          <select value={type} onChange={(e) => { setType(e.target.value as InvestmentType); }}>
            <option value="stock">Acción</option>
            <option value="etf">ETF</option>
            <option value="crypto">Crypto</option>
          </select>
        </label>

        <Input
          label="Mercado"
          placeholder="US"
          value={market}
          onChange={(e) => { setMarket(e.target.value); }}
        />
      </div>

      <label className={styles.field}>
        <span className={styles.label}>Moneda</span>
        <select value={currency} onChange={(e) => { setCurrency(e.target.value as InvestmentCurrency); }}>
          <option value="USD">USD</option>
          <option value="EUR">EUR</option>
        </select>
      </label>

      <div className={styles.actions}>
        <Button variant="ghost" type="button" onClick={onCancel}>
          Cancelar
        </Button>
        <Button type="submit" loading={loading} disabled={!canSubmit}>
          Guardar posición
        </Button>
      </div>
    </form>
  )
}
