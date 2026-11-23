// Ukládání stavů a poznámek do prohlížeče (localStorage).

const KEY = 'leadradar:v1'

export const STATUSES = [
  { id: 'new', label: 'Nová', color: '#8b93a7' },
  { id: 'contacted', label: 'Osloveno', color: '#4f8cff' },
  { id: 'replied', label: 'Odpověděli', color: '#f5a524' },
  { id: 'client', label: 'Klient 🎉', color: '#22c55e' },
  { id: 'no', label: 'Nemá zájem', color: '#ef4444' },
  { id: 'has_web', label: 'Web už má', color: '#64748b' },
]

export function loadCrm() {
  try {
    return JSON.parse(localStorage.getItem(KEY)) || {}
  } catch {
    return {}
  }
}

export function saveCrm(crm) {
  try {
    localStorage.setItem(KEY, JSON.stringify(crm))
  } catch {
    /* plná paměť nebo soukromý režim – nevadí */
  }
}

export function toCsv(leads, crm) {
  const cols = ['name', 'type', 'address', 'phone', 'email', 'instagram', 'facebook', 'status', 'note', 'googleUrl']
  const esc = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`
  const rows = leads.map((l) => {
    const c = crm[l.id] || {}
    const label = STATUSES.find((s) => s.id === (c.status || 'new'))?.label
    return cols.map((k) => esc(k === 'status' ? label : k === 'note' ? c.note : l[k])).join(',')
  })
  return '﻿' + [cols.join(','), ...rows].join('\n')
}

export function downloadFile(name, text) {
  const blob = new Blob([text], { type: 'text/csv;charset=utf-8' })
  const a = document.createElement('a')
  a.href = URL.createObjectURL(blob)
  a.download = name
  a.click()
  setTimeout(() => URL.revokeObjectURL(a.href), 1000)
}
