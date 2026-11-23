import { useEffect, useMemo, useRef, useState } from 'react'
import { CATEGORIES, formatDistance, getMyLocation, searchLeads } from './overpass.js'
import { STATUSES, downloadFile, loadCrm, saveCrm, toCsv } from './storage.js'
import LeadCard from './components/LeadCard.jsx'
import MessageModal from './components/MessageModal.jsx'

const LEADS_KEY = 'leadradar:leads'
const PAGE = 60
const RADII = [500, 1000, 2000, 5000]

function loadLeads() {
  try {
    return { city: 'Praha', mode: 'city', items: [], ...JSON.parse(localStorage.getItem(LEADS_KEY)) }
  } catch {
    return { city: 'Praha', mode: 'city', items: [] }
  }
}

export default function App() {
  const saved = useMemo(loadLeads, [])
  const [city, setCity] = useState(saved.city)
  const [mode, setMode] = useState(saved.mode)
  const [radius, setRadius] = useState(1000)
  const [locating, setLocating] = useState(false)
  const [lastSearch, setLastSearch] = useState(saved.label || '')
  const [cats, setCats] = useState(['beauty', 'food'])
  const [leads, setLeads] = useState(saved.items)
  const [crm, setCrm] = useState(loadCrm)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [catFilter, setCatFilter] = useState('all')
  const [onlyContact, setOnlyContact] = useState(false)
  const [limit, setLimit] = useState(PAGE)
  const [messageLead, setMessageLead] = useState(null)
  const abortRef = useRef(null)

  useEffect(() => saveCrm(crm), [crm])

  function toggleCat(id) {
    setCats((c) => (c.includes(id) ? c.filter((x) => x !== id) : [...c, id]))
  }

  async function search(e) {
    e?.preventDefault()
    if (cats.length === 0) return
    if (mode === 'city' && !city.trim()) return
    abortRef.current?.abort()
    const ctrl = new AbortController()
    abortRef.current = ctrl
    setError('')
    try {
      let place = { city }
      let label = city
      if (mode === 'near') {
        setLocating(true)
        const me = await getMyLocation().finally(() => setLocating(false))
        place = { ...me, radius }
        label = `do ${formatDistance(radius)} ode mě`
      }
      setLoading(true)
      const found = await searchLeads(place, cats, ctrl.signal)
      setLeads(found)
      setLastSearch(label)
      setLimit(PAGE)
      setCatFilter('all')
      try {
        localStorage.setItem(LEADS_KEY, JSON.stringify({ city, mode, label, items: found }))
      } catch { /* ignore */ }
      if (found.length === 0) {
        setError(mode === 'near'
          ? 'V okolí jsem nic nenašel. Zkus větší okruh nebo víc oborů.'
          : `Pro „${city}“ jsem nic nenašel. Zkus přesný název obce (např. Praha, Brno, Plzeň).`)
      }
    } catch (err) {
      if (err.name !== 'AbortError') {
        setError(mode === 'near' && !String(err.message).includes('Server')
          ? err.message
          : `Chyba při hledání: ${err.message}. Zkus to za chvíli znovu.`)
      }
    } finally {
      setLoading(false)
      setLocating(false)
    }
  }

  function updateLead(id, patch) {
    setCrm((c) => ({ ...c, [id]: { ...c[id], ...patch, updated: Date.now() } }))
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase()
    return leads.filter((l) => {
      const st = crm[l.id]?.status || 'new'
      if (statusFilter !== 'all' && st !== statusFilter) return false
      if (catFilter !== 'all' && l.category !== catFilter) return false
      if (onlyContact && !l.hasContact) return false
      if (q && !`${l.name} ${l.address} ${l.type}`.toLowerCase().includes(q)) return false
      return true
    })
  }, [leads, crm, query, statusFilter, catFilter, onlyContact])

  const stats = useMemo(() => {
    const count = (s) => leads.filter((l) => (crm[l.id]?.status || 'new') === s).length
    return {
      total: leads.length,
      contact: leads.filter((l) => l.hasContact).length,
      contacted: count('contacted') + count('replied') + count('client') + count('no'),
      clients: count('client'),
    }
  }, [leads, crm])

  const presentCats = CATEGORIES.filter((c) => leads.some((l) => l.category === c.id))

  return (
    <div className="app">
      <nav className="nav">
        <div className="logo">
          <span className="logo-dot" />
          LeadRadar
        </div>
        <a className="author" href="https://jazzhe-web.store" target="_blank" rel="noreferrer">
          <span className="author-mark">J</span>
          by <strong>Jazzhe</strong>
        </a>
      </nav>

      <header className="hero">
        <h1>Najdi firmy, které ještě <span className="grad">nemají web</span></h1>
        <p className="sub">Vyber město a obory. Ukážu ti malé firmy bez webu, jejich kontakty a pomůžu ti je oslovit.</p>

        <div className="mode" role="tablist">
          <button type="button" className={mode === 'city' ? 'on' : ''} onClick={() => setMode('city')}>🏙️ Podle města</button>
          <button type="button" className={mode === 'near' ? 'on' : ''} onClick={() => setMode('near')}>📍 V mém okolí</button>
        </div>

        <form className="search" onSubmit={search}>
          {mode === 'city' ? (
            <input
              className="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="Město, např. Praha"
              aria-label="Město"
            />
          ) : (
            <div className="radius">
              <span>Okruh</span>
              {RADII.map((r) => (
                <button key={r} type="button" className={radius === r ? 'on' : ''} onClick={() => setRadius(r)}>
                  {formatDistance(r)}
                </button>
              ))}
            </div>
          )}
          <button className="btn btn-big" disabled={loading || locating || cats.length === 0}>
            {loading || locating ? <span className="spinner" /> : mode === 'near' ? '📍' : '🔍'}{' '}
            {locating ? 'Zjišťuji polohu…' : loading ? 'Hledám…' : mode === 'near' ? 'Najít poblíž' : 'Hledat'}
          </button>
        </form>
        {mode === 'near' && !loading && !locating && (
          <p className="hint center">Prohlížeč se zeptá na povolení polohy. Použije se jen pro vyhledávání a nikam se neukládá.</p>
        )}

        <div className="cats">
          {CATEGORIES.map((c) => (
            <button
              key={c.id}
              type="button"
              className={`chip ${cats.includes(c.id) ? 'on' : ''}`}
              onClick={() => toggleCat(c.id)}
            >
              {c.emoji} {c.label}
            </button>
          ))}
        </div>
        {loading && <p className="hint center">Prohledávám mapu… může to trvat až minutu.</p>}
        {error && <p className="error">{error}</p>}
      </header>

      {leads.length === 0 && !loading && (
        <section className="steps">
          {[
            ['🔍', 'Najdi', 'Vyber město a obory. LeadRadar projde mapu a ukáže firmy, které nemají vlastní web.'],
            ['✅', 'Ověř', 'Jedním klikem zkontroluješ v Googlu, že firma web opravdu nemá.'],
            ['💬', 'Oslov', 'Připrav osobní zprávu, zavolej nebo napiš a sleduj, kdo se stal klientem.'],
          ].map(([icon, title, text], i) => (
            <div className="step" key={title}>
              <span className="step-num">0{i + 1}</span>
              <div className="step-icon">{icon}</div>
              <h3>{title}</h3>
              <p>{text}</p>
            </div>
          ))}
        </section>
      )}

      {leads.length > 0 && (
        <>
          <section className="stats">
            <Stat value={stats.total} label="firem bez webu" />
            <Stat value={stats.contact} label="s kontaktem" />
            <Stat value={stats.contacted} label="osloveno" />
            <Stat value={stats.clients} label="klientů" accent />
          </section>

          <section className="toolbar">
            <input
              className="filter-input"
              placeholder="Hledat v seznamu…"
              value={query}
              onChange={(e) => { setQuery(e.target.value); setLimit(PAGE) }}
            />
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
              <option value="all">Všechny stavy</option>
              {STATUSES.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
            </select>
            {presentCats.length > 1 && (
              <select value={catFilter} onChange={(e) => setCatFilter(e.target.value)}>
                <option value="all">Všechny obory</option>
                {presentCats.map((c) => <option key={c.id} value={c.id}>{c.emoji} {c.label}</option>)}
              </select>
            )}
            <label className="toggle">
              <input type="checkbox" checked={onlyContact} onChange={(e) => setOnlyContact(e.target.checked)} />
              Jen s kontaktem
            </label>
            <button className="btn-ghost" onClick={() => downloadFile(`leadradar-${city}.csv`, toCsv(filtered, crm))}>
              ⬇️ Export CSV
            </button>
          </section>

          <p className="count">
            {lastSearch && <>Hledáno: <strong>{lastSearch}</strong> · </>}
            Zobrazeno {Math.min(limit, filtered.length)} z {filtered.length}
          </p>

          <section className="grid">
            {filtered.slice(0, limit).map((l) => (
              <LeadCard key={l.id} lead={l} entry={crm[l.id]} onChange={updateLead} onMessage={setMessageLead} />
            ))}
          </section>

          {filtered.length > limit && (
            <div className="center">
              <button className="btn-ghost" onClick={() => setLimit((n) => n + PAGE)}>Načíst další</button>
            </div>
          )}
        </>
      )}

      <footer className="footer">
        <div className="footer-brand">
          <span className="author-mark big">J</span>
          <div>
            <strong>Jazzhe</strong>
            <span>Weby pro malé firmy · Praha</span>
          </div>
          <a className="btn-ghost" href="https://jazzhe-web.store" target="_blank" rel="noreferrer">jazzhe-web.store ↗</a>
        </div>
        <p>
          © {new Date().getFullYear()} LeadRadar by Jazzhe. Data © přispěvatelé{' '}
          <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noreferrer">OpenStreetMap</a> (ODbL).
          Mapa nemusí být úplná – web si u každé firmy ověř. Nepoužívej hromadné e-maily, oslovuj osobně.
        </p>
      </footer>

      {messageLead && (
        <MessageModal
          lead={messageLead}
          onClose={() => setMessageLead(null)}
          onSent={(id) => updateLead(id, { status: 'contacted' })}
        />
      )}
    </div>
  )
}

function Stat({ value, label, accent }) {
  return (
    <div className={`stat ${accent ? 'accent' : ''}`}>
      <strong>{value}</strong>
      <span>{label}</span>
    </div>
  )
}
