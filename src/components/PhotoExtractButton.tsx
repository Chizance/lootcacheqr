import { useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import type { ExtractedItemsResponse } from '../types'

function fileToBase64(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      const result = reader.result as string
      // Strip the "data:image/jpeg;base64," prefix — the API wants raw base64.
      resolve(result.split(',')[1] ?? '')
    }
    reader.onerror = reject
    reader.readAsDataURL(file)
  })
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
      const base64 = await fileToBase64(file)
      const { data, error: fnError } = await supabase.functions.invoke<ExtractedItemsResponse>('extract-items', {
        body: { image: base64, mediaType: file.type || 'image/jpeg' },
      })
      if (fnError) throw fnError
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
