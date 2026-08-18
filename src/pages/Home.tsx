import { lazy, Suspense, useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'
import { Layout } from '../components/Layout'
import { locationPath } from '../lib/locations'
import type { BinRow, LocationRow } from '../types'

// The QR-decoding library is a meaningful chunk of code that's only needed
// when someone actually opens the scanner — load it on demand instead of
// bundling it into every page load.
const QRScanner = lazy(() => import('../components/QRScanner').then((m) => ({ default: m.QRScanner })))

const BIN_ID_PATTERN = /#\/bin\/([0-9a-fA-F-]{36})/

export function Home() {
  const navigate = useNavigate()
  const [bins, setBins] = useState<BinRow[]>([])
  const [locations, setLocations] = useState<LocationRow[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showScanner, setShowScanner] = useState(false)
  const [scanError, setScanError] = useState('')

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

    // Mobile browsers/PWAs freeze JS execution (and can drop the realtime
    // socket) while backgrounded. Re-fetch whenever the app comes back to
    // the foreground, so reopening it after a while doesn't show stale data
    // until a manual refresh.
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

  const handleScan = (data: string) => {
    const match = data.match(BIN_ID_PATTERN)
    if (match) {
      setShowScanner(false)
      setScanError('')
      navigate(`/bin/${match[1]}`)
    } else {
      setScanError("That doesn't look like a LootcacheQR bin code — try again or scan a different code.")
    }
  }

  return (
    <Layout title="LootcacheQR">
      <div className="field-row">
        <input
          type="search"
          placeholder="Search items, titles, tags…"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          aria-label="Search bins"
        />
        <button
          type="button"
          className="btn-icon"
          onClick={() => {
            setScanError('')
            setShowScanner(true)
          }}
          aria-label="Scan a bin's QR code"
          title="Scan QR code"
        >
          📷
        </button>
      </div>

      {showScanner && (
        <Suspense
          fallback={
            <div className="scanner-overlay">
              <p style={{ color: '#fff' }}>Loading scanner…</p>
            </div>
          }
        >
          <QRScanner onScan={handleScan} onClose={() => setShowScanner(false)} />
        </Suspense>
      )}
      {scanError && (
        <p className="error-banner" style={{ marginTop: 8 }}>
          {scanError}
        </p>
      )}

      {loading && <p className="muted" style={{ marginTop: 16 }}>Loading…</p>}

      {!loading && filtered.length === 0 && (
        <p className="muted" style={{ marginTop: 16 }}>
          {query ? 'No matches.' : 'No bins yet — tap Add Bin to create your first one.'}
        </p>
      )}

      {!loading && filtered.length > 0 && (
        <table className="bin-table" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>Bin</th>
              <th>Location</th>
              <th>Tags</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((bin) => {
              const goToBin = () => navigate(`/bin/${bin.id}`)
              return (
                <tr
                  key={bin.id}
                  tabIndex={0}
                  role="button"
                  onClick={goToBin}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') goToBin()
                  }}
                >
                  <td>
                    {bin.title || bin.number || 'Untitled bin'}
                    {bin.number && bin.title && <div className="table-location">#{bin.number}</div>}
                  </td>
                  <td data-label="Location" className="table-location">
                    {locationPath(bin.location_id, locations)}
                  </td>
                  <td data-label="Tags">
                    {bin.tags.length > 0 ? (
                      <div className="chip-row" style={{ marginTop: 0 }}>
                        {bin.tags.map((tag) => (
                          <span className="chip" key={tag}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="muted">—</span>
                    )}
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      )}
    </Layout>
  )
}
