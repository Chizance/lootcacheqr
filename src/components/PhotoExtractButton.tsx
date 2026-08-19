import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ExtractedItemsResponse } from '../types'

// Claude's vision API only accepts JPEG/PNG/GIF/WebP — phone photos are
// sometimes HEIC (common on iPhone) or another format it rejects outright,
// which fails with an opaque "non-2xx status" error and no useful detail.
// Redrawing every photo onto a canvas and re-exporting as JPEG guarantees a
// supported format regardless of source, and doubles as downsizing so we
// never send a multi-megabyte original for no benefit — Claude resizes
// internally to a max of ~1568px on the long edge anyway.
const MAX_DIMENSION = 1568

async function normalizeImage(file: File): Promise<string> {
  let bitmap: ImageBitmap
  try {
    bitmap = await createImageBitmap(file)
  } catch {
    throw new Error(
      "Couldn't read that photo — it may be in a format this browser can't open. Try a different photo.",
    )
  }

  try {
    const scale = Math.min(1, MAX_DIMENSION / Math.max(bitmap.width, bitmap.height))
    const width = Math.round(bitmap.width * scale)
    const height = Math.round(bitmap.height * scale)

    const canvas = document.createElement('canvas')
    canvas.width = width
    canvas.height = height
    const ctx = canvas.getContext('2d')
    if (!ctx) throw new Error('Could not process that photo on this device.')
    ctx.drawImage(bitmap, 0, 0, width, height)

    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85))
    if (!blob) throw new Error('Could not process that photo on this device.')

    return await new Promise<string>((resolve, reject) => {
      const reader = new FileReader()
      reader.onload = () => resolve((reader.result as string).split(',')[1] ?? '')
      reader.onerror = () => reject(new Error('Could not read that photo.'))
      reader.readAsDataURL(blob)
    })
  } finally {
    bitmap.close()
  }
}

// supabase-js only gives a generic "non-2xx status" message by default — the
// actual reason (from our Edge Function's own error response) is on the
// error's `context` Response object and has to be read out explicitly.
async function describeFunctionError(err: unknown): Promise<string> {
  if (err && typeof err === 'object' && 'context' in err) {
    const context = (err as { context?: unknown }).context
    if (context instanceof Response) {
      try {
        const body = await context.clone().json()
        if (body?.error) return String(body.error)
      } catch {
        // Response body wasn't JSON — fall through to the generic message.
      }
    }
  }
  return err instanceof Error ? err.message : 'Photo scan failed'
}

export function PhotoExtractButton({ onAddItems }: { onAddItems: (items: string[]) => void }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [draft, setDraft] = useState<string[] | null>(null)
  const [cost, setCost] = useState<number | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFile = async (file: File | null) => {
    if (!file) return
    setLoading(true)
    setError('')
    setDraft(null)
    setCost(null)
    try {
      const base64 = await normalizeImage(file)
      const { data, error: fnError } = await supabase.functions.invoke<ExtractedItemsResponse>('extract-items', {
        body: { image: base64, mediaType: 'image/jpeg' },
      })
      if (fnError) throw new Error(await describeFunctionError(fnError))
      if (!data) throw new Error('No response from extraction function')
      setDraft(data.items)
      setCost(data.estimated_cost_usd)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Photo scan failed')
    } finally {
      setLoading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const toggleItem = (index: number) => {
    if (!draft) return
    setDraft(draft.filter((_, i) => i !== index))
  }

  const confirmAdd = () => {
    if (draft && draft.length) onAddItems(draft)
    setDraft(null)
    setCost(null)
  }

  return (
    <div className="card" style={{ background: 'var(--brand-light)', border: 'none' }}>
      <p style={{ margin: '0 0 8px', fontWeight: 600, color: 'var(--brand-dark)' }}>
        ✨ Scan a box with Claude (optional)
      </p>
      <p className="muted" style={{ margin: '0 0 10px', fontSize: '0.85rem' }}>
        Take one photo of the open box. Claude drafts a list of visible items — review and edit before adding.
      </p>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        style={{ display: 'none' }}
        onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
      />
      <button type="button" className="btn-secondary" disabled={loading} onClick={() => fileInputRef.current?.click()}>
        {loading ? 'Scanning…' : '📷 Take photo & scan'}
      </button>

      {error && (
        <p className="error-banner" style={{ marginTop: 8 }}>
          {error}
        </p>
      )}

      {draft && (
        <div style={{ marginTop: 12 }}>
          <p style={{ fontWeight: 600 }}>Claude found {draft.length} item(s):</p>
          <div className="stack">
            {draft.map((item, index) => (
              <div className="item-row" key={index}>
                <span style={{ flex: 1 }}>{item}</span>
                <button type="button" className="btn-icon" onClick={() => toggleItem(index)} aria-label="Discard item">
                  🗑️
                </button>
              </div>
            ))}
          </div>
          {cost !== null && (
            <p className="muted" style={{ fontSize: '0.85rem', marginTop: 6 }}>
              Estimated cost: ${cost.toFixed(4)}
            </p>
          )}
          <button type="button" className="btn-primary" style={{ marginTop: 8 }} onClick={confirmAdd} disabled={!draft.length}>
            Add {draft.length} item(s) to list
          </button>
        </div>
      )}
    </div>
  )
}
