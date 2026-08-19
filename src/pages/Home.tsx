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
const MAX_SHOWN_MATCHES = 3
const MATCH_SNIPPET_LENGTH = 60

type SortField = 'bin' | 'location' | 'accessed'
type SortDir = 'asc' | 'desc'

interface SearchMatch {
  field: 'Bin' | 'Location' | 'Tag' | 'Item'
  text: string
}

function binDisplayName(bin: BinRow): string {
  return bin.title || bin.number || 'Untitled bin'
}

function truncate(text: string, max: number): string {
  return text.length > max ? `${text.slice(0, max - 1)}…` : text
}

function formatRelativeTime(iso: string): string {
  const diffSec = Math.floor((Date.now() - new Date(iso).getTime()) / 1000)
  if (diffSec < 60) return 'just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDay = Math.floor(diffHr / 24)
  if (diffDay < 30) return `${diffDay}d ago`
  const diffMonth = Math.floor(diffDay / 30)
  if (diffMonth < 12) return `${diffMonth}mo ago`
  return `${Math.floor(diffMonth / 12)}y ago`
}

// Which specific strings on this bin the search keyword actually matched —
// so search results can show *why* a bin matched without opening it.
function findMatches(bin: BinRow, locationLabel: string, query: string): SearchMatch[] {
  const q = query.trim().toLowerCase()
  if (!q) return []
  const matches: SearchMatch[] = []

  for (const text of [bin.title, bin.description, bin.number]) {
    if (text && text.toLowerCase().includes(q)) matches.push({ field: 'Bin', text })
  }
  if (locationLabel.toLowerCase().includes(q)) matches.push({ field: 'Location', text: locationLabel })
  for (const tag of bin.tags) {
    if (tag.toLowerCase().includes(q)) matches.push({ field: 'Tag', text: tag })
  }
  for (const item of bin.items) {
    if (item.toLowerCase().includes(q)) matches.push({ field: 'Item', text: item })
  }
  return matches
}

export function Home() {
  const navigate = useNavigate()
  const [bins, setBins] = useState<BinRow[]>([])
  const [locations, setLocations] = useState<LocationRow[]>([])
  const [query, setQuery] = useState('')
  const [loading, setLoading] = useState(true)
  const [showScanner, setShowScanner] = useState(false)
  const [scanError, setScanError] = useState('')
  const [sortField, setSortField] = useState<SortField>('bin')
  const [sortDir, setSortDir] = useState<SortDir>('asc')

  useEffect(() => {
    let cancelled = false

    async function load() {
      const [binsRes, locationsRes] = await Promise.all([
        supabase.from('bins').select('*'),
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

  // Bin + its resolved location path, computed once per data change so
  // filtering, sorting, and match-highlighting all share the same value.
  const rows = useMemo(
    () => bins.map((bin) => ({ bin, locationLabel: locationPath(bin.location_id, locations) })),
    [bins, locations],
  )

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    if (!q) return rows
    return rows.filter(({ bin, locationLabel }) => {
      const haystack = [bin.title, bin.description, bin.number, locationLabel, ...bin.tags, ...bin.items]
        .join(' ')
        .toLowerCase()
      return haystack.includes(q)
    })
  }, [rows, query])

  const sorted = useMemo(() => {
    const dirMul = sortDir === 'asc' ? 1 : -1
    const copy = [...filtered]
    copy.sort((a, b) => {
      switch (sortField) {
        case 'location':
          return a.locationLabel.localeCompare(b.locationLabel) * dirMul
        case 'accessed':
          return (
            (new Date(a.bin.last_accessed_at).getTime() - new Date(b.bin.last_accessed_at).getTime()) * dirMul
          )
        default:
          return binDisplayName(a.bin).localeCompare(binDisplayName(b.bin)) * dirMul
      }
    })
    return copy
  }, [filtered, sortField, sortDir])

  const toggleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'))
    } else {
      setSortField(field)
      setSortDir('asc')
    }
  }

  const sortArrow = (field: SortField) => (sortField === field ? (sortDir === 'asc' ? ' ▲' : ' ▼') : '')

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

      {!loading && sorted.length === 0 && (
        <p className="muted" style={{ marginTop: 16 }}>
          {query ? 'No matches.' : 'No bins yet — tap Add Bin to create your first one.'}
        </p>
      )}

      {!loading && sorted.length > 0 && (
        <table className="bin-table" style={{ marginTop: 12 }}>
          <thead>
            <tr>
              <th>
                <button type="button" className="sort-header" onClick={() => toggleSort('bin')}>
                  Bin{sortArrow('bin')}
                </button>
              </th>
              <th>
                <button type="button" className="sort-header" onClick={() => toggleSort('location')}>
                  Location{sortArrow('location')}
                </button>
              </th>
              <th>Tags</th>
              <th>
                <button type="button" className="sort-header" onClick={() => toggleSort('accessed')}>
                  Last accessed{sortArrow('accessed')}
                </button>
              </th>
            </tr>
          </thead>
          <tbody>
            {sorted.map(({ bin, locationLabel }) => {
              const goToBin = () => navigate(`/bin/${bin.id}`)
              const matches = query.trim() ? findMatches(bin, locationLabel, query) : []
              const shownMatches = matches.slice(0, MAX_SHOWN_MATCHES)
              const extraCount = matches.length - shownMatches.length
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
                    {binDisplayName(bin)}
                    {bin.number && bin.title && <div className="table-location">#{bin.number}</div>}
                    {shownMatches.length > 0 && (
                      <div className="search-matches">
                        {shownMatches.map((m, i) => (
                          <div className="search-match" key={i}>
                            <span className="search-match-field">{m.field}:</span>{' '}
                            {truncate(m.text, MATCH_SNIPPET_LENGTH)}
                          </div>
                        ))}
                        {extraCount > 0 && <div className="search-match">+{extraCount} more match(es)</div>}
                      </div>
                    )}
                  </td>
                  <td data-label="Location" className="table-location">
                    {locationLabel}
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
                  <td data-label="Last accessed" className="table-location">
                    {formatRelativeTime(bin.last_accessed_at)}
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
