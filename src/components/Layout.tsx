import { NavLink } from 'react-router-dom'
import type { ReactNode } from 'react'
import { supabase } from '../lib/supabase'

export function Layout({ title, children }: { title: string; children: ReactNode }) {
  return (
    <>
      <div className="top-bar">
        <h1>{title}</h1>
        <button
          type="button"
          className="btn-icon"
          style={{ color: '#fff' }}
          onClick={() => supabase.auth.signOut()}
          aria-label="Sign out"
          title="Sign out"
        >
          🚪
        </button>
      </div>
      <main>{children}</main>
      <nav className="tab-bar">
        <NavLink to="/" end className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="tab-icon">🔍</span>
          Search
        </NavLink>
        <NavLink to="/bin/new" className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="tab-icon">➕</span>
          Add Bin
        </NavLink>
        <NavLink to="/locations" className={({ isActive }) => (isActive ? 'active' : '')}>
          <span className="tab-icon">🗂️</span>
          Locations
        </NavLink>
      </nav>
    </>
  )
}
