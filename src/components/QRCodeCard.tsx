import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function binUrl(binId: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}#/bin/${binId}`
}

// Print label size: 3.75" x 5" so four of them (2x2) exactly fill a 7.5"x10"
// sheet in Word. Rendered at 300 DPI for crisp print quality.
const DPI = 300
const LABEL_WIDTH_IN = 3.75
const LABEL_HEIGHT_IN = 5
export const LABEL_WIDTH_PX = Math.round(LABEL_WIDTH_IN * DPI)
export const LABEL_HEIGHT_PX = Math.round(LABEL_HEIGHT_IN * DPI)

const FONT_STACK = 'system-ui, -apple-system, "Segoe UI", sans-serif'

/** Largest font size (up to maxSize, down to minSize) at which `text` still fits within `maxWidth`. */
function fitFontSize(
  ctx: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxSize: number,
  minSize: number,
  weight: 'normal' | 'bold',
): number {
  let size = maxSize
  while (size > minSize) {
    ctx.font = `${weight} ${size}px ${FONT_STACK}`
    if (ctx.measureText(text).width <= maxWidth) break
    size -= 2
  }
  return size
}

function drawCenteredText(
  ctx: CanvasRenderingContext2D,
  text: string,
  centerX: number,
  y: number,
  size: number,
  weight: 'normal' | 'bold',
  underline: boolean,
): void {
  ctx.font = `${weight} ${size}px ${FONT_STACK}`
  ctx.fillStyle = '#000000'
  ctx.textAlign = 'center'
  ctx.textBaseline = 'alphabetic'
  ctx.fillText(text, centerX, y)

  if (underline) {
    const textWidth = ctx.measureText(text).width
    const underlineY = y + Math.round(size * 0.18)
    ctx.lineWidth = Math.max(2, Math.round(size * 0.045))
    ctx.strokeStyle = '#000000'
    ctx.beginPath()
    ctx.moveTo(centerX - textWidth / 2, underlineY)
    ctx.lineTo(centerX + textWidth / 2, underlineY)
    ctx.stroke()
  }
}

async function generateLabelImage(binId: string, number: string, title: string): Promise<string> {
  const width = LABEL_WIDTH_PX
  const height = LABEL_HEIGHT_PX
  const nameText = number.trim() || title.trim() || '(unlabeled)'

  const canvas = document.createElement('canvas')
  canvas.width = width
  canvas.height = height
  const ctx = canvas.getContext('2d')
  if (!ctx) return ''

  // White background — printed labels, no transparency.
  ctx.fillStyle = '#ffffff'
  ctx.fillRect(0, 0, width, height)

  // QR code, square, centered horizontally near the top.
  const margin = Math.round(width * 0.08)
  const qrSize = width - margin * 2
  const qrCanvas = document.createElement('canvas')
  await QRCode.toCanvas(qrCanvas, binUrl(binId), { width: qrSize, margin: 1 })
  ctx.drawImage(qrCanvas, margin, margin, qrSize, qrSize)

  // "BIN" — always bold + underlined, fixed size, directly under the QR code.
  const binLabelSize = Math.round(width * 0.1)
  const binLabelY = margin + qrSize + Math.round(height * 0.11)
  drawCenteredText(ctx, 'BIN', width / 2, binLabelY, binLabelSize, 'bold', true)

  // The bin number/name text — shrinks (or grows, up to a cap) to fit the
  // label width on one line, so the overall label size never has to change.
  const textMaxWidth = width - margin * 1.5
  const nameY = binLabelY + Math.round(height * 0.13)
  const nameSize = fitFontSize(ctx, nameText, textMaxWidth, Math.round(width * 0.15), 28, 'normal')
  drawCenteredText(ctx, nameText, width / 2, nameY, nameSize, 'normal', false)

  return canvas.toDataURL('image/png')
}

export function QRCodeCard({ binId, number, title }: { binId: string; number: string; title: string }) {
  const [dataUrl, setDataUrl] = useState('')
  const url = binUrl(binId)

  useEffect(() => {
    let cancelled = false
    generateLabelImage(binId, number, title).then((result) => {
      if (!cancelled) setDataUrl(result)
    })
    return () => {
      cancelled = true
    }
  }, [binId, number, title])

  const download = () => {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `bin-label-${number || title || binId}.png`
    a.click()
  }

  return (
    <div className="qr-box">
      {dataUrl ? (
        <img src={dataUrl} alt={`Printable QR label for bin ${number || title}`} />
      ) : (
        <p className="muted">Generating…</p>
      )}
      <p className="muted" style={{ fontSize: '0.8rem', wordBreak: 'break-all', textAlign: 'center' }}>
        {url}
      </p>
      <button type="button" className="btn-secondary" onClick={download} disabled={!dataUrl}>
        ⬇️ Download label to print
      </button>
      <p className="muted" style={{ fontSize: '0.75rem', textAlign: 'center' }}>
        3.75" × 5" — paste 4 copies into Word (2×2) to fill a 7.5" × 10" sheet
      </p>
    </div>
  )
}
