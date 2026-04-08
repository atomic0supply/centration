import { httpsCallable } from 'firebase/functions'

import type {
  RefreshPortfolioQuotesRequest,
  RefreshPortfolioQuotesResponse,
  UpsertInvestmentTransactionRequest,
  UpsertInvestmentTransactionResponse,
} from '@/types/investment'

import { functions } from './firebase'

const upsertInvestmentTransactionCallable = httpsCallable<
  UpsertInvestmentTransactionRequest,
  UpsertInvestmentTransactionResponse
>(functions, 'upsertInvestmentTransaction')

const refreshPortfolioQuotesCallable = httpsCallable<
  RefreshPortfolioQuotesRequest,
  RefreshPortfolioQuotesResponse
>(functions, 'refreshPortfolioQuotes')

export async function upsertInvestmentTransaction(
  payload: UpsertInvestmentTransactionRequest,
): Promise<UpsertInvestmentTransactionResponse> {
  const response = await upsertInvestmentTransactionCallable(payload)
  return response.data
}

export async function refreshPortfolioQuotes(
  payload: RefreshPortfolioQuotesRequest = {},
): Promise<RefreshPortfolioQuotesResponse> {
  const response = await refreshPortfolioQuotesCallable(payload)
  return response.data
}
