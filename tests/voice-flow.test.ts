import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import { useVoiceInventory } from '@/hooks/useVoiceInventory'
import { sendVoiceInventoryCommand } from '@/services/voiceInventoryService'
import type { VoiceInventoryResponse } from '@/types/voice'

vi.mock('@/services/voiceInventoryService', () => ({
  sendVoiceInventoryCommand: vi.fn(),
}))

class MockSpeechRecognition {
  static instances: MockSpeechRecognition[] = []

  lang = 'es-ES'
  continuous = false
  interimResults = false
  maxAlternatives = 1

  onstart: ((this: SpeechRecognition, ev: Event) => unknown) | null = null
  onresult: ((this: SpeechRecognition, ev: SpeechRecognitionEvent) => unknown) | null = null
  onerror: ((this: SpeechRecognition, ev: SpeechRecognitionErrorEvent) => unknown) | null = null
  onend: ((this: SpeechRecognition, ev: Event) => unknown) | null = null

  constructor() {
    MockSpeechRecognition.instances.push(this)
  }

  start() {
    this.onstart?.call(this as unknown as SpeechRecognition, new Event('start'))
  }

  stop() {
    this.onend?.call(this as unknown as SpeechRecognition, new Event('end'))
  }

  emitResult(transcript: string, isFinal = true) {
    const alternative = {
      transcript,
      confidence: 0.9,
    }

    const result = {
      0: alternative,
      isFinal,
      length: 1,
      item: () => alternative,
    }

    const results = {
      0: result,
      length: 1,
      item: () => result,
    }

    const event = {
      resultIndex: 0,
      results,
    } as unknown as SpeechRecognitionEvent

    this.onresult?.call(this as unknown as SpeechRecognition, event)
  }

  emitError(error: SpeechRecognitionErrorEvent['error']) {
    const event = {
      error,
      message: error,
    } as SpeechRecognitionErrorEvent

    this.onerror?.call(this as unknown as SpeechRecognition, event)
  }

  finish() {
    this.onend?.call(this as unknown as SpeechRecognition, new Event('end'))
  }

  static latest(): MockSpeechRecognition {
    const instance = MockSpeechRecognition.instances.at(-1)
    if (!instance) throw new Error('No speech recognition instance created')
    return instance
  }
}

describe('useVoiceInventory', () => {
  const mockedSend = vi.mocked(sendVoiceInventoryCommand)

  beforeEach(() => {
    mockedSend.mockReset()
    MockSpeechRecognition.instances = []
    Object.defineProperty(window, 'SpeechRecognition', {
      value: undefined,
      configurable: true,
      writable: true,
    })
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      value: MockSpeechRecognition,
      configurable: true,
      writable: true,
    })
  })

  it('marca soporte no disponible si no hay Speech API', () => {
    Object.defineProperty(window, 'webkitSpeechRecognition', {
      value: undefined,
      configurable: true,
      writable: true,
    })

    const { result } = renderHook(() => useVoiceInventory())

    expect(result.current.isSupported).toBe(false)
  })

  it('captura voz, envía transcript y devuelve éxito', async () => {
    const response: VoiceInventoryResponse = {
      ok: true,
      transcript: 'He terminado el cafe',
      command: {
        action: 'consume',
        item: 'cafe',
        quantity: 1,
        unit: 'ud',
        confidence: 0.93,
      },
      result: {
        status: 'consumed',
        itemName: 'Cafe molido',
        remainingQuantity: 2,
        unit: 'ud',
      },
    }

    mockedSend.mockResolvedValue(response)

    const { result } = renderHook(() => useVoiceInventory('es-ES'))

    act(() => {
      result.current.startListening()
    })

    expect(result.current.state).toBe('listening')

    const speech = MockSpeechRecognition.latest()
    act(() => {
      speech.emitResult('He terminado el cafe', true)
      speech.finish()
    })

    await waitFor(() => {
      expect(mockedSend).toHaveBeenCalledWith('He terminado el cafe', 'es-ES')
    })

    await waitFor(() => {
      expect(result.current.state).toBe('success')
    })

    expect(result.current.response).toEqual(response)
  })

  it('maneja errores de permisos de micrófono', async () => {
    const { result } = renderHook(() => useVoiceInventory('es-ES'))

    act(() => {
      result.current.startListening()
    })

    const speech = MockSpeechRecognition.latest()
    act(() => {
      speech.emitError('not-allowed')
      speech.finish()
    })

    await waitFor(() => {
      expect(result.current.state).toBe('error')
    })

    expect(result.current.errorMessage).toMatch(/permisos/i)
  })

  it('muestra error cuando Gemini devuelve baja confianza', async () => {
    mockedSend.mockResolvedValue({
      ok: false,
      reason: 'LOW_CONFIDENCE',
      transcript: 'una cosa rara',
      command: {
        action: 'query',
        item: 'desconocido',
        quantity: 1,
        unit: 'ud',
        confidence: 0.42,
      },
      result: null,
    })

    const { result } = renderHook(() => useVoiceInventory('es-ES'))

    act(() => {
      result.current.startListening()
    })

    const speech = MockSpeechRecognition.latest()
    act(() => {
      speech.emitResult('una cosa rara', true)
      speech.finish()
    })

    await waitFor(() => {
      expect(result.current.state).toBe('error')
    })

    expect(result.current.errorMessage).toMatch(/No entend/i)
  })
})
