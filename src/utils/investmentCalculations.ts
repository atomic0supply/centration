import type { Investment } from '@/types/investment'

export interface PortfolioTotals {
  totalValue: number
  totalCostBasis: number
  realizedPnl: number
  unrealizedPnl: number
  totalPnl: number
  roiPct: number
}

export function calculatePortfolioTotals(investments: Investment[]): PortfolioTotals {
  const totalValue = investments.reduce((sum, row) => sum + row.currentValue, 0)
  const totalCostBasis = investments.reduce((sum, row) => sum + row.costBasis, 0)
  const realizedPnl = investments.reduce((sum, row) => sum + row.realizedPnl, 0)
  const unrealizedPnl = investments.reduce((sum, row) => sum + row.unrealizedPnl, 0)
  const totalPnl = realizedPnl + unrealizedPnl
  const roiPct = totalCostBasis > 0 ? (totalPnl / totalCostBasis) * 100 : 0

  return {
    totalValue,
    totalCostBasis,
    realizedPnl,
    unrealizedPnl,
    totalPnl,
    roiPct,
  }
}

export function calculateDiversificationByType(investments: Investment[]): {
  crypto: number
  stock: number
  etf: number
} {
  return investments.reduce(
    (acc, row) => {
      acc[row.type] += row.currentValue
      return acc
    },
    { crypto: 0, stock: 0, etf: 0 },
  )
}

export function isStaleInvestment(investment: Investment): boolean {
  return investment.stalePrice || investment.currentPrice === null
}
