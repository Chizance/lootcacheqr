import { useState } from 'react'
import { DictationButton } from './DictationButton'

export function ItemList({ items, onChange }: { items: string[]; onChange: (items: string[]) => void }) {
  const [draft, setDraft] = useState('')

  const addItem = (raw: string) => {
    const clean = raw.trim()
    if (!clean) return
    onChange([...items, clean])
    setDraft('')
  }

  const updateItem = (index: number, value: string) => {
    const next = [...items]
    next[index] = value
    onChange(next)
  }

  const removeItem = (index: number) => {
    onChange(items.filter((_, i) => i !== index))
  }

  return (
    <div>
      {items.length > 0 && (
        <div className="stack" style={{ marginBottom: 8 }}>
          {items.map((item, index) => (
            <div className="item-row" key={index}>
              <input type="text" value={item} onChange={(e) => updateItem(index, e.target.value)} />
              <button type="button" className="btn-icon" onClick={() => removeItem(index)} aria-label="Remove item">
                🗑️
              </button>
            </div>
          ))}
        </div>
      )}
      <div className="field-row">
        <input
          type="text"
          value={draft}
          placeholder="Add an item and press Enter"
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') {
              e.preventDefault()
              addItem(draft)
            }
          }}
        />
        <DictationButton onResult={(text) => addItem(text)} />
        <button type="button" className="btn-icon" onClick={() => addItem(draft)} aria-label="Add item">
          ➕
        </button>
      </div>
    </div>
  )
}
