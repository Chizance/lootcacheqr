import { useState } from 'react'
import { DictationButton } from './DictationButton'

export function TagInput({ tags, onChange }: { tags: string[]; onChange: (tags: string[]) => void }) {
  const [draft, setDraft] = useState('')

  const addTag = (raw: string) => {
    const clean = raw.trim()
    if (!clean) return
    if (tags.some((t) => t.toLowerCase() === clean.toLowerCase())) {
      setDraft('')
      return
    }
    onChange([...tags, clean])
    setDraft('')
  }

  return (
    <div>
      <div className="field-row">
        <input
          type="text"
          value={draft}
          placeholder="Add a tag and press Enter"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addTag(draft)
            }
          }}
        />
        <DictationButton onResult={(text) => addTag(text)} />
        <button type="button" className="btn-icon" onClick={() => addTag(draft)} aria-label="Add tag">
          ➕
        </button>
      </div>
      {tags.length > 0 && (
        <div className="chip-row">
          {tags.map((tag) => (
            <span className="chip" key={tag}>
              {tag}
              <button
                type="button"
                onClick={() => onChange(tags.filter((t) => t !== tag))}
                aria-label={`Remove tag ${tag}`}
              >
                ✕
              </button>
            </span>
          ))}
        </div>
      )}
    </div>
  )
}
