export type StatutVisite = 'planifiee' | 'realisee' | 'annulee' | 'a_planifier'
export type Aptitude = 'apte' | 'apte_amenagements' | 'inapte_partiel' | 'inapte' | 'en_attente'

export interface TypeVisiteMedicale {
  id: string; code: string; label: string; couleur: string
  description?: string; periodicite_mois?: number; obligatoire: boolean; ordre: number
}

export interface VisiteMedicale {
  id: string; profile_id: string; type_code: string
  date_prevue?: string; date_realisee?: string
  medecin?: string; service_sst?: string; lieu?: string
  aptitude?: Aptitude; amenagements?: string; restrictions?: string; remarques?: string
  attestation_path?: string; statut: StatutVisite
  prochaine_date?: string; rappel_envoye: boolean
  cree_par?: string; created_at: string; updated_at: string
  type?: TypeVisiteMedicale
  profile?: { prenom: string; nom: string; poste: string; departement: string; date_entree: string }
}

export interface AlerteMedicale {
  id: string; profile_id: string; visite_id?: string; type_alerte: string
  message: string; echeance?: string; urgence: 'normale' | 'haute' | 'critique'
  lue: boolean; created_at: string
  profile?: { prenom: string; nom: string }
}

export interface DuerRisque {
  id: string; unite_travail: string; risque: string; description?: string
  gravite: number; probabilite: number; criticite: number
  mesures_actuelles?: string; mesures_prevues?: string
  responsable?: string; echeance?: string; statut: string
  created_at: string; updated_at: string
}

export const APTITUDE_LABELS: Record<Aptitude, string> = {
  apte:               'Apte',
  apte_amenagements:  'Apte avec aménagements',
  inapte_partiel:     'Inaptitude partielle',
  inapte:             'Inapte',
  en_attente:         'En attente',
}
export const APTITUDE_COLORS: Record<Aptitude, string> = {
  apte:               'bg-green-50 text-green-700 border-green-200',
  apte_amenagements:  'bg-amber-50 text-amber-700 border-amber-200',
  inapte_partiel:     'bg-orange-50 text-orange-700 border-orange-200',
  inapte:             'bg-red-50 text-red-700 border-red-200',
  en_attente:         'bg-gray-100 text-gray-600 border-gray-200',
}
export const STATUT_VISITE_LABELS: Record<StatutVisite, string> = {
  planifiee:    'Planifiée',
  realisee:     'Réalisée',
  annulee:      'Annulée',
  a_planifier:  'À planifier',
}
export const STATUT_VISITE_COLORS: Record<StatutVisite, string> = {
  planifiee:   'bg-blue-50 text-blue-700 border-blue-200',
  realisee:    'bg-green-50 text-green-700 border-green-200',
  annulee:     'bg-gray-100 text-gray-400 border-gray-200',
  a_planifier: 'bg-red-50 text-red-700 border-red-200',
}
export const CRITICITE_COLOR = (c: number) => c >= 12 ? 'bg-red-50 text-red-700' : c >= 6 ? 'bg-amber-50 text-amber-700' : 'bg-green-50 text-green-700'
export const CRITICITE_LABEL = (c: number) => c >= 12 ? 'Critique' : c >= 6 ? 'Modéré' : 'Faible'
