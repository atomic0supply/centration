import { httpsCallable } from 'firebase/functions'

import { functions } from './firebase'

/* ── Types ── */

export interface ChefIngredient {
  name: string
  qty: string
  fromInventory: boolean
}

export interface ChefRecipe {
  name: string
  emoji: string
  time: string
  servings: number
  zeroWasteScore: number
  expiringUsed: string[]
  ingredients: ChefIngredient[]
  steps: string[]
  tip: string
}

export interface AiChefResponse {
  recipes: ChefRecipe[]
  expiringItems: string[]
  note?: string
}

export type NutritionalGoal = 'health' | 'savings' | 'sport'

export interface DayPlan {
  day: string
  breakfast: string
  lunch: string
  dinner: string
  snack: string
  estimatedCost: number
  proteinG: number
  carbsG: number
  fatG: number
  kcal: number
}

export interface NutritionalPlanResponse {
  goal: NutritionalGoal
  analysis: {
    summary: string
    strengths: string[]
    improvements: string[]
    monthlyFoodSpend: number
  }
  weekPlan: DayPlan[]
  shoppingNeeds: string[]
  tips: string[]
}

export interface CartItem {
  item: string
  bestStore: string
  estimatedPrice: number
  alternatives: Array<{ store: string; price: number }>
  savingVsAvg: number
  tip: string
}

export interface CartOptimizerResponse {
  optimizedList: CartItem[]
  storeRecommendation: {
    primary: string
    secondary: string
    reason: string
  }
  totalEstimate: number
  totalSavings: number
  generalTips: string[]
}

export interface BreakdownItem {
  concept: string
  amount: number
  type: 'cost' | 'benefit' | 'opportunity_cost'
}

export interface RoiAlternative {
  option: string
  estimatedSaving: number
  pros: string[]
  cons: string[]
}

export interface LifeRoiResponse {
  verdict: string
  verdictEmoji: string
  roiScore: number
  financialImpact: {
    currentAnnualCost: number
    estimatedAnnualBenefit: number
    netRoi: number
    paybackMonths: number | null
  }
  breakdown: BreakdownItem[]
  alternatives: RoiAlternative[]
  recommendation: string
  dataGaps: string[]
}

/* ── Callables ── */

const aiChefCallable = httpsCallable<{ maxRecipes?: number }, AiChefResponse>(
  functions,
  'aiChef',
)

const nutritionalPlannerCallable = httpsCallable<
  { goal: NutritionalGoal; days?: number },
  NutritionalPlanResponse
>(functions, 'nutritionalPlanner')

const cartOptimizerCallable = httpsCallable<{ itemNames: string[] }, CartOptimizerResponse>(
  functions,
  'cartOptimizer',
)

const lifeRoiCallable = httpsCallable<{ query: string }, LifeRoiResponse>(
  functions,
  'lifeRoiAnalyst',
)

/* ── Public API ── */

export async function getZeroWasteRecipes(maxRecipes = 3): Promise<AiChefResponse> {
  const res = await aiChefCallable({ maxRecipes })
  return res.data
}

export async function getNutritionalPlan(
  goal: NutritionalGoal,
  days = 7,
): Promise<NutritionalPlanResponse> {
  const res = await nutritionalPlannerCallable({ goal, days })
  return res.data
}

export async function optimizeCart(itemNames: string[]): Promise<CartOptimizerResponse> {
  const res = await cartOptimizerCallable({ itemNames })
  return res.data
}

export async function analyzeLifeRoi(query: string): Promise<LifeRoiResponse> {
  const res = await lifeRoiCallable({ query })
  return res.data
}
