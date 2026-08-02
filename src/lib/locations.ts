import type { LocationRow } from '../types'

export interface LocationNode extends LocationRow {
  children: LocationNode[]
  depth: number
}

/** Turns the flat locations table into a nested tree, sorted by name at each level. */
export function buildLocationTree(rows: LocationRow[]): LocationNode[] {
  const byId = new Map<string, LocationNode>()
  for (const row of rows) {
    byId.set(row.id, { ...row, children: [], depth: 0 })
  }

  const roots: LocationNode[] = []
  for (const node of byId.values()) {
    if (node.parent_id && byId.has(node.parent_id)) {
      byId.get(node.parent_id)!.children.push(node)
    } else {
      roots.push(node)
    }
  }

  const sortAndDepth = (nodes: LocationNode[], depth: number) => {
    nodes.sort((a, b) => a.name.localeCompare(b.name))
    for (const n of nodes) {
      n.depth = depth
      sortAndDepth(n.children, depth + 1)
    }
  }
  sortAndDepth(roots, 0)

  return roots
}

/** Flattens a tree into a depth-ordered list for rendering an indented <select>/list. */
export function flattenTree(nodes: LocationNode[]): LocationNode[] {
  const out: LocationNode[] = []
  const walk = (list: LocationNode[]) => {
    for (const n of list) {
      out.push(n)
      walk(n.children)
    }
  }
  walk(nodes)
  return out
}

/** "Backyard > Shelf A > Bottom Row" style breadcrumb for a given location id. */
export function locationPath(locationId: string | null, rows: LocationRow[]): string {
  if (!locationId) return 'Unassigned'
  const byId = new Map(rows.map((r) => [r.id, r]))
  const parts: string[] = []
  let current = byId.get(locationId)
  let guard = 0
  while (current && guard < 50) {
    parts.unshift(current.name)
    current = current.parent_id ? byId.get(current.parent_id) : undefined
    guard++
  }
  return parts.length ? parts.join(' > ') : 'Unassigned'
}

/** Every descendant id of a location, used to block moving a location into its own subtree. */
export function descendantIds(locationId: string, rows: LocationRow[]): Set<string> {
  const children = new Map<string, string[]>()
  for (const r of rows) {
    if (!r.parent_id) continue
    if (!children.has(r.parent_id)) children.set(r.parent_id, [])
    children.get(r.parent_id)!.push(r.id)
  }
  const result = new Set<string>()
  const stack = [...(children.get(locationId) ?? [])]
  while (stack.length) {
    const id = stack.pop()!
    if (result.has(id)) continue
    result.add(id)
    stack.push(...(children.get(id) ?? []))
  }
  return result
}
