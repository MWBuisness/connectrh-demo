export type StatutDemande = 'en_attente' | 'validee' | 'refusee' | 'annulee'

export interface TypeAbsence {
  id: string
  code: string
  label: string
  couleur: string
  decompte: boolean
  ordre: number
}

export interface SoldeConges {
  id: string
  profile_id: string
  type_code: string
  annee: number
  solde_initial: number
  solde_acquis: number
  solde_pris: number
  solde_en_cours: number
  updated_at: string
  // join
  type?: TypeAbsence
}

export interface DemandeConges {
  id: string
  profile_id: string
  type_code: string
  date_debut: string
  date_fin: string
  nb_jours: number
  demi_journee_debut?: string
  demi_journee_fin?: string
  motif?: string
  statut: StatutDemande
  validee_par?: string
  validee_le?: string
  commentaire_valid?: string
  silae_transmis: boolean
  silae_transmis_le?: string
  silae_reference?: string
  created_at: string
  updated_at: string
  // joins
  type?: TypeAbsence
  profile?: { prenom: string; nom: string; departement: string; responsable_id?: string }
  valideur?: { prenom: string; nom: string }
}

export interface JourFerie {
  date: string
  label: string
}
