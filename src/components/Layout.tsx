import { NavLink } from 'react-router-dom'
import { useEffect, useState, type ReactNode } from 'react'
import { supabase } from '../lib/supabase'
import type { User } from '@supabase/supabase-js'

export function Layout({ title, children }: { title: string; children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => setUser(data.user))
  }, [])

  return (
    <>
      <div className="top-bar">
        <div className="top-bar-content">
          <span className="top-bar-brand">LootcacheQR</span>
          <h1>{title}</h1>
        </div>
        <div className="top-bar-right">
          {user && (
            <span className="top-bar-user" title={user.email}>
              {user.email?.split('@')[0]}
            </span>
          )}
          <button
            type="button"
            className="btn-signout"
            onClick={() => supabase.auth.signOut()}
          >
            Sign out
          </button>
        </div>
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
