import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { supabase } from '../lib/supabase'

// Creates a blank bin row immediately, then redirects to its detail/edit page.
// This keeps BinDetail simple: it always operates on a bin that already
// exists in the database (needed so photo uploads have a bin id to file under).
export function BinNew() {
  const navigate = useNavigate()
  const started = useRef(false)

  useEffect(() => {
    if (started.current) return
    started.current = true

    supabase
      .from('bins')
      .insert({})
      .select('id')
      .single()
      .then(({ data, error }) => {
        if (error || !data) {
          navigate('/', { replace: true })
          return
        }
        navigate(`/bin/${data.id}`, { replace: true })
      })
  }, [navigate])

  return (
    <div className="center-screen">
      <p className="muted">Creating bin…</p>
    </div>
  )
}
