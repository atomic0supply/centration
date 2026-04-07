import { useCallback, useEffect, useRef, useState } from 'react'

import { sendVoiceInventoryCommand } from '@/services/voiceInventoryService'
import type { VoiceInventoryResponse } from '@/types/voice'

export type VoiceFlowState =
  | 'idle'
  | 'listening'
  | 'processing'
  | 'success'
  | 'error'

function getSpeechRecognitionCtor(): SpeechRecognitionConstructor | null {
  if (typeof window === 'undefined') return null
  return window.SpeechRecognition ?? window.webkitSpeechRecognition ?? null
}

function buildSpeechErrorMessage(errorCode: SpeechRecognitionErrorEvent['error']): string {
  switch (errorCode) {
    case 'not-allowed':
    case 'service-not-allowed':
      return 'No tengo permisos de micrófono. Actívalos en el navegador.'
    case 'no-speech':
      return 'No se detectó voz. Inténtalo de nuevo.'
    case 'audio-capture':
      return 'No pude acceder al micrófono.'
    default:
      return 'Error al reconocer la voz.'
  }
}

export interface UseVoiceInventory {
  isSupported: boolean
  state: VoiceFlowState
  transcript: string
  response: VoiceInventoryResponse | null
  errorMessage: string | null
  startListening: () => void
  stopListening: () => void
  toggleListening: () => void
  reset: () => void
}

export function useVoiceInventory(locale = 'es-ES'): UseVoiceInventory {
  const recognitionRef = useRef<SpeechRecognition | null>(null)
  const hadRecognitionErrorRef = useRef(false)
  const finalTranscriptRef = useRef('')
  const interimTranscriptRef = useRef('')

  const [state, setState] = useState<VoiceFlowState>('idle')
  const [transcript, setTranscript] = useState('')
  const [response, setResponse] = useState<VoiceInventoryResponse | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const isSupported = Boolean(getSpeechRecognitionCtor())

  const reset = useCallback(() => {
    setState('idle')
    setTranscript('')
    setResponse(null)
    setErrorMessage(null)
    finalTranscriptRef.current = ''
    interimTranscriptRef.current = ''
  }, [])

  const stopListening = useCallback(() => {
    recognitionRef.current?.stop()
  }, [])

  const processTranscript = useCallback(
    async (spokenText: string) => {
      setState('processing')
      try {
        const data = await sendVoiceInventoryCommand(spokenText, locale)
        setResponse(data)
        setState(data.ok ? 'success' : 'error')
        if (!data.ok && data.reason === 'LOW_CONFIDENCE') {
          setErrorMessage('No entendí bien el comando. Repite la frase de forma más concreta.')
          return
        }
        setErrorMessage(null)
      } catch {
        setState('error')
        setErrorMessage('No pude enviar el comando de voz al servidor.')
      }
    },
    [locale],
  )

  const startListening = useCallback(() => {
    const SpeechRecognitionCtor = getSpeechRecognitionCtor()
    if (!SpeechRecognitionCtor) {
      setState('error')
      setErrorMessage('Este navegador no soporta reconocimiento de voz.')
      return
    }

    hadRecognitionErrorRef.current = false
    finalTranscriptRef.current = ''
    interimTranscriptRef.current = ''
    setTranscript('')
    setResponse(null)
    setErrorMessage(null)

    const recognition = new SpeechRecognitionCtor()
    recognitionRef.current = recognition
    recognition.lang = locale
    recognition.continuous = false
    recognition.interimResults = true
    recognition.maxAlternatives = 1

    recognition.onstart = () => {
      setState('listening')
    }

    recognition.onresult = (event) => {
      let interim = ''

      for (let i = event.resultIndex; i < event.results.length; i += 1) {
        const value = event.results[i][0].transcript.trim()
        if (!value) continue
        if (event.results[i].isFinal) {
          finalTranscriptRef.current = [finalTranscriptRef.current, value]
            .filter(Boolean)
            .join(' ')
            .trim()
        } else {
          interim = `${interim} ${value}`.trim()
        }
      }

      interimTranscriptRef.current = interim
      setTranscript([finalTranscriptRef.current, interim].filter(Boolean).join(' ').trim())
    }

    recognition.onerror = (event) => {
      hadRecognitionErrorRef.current = true
      setState('error')
      setErrorMessage(buildSpeechErrorMessage(event.error))
    }

    recognition.onend = () => {
      recognitionRef.current = null
      if (hadRecognitionErrorRef.current) return

      const spokenText = [finalTranscriptRef.current, interimTranscriptRef.current]
        .filter(Boolean)
        .join(' ')
        .trim()

      if (!spokenText) {
        setState('idle')
        return
      }

      void processTranscript(spokenText)
    }

    recognition.start()
  }, [locale, processTranscript])

  const toggleListening = useCallback(() => {
    if (state === 'listening') {
      stopListening()
      return
    }
    startListening()
  }, [startListening, state, stopListening])

  useEffect(() => {
    return () => {
      recognitionRef.current?.stop()
      recognitionRef.current = null
    }
  }, [])

  return {
    isSupported,
    state,
    transcript,
    response,
    errorMessage,
    startListening,
    stopListening,
    toggleListening,
    reset,
  }
}
