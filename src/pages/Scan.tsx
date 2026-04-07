import { AnimatePresence, motion } from 'framer-motion'
import { useState } from 'react'

import { type CaptureResult, CameraCapture } from '@/components/camera/CameraCapture'
import { EditTicketForm } from '@/components/scan/EditTicketForm'
import { SummaryCard } from '@/components/scan/SummaryCard'
import { SkeletonCard, SkeletonText } from '@/components/ui'
import { useToast } from '@/hooks/useToast'
import { mockExtractTicket, saveTicket } from '@/services/ticketService'
import type { ExtractedTicket } from '@/types/ticket'

type Stage = 'capture' | 'analyzing' | 'review' | 'editing' | 'saving' | 'done'

export function Scan() {
  const [stage, setStage] = useState<Stage>('capture')
  const [captureResult, setCaptureResult] = useState<CaptureResult | null>(null)
  const [ticket, setTicket] = useState<ExtractedTicket | null>(null)
  const { success, error } = useToast()

  /* ── After image captured + uploaded ── */
  const handleCapture = async (result: CaptureResult) => {
    setCaptureResult(result)
    setStage('analyzing')
    try {
      const extracted = await mockExtractTicket(result.url)
      setTicket(extracted)
      setStage('review')
    } catch {
      error('Error al analizar imagen', 'Intenta de nuevo con una imagen más nítida')
      setStage('capture')
    }
  }

  /* ── Confirm ticket (from SummaryCard or after edit) ── */
  const handleConfirm = async (data?: ExtractedTicket) => {
    const toSave = data ?? ticket
    if (!toSave) return
    setStage('saving')
    try {
      await saveTicket(toSave)
      setStage('done')
      success('Gasto registrado correctamente', `${toSave.store} · ${toSave.total.toLocaleString('es-ES', { style: 'currency', currency: toSave.currency })}`)
    } catch (e) {
      error('Error al guardar', e instanceof Error ? e.message : 'Inténtalo de nuevo')
      setStage('review')
    }
  }

  const reset = () => {
    setCaptureResult(null)
    setTicket(null)
    setStage('capture')
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 'var(--space-6)' }}>
      {/* ── Page header ── */}
      <div>
        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em', marginBottom: 4 }}>
          Escanear
        </h1>
        <p style={{ color: 'var(--text-secondary)', fontSize: 14 }}>
          {stage === 'capture' && 'Captura tickets, facturas y productos.'}
          {stage === 'analyzing' && 'Analizando imagen con IA…'}
          {stage === 'review' && 'Revisa y confirma los datos detectados.'}
          {stage === 'editing' && 'Corrige los datos manualmente.'}
          {stage === 'saving' && 'Guardando en tu ledger…'}
          {stage === 'done' && 'Gasto registrado correctamente.'}
        </p>
      </div>

      <AnimatePresence mode="wait">
        {/* ── 1. Capture ── */}
        {stage === 'capture' && (
          <motion.div key="capture" {...fade}>
            <CameraCapture onCapture={(r) => { void handleCapture(r) }} />
          </motion.div>
        )}

        {/* ── 2. Analyzing skeleton ── */}
        {stage === 'analyzing' && (
          <motion.div
            key="analyzing"
            {...fade}
            style={{
              display: 'flex',
              flexDirection: 'column',
              gap: 'var(--space-4)',
              maxWidth: 520,
              margin: '0 auto',
              width: '100%',
            }}
          >
            {/* Thumbnail of captured image */}
            {captureResult && (
              <div style={{ position: 'relative', borderRadius: 'var(--radius-xl)', overflow: 'hidden', height: 160, border: '1px solid var(--border)' }}>
                <img
                  src={captureResult.url}
                  alt="Analizando"
                  style={{ width: '100%', height: '100%', objectFit: 'cover', filter: 'brightness(0.6)' }}
                />
                <div style={{
                  position: 'absolute', inset: 0,
                  display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                  gap: 'var(--space-3)',
                }}>
                  <motion.div
                    animate={{ opacity: [0.4, 1, 0.4] }}
                    transition={{ duration: 1.4, repeat: Infinity }}
                  >
                    <svg width="28" height="28" viewBox="0 0 24 24" fill="currentColor" style={{ color: 'var(--accent-light)' }}>
                      <path d="M12 2L9.19 8.63 2 9.24l5.46 4.73L5.82 21 12 17.27 18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2z" />
                    </svg>
                  </motion.div>
                  <span style={{ fontSize: 13, fontWeight: 500, color: 'white', textShadow: '0 1px 6px rgba(0,0,0,0.8)' }}>
                    Analizando con IA…
                  </span>
                </div>
              </div>
            )}

            <SkeletonCard />
            <SkeletonText lines={4} />
          </motion.div>
        )}

        {/* ── 3. Review ── */}
        {stage === 'review' && ticket && (
          <motion.div key="review" {...fade}>
            <SummaryCard
              ticket={ticket}
              onConfirm={() => { void handleConfirm() }}
              onEdit={() => { setStage('editing') }}
            />
          </motion.div>
        )}

        {/* ── 4. Edit form ── */}
        {stage === 'editing' && ticket && (
          <motion.div key="editing" {...fade}>
            <EditTicketForm
              ticket={ticket}
              onSave={(updated) => {
                setTicket(updated)
                void handleConfirm(updated)
              }}
              onCancel={() => { setStage('review') }}
            />
          </motion.div>
        )}

        {/* ── 5. Saving ── */}
        {stage === 'saving' && (
          <motion.div
            key="saving"
            {...fade}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              gap: 'var(--space-4)',
              padding: 'var(--space-12)',
            }}
          >
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--accent-light)" strokeWidth="2.5" strokeLinecap="round">
                <path d="M12 2a10 10 0 0 1 10 10" />
              </svg>
            </motion.div>
            <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>Guardando en tu ledger…</p>
          </motion.div>
        )}

        {/* ── 6. Done ── */}
        {stage === 'done' && (
          <motion.div
            key="done"
            {...fade}
            style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              gap: 'var(--space-5)',
              padding: 'var(--space-8)',
              textAlign: 'center',
            }}
          >
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ type: 'spring', stiffness: 400, damping: 18 }}
              style={{
                width: 72, height: 72,
                borderRadius: 'var(--radius-full)',
                background: 'var(--success-bg)',
                border: '1px solid var(--success-border)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}
            >
              <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="var(--success)" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                <polyline points="20 6 9 17 4 12" />
              </svg>
            </motion.div>

            <div>
              <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>
                Gasto registrado
              </h2>
              <p style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                Puedes consultarlo en tu Ledger
              </p>
            </div>

            <div style={{ display: 'flex', gap: 'var(--space-3)', width: '100%', maxWidth: 320 }}>
              <button
                onClick={reset}
                style={{
                  flex: 1, height: 44, borderRadius: 'var(--radius-md)',
                  background: 'var(--accent)', color: 'white', border: 'none',
                  fontFamily: 'var(--font-sans)', fontSize: 14, fontWeight: 500,
                  cursor: 'pointer', transition: 'background var(--transition-base)',
                }}
              >
                Escanear otro
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  )
}

/* Shared fade transition */
const fade = {
  initial: { opacity: 0, y: 8 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -4 },
  transition: { duration: 0.18 },
}
