import { AnimatePresence, motion } from 'framer-motion'
import { type ChangeEvent, useEffect, useRef, useState } from 'react'

import { Button } from '@/components/ui'
import { uploadTicketImage } from '@/services/storageService'
import { compressImage } from '@/utils/imageCompression'

import { ScannerOverlay } from './ScannerOverlay'
import styles from './CameraCapture.module.css'

type Stage = 'idle' | 'camera' | 'preview' | 'processing'

export interface CaptureResult {
  url: string
  path: string
  blob: Blob
  originalSize: number
  compressedSize: number
}

interface CameraCaptureProps {
  onCapture: (result: CaptureResult) => void
  onCancel?: () => void
}

const CamIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
    <circle cx="12" cy="13" r="4" />
  </svg>
)

const GalleryIcon = () => (
  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
    <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
    <circle cx="8.5" cy="8.5" r="1.5" />
    <polyline points="21 15 16 10 5 21" />
  </svg>
)

const CloseIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
    <line x1="18" y1="6" x2="6" y2="18" />
    <line x1="6" y1="6" x2="18" y2="18" />
  </svg>
)

export function CameraCapture({ onCapture, onCancel }: CameraCaptureProps) {
  const [stage, setStage] = useState<Stage>('idle')
  const [capturedBlob, setCapturedBlob] = useState<Blob | null>(null)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [error, setError] = useState<string | null>(null)

  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }

  useEffect(() => {
    return () => {
      stopCamera()
      if (previewUrl) URL.revokeObjectURL(previewUrl)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /* ── Start camera ── */
  const startCamera = async () => {
    setError(null)
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' },
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })
      streamRef.current = stream
      setStage('camera')
      // Attach after DOM is ready
      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream
          void videoRef.current.play()
        }
      })
    } catch {
      setError('No se pudo acceder a la cámara. Verifica los permisos del navegador.')
    }
  }

  /* ── Capture frame ── */
  const capturePhoto = () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    canvas.width = video.videoWidth
    canvas.height = video.videoHeight
    const ctx = canvas.getContext('2d')
    if (!ctx) return

    ctx.drawImage(video, 0, 0)
    canvas.toBlob(
      (blob) => {
        if (!blob) return
        stopCamera()
        const url = URL.createObjectURL(blob)
        setCapturedBlob(blob)
        setPreviewUrl(url)
        setStage('preview')
      },
      'image/webp',
      0.92,
    )
  }

  /* ── Gallery file ── */
  const handleFileSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    const url = URL.createObjectURL(file)
    setCapturedBlob(file)
    setPreviewUrl(url)
    setStage('preview')
    e.target.value = ''
  }

  /* ── Retake ── */
  const retake = () => {
    if (previewUrl) URL.revokeObjectURL(previewUrl)
    setCapturedBlob(null)
    setPreviewUrl(null)
    setError(null)
    setStage('idle')
  }

  /* ── Confirm: compress + upload ── */
  const confirm = async () => {
    if (!capturedBlob) return
    setStage('processing')
    setUploadProgress(0)
    setError(null)

    try {
      const originalSize = capturedBlob.size
      const compressed = await compressImage(capturedBlob, { maxWidth: 1920, quality: 0.75 })
      const result = await uploadTicketImage(compressed, setUploadProgress)
      onCapture({ ...result, blob: compressed, originalSize, compressedSize: compressed.size })
    } catch (e) {
      setError(e instanceof Error ? e.message : 'Error al procesar la imagen')
      setStage('preview')
    }
  }

  return (
    <div className={styles.container}>
      {/* ── Media area ── */}
      <div className={styles.mediaArea}>
        <AnimatePresence mode="wait">
          {stage === 'idle' && (
            <motion.div
              key="idle"
              className={styles.placeholder}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.15 }}
            >
              <svg width="52" height="52" viewBox="0 0 24 24" fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
                <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z" />
                <circle cx="12" cy="13" r="4" />
              </svg>
              <p style={{ color: 'rgba(255,255,255,0.25)', fontSize: 13, textAlign: 'center', maxWidth: 200 }}>
                Captura un ticket, factura o producto
              </p>
            </motion.div>
          )}

          {stage === 'camera' && (
            <motion.video
              key="video"
              ref={videoRef}
              className={styles.video}
              autoPlay
              playsInline
              muted
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
            />
          )}

          {(stage === 'preview' || stage === 'processing') && previewUrl && (
            <motion.img
              key="preview"
              src={previewUrl}
              className={styles.previewImg}
              alt="Imagen capturada"
              initial={{ opacity: 0, scale: 0.97 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.2 }}
            />
          )}
        </AnimatePresence>

        {/* Scanner laser overlay */}
        <ScannerOverlay active={stage === 'processing'} progress={uploadProgress} />

        {/* Rule-of-thirds grid (camera mode only) */}
        {stage === 'camera' && <div className={styles.gridOverlay} />}
      </div>

      {/* Hidden canvas (capture buffer) */}
      <canvas ref={canvasRef} style={{ display: 'none' }} />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        style={{ display: 'none' }}
        onChange={handleFileSelect}
      />

      {/* ── Error message ── */}
      <AnimatePresence>
        {error && (
          <motion.div
            className={styles.errorMsg}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Controls ── */}
      <div className={styles.controls}>
        <AnimatePresence mode="wait">
          {stage === 'idle' && (
            <motion.div
              key="idle-ctrl"
              className={styles.idleActions}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <Button
                variant="primary"
                size="lg"
                onClick={() => { void startCamera() }}
                style={{ flex: 1, gap: 'var(--space-2)' }}
              >
                <CamIcon /> Abrir cámara
              </Button>
              <Button
                variant="ghost"
                size="lg"
                onClick={() => { fileInputRef.current?.click() }}
                style={{ flex: 1, gap: 'var(--space-2)' }}
              >
                <GalleryIcon /> Galería
              </Button>
              {onCancel && (
                <Button variant="ghost" size="lg" onClick={onCancel}>
                  Cancelar
                </Button>
              )}
            </motion.div>
          )}

          {stage === 'camera' && (
            <motion.div
              key="camera-ctrl"
              className={styles.cameraControls}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <button
                className={styles.iconBtn}
                onClick={() => { stopCamera(); setStage('idle') }}
                aria-label="Cancelar"
              >
                <CloseIcon />
              </button>

              <button
                className={styles.captureBtn}
                onClick={capturePhoto}
                aria-label="Capturar foto"
              />

              <button
                className={styles.iconBtn}
                onClick={() => { stopCamera(); setStage('idle'); fileInputRef.current?.click() }}
                aria-label="Subir desde galería"
              >
                <GalleryIcon />
              </button>
            </motion.div>
          )}

          {stage === 'preview' && (
            <motion.div
              key="preview-ctrl"
              className={styles.previewControls}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -4 }}
              transition={{ duration: 0.15 }}
            >
              <Button variant="ghost" size="lg" onClick={retake} style={{ flex: 1 }}>
                Reintentar
              </Button>
              <Button
                variant="primary"
                size="lg"
                onClick={() => { void confirm() }}
                style={{ flex: 2 }}
              >
                Confirmar
              </Button>
            </motion.div>
          )}

          {stage === 'processing' && (
            <motion.div
              key="processing-ctrl"
              className={styles.processingControls}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div className={styles.progressBar}>
                <div
                  className={styles.progressFill}
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
              <p style={{ fontSize: 13, color: 'var(--text-secondary)', textAlign: 'center' }}>
                {uploadProgress < 100
                  ? `Subiendo imagen… ${uploadProgress}%`
                  : 'Procesando con IA…'}
              </p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  )
}
