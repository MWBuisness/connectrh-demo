export type SignatureMode = 'simple' | 'avancee' | 'docusign'
export type StatutSignature = 'en_attente' | 'signe' | 'refuse' | 'expire'

export interface CategorieDocument {
  id: string
  code: string
  label: string
  icone: string
  couleur: string
  ordre: number
}

export interface Document {
  id: string
  profile_id: string
  categorie_code: string
  titre: string
  description?: string
  storage_path: string
  nom_fichier: string
  taille_octets?: number
  mime_type: string
  periode_mois?: number
  periode_annee?: number
  signature_requise: boolean
  signature_mode: SignatureMode
  signe: boolean
  signe_le?: string
  signature_data?: string
  signature_hash?: string
  docusign_envelope_id?: string
  docusign_statut?: string
  visible_salarie: boolean
  date_archivage_legal?: string
  emis_par?: string
  created_at: string
  updated_at: string
  // joins
  categorie?: CategorieDocument
  emetteur?: { prenom: string; nom: string }
  demande_signature?: DemandeSignature
}

export interface DemandeSignature {
  id: string
  document_id: string
  profile_id: string
  statut: StatutSignature
  message?: string
  date_limite?: string
  signe_le?: string
  refuse_le?: string
  motif_refus?: string
  created_at: string
}

export interface ParametresDocusign {
  id: string
  actif: boolean
  account_id?: string
  integration_key?: string
  base_uri: string
}

export const MOIS_FR = [
  'Janvier','Février','Mars','Avril','Mai','Juin',
  'Juillet','Août','Septembre','Octobre','Novembre','Décembre'
]

export function formatTaille(octets?: number): string {
  if (!octets) return '—'
  if (octets < 1024) return `${octets} o`
  if (octets < 1024 * 1024) return `${(octets / 1024).toFixed(0)} Ko`
  return `${(octets / (1024 * 1024)).toFixed(1)} Mo`
}

export function signatureModeLabel(mode: SignatureMode): string {
  const labels = { simple: 'Simple', avancee: 'Avancée', docusign: 'DocuSign' }
  return labels[mode]
}
