export function minutesToHHMM(minutes: number | null | undefined): string {
  if (!minutes && minutes !== 0) return '—'
  const h = Math.floor(Math.abs(minutes) / 60)
  const m = Math.abs(minutes) % 60
  const sign = minutes < 0 ? '-' : ''
  return `${sign}${h}h${m.toString().padStart(2, '0')}`
}

export function heuresLabel(heures: number): string {
  const h = Math.floor(Math.abs(heures))
  const m = Math.round((Math.abs(heures) - h) * 60)
  const sign = heures < 0 ? '-' : ''
  return `${sign}${h}h${m.toString().padStart(2, '0')}`
}

export function getCurrentTime(): string {
  return new Date().toTimeString().slice(0, 5)
}

export function getTodayISO(): string {
  return new Date().toISOString().split('T')[0]
}

export function getMoisAnnee(annee: number, mois: number): string {
  return new Intl.DateTimeFormat('fr-FR', { month: 'long', year: 'numeric' })
    .format(new Date(annee, mois - 1, 1))
}

export function formatHeure(heure: string | null | undefined): string {
  if (!heure) return '—'
  return heure.slice(0, 5)
}

export function joursOuvresMois(annee: number, mois: number): number {
  const debut = new Date(annee, mois - 1, 1)
  const fin = new Date(annee, mois, 0)
  let count = 0
  const cur = new Date(debut)
  while (cur <= fin) {
    const dow = cur.getDay()
    if (dow !== 0 && dow !== 6) count++
    cur.setDate(cur.getDate() + 1)
  }
  return count
}

export function pctColor(pct: number): string {
  if (pct >= 100) return '#3B6D11'
  if (pct >= 80)  return '#378ADD'
  if (pct >= 60)  return '#BA7517'
  return '#E24B4A'
}
