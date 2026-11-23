import { CATEGORIES, formatDistance } from '../overpass.js'
import { STATUSES } from '../storage.js'

export default function LeadCard({ lead, entry, onChange, onMessage }) {
  const status = entry?.status || 'new'
  const current = STATUSES.find((s) => s.id === status)
  const cat = CATEGORIES.find((c) => c.id === lead.category)

  return (
    <article className="card" style={{ '--status': current.color }}>
      <header className="card-head">
        <div className="card-icon">{cat?.emoji || '📍'}</div>
        <div className="card-title">
          <h3>{lead.name}</h3>
          <p>{lead.address || 'Adresa neuvedena'}</p>
        </div>
        <div className="badges">
          {lead.distance != null && <span className="badge dist">📍 {formatDistance(lead.distance)}</span>}
          {lead.hasContact && <span className="badge">kontakt</span>}
        </div>
      </header>

      <div className="contacts">
        {lead.phone && <a href={`tel:${lead.phone.replace(/\s/g, '')}`}>📞 {lead.phone}</a>}
        {lead.email && <a href={`mailto:${lead.email}`}>✉️ {lead.email}</a>}
        {lead.instagram && (
          <a href={lead.instagram.startsWith('http') ? lead.instagram : `https://instagram.com/${lead.instagram.replace('@', '')}`} target="_blank" rel="noreferrer">📸 Instagram</a>
        )}
        {lead.facebook && (
          <a href={lead.facebook.startsWith('http') ? lead.facebook : `https://facebook.com/${lead.facebook}`} target="_blank" rel="noreferrer">👍 Facebook</a>
        )}
        <a href={lead.googleUrl} target="_blank" rel="noreferrer">🔎 Ověřit web</a>
        <a href={lead.mapUrl} target="_blank" rel="noreferrer">🗺️ Mapa</a>
      </div>

      <div className="status-row">
        {STATUSES.map((s) => (
          <button
            key={s.id}
            className={`chip-status ${status === s.id ? 'active' : ''}`}
            style={{ '--c': s.color }}
            onClick={() => onChange(lead.id, { status: s.id })}
          >
            {s.label}
          </button>
        ))}
      </div>

      <textarea
        className="note"
        placeholder="Poznámka: s kým jsem mluvil, kdy zavolat znovu…"
        value={entry?.note || ''}
        onChange={(e) => onChange(lead.id, { note: e.target.value })}
        rows={2}
      />

      <button className="btn-ghost" onClick={() => onMessage(lead)}>
        ✍️ Připravit zprávu
      </button>
    </article>
  )
}
