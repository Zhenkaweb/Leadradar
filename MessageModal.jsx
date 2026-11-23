import { useEffect, useState } from 'react'
import { firstMessage } from '../template.js'

export default function MessageModal({ lead, onClose, onSent }) {
  const [text, setText] = useState(() => firstMessage(lead))
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    const onKey = (e) => e.key === 'Escape' && onClose()
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [onClose])

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1500)
  }

  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-head">
          <h2>Zpráva pro {lead.name}</h2>
          <button className="icon-btn" onClick={onClose} aria-label="Zavřít">✕</button>
        </div>
        <p className="hint">Uprav text podle firmy – osobní zpráva funguje mnohem líp než kopie.</p>
        <textarea value={text} onChange={(e) => setText(e.target.value)} rows={14} />
        <div className="modal-actions">
          <button className="btn" onClick={copy}>{copied ? '✓ Zkopírováno' : '📋 Kopírovat'}</button>
          <button className="btn-ghost" onClick={() => { onSent(lead.id); onClose() }}>
            Označit jako osloveno
          </button>
        </div>
      </div>
    </div>
  )
}
