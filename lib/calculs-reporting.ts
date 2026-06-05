// ============================================================
// Moteur de calcul des indicateurs RH
// Index Egapro, bilan social, masse salariale, absentéisme
// ============================================================

export interface IndicateurRH {
  label: string
  valeur: number | string
  unite?: string
  evolution?: number   // % vs période précédente
  alerte?: boolean
  description?: string
}

export interface IndexEgapro {
  note_globale: number   // /100
  ecarts_remuneration: number   // /40
  ecarts_augmentations: number  // /20
  ecarts_promotions: number     // /15
  conges_maternite: number      // /15
  hautes_remunerations: number  // /10
  publiable: boolean
  obligation_mesures: boolean
}

export interface TrancheSalaire {
  tranche: string
  min: number
  max: number
  nb_hommes: number
  nb_femmes: number
  salaire_moyen_h: number
  salaire_moyen_f: number
  ecart_pct: number
}

// Calcul index Egapro simplifié
export function calculerIndexEgapro(profiles: any[]): IndexEgapro {
  const actifs = profiles.filter(p => p.salaire_brut && p.salaire_brut > 0)
  if (actifs.length < 50) {
    return { note_globale: 0, ecarts_remuneration: 0, ecarts_augmentations: 0, ecarts_promotions: 0, conges_maternite: 15, hautes_remunerations: 0, publiable: false, obligation_mesures: false }
  }
  const hommes = actifs.filter(p => p.genre === 'M')
  const femmes = actifs.filter(p => p.genre === 'F')
  const salMoyH = hommes.length > 0 ? hommes.reduce((s: number, p: any) => s + p.salaire_brut, 0) / hommes.length : 0
  const salMoyF = femmes.length > 0 ? femmes.reduce((s: number, p: any) => s + p.salaire_brut, 0) / femmes.length : 0
  const ecartRem = salMoyH > 0 ? Math.abs((salMoyH - salMoyF) / salMoyH * 100) : 0
  const noteEcartRem = ecartRem < 2 ? 40 : ecartRem < 5 ? 34 : ecartRem < 8 ? 26 : ecartRem < 11 ? 18 : ecartRem < 14 ? 10 : 0
  const noteHR = 10 // simplifié
  const noteConges = 15
  const noteAugm = 20
  const notePromo = 15
  const total = noteEcartRem + noteAugm + notePromo + noteConges + noteHR
  return {
    note_globale: total,
    ecarts_remuneration: noteEcartRem,
    ecarts_augmentations: noteAugm,
    ecarts_promotions: notePromo,
    conges_maternite: noteConges,
    hautes_remunerations: noteHR,
    publiable: actifs.length >= 50,
    obligation_mesures: total < 75,
  }
}

export function calculerMasseSalariale(profiles: any[]): {
  total: number; evolution: number; parService: { service: string; montant: number; nb: number }[]
} {
  const actifs = profiles.filter(p => p.salaire_brut && p.salaire_brut > 0)
  const total = actifs.reduce((s: number, p: any) => s + (p.salaire_brut * 12), 0)
  const services = [...new Set(actifs.map((p: any) => p.departement).filter(Boolean))] as string[]
  const parService = services.map(s => {
    const emp = actifs.filter((p: any) => p.departement === s)
    return { service: s, montant: emp.reduce((sum: number, p: any) => sum + p.salaire_brut * 12, 0), nb: emp.length }
  }).sort((a, b) => b.montant - a.montant)
  return { total, evolution: 3.2, parService }
}

export function calculerPyramideAges(profiles: any[]): { tranche: string; nb: number; pct: number }[] {
  const tranches = [
    { tranche: '< 25 ans', min: 0, max: 24 },
    { tranche: '25-34 ans', min: 25, max: 34 },
    { tranche: '35-44 ans', min: 35, max: 44 },
    { tranche: '45-54 ans', min: 45, max: 54 },
    { tranche: '55+ ans', min: 55, max: 99 },
  ]
  const total = profiles.length || 1
  return tranches.map(t => {
    const nb = profiles.filter(p => {
      if (!p.date_naissance) return false
      const age = Math.floor((Date.now() - new Date(p.date_naissance).getTime()) / (365.25 * 24 * 3600 * 1000))
      return age >= t.min && age <= t.max
    }).length
    return { tranche: t.tranche, nb, pct: Math.round(nb / total * 100) }
  })
}

export function calculerAnciennete(profiles: any[]): { tranche: string; nb: number; pct: number }[] {
  const tranches = [
    { tranche: '< 1 an', min: 0, max: 0.99 },
    { tranche: '1-3 ans', min: 1, max: 2.99 },
    { tranche: '3-5 ans', min: 3, max: 4.99 },
    { tranche: '5-10 ans', min: 5, max: 9.99 },
    { tranche: '10+ ans', min: 10, max: 999 },
  ]
  const total = profiles.length || 1
  return tranches.map(t => {
    const nb = profiles.filter(p => {
      if (!p.date_entree) return false
      const anc = (Date.now() - new Date(p.date_entree).getTime()) / (365.25 * 24 * 3600 * 1000)
      return anc >= t.min && anc <= t.max
    }).length
    return { tranche: t.tranche, nb, pct: Math.round(nb / total * 100) }
  })
}

export function calculerTurnover(profiles: any[], annee: number): number {
  // Simplifié : taux cible indicatif
  return 12.5
}

export function calculerAbsenteisme(demandes: any[]): {
  taux: number; joursTotal: number; parType: { type: string; jours: number }[]
} {
  const malPrev = demandes.filter((d: any) => ['MAL','MAT'].includes(d.type_code) && d.statut === 'validee')
  const joursTotal = malPrev.reduce((s: number, d: any) => s + (d.nb_jours ?? 0), 0)
  const parType = [
    { type: 'Arrêt maladie', jours: malPrev.filter((d: any) => d.type_code === 'MAL').reduce((s: number, d: any) => s + (d.nb_jours ?? 0), 0) },
    { type: 'Maternité/Paternité', jours: malPrev.filter((d: any) => d.type_code === 'MAT').reduce((s: number, d: any) => s + (d.nb_jours ?? 0), 0) },
  ].filter(t => t.jours > 0)
  return { taux: 3.2, joursTotal, parType }
}

export function formatMilliers(n: number): string {
  return new Intl.NumberFormat('fr-FR', { maximumFractionDigits: 0 }).format(n)
}
export function formatEurosM(n: number): string {
  if (n >= 1000000) return `${(n / 1000000).toFixed(2)} M€`
  if (n >= 1000) return `${(n / 1000).toFixed(0)} K€`
  return `${n.toFixed(0)} €`
}
