export type Role = 'salarie' | 'responsable' | 'rh_admin'

export type ContratType = 'CDI' | 'CDD' | 'Stage' | 'Alternance' | 'Freelance'

export type StatutMarital = 'Célibataire' | 'Marié(e)' | 'Pacsé(e)' | 'Divorcé(e)' | 'Veuf/Veuve'

export interface UserProfile {
  id: string
  user_id: string
  role: Role
  // Infos personnelles
  prenom: string
  nom: string
  email: string
  telephone?: string
  date_naissance?: string
  lieu_naissance?: string
  nationalite?: string
  statut_marital?: StatutMarital
  nombre_enfants?: number
  // Adresse
  adresse?: string
  code_postal?: string
  ville?: string
  pays?: string
  // Contrat
  poste: string
  departement: string
  type_contrat: ContratType
  date_entree: string
  date_fin_contrat?: string
  temps_travail: number // % ex: 100, 80, 50
  convention_collective?: string
  responsable_id?: string
  // Bancaire
  iban?: string
  bic?: string
  // Paie
  salaire_brut?: number
  // Meta
  avatar_url?: string
  created_at: string
  updated_at: string
}

export interface Department {
  id: string
  nom: string
  responsable_id?: string
}
