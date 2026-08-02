import { useEffect, useState } from 'react'
import QRCode from 'qrcode'

export function binUrl(binId: string): string {
  return `${window.location.origin}${import.meta.env.BASE_URL}#/bin/${binId}`
}

export function QRCodeCard({ binId, label }: { binId: string; label: string }) {
  const [dataUrl, setDataUrl] = useState('')
  const url = binUrl(binId)

  useEffect(() => {
    QRCode.toDataURL(url, { width: 600, margin: 2 }).then(setDataUrl)
  }, [url])

  const download = () => {
    const a = document.createElement('a')
    a.href = dataUrl
    a.download = `bin-qr-${label || binId}.png`
    a.click()
  }

  return (
    <div className="qr-box">
      {dataUrl ? <img src={dataUrl} alt={`QR code for bin ${label}`} /> : <p className="muted">Generating…</p>}
      <p className="muted" style={{ fontSize: '0.8rem', wordBreak: 'break-all', textAlign: 'center' }}>
        {url}
      </p>
      <button type="button" className="btn-secondary" onClick={download} disabled={!dataUrl}>
        ⬇️ Download QR to print
      </button>
    </div>
  )
}
