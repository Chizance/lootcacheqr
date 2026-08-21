import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { Layout } from '../components/Layout'
import { buildLocationTree, descendantIds, flattenTree, type LocationNode } from '../lib/locations'
import type { LocationRow } from '../types'

const WARN_KEY = 'locations-change-warn-seen'

type PendingAction =
  | { type: 'add'; parentId: string | null }
  | { type: 'delete'; node: LocationNode }

function depthBorder(depth: number): string {
  if (depth === 0) return 'var(--border)'
  if (depth === 1) return '#fdba74'
  return 'var(--brand)'
}

function depthBg(depth: number): string {
  if (depth === 0) return 'transparent'
  if (depth === 1) return '#fff7ed'
  return 'var(--brand-light)'
}

export function Locations() {
  const [locations, setLocations] = useState<LocationRow[]>([])
  const [addingUnder, setAddingUnder] = useState<string | null>(null)
  const [newName, setNewName] = useState('')
  const [loading, setLoading] = useState(true)
  const [draggingId, setDraggingId] = useState<string | null>(null)
  const [dragOverId, setDragOverId] = useState<string | null>(null)
  const [dragOverRoot, setDragOverRoot] = useState(false)
  const [pendingAction, setPendingAction] = useState<PendingAction | null>(null)
  const [warnDontShow, setWarnDontShow] = useState(false)

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

    const handleVisibility = () => {
      if (document.visibilityState === 'visible') load()
    }
    document.addEventListener('visibilitychange', handleVisibility)

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
      document.removeEventListener('visibilitychange', handleVisibility)
    }
  }, [])

  const tree = flattenTree(buildLocationTree(locations))

  const warnSeen = () => !!localStorage.getItem(WARN_KEY)

  const addLocation = (parentId: string | null) => {
    if (!newName.trim()) return
    if (!warnSeen()) {
      setPendingAction({ type: 'add', parentId })
    } else {
      doAdd(parentId)
    }
  }

  const doAdd = async (parentId: string | null) => {
    const name = newName.trim()
    if (!name) return
    await supabase.from('locations').insert({ name, parent_id: parentId })
    setNewName('')
    setAddingUnder(null)
    setPendingAction(null)
  }

  const rename = async (id: string, name: string) => {
    if (!name.trim()) return
    await supabase.from('locations').update({ name: name.trim() }).eq('id', id)
  }

  const remove = (node: LocationNode) => {
    if (!warnSeen()) {
      setPendingAction({ type: 'delete', node })
    } else {
      doRemove(node)
    }
  }

  const doRemove = async (node: LocationNode) => {
    await supabase.from('locations').delete().eq('id', node.id)
    setPendingAction(null)
  }

  const moveLocation = async (draggedId: string, newParentId: string | null) => {
    if (draggedId === newParentId) return
    if (newParentId !== null && descendantIds(draggedId, locations).has(newParentId)) return
    await supabase.from('locations').update({ parent_id: newParentId }).eq('id', draggedId)
  }

  const confirmAction = async () => {
    if (warnDontShow) localStorage.setItem(WARN_KEY, '1')
    if (!pendingAction) return
    if (pendingAction.type === 'add') {
      await doAdd(pendingAction.parentId)
    } else {
      await doRemove(pendingAction.node)
    }
    setWarnDontShow(false)
  }

  const cancelAction = () => {
    setPendingAction(null)
    setWarnDontShow(false)
  }

  const warnMessage = (action: PendingAction): string => {
    if (action.type === 'add') {
      return 'Bins display their full location path. Any bins assigned here or to sub-locations will automatically reflect this location in their path.'
    }
    const childCount = flattenTree(action.node.children).length
    const suffix = childCount > 0 ? ` and its ${childCount} sub-location${childCount === 1 ? '' : 's'}` : ''
    return `Deleting "${action.node.name}"${suffix} will move all assigned bins to Unassigned. The bins themselves won't be deleted.`
  }

  return (
    <Layout title="Locations">
      {pendingAction && (
        <div className="warn-overlay" onClick={cancelAction}>
          <div className="warn-dialog" onClick={(e) => e.stopPropagation()}>
            <p style={{ margin: '0 0 12px' }}>{warnMessage(pendingAction)}</p>
            <label className="warn-check">
              <input
                type="checkbox"
                checked={warnDontShow}
                onChange={(e) => setWarnDontShow(e.target.checked)}
              />
              Don't show this again
            </label>
            <div className="field-row" style={{ marginTop: 14 }}>
              <button
                type="button"
                className="btn-secondary btn-small"
                style={{ width: 'auto' }}
                onClick={cancelAction}
              >
                Cancel
              </button>
              <button
                type="button"
                className="btn-primary btn-small"
                style={{ width: 'auto', flex: 1 }}
                onClick={confirmAction}
              >
                {pendingAction.type === 'add' ? 'Add location' : 'Delete location'}
              </button>
            </div>
          </div>
        </div>
      )}

      {loading && <p className="muted">Loading…</p>}

      {!loading && tree.length === 0 && (
        <p className="muted">No locations yet. Add your first one below (e.g. "Backyard").</p>
      )}

      <div
        className="stack"
        onDragLeave={(e) => {
          if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragOverId(null)
        }}
      >
        {tree.map((node) => {
          const isDragging = draggingId === node.id
          const isDropTarget = dragOverId === node.id && draggingId !== node.id
          return (
            <div key={node.id}>
              <div
                className={`location-tree-item${isDropTarget ? ' drop-target' : ''}`}
                style={{
                  paddingLeft: node.depth * 18 + 6,
                  paddingRight: 6,
                  opacity: isDragging ? 0.4 : 1,
                  borderLeft: `3px solid ${depthBorder(node.depth)}`,
                  background: depthBg(node.depth),
                  borderRadius: 6,
                }}
                draggable
                onDragStart={(e) => {
                  setDraggingId(node.id)
                  e.dataTransfer.effectAllowed = 'move'
                }}
                onDragEnd={() => {
                  setDraggingId(null)
                  setDragOverId(null)
                }}
                onDragOver={(e) => {
                  e.preventDefault()
                  e.stopPropagation()
                  e.dataTransfer.dropEffect = 'move'
                  if (draggingId && draggingId !== node.id) setDragOverId(node.id)
                }}
                onDrop={(e) => {
                  e.preventDefault()
                  if (draggingId && draggingId !== node.id) moveLocation(draggingId, node.id)
                  setDraggingId(null)
                  setDragOverId(null)
                }}
              >
                <span className="drag-handle" aria-hidden="true">⠿</span>
                <input
                  type="text"
                  defaultValue={node.name}
                  onBlur={(e) => rename(node.id, e.target.value)}
                  style={{ flex: 1 }}
                />
                <div
                  className="tooltip-wrap"
                  data-tooltip={`Add sublocation to "${node.name}"`}
                >
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => {
                      setAddingUnder(addingUnder === node.id ? null : node.id)
                      setNewName('')
                    }}
                    aria-label={`Add sublocation to "${node.name}"`}
                  >
                    ➕
                  </button>
                </div>
                <button
                  type="button"
                  className="btn-icon"
                  onClick={() => remove(node)}
                  aria-label="Delete location"
                >
                  🗑️
                </button>
              </div>
              {addingUnder === node.id && (
                <div
                  className="field-row"
                  style={{ paddingLeft: (node.depth + 1) * 18 + 6, marginTop: 4 }}
                >
                  <input
                    type="text"
                    autoFocus
                    placeholder={`New location inside "${node.name}"`}
                    value={newName}
                    onChange={(e) => setNewName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') addLocation(node.id)
                      if (e.key === 'Escape') setAddingUnder(null)
                    }}
                  />
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => addLocation(node.id)}
                    aria-label="Save"
                  >
                    ✅
                  </button>
                  <button
                    type="button"
                    className="btn-icon"
                    onClick={() => setAddingUnder(null)}
                    aria-label="Cancel"
                  >
                    ✕
                  </button>
                </div>
              )}
            </div>
          )
        })}
      </div>

      {draggingId && (
        <div
          className={`root-drop-zone${dragOverRoot ? ' drop-target' : ''}`}
          onDragOver={(e) => {
            e.preventDefault()
            e.dataTransfer.dropEffect = 'move'
            setDragOverRoot(true)
          }}
          onDragLeave={() => setDragOverRoot(false)}
          onDrop={(e) => {
            e.preventDefault()
            if (draggingId) moveLocation(draggingId, null)
            setDraggingId(null)
            setDragOverRoot(false)
          }}
        >
          Drop here to make top-level
        </div>
      )}

      <div style={{ marginTop: 20 }}>
        {addingUnder === 'root' ? (
          <div className="field-row">
            <input
              type="text"
              autoFocus
              placeholder="New top-level location (e.g. Backyard)"
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') addLocation(null)
                if (e.key === 'Escape') setAddingUnder(null)
              }}
            />
            <button
              type="button"
              className="btn-icon"
              onClick={() => addLocation(null)}
              aria-label="Save"
            >
              ✅
            </button>
            <button
              type="button"
              className="btn-icon"
              onClick={() => setAddingUnder(null)}
              aria-label="Cancel"
            >
              ✕
            </button>
          </div>
        ) : (
          <div className="tooltip-wrap" data-tooltip="Add new top-level location" style={{ display: 'block' }}>
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
          </div>
        )}
      </div>
    </Layout>
  )
}
