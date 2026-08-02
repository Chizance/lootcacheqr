import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Layout } from '../components/Layout'
import { buildLocationTree, flattenTree, type LocationNode } from '../lib/locations'
import type { LocationRow } from '../types'

export function Locations() {
  const [locations, setLocations] = useState<LocationRow[]>([])
  const [addingUnder, setAddingUnder] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const { data } = await supabase.from('locations').select('*')
      if (!cancelled && data) setLocations(data)
      setLoading(false)
    }
    load()

    const channel = supabase
      .channel('locations-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, () => load())
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  const tree = flattenTree(buildLocationTree(locations))

  const addLocation = async (parentId: string | null) => {
    const name = newName.trim()
    if (!name) return
    await supabase.from('locations').insert({ name, parent_id: parentId })
    setNewName('')
    setAddingUnder(null)
  }

  const rename = async (id: string, name: string) => {
    if (!name.trim()) return
    await supabase.from('locations').update({ name: name.trim() }).eq('id', id)
  }

  const remove = async (node: LocationNode) => {
    const childCount = flattenTree(node.children).length
    const message =
      childCount > 0
        ? `Delete "${node.name}" and its ${childCount} sub-location(s)? Bins inside will become Unassigned, not deleted.`
        : `Delete "${node.name}"? Bins inside will become Unassigned, not deleted.`
    if (!window.confirm(message)) return
    await supabase.from('locations').delete().eq('id', node.id)
  }

  return (
    <Layout title="Locations">
      {loading && <p className="muted">Loading…</p>}

      {!loading && tree.length === 0 && (
        <p className="muted">No locations yet. Add your first one below (e.g. "Backyard").</p>
      )}

      <div className="stack">
        {tree.map((node) => (
          <div key={node.id}>
            <div className="location-tree-item" style={{ paddingLeft: node.depth * 18 }}>
              <input
                type="text"
                defaultValue={node.name}
                onBlur={(e) => rename(node.id, e.target.value)}
                style={{ flex: 1 }}
              />
              <button
                type="button"
                className="btn-icon"
                onClick={() => {
                  setAddingUnder(addingUnder === node.id ? null : node.id)
                  setNewName('')
                }}
                aria-label="Add sub-location"
              >
                ➕
              </button>
              <button type="button" className="btn-icon" onClick={() => remove(node)} aria-label="Delete location">
                🗑️
              </button>
            </div>
            {addingUnder === node.id && (
              <div className="field-row" style={{ paddingLeft: (node.depth + 1) * 18, marginTop: 4 }}>
                <input
                  type="text"
                  autoFocus
                  placeholder={`New location inside "${node.name}"`}
                  value={newName}
                  onChange={(e) => setNewName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && addLocation(node.id)}
                />
                <button type="button" className="btn-icon" onClick={() => addLocation(node.id)} aria-label="Save">
                  ✅
                </button>
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20 }}>
        {addingUnder === 'root' ? (
          <div className="field-row">
            <input
              type="text"
              autoFocus
              placeholder="New top-level location (e.g. Backyard)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && addLocation(null)}
            />
            <button type="button" className="btn-icon" onClick={() => addLocation(null)} aria-label="Save">
              ✅
            </button>
          </div>
        ) : (
          <button
            type="button"
            className="btn-secondary"
            onClick={() => {
              setAddingUnder('root')
              setNewName('')
            }}
          >
            ➕ Add top-level location
          </button>
        )}
      </div>
    </Layout>
  )
}
