export type VoiceInventoryAction = 'add' | 'consume' | 'delete' | 'query'

export interface VoiceInventoryCommand {
  action: VoiceInventoryAction
  item: string
  quantity: number
  unit?: 'ud' | 'kg' | 'g' | 'l' | 'ml' | null
  confidence: number
}

export type VoiceInventoryStatus =
  | 'created'
  | 'updated'
  | 'consumed'
  | 'depleted'
  | 'deleted'
  | 'found'
  | 'not_found'

export interface VoiceInventoryResult {
  status: VoiceInventoryStatus
  itemName: string
  remainingQuantity: number | null
  unit: string | null
}

export interface VoiceInventoryResponse {
  ok: boolean
  reason?: 'LOW_CONFIDENCE'
  transcript: string
  command: VoiceInventoryCommand
  result: VoiceInventoryResult | null
}

