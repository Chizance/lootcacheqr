import { buildLocationTree, flattenTree } from '../lib/locations'
import type { LocationRow } from '../types'

export function LocationPicker({
  locations,
  value,
  onChange,
}: {
  locations: LocationRow[]
  value: string | null
  onChange: (locationId: string | null) => void
}) {
  const flat = flattenTree(buildLocationTree(locations))

  return (
    <select value={value ?? ''} onChange={(e) => onChange(e.target.value || null)}>
      <option value="">Unassigned</option>
      {flat.map((loc) => (
        <option key={loc.id} value={loc.id}>
          {'—'.repeat(loc.depth)} {loc.name}
        </option>
      ))}
    </select>
  )
}
