// Hledání firem bez webu přes OpenStreetMap (Overpass API).
// Data © přispěvatelé OpenStreetMap, licence ODbL.

const ENDPOINTS = [
  'https://overpass-api.de/api/interpreter',
  'https://overpass.kumi.systems/api/interpreter',
]

export const CATEGORIES = [
  { id: 'beauty', label: 'Kadeřnictví & beauty', emoji: '💇', filter: '["shop"~"^(hairdresser|beauty|cosmetics|massage|tattoo|nails)$"]' },
  { id: 'food', label: 'Kavárny & restaurace', emoji: '☕', filter: '["amenity"~"^(cafe|restaurant|fast_food|bar|pub|ice_cream)$"]' },
  { id: 'fitness', label: 'Fitness & sport', emoji: '🏋️', filter: '["leisure"~"^(fitness_centre|sports_centre|dance)$"]' },
  { id: 'shops', label: 'Malé obchody', emoji: '🛍️', filter: '["shop"~"^(clothes|shoes|florist|gift|bakery|butcher|jewelry|bicycle|pet|furniture|optician|tailor)$"]' },
  { id: 'auto', label: 'Autoservisy', emoji: '🔧', filter: '["shop"~"^(car_repair|tyres|car_parts)$"]' },
  { id: 'craft', label: 'Řemeslníci', emoji: '🪚', filter: '["craft"]' },
  { id: 'services', label: 'Kanceláře & služby', emoji: '💼', filter: '["office"~"^(accountant|lawyer|estate_agent|insurance|travel_agent)$"]' },
  { id: 'health', label: 'Zubaři & veterináři', emoji: '🦷', filter: '["amenity"~"^(dentist|veterinary|clinic|doctors)$"]' },
  { id: 'driving', label: 'Autoškoly', emoji: '🚗', filter: '["amenity"="driving_school"]' },
]

const NO_WEBSITE = '["name"][!"website"][!"contact:website"][!"url"][!"brand"]'

function escapeOql(s) {
  return s.replace(/\\/g, '\\\\').replace(/"/g, '\\"')
}

// place = { city: 'Praha' }  nebo  { lat, lon, radius }  (radius v metrech)
export function buildQuery(place, categoryIds) {
  const cats = CATEGORIES.filter((c) => categoryIds.includes(c.id))
  if (place.lat != null) {
    const around = `(around:${Math.round(place.radius)},${place.lat.toFixed(6)},${place.lon.toFixed(6)})`
    const parts = cats.map((c) => `nwr${around}${c.filter}${NO_WEBSITE};`).join('')
    return `[out:json][timeout:90];(${parts});out center tags 2000;`
  }
  const area = `area["name"="${escapeOql(place.city.trim())}"]["boundary"="administrative"]["admin_level"~"^[4-8]$"]->.a;`
  const parts = cats.map((c) => `nwr(area.a)${c.filter}${NO_WEBSITE};`).join('')
  return `[out:json][timeout:120];${area}(${parts});out center tags 2000;`
}

// vzdálenost dvou bodů v metrech (Haversine)
export function distance(a, b) {
  const R = 6371000
  const toRad = (d) => (d * Math.PI) / 180
  const dLat = toRad(b.lat - a.lat)
  const dLon = toRad(b.lon - a.lon)
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(a.lat)) * Math.cos(toRad(b.lat)) * Math.sin(dLon / 2) ** 2
  return 2 * R * Math.asin(Math.sqrt(h))
}

export function formatDistance(m) {
  if (m == null) return ''
  return m < 1000 ? `${Math.round(m / 10) * 10} m` : `${(m / 1000).toFixed(1).replace(/\.0$/, '').replace('.', ',')} km`
}

export function getMyLocation() {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) {
      reject(new Error('Tento prohlížeč neumí zjistit polohu.'))
      return
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lon: pos.coords.longitude }),
      (err) => reject(new Error(
        err.code === 1
          ? 'Přístup k poloze byl zamítnut. Povol ho v nastavení prohlížeče.'
          : 'Polohu se nepodařilo zjistit. Zkus to znovu venku nebo zapni GPS.'
      )),
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 60000 }
    )
  })
}

function categoryOf(tags) {
  for (const c of CATEGORIES) {
    // jednoduché zařazení podle hlavního klíče
    const m = c.filter.match(/\["(\w+)"(?:~"\^\(([^)]*)\)\$"|="([^"]+)")?\]/)
    if (!m) continue
    const [, key, list, single] = m
    if (!(key in tags)) continue
    if (!list && !single) return c.id
    const values = list ? list.split('|') : [single]
    if (values.includes(tags[key])) return c.id
  }
  return null
}

export function parseElements(json, city, origin) {
  const seen = new Set()
  const leads = []
  for (const el of json.elements || []) {
    const t = el.tags || {}
    const name = (t.name || '').trim()
    if (!name) continue
    const street = [t['addr:street'], t['addr:housenumber']].filter(Boolean).join(' ')
    const key = `${name.toLowerCase()}|${street.toLowerCase()}`
    if (seen.has(key)) continue
    seen.add(key)

    const lat = el.lat ?? el.center?.lat
    const lon = el.lon ?? el.center?.lon
    const phone = t.phone || t['contact:phone'] || ''
    const email = t.email || t['contact:email'] || ''
    const instagram = t['contact:instagram'] || ''
    const facebook = t['contact:facebook'] || ''
    const place = t['addr:city'] || city

    leads.push({
      id: `${el.type}/${el.id}`,
      name,
      category: categoryOf(t),
      type: t.shop || t.amenity || t.leisure || t.craft || t.office || '',
      address: [street, place].filter(Boolean).join(', '),
      phone,
      email,
      instagram,
      facebook,
      hasContact: Boolean(phone || email || instagram || facebook),
      lat,
      lon,
      distance: origin && lat != null ? distance(origin, { lat, lon }) : null,
      googleUrl: `https://www.google.com/search?q=${encodeURIComponent(`${name} ${street} ${place}`)}`,
      mapUrl: lat && lon
        ? `https://www.google.com/maps/search/?api=1&query=${lat},${lon}`
        : `https://www.openstreetmap.org/${el.type}/${el.id}`,
    })
  }
  if (origin) leads.sort((a, b) => (a.distance ?? 1e9) - (b.distance ?? 1e9))
  else leads.sort((a, b) => Number(b.hasContact) - Number(a.hasContact) || a.name.localeCompare(b.name, 'cs'))
  return leads
}

export async function searchLeads(place, categoryIds, signal) {
  const body = new URLSearchParams({ data: buildQuery(place, categoryIds) })
  const origin = place.lat != null ? { lat: place.lat, lon: place.lon } : null
  const cityLabel = place.city || ''
  let lastError
  for (const url of ENDPOINTS) {
    try {
      const res = await fetch(url, { method: 'POST', body, signal })
      if (!res.ok) throw new Error(`Server odpověděl ${res.status}`)
      const json = await res.json()
      return parseElements(json, cityLabel, origin)
    } catch (e) {
      if (e.name === 'AbortError') throw e
      lastError = e
    }
  }
  throw lastError || new Error('Nepodařilo se načíst data')
}
