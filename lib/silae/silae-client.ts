// ============================================================
// SILAE — Client principal
// ============================================================
// Point d'entrée unique pour toute l'application.
// Encapsule les appels à l'adaptateur (mock ou production),
// gère les logs et fournit des helpers métier de haut niveau.
// ============================================================

import {
  envoyerAbsences,
  envoyerVariablesPaie,
  getSoldes,
  getSalaries,
  annulerAbsence,
  pingsilae,
  ajouterLog,
  getLogs,
  clearLogs,
} from './silae-adapter.mock'
// PRODUCTION : remplacer la ligne ci-dessus par :
// } from './silae-adapter.production'

import type {
  SilaeAbsence,
  SilaeVariablePaie,
  SilaeSolde,
  SilaeSalarie,
  SilaeResponse,
  SilaeLogEntry,
} from './types'

export type { SilaeAbsence, SilaeVariablePaie, SilaeSolde, SilaeSalarie, SilaeResponse, SilaeLogEntry }

// ─── Client SILAE ────────────────────────────────────────────

export const silae = {

  // ── Statut ───────────────────────────────────────────────

  async ping(): Promise<SilaeResponse<{ version: string; env: string }>> {
    const res = await pingsilae()
    ajouterLog({
      action: 'PING',
      statut: res.ok ? 'succes' : 'erreur',
      reponse: res.data,
      message: res.erreur,
    })
    return res
  },

  // ── Congés ───────────────────────────────────────────────

  /**
   * Transmet une demande de congé validée à SILAE.
   * Appelé après validation RH, juste avant de marquer silae_transmis = true.
   */
  async transmettreConge(params: {
    matricule: string
    codeAbsence: string
    dateDebut: string
    dateFin: string
    nbJours: number
    demiJourneeDebut?: 'matin' | 'apres-midi'
    demiJourneeFin?: 'matin' | 'apres-midi'
    motif?: string
  }): Promise<SilaeResponse<{ referenceExterne: string }>> {
    const absence: SilaeAbsence = {
      ...params,
      statut: 'VALIDE',
    }

    const res = await envoyerAbsences([absence])

    ajouterLog({
      action: 'TRANSMETTRE_CONGE',
      matricule: params.matricule,
      statut: res.ok ? 'succes' : 'erreur',
      payload: absence,
      reponse: res.data?.[0],
      message: res.erreur ?? res.data?.[0]?.message,
    })

    if (!res.ok || !res.data?.[0]) {
      return { ok: false, erreur: res.erreur ?? 'Erreur inconnue SILAE', timestamp: res.timestamp }
    }

    return {
      ok: true,
      data: { referenceExterne: res.data[0].referenceExterne },
      timestamp: res.timestamp,
    }
  },

  /**
   * Annule un congé déjà transmis à SILAE (ex: annulation salarié).
   */
  async annulerConge(params: {
    matricule: string
    referenceExterne: string
    motif?: string
  }): Promise<SilaeResponse<{ annule: boolean }>> {
    const res = await annulerAbsence(params.referenceExterne, params.motif)

    ajouterLog({
      action: 'ANNULER_CONGE',
      matricule: params.matricule,
      statut: res.ok ? 'succes' : 'erreur',
      payload: params,
      message: res.erreur,
    })

    return res
  },

  // ── Variables de paie ─────────────────────────────────────

  /**
   * Envoie les heures supplémentaires et récupérations du mois.
   */
  async transmettreHeures(params: {
    matricule: string
    mois: number
    annee: number
    heuresSup: number
    heuresRecup: number
  }): Promise<SilaeResponse<{ nbVariables: number }>> {
    const variables: SilaeVariablePaie[] = []

    if (params.heuresSup > 0) {
      variables.push({
        matricule: params.matricule,
        mois: params.mois,
        annee: params.annee,
        codeRubrique: 'HSUP',
        libelle: 'Heures supplémentaires',
        valeur: params.heuresSup,
        unite: 'heures',
      })
    }

    if (params.heuresRecup > 0) {
      variables.push({
        matricule: params.matricule,
        mois: params.mois,
        annee: params.annee,
        codeRubrique: 'RECUP',
        libelle: 'Heures de récupération',
        valeur: params.heuresRecup,
        unite: 'heures',
      })
    }

    if (variables.length === 0) {
      return { ok: true, data: { nbVariables: 0 }, timestamp: new Date().toISOString() }
    }

    const res = await envoyerVariablesPaie(variables)

    ajouterLog({
      action: 'TRANSMETTRE_HEURES',
      matricule: params.matricule,
      statut: res.ok ? 'succes' : 'erreur',
      payload: variables,
      reponse: res.data,
      message: res.erreur,
    })

    return res.ok
      ? { ok: true, data: { nbVariables: variables.length }, timestamp: res.timestamp }
      : { ok: false, erreur: res.erreur, timestamp: res.timestamp }
  },

  /**
   * Envoie un lot de variables de paie (export mensuel complet).
   * Utilisé par le bouton "Transmettre à SILAE" de la page admin/temps.
   */
  async transmettreVariablesBatch(
    variables: SilaeVariablePaie[]
  ): Promise<SilaeResponse<{ nbSucces: number; nbErreurs: number }>> {
    const res = await envoyerVariablesPaie(variables)

    const nbSucces = res.data?.filter(r => r.statut === 'succes').length ?? 0
    const nbErreurs = res.data?.filter(r => r.statut === 'erreur').length ?? 0

    ajouterLog({
      action: 'TRANSMETTRE_VARIABLES_BATCH',
      statut: res.ok ? 'succes' : 'erreur',
      payload: { nbVariables: variables.length },
      reponse: { nbSucces, nbErreurs },
      message: res.erreur,
    })

    return res.ok
      ? { ok: true, data: { nbSucces, nbErreurs }, timestamp: res.timestamp }
      : { ok: false, erreur: res.erreur, timestamp: res.timestamp }
  },

  // ── Soldes ───────────────────────────────────────────────

  /**
   * Récupère les soldes de congés d'un salarié depuis SILAE.
   * Permet de synchroniser les compteurs locaux avec SILAE.
   */
  async getSoldes(matricule: string, annee: number): Promise<SilaeResponse<SilaeSolde[]>> {
    const res = await getSoldes(matricule, annee)

    ajouterLog({
      action: 'GET_SOLDES',
      matricule,
      statut: res.ok ? 'succes' : 'erreur',
      reponse: res.data,
      message: res.erreur,
    })

    return res
  },

  // ── Salariés ─────────────────────────────────────────────

  /**
   * Récupère la liste des salariés SILAE (pour synchro initiale ou vérification).
   */
  async getSalaries(): Promise<SilaeResponse<SilaeSalarie[]>> {
    const res = await getSalaries()

    ajouterLog({
      action: 'GET_SALARIES',
      statut: res.ok ? 'succes' : 'erreur',
      reponse: { count: res.data?.length },
      message: res.erreur,
    })

    return res
  },

  // ── Logs ─────────────────────────────────────────────────

  getLogs(limit?: number): SilaeLogEntry[] {
    return getLogs(limit)
  },

  clearLogs(): void {
    clearLogs()
  },
}

export default silae
