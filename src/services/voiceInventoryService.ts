import { httpsCallable } from 'firebase/functions'

import type { VoiceInventoryResponse } from '@/types/voice'

import { functions } from './firebase'

interface VoiceInventoryRequest {
  transcript: string
  locale?: string
}

const voiceToInventoryCallable = httpsCallable<VoiceInventoryRequest, VoiceInventoryResponse>(
  functions,
  'voiceToInventory',
)

export async function sendVoiceInventoryCommand(
  transcript: string,
  locale = 'es-ES',
): Promise<VoiceInventoryResponse> {
  const response = await voiceToInventoryCallable({
    transcript,
    locale,
  })

  return response.data
}

