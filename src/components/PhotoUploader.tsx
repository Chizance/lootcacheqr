import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'
import { PhotoLightbox } from './PhotoLightbox'

export const PHOTO_BUCKET = 'bin-photos'

export function PhotoUploader({
  binId,
  photos,
  onChange,
  mainPhoto,
  onMainPhotoChange,
}: {
  binId: string
  photos: string[]
  onChange: (photos: string[]) => void
  mainPhoto: string | null
  onMainPhotoChange: (path: string | null) => void
}) {
  const [urls, setUrls] = useState<Record<string, string>>({})
  const [uploading, setUploading] = useState(false)
  const [error, setError] = useState('')
  const [expandedPath, setExpandedPath] = useState<string | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    let cancelled = false
    const missing = photos.filter((path) => !urls[path])
    if (missing.length === 0) return

    Promise.all(
      missing.map(async (path) => {
        const { data, error: downloadError } = await supabase.storage.from(PHOTO_BUCKET).download(path)
        if (downloadError || !data) return null
        return [path, URL.createObjectURL(data)] as const
      }),
    ).then((entries) => {
      if (cancelled) return
      const next: Record<string, string> = {}
      for (const entry of entries) {
        if (entry) next[entry[0]] = entry[1]
      }
      if (Object.keys(next).length) setUrls((prev) => ({ ...prev, ...next }))
    })

    return () => {
      cancelled = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [photos])

  const handleFiles = async (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0) return
    setUploading(true)
    setError('')
    try {
      const newPaths: string[] = []
      for (const file of Array.from(fileList)) {
        const ext = file.name.split('.').pop() || 'jpg'
        const path = `${binId}/${crypto.randomUUID()}.${ext}`
        const { error: uploadError } = await supabase.storage.from(PHOTO_BUCKET).upload(path, file, {
          contentType: file.type || 'image/jpeg',
        })
        if (uploadError) throw uploadError
        newPaths.push(path)
      }
      onChange([...photos, ...newPaths])
      // First photo(s) added to an empty bin become the main photo by default.
      if (!mainPhoto && newPaths.length) onMainPhotoChange(newPaths[0])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Photo upload failed')
    } finally {
      setUploading(false)
      if (fileInputRef.current) fileInputRef.current.value = ''
    }
  }

  const removePhoto = async (path: string) => {
    onChange(photos.filter((p) => p !== path))
    if (mainPhoto === path) onMainPhotoChange(null)
    await supabase.storage.from(PHOTO_BUCKET).remove([path])
  }

  return (
    <div>
      {photos.length > 0 && (
        <div className="photo-grid">
          {photos.map((path) => {
            const isMain = mainPhoto === path
            return (
              <div
                className="photo-thumb"
                key={path}
                onClick={() => urls[path] && setExpandedPath(path)}
                role={urls[path] ? 'button' : undefined}
                tabIndex={urls[path] ? 0 : undefined}
              >
                {urls[path] ? <img src={urls[path]} alt="Bin contents — tap to expand" /> : null}
                <button
                  type="button"
                  className="photo-thumb-star"
                  onClick={(e) => {
                    e.stopPropagation()
                    onMainPhotoChange(isMain ? null : path)
                  }}
                  aria-label={isMain ? 'Unset as main photo' : 'Set as main photo'}
                  title={isMain ? 'Main photo — tap to unset' : 'Set as main photo'}
                >
                  {isMain ? '⭐' : '☆'}
                </button>
                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation()
                    removePhoto(path)
                  }}
                  aria-label="Remove photo"
                >
                  ✕
                </button>
              </div>
            )
          })}
        </div>
      )}
      {photos.length > 0 && (
        <p className="muted" style={{ fontSize: '0.8rem', marginTop: 6 }}>
          ⭐ marks the main photo — shown on the Search page. Tap the star on any photo to change it.
        </p>
      )}

      {expandedPath && urls[expandedPath] && (
        <PhotoLightbox src={urls[expandedPath]} onClose={() => setExpandedPath(null)} />
      )}

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        capture="environment"
        multiple
        style={{ display: 'none' }}
        onChange={(e) => handleFiles(e.target.files)}
      />
      <button
        type="button"
        className="btn-secondary"
        style={{ marginTop: 10 }}
        disabled={uploading}
        onClick={() => fileInputRef.current?.click()}
      >
        {uploading ? 'Uploading…' : '📷 Add photo'}
      </button>
      {error && (
        <p className="error-banner" style={{ marginTop: 8 }}>
          {error}
        </p>
      )}
    </div>
  )
}
