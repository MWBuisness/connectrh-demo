export type StatutEntretien = 'planifie'|'prep_manager'|'prep_salarie'|'en_cours'|'realise'|'signe'

export interface TypeEntretien {
  id: string; code: string; label: string; couleur: string
  description?: string; periodicite_mois?: number; obligatoire: boolean; ordre: number
}

export interface CampagneEntretien {
  id: string; type_code: string; titre: string; description?: string
  date_debut: string; date_fin: string; statut: string; cree_par?: string
  created_at: string; type?: TypeEntretien
}

export interface Objectif {
  id: string; titre: string; description?: string; echeance?: string
  note?: number; atteint?: boolean; priorite?: 'haute'|'moyenne'|'faible'
}

export interface CompetenceNote {
  id: string; label: string; categorie: string; note_1_5: number; commentaire?: string
}

export interface Entretien {
  id: string; campagne_id?: string; type_code: string; profile_id: string; manager_id?: string
  date_prevue?: string; heure_prevue?: string; lieu?: string
  statut: StatutEntretien
  prep_manager: Record<string,string>; prep_manager_le?: string
  prep_salarie: Record<string,string>; prep_salarie_le?: string
  compte_rendu: Record<string,string>; realise_le?: string
  objectifs_actuels: Objectif[]; objectifs_nouveaux: Objectif[]
  competences: CompetenceNote[]; note_globale?: number
  signe_manager: boolean; signe_manager_le?: string
  signe_salarie: boolean; signe_salarie_le?: string
  transmis_silae: boolean; created_at: string; updated_at: string
  type?: TypeEntretien
  profile?: { prenom: string; nom: string; poste: string; departement: string; date_entree: string }
  manager?: { prenom: string; nom: string }
}

export interface CompetenceReferentiel { id: string; categorie: string; label: string; ordre: number }

export const STATUT_ENTRETIEN_LABELS: Record<StatutEntretien, string> = {
  planifie: 'Planifié', prep_manager: 'Préparation manager',
  prep_salarie: 'Préparation salarié', en_cours: 'En cours',
  realise: 'Réalisé', signe: 'Signé',
}
export const STATUT_ENTRETIEN_COLORS: Record<StatutEntretien, string> = {
  planifie:     'bg-gray-100 text-gray-600 border-gray-200',
  prep_manager: 'bg-amber-50 text-amber-700 border-amber-200',
  prep_salarie: 'bg-blue-50 text-blue-700 border-blue-200',
  en_cours:     'bg-purple-50 text-purple-700 border-purple-200',
  realise:      'bg-green-50 text-green-600 border-green-200',
  signe:        'bg-green-100 text-green-800 border-green-300',
}
export const NOTES_LABELS: Record<number,string> = {
  1: 'Insuffisant', 2: 'À améliorer', 3: 'Satisfaisant', 4: 'Bien', 5: 'Excellent'
}
