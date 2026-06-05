// ============================================================
// SILAE — Types partagés (mock + production identiques)
// Le jour J, seul silae-adapter.ts change. Ces types restent.
// ============================================================

/** Identifiant d'un salarié côté SILAE (matricule) */
export type SilaeMatricule = string

/** Statut de synchronisation */
export type SilaeStatut = 'succes' | 'erreur' | 'en_attente' | 'ignoré'

// ─── Congés ──────────────────────────────────────────────────

export interface SilaeAbsence {
  matricule: SilaeMatricule
  codeAbsence: string        // ex: 'CP', 'RTT', 'MAL'
  dateDebut: string          // ISO YYYY-MM-DD
  dateFin: string
  nbJours: number
  demiJourneeDebut?: 'matin' | 'apres-midi'
  demiJourneeFin?: 'matin' | 'apres-midi'
  motif?: string
  statut: 'VALIDE' | 'ANNULE'
}

export interface SilaeAbsenceResult {
  matricule: SilaeMatricule
  referenceExterne: string   // ID retourné par SILAE
  statut: SilaeStatut
  message?: string
}

// ─── Variables de paie ───────────────────────────────────────

export interface SilaeVariablePaie {
  matricule: SilaeMatricule
  mois: number               // 1–12
  annee: number
  codeRubrique: string       // ex: 'HSUP', 'RECUP', 'PRIME'
  libelle: string
  valeur: number             // heures ou montant
  unite: 'heures' | 'jours' | 'euros'
}

export interface SilaeVariableResult {
  matricule: SilaeMatricule
  codeRubrique: string
  statut: SilaeStatut
  message?: string
}

// ─── Soldes ──────────────────────────────────────────────────

export interface SilaeSolde {
  matricule: SilaeMatricule
  annee: number
  codeAbsence: string
  soldeInitial: number
  soldeAcquis: number
  soldePris: number
  soldeRestant: number
}

// ─── Salarié ─────────────────────────────────────────────────

export interface SilaeSalarie {
  matricule: SilaeMatricule
  nom: string
  prenom: string
  email: string
  poste: string
  dateEntree: string
  typeContrat: string
  tempsTravail: number       // 100 = temps plein
  departement?: string
}

// ─── Résultat générique ──────────────────────────────────────

export interface SilaeResponse<T> {
  ok: boolean
  data?: T
  erreur?: string
  codeErreur?: string
  timestamp: string
}

// ─── Log de synchronisation ──────────────────────────────────

export interface SilaeLogEntry {
  id: string
  action: string
  matricule?: SilaeMatricule
  statut: SilaeStatut
  payload?: unknown
  reponse?: unknown
  message?: string
  createdAt: string
}
