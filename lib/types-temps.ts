export type TypeJournee = 'bureau' | 'teletravail' | 'deplacement' | 'formation' | 'absent'
export type StatutPointage = 'en_cours' | 'valide' | 'anomalie'

export interface Pointage {
  id: string
  profile_id: string
  date: string
  heure_entree?: string
  heure_sortie?: string
  pause_minutes: number
  duree_minutes?: number
  type_journee: TypeJournee
  note?: string
  statut: StatutPointage
  valide_par?: string
  valide_le?: string
  created_at: string
  updated_at: string
}

export interface CompteurTemps {
  id: string
  profile_id: string
  annee: number
  mois: number
  heures_contractuelles: number
  heures_realisees: number
  heures_sup: number
  heures_recup: number
  jours_bureau: number
  jours_teletravail: number
  jours_deplacement: number
  jours_absence: number
  jours_forfait: number
  silae_transmis: boolean
  silae_transmis_le?: string
  updated_at: string
}

export interface TeletravailCompteur {
  id: string
  profile_id: string
  annee: number
  plafond_jours: number
  jours_pris: number
  updated_at: string
}

export interface AlerteTemps {
  id: string
  profile_id: string
  type_alerte: string
  message: string
  date_alerte: string
  lue: boolean
  created_at: string
}

export const TYPE_JOURNEE_LABELS: Record<TypeJournee, string> = {
  bureau:      'Présentiel',
  teletravail: 'Télétravail',
  deplacement: 'Déplacement',
  formation:   'Formation',
  absent:      'Absent',
}

export const TYPE_JOURNEE_COLORS: Record<TypeJournee, string> = {
  bureau:      '#378ADD',
  teletravail: '#1D9E75',
  deplacement: '#BA7517',
  formation:   '#534AB7',
  absent:      '#E24B4A',
}
