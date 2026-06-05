import type { JourFerie } from './types-conges'

/**
 * Calcule le nombre de jours ouvrés entre deux dates
 * en excluant week-ends et jours fériés
 */
export function calculerJoursOuvres(
  debut: Date,
  fin: Date,
  feriesDates: Set<string>
): number {
  let jours = 0
  const current = new Date(debut)
  current.setHours(0, 0, 0, 0)
  const end = new Date(fin)
  end.setHours(0, 0, 0, 0)

  while (current <= end) {
    const dow = current.getDay()
    const iso = current.toISOString().split('T')[0]
    if (dow !== 0 && dow !== 6 && !feriesDates.has(iso)) {
      jours++
    }
    current.setDate(current.getDate() + 1)
  }
  return jours
}

export function feriesSet(feries: JourFerie[]): Set<string> {
  return new Set(feries.map(f => f.date))
}

export function formatDateFR(date: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: 'long', year: 'numeric'
  }).format(new Date(date))
}

export function formatDateShortFR(date: string): string {
  return new Intl.DateTimeFormat('fr-FR', {
    day: '2-digit', month: 'short'
  }).format(new Date(date))
}

export function statutLabel(statut: string): string {
  const map: Record<string, string> = {
    en_attente: 'En attente',
    validee: 'Validée',
    refusee: 'Refusée',
    annulee: 'Annulée',
  }
  return map[statut] ?? statut
}

export function statutColor(statut: string): string {
  const map: Record<string, string> = {
    en_attente: 'bg-amber-50 text-amber-700 border-amber-200',
    validee:    'bg-green-50 text-green-700 border-green-200',
    refusee:    'bg-red-50 text-red-700 border-red-200',
    annulee:    'bg-gray-100 text-gray-500 border-gray-200',
  }
  return map[statut] ?? 'bg-gray-100 text-gray-500'
}

/**
 * Génère les jours d'un mois pour l'affichage calendrier
 */
export function getMoisCalendrier(annee: number, mois: number) {
  const premier = new Date(annee, mois, 1)
  const dernier = new Date(annee, mois + 1, 0)
  const premierDow = (premier.getDay() + 6) % 7 // Lundi = 0

  const jours: Array<{ date: Date | null; num: number | null }> = []
  for (let i = 0; i < premierDow; i++) jours.push({ date: null, num: null })
  for (let d = 1; d <= dernier.getDate(); d++) {
    jours.push({ date: new Date(annee, mois, d), num: d })
  }
  return jours
}

export const MOIS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
]
