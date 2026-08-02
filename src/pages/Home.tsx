import { useEffect, useMemo, useState } from 'react'
import { Link } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Layout } from '../components/Layout'
import { locationPath } from '../lib/locations'
import type { BinRow, LocationRow } from '../types'

export function Home() {
  const [bins, setBins] = useState<BinRow[]>([])
  const [locations, setLocations] = useState<LocationRow[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [binsRes, locationsRes] = await Promise.all([
        supabase.from('bins').select('*').order('updated_at', { ascending: false }),
        supabase.from('locations').select('*'),
      ])
      if (cancelled) return
      if (binsRes.data) setBins(binsRes.data)
      if (locationsRes.data) setLocations(locationsRes.data)
      setLoading(false)
    }
    load()

    // Live sync: pick up edits made from the other phone.
    const channel = supabase
      .channel('home-sync')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'bins' }, () => load())
      .on('postgres_changes', { event: '*', schema: 'public', table: 'locations' }, () => load())
      .subscribe()

    return () => {
      cancelled = true
      supabase.removeChannel(channel)
    }
  }, [])

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return bins
    return bins.filter((bin) => {
      const haystack = [bin.title, bin.description, bin.number, ...bin.tags, ...bin.items]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [bins, query])

  return (
    <Layout title="Storage Inventory">
      <input
        type="search"
        placeholder="Search items, titles, tags…"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        aria-label="Search bins"
      />

      {loading && <p className="muted" style={{ marginTop: 16 }}>Loading…</p>}

      {!loading && filtered.length === 0 && (
        <p className="muted" style={{ marginTop: 16 }}>
          {query ? 'No matches.' : 'No bins yet — tap Add Bin to create your first one.'}
        </p>
      )}

      <div style={{ marginTop: 12 }}>
        {filtered.map((bin) => (
          <Link to={`/bin/${bin.id}`} className="card" key={bin.id}>
            <div className="card-title">{bin.title || bin.number || 'Untitled bin'}</div>
            <div className="card-sub">
              {bin.number ? `#${bin.number} · ` : ''}
              {locationPath(bin.location_id, locations)}
            </div>
            {bin.tags.length > 0 && (
              <div className="chip-row">
                {bin.tags.map((tag) => (
                  <span className="chip" key={tag}>
                    {tag}
                  </span>
                ))}
              </div>
            )}
          </Link>
        ))}
      </div>
    </Layout>
  )
}
