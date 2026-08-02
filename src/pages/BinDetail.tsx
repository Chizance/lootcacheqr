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

  useEffect(() => {
    if (!id) return
    let cancelled = false

    supabase
      .from('bins')
      .select('*')
      .eq('id', id)
      .maybeSingle()
      .then(({ data }) => {
        if (cancelled) return
        if (!data) {
          setNotFound(true)
          return
        }
        setBin(data)
      })

    supabase
      .from('locations')
      .select('*')
      .then(({ data }) => {
        if (!cancelled && data) setLocations(data)
      })

    return () => {
      cancelled = true
    }
  }, [id])

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
    setConfirmingEmpty(false)
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
      <input id="number" type="text" value={bin.number} onChange={(e) => patch({ number: e.target.value })} />

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
      <QRCodeCard binId={bin.id} label={bin.number || bin.title} />

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
