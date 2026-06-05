// ============================================================
// SILAE — Adaptateur MOCK (prototype)
// ============================================================
// Simule l'API SILAE avec des délais réalistes, des erreurs
// aléatoires, des données cohérentes et des logs détaillés.
//
// POUR PASSER EN PRODUCTION :
//   1. Créer silae-adapter.production.ts avec les vrais appels HTTP
//   2. Remplacer l'import dans silae-client.ts :
//      - import { ... } from './silae-adapter.mock'
//      + import { ... } from './silae-adapter.production'
//   3. Ajouter SILAE_API_URL + SILAE_API_KEY dans .env.local
//   C'est tout. Les types, logs et interface restent identiques.
// ============================================================

import type {
  SilaeAbsence, SilaeAbsenceResult,
  SilaeVariablePaie, SilaeVariableResult,
  SilaeSolde, SilaeSalarie,
  SilaeResponse, SilaeLogEntry,
} from './types'

// ─── Utilitaires mock ────────────────────────────────────────

/** Latence simulée (ms) — SILAE est typiquement 200–800ms */
function delai(min = 200, max = 700): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min) + min)
  return new Promise(r => setTimeout(r, ms))
}

/** Simule une erreur réseau ou SILAE (~5% du temps) */
function simulerErreurAleatoire(): boolean {
  return Math.random() < 0.05
}

/** Génère un ID de référence externe fictif SILAE */
function refSilae(prefix: string): string {
  return `${prefix}-${Date.now()}-${Math.floor(Math.random() * 9000 + 1000)}`
}

/** Génère un timestamp ISO */
function ts(): string {
  return new Date().toISOString()
}

// ─── Données fictives stables ────────────────────────────────
// Ces données sont générées à partir du matricule (hash simple)
// pour être cohérentes entre appels sans base de données.

function soldesCPMock(matricule: string, annee: number): SilaeSolde[] {
  const seed = matricule.charCodeAt(0) + matricule.length
  return [
    {
      matricule,
      annee,
      codeAbsence: 'CP',
      soldeInitial: 25,
      soldeAcquis: 25,
      soldePris: (seed % 10) + 2,
      soldeRestant: 25 - ((seed % 10) + 2),
    },
    {
      matricule,
      annee,
      codeAbsence: 'RTT',
      soldeInitial: 10,
      soldeAcquis: 10,
      soldePris: seed % 5,
      soldeRestant: 10 - (seed % 5),
    },
    {
      matricule,
      annee,
      codeAbsence: 'REC',
      soldeInitial: 0,
      soldeAcquis: (seed % 8) * 0.5,
      soldePris: 0,
      soldeRestant: (seed % 8) * 0.5,
    },
  ]
}

// ─── API mock ────────────────────────────────────────────────

/**
 * Envoie une ou plusieurs absences à SILAE.
 * En production : POST /api/absences
 */
export async function envoyerAbsences(
  absences: SilaeAbsence[]
): Promise<SilaeResponse<SilaeAbsenceResult[]>> {
  await delai()

  if (simulerErreurAleatoire()) {
    return {
      ok: false,
      erreur: 'Connexion SILAE temporairement indisponible (timeout)',
      codeErreur: 'SILAE_TIMEOUT',
      timestamp: ts(),
    }
  }

  const results: SilaeAbsenceResult[] = absences.map(a => ({
    matricule: a.matricule,
    referenceExterne: refSilae('ABS'),
    statut: 'succes',
    message: `Absence ${a.codeAbsence} du ${a.dateDebut} au ${a.dateFin} enregistrée`,
  }))

  return { ok: true, data: results, timestamp: ts() }
}

/**
 * Envoie les variables de paie du mois (heures sup, récup, primes…).
 * En production : POST /api/variables-paie
 */
export async function envoyerVariablesPaie(
  variables: SilaeVariablePaie[]
): Promise<SilaeResponse<SilaeVariableResult[]>> {
  await delai(300, 900)

  if (simulerErreurAleatoire()) {
    return {
      ok: false,
      erreur: 'Erreur de validation SILAE : matricule inconnu ou période clôturée',
      codeErreur: 'SILAE_VALIDATION_ERROR',
      timestamp: ts(),
    }
  }

  const results: SilaeVariableResult[] = variables.map(v => ({
    matricule: v.matricule,
    codeRubrique: v.codeRubrique,
    statut: 'succes',
    message: `${v.libelle} : ${v.valeur} ${v.unite} enregistré pour ${v.mois}/${v.annee}`,
  }))

  return { ok: true, data: results, timestamp: ts() }
}

/**
 * Récupère les soldes de congés depuis SILAE.
 * En production : GET /api/salaries/{matricule}/soldes?annee=YYYY
 */
export async function getSoldes(
  matricule: string,
  annee: number
): Promise<SilaeResponse<SilaeSolde[]>> {
  await delai(150, 500)

  if (simulerErreurAleatoire()) {
    return {
      ok: false,
      erreur: `Salarié ${matricule} introuvable dans SILAE`,
      codeErreur: 'SILAE_NOT_FOUND',
      timestamp: ts(),
    }
  }

  return {
    ok: true,
    data: soldesCPMock(matricule, annee),
    timestamp: ts(),
  }
}

/**
 * Récupère la liste des salariés depuis SILAE (pour synchronisation).
 * En production : GET /api/salaries
 */
export async function getSalaries(): Promise<SilaeResponse<SilaeSalarie[]>> {
  await delai(400, 1200)

  const mock: SilaeSalarie[] = [
    { matricule: 'MAT001', nom: 'Martin', prenom: 'Sophie', email: 'sophie.martin@exemple.fr', poste: 'DRH', dateEntree: '2019-03-01', typeContrat: 'CDI', tempsTravail: 100, departement: 'Ressources Humaines' },
    { matricule: 'MAT002', nom: 'Dupont', prenom: 'Thomas', email: 'thomas.dupont@exemple.fr', poste: 'Développeur senior', dateEntree: '2021-09-15', typeContrat: 'CDI', tempsTravail: 100, departement: 'Technique' },
    { matricule: 'MAT003', nom: 'Bernard', prenom: 'Claire', email: 'claire.bernard@exemple.fr', poste: 'Responsable commercial', dateEntree: '2020-01-06', typeContrat: 'CDI', tempsTravail: 80, departement: 'Commercial' },
    { matricule: 'MAT004', nom: 'Leroy', prenom: 'Marc', email: 'marc.leroy@exemple.fr', poste: 'Comptable', dateEntree: '2022-04-11', typeContrat: 'CDI', tempsTravail: 100, departement: 'Comptabilité' },
    { matricule: 'MAT005', nom: 'Petit', prenom: 'Julie', email: 'julie.petit@exemple.fr', poste: 'Chef de projet', dateEntree: '2018-07-23', typeContrat: 'CDI', tempsTravail: 100, departement: 'Direction' },
  ]

  return { ok: true, data: mock, timestamp: ts() }
}

/**
 * Annule une absence déjà transmise à SILAE.
 * En production : PUT /api/absences/{referenceExterne}/annuler
 */
export async function annulerAbsence(
  referenceExterne: string,
  motif?: string
): Promise<SilaeResponse<{ annule: boolean }>> {
  await delai()

  return {
    ok: true,
    data: { annule: true },
    timestamp: ts(),
  }
}

/**
 * Vérifie que la connexion SILAE est opérationnelle (health check).
 * En production : GET /api/ping
 */
export async function pingsilae(): Promise<SilaeResponse<{ version: string; env: string }>> {
  await delai(80, 200)

  // Simule une coupure ~2% du temps
  if (Math.random() < 0.02) {
    return {
      ok: false,
      erreur: 'SILAE indisponible',
      codeErreur: 'SILAE_DOWN',
      timestamp: ts(),
    }
  }

  return {
    ok: true,
    data: { version: 'SILAE-MOCK-v1.0', env: 'demo' },
    timestamp: ts(),
  }
}

// ─── Logs (stockés en mémoire pour le mock) ──────────────────
// En production : les logs iraient en base de données (table silae_logs)

const _logs: SilaeLogEntry[] = []

export function ajouterLog(entry: Omit<SilaeLogEntry, 'id' | 'createdAt'>): SilaeLogEntry {
  const log: SilaeLogEntry = {
    ...entry,
    id: refSilae('LOG'),
    createdAt: ts(),
  }
  _logs.unshift(log)
  if (_logs.length > 200) _logs.pop() // garde les 200 derniers
  return log
}

export function getLogs(limit = 50): SilaeLogEntry[] {
  return _logs.slice(0, limit)
}

export function clearLogs(): void {
  _logs.length = 0
}
