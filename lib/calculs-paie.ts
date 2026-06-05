// ============================================================
// Calculs de charges sociales France 2025
// Sources : URSSAF, BOSS, conventions collectives
// ============================================================

export interface ParametresCalcul {
  salaireBrut: number
  typeContrat: 'CDI' | 'CDD' | 'Stage' | 'Alternance'
  tempsTravail: number          // % ex: 100, 80, 50
  anciennete: number            // années
  statut: 'employe' | 'cadre'
  trancheSalaire?: 'A' | 'B' | 'C'
  avantagesNature: number       // €/mois
  fraisPro: number              // €/mois remboursés
  convention: string
}

export interface ResultatCalcul {
  // Salarié
  salaireBrut: number
  cotisationsSalarie: number
  salaireNet: number
  salaireNetAPayer: number      // après retenue à la source
  // Employeur
  cotisationsPatronales: number
  coutTotalEmployeur: number
  // Détail charges
  detail: LigneCharge[]
  // Taux effectifs
  tauxChargesSalarie: number    // %
  tauxChargesPatronales: number // %
  tauxChargesGlobal: number     // %
  // Annuel
  brut13eme?: number
  coutAnnuel: number
  // Aides
  reductionFillon: number
  autresAides: number
}

export interface LigneCharge {
  libelle: string
  base: number
  tauxSalarie: number
  tauxPatronal: number
  montantSalarie: number
  montantPatronal: number
  categorie: 'sante' | 'retraite' | 'chomage' | 'prevoyance' | 'autres'
}

// Plafond sécurité sociale mensuel 2025
const PASS_MENSUEL = 3925

// Calcul réduction Fillon
function calcReductionFillon(brut: number, tempsTravail: number): number {
  const smicMensuel = 1801.80 * (tempsTravail / 100)
  if (brut > smicMensuel * 2.5) return 0
  const coef = Math.max(0, (0.3205 / 0.6) * (1.6 * smicMensuel / brut - 1))
  const taux = Math.min(0.3205, coef)
  return brut * taux
}

export function calculerCout(params: ParametresCalcul): ResultatCalcul {
  const { salaireBrut: brut, tempsTravail, statut, typeContrat } = params
  const pass = PASS_MENSUEL
  const trancheA = Math.min(brut, pass)
  const trancheB = Math.min(Math.max(0, brut - pass), pass * 3)

  const lignes: LigneCharge[] = []

  function add(libelle: string, base: number, tauxS: number, tauxP: number, cat: LigneCharge['categorie']) {
    lignes.push({
      libelle, base,
      tauxSalarie: tauxS, tauxPatronal: tauxP,
      montantSalarie: Math.round(base * tauxS / 100 * 100) / 100,
      montantPatronal: Math.round(base * tauxP / 100 * 100) / 100,
      categorie: cat,
    })
  }

  // === SANTÉ ===
  add('Maladie-Maternité', brut, 0, 7.0, 'sante')
  add('Maladie (solidarité autonomie)', brut, 0, 0.3, 'sante')
  add('Assurance maladie salarié', brut, 0.75, 0, 'sante')
  add('Complémentaire santé obligatoire', brut, 0, 1.5, 'sante') // approx

  // === RETRAITE ===
  add('Retraite de base (tranche A)', trancheA, 6.9, 8.55, 'retraite')
  if (trancheB > 0) {
    add('Retraite complémentaire AGIRC-ARRCO (T1)', trancheA, 3.15, 4.72, 'retraite')
    add('Retraite complémentaire AGIRC-ARRCO (T2)', trancheB, 8.64, 12.95, 'retraite')
  } else {
    add('Retraite complémentaire AGIRC-ARRCO (T1)', trancheA, 3.15, 4.72, 'retraite')
  }
  if (statut === 'cadre') {
    add('CET (Cadre)', trancheA, 0.14, 0.21, 'retraite')
    add('Prévoyance cadre', trancheA, 1.5, 1.5, 'prevoyance')
  }
  add('Retraite supplémentaire (CSG assise)', brut * 1.0225, 0.5, 0, 'retraite')

  // === CHÔMAGE ===
  if (typeContrat !== 'Stage' && typeContrat !== 'Alternance') {
    add('Assurance chômage', Math.min(brut, pass * 4), 0, 4.05, 'chomage')
    add('AGS (garantie salaires)', Math.min(brut, pass * 4), 0, 0.25, 'chomage')
  }

  // === AUTRES ===
  add('CSG déductible', brut * 0.9825, 6.8, 0, 'autres')
  add('CSG non déductible + CRDS', brut * 0.9825, 2.9, 0, 'autres')
  add('Allocations familiales', brut, 0, brut <= pass * 1.6 ? 3.45 : 5.25, 'autres')
  add('Accident du travail (taux moyen)', brut, 0, 2.22, 'autres')
  add('Formation professionnelle', brut, 0, brut * 12 <= 40000 ? 1 : 0.55, 'autres')
  add('Taxe d\'apprentissage', brut, 0, 0.68, 'autres')
  add('Transport (Paris IDF)', brut, 0, 0, 'autres') // optionnel
  if (typeContrat === 'CDD') {
    add('Précarité CDD (10%)', brut, 0, 10, 'chomage')
  }

  const totalSalarie = lignes.reduce((s, l) => s + l.montantSalarie, 0)
  const totalPatronal = lignes.reduce((s, l) => s + l.montantPatronal, 0)

  const reductionFillon = typeContrat !== 'Stage' && typeContrat !== 'Alternance'
    ? calcReductionFillon(brut, tempsTravail)
    : 0

  const cotisationsPatronalesNettes = Math.max(0, totalPatronal - reductionFillon)
  const salaireNet = brut - totalSalarie
  const coutTotal = brut + cotisationsPatronalesNettes

  return {
    salaireBrut: brut,
    cotisationsSalarie: totalSalarie,
    salaireNet,
    salaireNetAPayer: salaireNet * 0.98, // PAS simulé à 2%
    cotisationsPatronales: cotisationsPatronalesNettes,
    coutTotalEmployeur: coutTotal,
    detail: lignes,
    tauxChargesSalarie: Math.round(totalSalarie / brut * 1000) / 10,
    tauxChargesPatronales: Math.round(cotisationsPatronalesNettes / brut * 1000) / 10,
    tauxChargesGlobal: Math.round((totalSalarie + cotisationsPatronalesNettes) / brut * 1000) / 10,
    reductionFillon,
    autresAides: 0,
    coutAnnuel: coutTotal * 12,
  }
}

export function formatEuros(n: number): string {
  return new Intl.NumberFormat('fr-FR', { style: 'currency', currency: 'EUR', maximumFractionDigits: 2 }).format(n)
}

export function formatPct(n: number): string {
  return `${n.toFixed(1)} %`
}
