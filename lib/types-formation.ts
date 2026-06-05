export type StatutDemande = 'demande'|'validee_manager'|'validee_rh'|'planifiee'|'en_cours'|'terminee'|'annulee'|'refusee'
export type Financement = 'entreprise'|'cpf'|'cpf_abonde'|'opco'|'personnel'
export type ModaliteFormation = 'presentiel'|'distanciel'|'hybride'|'e-learning'
export type CategorieFormation = 'metier'|'securite'|'reglementaire'|'management'|'bureautique'|'langue'|'autre'

export interface FormationCatalogue {
  id: string; titre: string; organisme?: string; description?: string
  categorie: CategorieFormation; duree_heures?: number; duree_jours?: number
  cout_moyen?: number; modalite: ModaliteFormation; certifiante: boolean
  eligible_cpf: boolean; renouvellement_mois?: number; actif: boolean; created_at: string
}

export interface PlanFormation {
  id: string; annee: number; titre: string; budget_total: number
  budget_engage: number; statut: string; created_at: string
}

export interface DemandeFormation {
  id: string; profile_id: string; plan_id?: string; formation_id?: string
  titre_libre?: string; organisme_libre?: string; description_libre?: string
  date_souhaitee?: string; date_debut?: string; date_fin?: string; duree_heures?: number
  cout_estime?: number; cout_reel?: number; financement: Financement
  montant_opco?: number; dossier_opco_ref?: string; heures_cpf?: number
  statut: StatutDemande; motif_refus?: string
  note_satisfaction?: number; commentaire_fin?: string; attestation_path?: string
  origine: string
  validee_manager_par?: string; validee_manager_le?: string
  validee_rh_par?: string; validee_rh_le?: string
  created_at: string; updated_at: string
  formation?: FormationCatalogue
  profile?: { prenom: string; nom: string; poste: string; departement: string }
}

export interface CpfCompteur {
  id: string; profile_id: string; heures_droit: number; heures_utilise: number
}

export interface AlerteFormation {
  id: string; profile_id: string; formation_id?: string; titre: string
  echeance: string; lue: boolean; created_at: string
}

export const STATUT_LABELS: Record<StatutDemande, string> = {
  demande: 'Demande déposée', validee_manager: 'Validée manager',
  validee_rh: 'Validée RH', planifiee: 'Planifiée',
  en_cours: 'En cours', terminee: 'Terminée',
  annulee: 'Annulée', refusee: 'Refusée',
}
export const STATUT_COLORS: Record<StatutDemande, string> = {
  demande:         'bg-gray-100 text-gray-600 border-gray-200',
  validee_manager: 'bg-amber-50 text-amber-700 border-amber-200',
  validee_rh:      'bg-blue-50 text-blue-700 border-blue-200',
  planifiee:       'bg-purple-50 text-purple-700 border-purple-200',
  en_cours:        'bg-indigo-50 text-indigo-700 border-indigo-200',
  terminee:        'bg-green-50 text-green-700 border-green-200',
  annulee:         'bg-gray-100 text-gray-400 border-gray-200',
  refusee:         'bg-red-50 text-red-700 border-red-200',
}
export const FINANCEMENT_LABELS: Record<Financement, string> = {
  entreprise: 'Plan de formation', cpf: 'CPF salarié',
  cpf_abonde: 'CPF abondé entreprise', opco: 'OPCO', personnel: 'Personnel',
}
export const CATEGORIE_COLORS: Record<CategorieFormation, string> = {
  metier: '#378ADD', securite: '#E24B4A', reglementaire: '#BA7517',
  management: '#534AB7', bureautique: '#1D9E75', langue: '#D85A30', autre: '#888780',
}
export const CATEGORIE_LABELS: Record<CategorieFormation, string> = {
  metier: 'Métier', securite: 'Sécurité', reglementaire: 'Réglementaire',
  management: 'Management', bureautique: 'Bureautique', langue: 'Langue', autre: 'Autre',
}
