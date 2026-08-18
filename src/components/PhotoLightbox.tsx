import { useEffect } from 'react'

// Full-screen photo viewer. Pinch-zoom and panning both come from the
// browser's native gesture handling (the page's viewport meta tag allows
// scaling) — no custom gesture code needed.
export function PhotoLightbox({ src, onClose }: { src: string; onClose: () => void }) {
  useEffect(() => {
    const handleKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKey)
    return () => window.removeEventListener('keydown', handleKey)
  }, [onClose])

  return (
    <div className="lightbox-overlay" onClick={onClose}>
      <button type="button" className="lightbox-close" onClick={onClose} aria-label="Close photo">
        ✕
      </button>
      <div className="lightbox-scroll" onClick={(e) => e.stopPropagation()}>
        <img src={src} alt="Bin photo, full size" className="lightbox-image" />
      </div>
    </div>
  )
}
