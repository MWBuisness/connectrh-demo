export type StatutMateriel = 'disponible' | 'attribue' | 'en_maintenance' | 'hors_service'
export type StatutAttribution = 'actif' | 'restitue' | 'litige'
export type TypeDossier = 'onboarding' | 'offboarding'

export interface ChampsEdl {
  id: string; label: string; type: 'text'|'number'|'date'|'select'|'textarea'
  options?: string[]; requis: boolean
}
export interface TypeMateriel {
  id: string; code: string; label: string; icone: string; couleur: string
  champs_edl: ChampsEdl[]; ordre: number
}
export interface Materiel {
  id: string; type_code: string; libelle: string; reference?: string
  valeur_achat?: number; date_achat?: string; statut: StatutMateriel; notes?: string
  created_at: string; type?: TypeMateriel
}
export interface AttributionMateriel {
  id: string; materiel_id: string; profile_id: string; date_remise: string
  remis_par?: string; edl_remise: Record<string,string>; photos_remise: string[]
  signature_remise?: string; signe_remise_le?: string; date_restitution?: string
  restitue_a?: string; edl_restitution?: Record<string,string>; photos_restitution: string[]
  signature_restitution?: string; signe_restitution_le?: string
  observations_restitution?: string; statut: StatutAttribution; created_at: string
  materiel?: Materiel; profile?: { prenom: string; nom: string }
}
export interface TacheOnboarding { id: string; label: string; responsable: string }
export interface EtapeOnboarding { id: string; categorie: string; label: string; taches: TacheOnboarding[] }
export interface TemplateOnboarding { id: string; nom: string; type: TypeDossier; etapes: EtapeOnboarding[] }
export interface TacheFaite { id: string; fait_le: string; fait_par: string }
export interface DossierOnboarding {
  id: string; profile_id: string; template_id?: string; type: TypeDossier
  date_debut: string; date_cible?: string; statut: 'en_cours'|'complete'|'abandonne'
  progression: number; taches_faites: TacheFaite[]; notes?: string; created_at: string
  template?: TemplateOnboarding; profile?: { prenom: string; nom: string; poste: string; departement: string }
}
export const STATUT_MATERIEL_LABELS: Record<StatutMateriel,string> = {
  disponible:'Disponible', attribue:'Attribué', en_maintenance:'En maintenance', hors_service:'Hors service'
}
export const STATUT_MATERIEL_COLORS: Record<StatutMateriel,string> = {
  disponible:'bg-green-50 text-green-700 border-green-200',
  attribue:'bg-blue-50 text-blue-700 border-blue-200',
  en_maintenance:'bg-amber-50 text-amber-700 border-amber-200',
  hors_service:'bg-red-50 text-red-700 border-red-200',
}
