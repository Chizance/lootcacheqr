import { useEffect, useRef, useState } from 'react'
import jsQR from 'jsqr'

// Full-screen camera overlay that decodes QR codes frame-by-frame with jsQR.
// Fires onScan for every *distinct* decoded value it sees (deduped so it
// doesn't fire every single frame while a code sits in view) — the caller
// decides what counts as a valid result and when to close the scanner.
export function QRScanner({ onScan, onClose }: { onScan: (data: string) => void; onClose: () => void }) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const onScanRef = useRef(onScan)
  onScanRef.current = onScan
  const [error, setError] = useState('')

  useEffect(() => {
    let cancelled = false
    let stream: MediaStream | null = null
    let rafId = 0
    let lastData = ''

    function tick() {
      const video = videoRef.current
      const canvas = canvasRef.current
      if (video && canvas && video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth
        canvas.height = video.videoHeight
        const ctx = canvas.getContext('2d')
        if (ctx) {
          ctx.drawImage(video, 0, 0, canvas.width, canvas.height)
          const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
          const code = jsQR(imageData.data, imageData.width, imageData.height)
          if (code?.data && code.data !== lastData) {
            lastData = code.data
            onScanRef.current(code.data)
          }
        }
      }
      rafId = requestAnimationFrame(tick)
    }

    async function start() {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } })
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        const video = videoRef.current
        if (video) {
          video.srcObject = stream
          await video.play()
        }
        rafId = requestAnimationFrame(tick)
      } catch (err) {
        if (!cancelled) setError(err instanceof Error ? err.message : 'Could not access the camera')
      }
    }

    start()

    return () => {
      cancelled = true
      cancelAnimationFrame(rafId)
      stream?.getTracks().forEach((t) => t.stop())
    }
  }, [])

  return (
    <div className="scanner-overlay">
      <button type="button" className="scanner-close" onClick={onClose} aria-label="Close scanner">
        ✕
      </button>
      {error ? (
        <div className="scanner-error">
          <p>{error}</p>
          <p className="muted">Check that this site has permission to use your camera.</p>
        </div>
      ) : (
        <video ref={videoRef} playsInline muted className="scanner-video" />
      )}
      <canvas ref={canvasRef} style={{ display: 'none' }} />
      {!error && <p className="scanner-hint">Point your camera at a bin's QR code</p>}
    </div>
  )
}
