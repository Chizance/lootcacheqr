import { useCallback, useEffect, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Layout } from '../components/Layout'
import { TagInput } from '../components/TagInput'
import { ItemList } from '../components/ItemList'
import { PhotoUploader } from '../components/PhotoUploader'
import { PhotoExtractButton } from '../components/PhotoExtractButton'
import { LocationPicker } from '../components/LocationPicker'
import { QRCodeCard } from '../components/QRCodeCard'
import { DictationButton } from '../components/DictationButton'
import type { BinRow, LocationRow } from '../types'

export function BinDetail() {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const [bin, setBin] = useState<BinRow | null>(null)
  const [locations, setLocations] = useState<LocationRow[]>([])
  const [notFound, setNotFound] = useState(false)
  const [saving, setSaving] = useState(false)
  const [confirmingEmpty, setConfirmingEmpty] = useState(false)
  const [confirmingDelete, setConfirmingDelete] = useState(false)
  // The number/name field gets its own local draft + confirm-on-blur, rather
  // than saving on every keystroke like the other fields — it's what's
  // printed on the physical sticker, so an accidental edit is more costly
  // than for title/description/tags.
  const [numberDraft, setNumberDraft] = useState('')

  useEffect(() => {
    if (!id) return
    let cancelled = false

    async function loadBin(clearFirst: boolean) {
      // Clearing first matters when `id` just changed (navigating directly
      // from one bin's page to another) — otherwise the old bin's data,
      // QR code included, can briefly render under the new URL. It's
      // skipped on a background-refresh re-fetch of the *same* bin, so
      // returning to the app doesn't flash back to a loading state.
      if (clearFirst) {
        setBin(null)
        setNotFound(false)
      }
      const { data } = await supabase.from('bins').select('*').eq('id', id).maybeSingle()
      if (cancelled) return
      if (!data) {
        setNotFound(true)
        return
      }
      setBin(data)

      // Record that this bin was actually opened (as opposed to a silent
      // background re-fetch of a page you're already sitting on) — this is
      // what "last accessed" sorting on the Search page is based on.
      // Supabase's query builder is lazy and only runs once awaited/`.then`ed,
      // so this has to be awaited even though nothing here needs the result.
      if (clearFirst) {
        await supabase.from('bins').update({ last_accessed_at: new Date().toISOString() }).eq('id', id)
      }
    }

    async function loadLocations() {
      const { data } = await supabase.from('locations').select('*')
      if (!cancelled && data) setLocations(data)
    }

    loadBin(true)
    loadLocations()

    // Re-fetch on returning from the background — see the matching comment
    // in Home.tsx for why this is needed.
    const handleVisibility = () => {
      if (document.visibilityState === 'visible') {
        loadBin(false)
        loadLocations()
      }
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelled = true
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [id])

  // Reset the number draft whenever a (new) bin finishes loading — but not
  // on every `bin` update, so it doesn't fight with in-progress typing.
  useEffect(() => {
    if (bin) setNumberDraft(bin.number)
  }, [bin?.id])

  const patch = useCallback(
    async (fields: Partial<BinRow>) => {
      if (!id) return
      setBin((prev) => (prev ? { ...prev, ...fields } : prev))
      setSaving(true)
      const { error } = await supabase.from('bins').update(fields).eq('id', id)
      setSaving(false)
      if (error) alert(`Couldn't save: ${error.message}`)
    },
    [id],
  )

  const emptyBin = async () => {
    if (!id || !bin) return
    if (bin.photos.length) {
      await supabase.storage.from('bin-photos').remove(bin.photos)
    }
    await patch({ number: '', title: '', description: '', tags: [], items: [], photos: [], location_id: null })
    setNumberDraft('')
    setConfirmingEmpty(false)
  }

  const handleNumberBlur = () => {
    if (!bin || numberDraft === bin.number) return
    const confirmed = window.confirm(
      `Change the bin number/name from "${bin.number || '(blank)'}" to "${numberDraft || '(blank)'}"?\n\n` +
        `This is the text printed on the physical sticker. If you've already printed a label for this bin, ` +
        `you'll need to reprint it to match.`,
    )
    if (confirmed) {
      patch({ number: numberDraft })
    } else {
      setNumberDraft(bin.number)
    }
  }

  const deleteBin = async () => {
    if (!id || !bin) return
    if (bin.photos.length) {
      await supabase.storage.from('bin-photos').remove(bin.photos)
    }
    await supabase.from('bins').delete().eq('id', id)
    navigate('/', { replace: true })
  }

  if (notFound) {
    return (
      <Layout title="Bin not found">
        <p>This bin doesn't exist (maybe it was deleted from another device).</p>
      </Layout>
    )
  }

  if (!bin) {
    return (
      <Layout title="Loading…">
        <p className="muted">Loading bin…</p>
      </Layout>
    )
  }

  return (
    <Layout title={bin.title || 'Untitled bin'}>
      <p className="muted" style={{ marginTop: -8, marginBottom: 8, fontSize: '0.8rem' }}>
        {saving ? 'Saving…' : 'Synced'}
      </p>

      <label htmlFor="number">Bin number / name</label>
      <input
        id="number"
        type="text"
        value={numberDraft}
        onChange={(e) => setNumberDraft(e.target.value)}
        onBlur={handleNumberBlur}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur()
        }}
      />
      <p className="muted" style={{ marginTop: 4, fontSize: '0.8rem' }}>
        This is what's printed on the sticker — changing it will ask you to confirm.
      </p>

      <label htmlFor="title">Title</label>
      <div className="field-row">
        <input id="title" type="text" value={bin.title} onChange={(e) => patch({ title: e.target.value })} />
        <DictationButton onResult={(text) => patch({ title: `${bin.title}${bin.title ? ' ' : ''}${text}` })} />
      </div>

      <label htmlFor="description">Description</label>
      <div className="field-row">
        <textarea
          id="description"
          value={bin.description}
          onChange={(e) => patch({ description: e.target.value })}
        />
        <DictationButton
          onResult={(text) => patch({ description: `${bin.description}${bin.description ? ' ' : ''}${text}` })}
        />
      </div>

      <label htmlFor="location">Location</label>
      <LocationPicker locations={locations} value={bin.location_id} onChange={(location_id) => patch({ location_id })} />

      <label>Tags</label>
      <TagInput tags={bin.tags} onChange={(tags) => patch({ tags })} />

      <label>Items in this bin</label>
      <ItemList items={bin.items} onChange={(items) => patch({ items })} />

      <div style={{ marginTop: 12 }}>
        <PhotoExtractButton onAddItems={(newItems) => patch({ items: [...bin.items, ...newItems] })} />
      </div>

      <label>Photos</label>
      <PhotoUploader binId={bin.id} photos={bin.photos} onChange={(photos) => patch({ photos })} />

      <label>QR code</label>
      <QRCodeCard binId={bin.id} number={bin.number} title={bin.title} />

      <div className="stack" style={{ marginTop: 24 }}>
        {!confirmingEmpty ? (
          <button type="button" className="btn-secondary" onClick={() => setConfirmingEmpty(true)}>
            🧹 Empty this bin (reuse sticker)
          </button>
        ) : (
          <div className="card">
            <p style={{ marginTop: 0 }}>Clear all fields and photos? The QR code keeps working for this bin.</p>
            <div className="stack">
              <button type="button" className="btn-danger" onClick={emptyBin}>
                Yes, empty it
              </button>
              <button type="button" className="btn-secondary" onClick={() => setConfirmingEmpty(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {!confirmingDelete ? (
          <button type="button" className="btn-icon" onClick={() => setConfirmingDelete(true)}>
            Delete this bin permanently
          </button>
        ) : (
          <div className="card">
            <p style={{ marginTop: 0 }}>Permanently delete this bin record? The QR sticker will stop working.</p>
            <div className="stack">
              <button type="button" className="btn-danger" onClick={deleteBin}>
                Yes, delete permanently
              </button>
              <button type="button" className="btn-secondary" onClick={() => setConfirmingDelete(false)}>
                Cancel
              </button>
            </div>
          </div>
        )}
      </div>
    </Layout>
  )
}
