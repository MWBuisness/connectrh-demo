'use client'
import { useState } from 'react'
import BarreHorizontale from './BarreHorizontale'
import IndexEgaproCard from './IndexEgaproCard'
import {
  calculerIndexEgapro, calculerMasseSalariale, calculerPyramideAges,
  calculerAnciennete, calculerAbsenteisme,
  formatMilliers, formatEurosM
} from '@/lib/calculs-reporting'

interface Props {
  profiles: any[]
  demandes: any[]
  entretiens: any[]
  formations: any[]
  annee: number
}

export default function ReportingDashboard({ profiles, demandes, entretiens, formations, annee }: Props) {
  const [onglet, setOnglet] = useState<'synthese'|'masse_sal'|'effectifs'|'absences'|'egapro'|'bdes'|'cse'>('synthese')
  const [exportLoading, setExportLoading] = useState(false)

  // Calculs
  const actifs = profiles.filter(p => p.type_contrat !== 'Stage')
  const index = calculerIndexEgapro(profiles)
  const masseSal = calculerMasseSalariale(profiles)
  const pyramide = calculerPyramideAges(profiles)
  const anciennete = calculerAnciennete(profiles)
  const absenteisme = calculerAbsenteisme(demandes)

  const cdi = profiles.filter(p => p.type_contrat === 'CDI').length
  const cdd = profiles.filter(p => p.type_contrat === 'CDD').length
  const alternants = profiles.filter(p => p.type_contrat === 'Alternance').length
  const stages = profiles.filter(p => p.type_contrat === 'Stage').length
  const cadres = profiles.filter(p => p.statut === 'cadre').length
  const employes = profiles.filter(p => p.statut !== 'cadre').length

  const salMoyen = profiles.filter(p => p.salaire_brut).length > 0
    ? profiles.filter(p => p.salaire_brut).reduce((s: number, p: any) => s + p.salaire_brut, 0) / profiles.filter(p => p.salaire_brut).length
    : 0

  const entretiensSignes = entretiens.filter((e: any) => e.statut === 'signe').length
  const formationsTerminees = formations.filter((f: any) => f.statut === 'terminee').length
  const heuresFormation = formations.filter((f: any) => f.statut === 'terminee').reduce((s: number, f: any) => s + (f.duree_heures ?? 0), 0)
  const budgetFormation = formations.filter((f: any) => !['annulee', 'refusee'].includes(f.statut)).reduce((s: number, f: any) => s + (f.cout_reel ?? f.cout_estime ?? 0), 0)

  const services = [...new Set(profiles.map(p => p.departement).filter(Boolean))] as string[]

  // Export CSV
  function exportCSV(data: any[], nom: string) {
    if (!data.length) return
    const headers = Object.keys(data[0])
    const csv = [headers.join(';'), ...data.map(r => headers.map(h => `"${r[h] ?? ''}"`).join(';'))].join('\n')
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url; a.download = `${nom}_${annee}.csv`; a.click()
  }

  return (
    <div>
      {/* Onglets */}
      <div className="flex border-b border-gray-200 mb-5 gap-0 overflow-x-auto">
        {[
          { id: 'synthese', label: 'Synthèse' },
          { id: 'masse_sal', label: 'Masse salariale' },
          { id: 'effectifs', label: 'Effectifs' },
          { id: 'absences', label: 'Absentéisme' },
          { id: 'egapro', label: 'Index Egapro' },
          { id: 'bdes', label: 'BDES' },
          { id: 'cse', label: 'Exports CSE' },
        ].map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id as any)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${onglet === o.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {o.label}
          </button>
        ))}
      </div>

      {/* === SYNTHÈSE === */}
      {onglet === 'synthese' && (
        <div className="space-y-5">
          {/* KPIs principaux */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Effectif total', value: profiles.length, sub: `dont ${cdi} CDI`, color: 'text-gray-900' },
              { label: 'Masse salariale annuelle', value: formatEurosM(masseSal.total), sub: `+${masseSal.evolution}% vs N-1`, color: 'text-gray-900' },
              { label: 'Salaire moyen brut', value: salMoyen > 0 ? `${formatMilliers(salMoyen)} €` : '—', sub: 'mensuel', color: 'text-gray-900' },
              { label: 'Taux absentéisme', value: `${absenteisme.taux}%`, sub: `${absenteisme.joursTotal}j d'absence`, color: absenteisme.taux > 5 ? 'text-red-600' : 'text-gray-900' },
            ].map(s => (
              <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                <p className={`text-xl font-semibold ${s.color}`}>{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
            {/* Répartition contrats */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <BarreHorizontale
                title="Répartition par contrat"
                items={[
                  { label: 'CDI', value: cdi, pct: Math.round(cdi / Math.max(profiles.length, 1) * 100), color: '#378ADD' },
                  { label: 'CDD', value: cdd, pct: Math.round(cdd / Math.max(profiles.length, 1) * 100), color: '#BA7517' },
                  { label: 'Alternance', value: alternants, pct: Math.round(alternants / Math.max(profiles.length, 1) * 100), color: '#534AB7' },
                  { label: 'Stage', value: stages, pct: Math.round(stages / Math.max(profiles.length, 1) * 100), color: '#888780' },
                ].filter(i => i.value > 0)}
              />
            </div>

            {/* Pyramide âges */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <BarreHorizontale
                title="Pyramide des âges"
                items={pyramide.map((p, i) => ({ label: p.tranche, value: p.nb, pct: p.pct }))}
                maxColor="#1D9E75"
              />
            </div>

            {/* Ancienneté */}
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <BarreHorizontale
                title="Ancienneté"
                items={anciennete.map(a => ({ label: a.tranche, value: a.nb, pct: a.pct }))}
                maxColor="#534AB7"
              />
            </div>
          </div>

          {/* Formation + entretiens */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Entretiens annuels signés', value: entretiensSignes, sub: `sur ${entretiens.length} planifiés` },
              { label: 'Formations terminées', value: formationsTerminees, sub: `${heuresFormation}h réalisées` },
              { label: 'Budget formation engagé', value: formatEurosM(budgetFormation), sub: 'tous financements' },
              { label: 'Score Egapro', value: index.publiable ? `${index.note_globale}/100` : 'N/A', sub: index.publiable ? (index.obligation_mesures ? '⚠️ Action requise' : '✓ Conforme') : '< 50 salariés' },
            ].map(s => (
              <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                <p className="text-xl font-semibold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === MASSE SALARIALE === */}
      {onglet === 'masse_sal' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
            {[
              { label: 'Masse salariale annuelle', value: formatEurosM(masseSal.total), sub: `+${masseSal.evolution}% vs N-1` },
              { label: 'Masse salariale mensuelle', value: formatEurosM(masseSal.total / 12), sub: 'moyenne mensuelle' },
              { label: 'Salaire brut moyen', value: salMoyen > 0 ? `${formatMilliers(salMoyen)} €/mois` : '—', sub: 'tous contrats confondus' },
            ].map(s => (
              <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                <p className="text-xl font-semibold text-gray-900">{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>

          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <BarreHorizontale
              title="Masse salariale par service"
              items={masseSal.parService.map(s => ({
                label: s.service,
                value: s.montant,
                sublabel: `${s.nb} pers.`,
              }))}
              unit=" €/an"
            />
          </div>

          {/* Tranches de salaires */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-4">Répartition par tranche de salaire brut mensuel</h4>
            <BarreHorizontale
              items={[
                { label: '< 2 000 €', value: profiles.filter(p => p.salaire_brut && p.salaire_brut < 2000).length, color: '#E24B4A' },
                { label: '2 000 – 3 000 €', value: profiles.filter(p => p.salaire_brut >= 2000 && p.salaire_brut < 3000).length, color: '#BA7517' },
                { label: '3 000 – 4 000 €', value: profiles.filter(p => p.salaire_brut >= 3000 && p.salaire_brut < 4000).length, color: '#378ADD' },
                { label: '4 000 – 6 000 €', value: profiles.filter(p => p.salaire_brut >= 4000 && p.salaire_brut < 6000).length, color: '#1D9E75' },
                { label: '> 6 000 €', value: profiles.filter(p => p.salaire_brut >= 6000).length, color: '#534AB7' },
              ].filter(i => i.value > 0)}
              unit=" pers."
            />
          </div>
        </div>
      )}

      {/* === EFFECTIFS === */}
      {onglet === 'effectifs' && (
        <div className="space-y-5">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <BarreHorizontale title="Effectif par service"
                items={services.map(s => ({
                  label: s,
                  value: profiles.filter(p => p.departement === s).length,
                }))} unit=" pers." />
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <BarreHorizontale title="Pyramide des âges"
                items={pyramide.map(p => ({ label: p.tranche, value: p.nb, pct: p.pct }))} maxColor="#1D9E75" />
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <BarreHorizontale title="Ancienneté moyenne"
                items={anciennete.map(a => ({ label: a.tranche, value: a.nb, pct: a.pct }))} maxColor="#534AB7" />
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <BarreHorizontale title="Type de contrat"
                items={[
                  { label: 'CDI', value: cdi, color: '#378ADD' },
                  { label: 'CDD', value: cdd, color: '#BA7517' },
                  { label: 'Alternance', value: alternants, color: '#534AB7' },
                  { label: 'Stage', value: stages, color: '#888780' },
                ].filter(i => i.value > 0)} unit=" pers." />
            </div>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100">
              <h3 className="text-sm font-medium text-gray-900">Registre du personnel</h3>
            </div>
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Nom', 'Poste', 'Service', 'Contrat', 'Entrée', 'Salaire brut'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {profiles.slice(0, 15).map((p: any) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <td className="px-4 py-3 font-medium text-gray-900">{p.prenom} {p.nom}</td>
                    <td className="px-4 py-3 text-gray-600 text-xs">{p.poste}</td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.departement}</td>
                    <td className="px-4 py-3"><span className="text-xs px-1.5 py-0.5 bg-blue-50 text-blue-700 rounded-full">{p.type_contrat}</span></td>
                    <td className="px-4 py-3 text-gray-500 text-xs">{p.date_entree ? new Intl.DateTimeFormat('fr-FR').format(new Date(p.date_entree)) : '—'}</td>
                    <td className="px-4 py-3 font-medium text-gray-900">{p.salaire_brut ? `${formatMilliers(p.salaire_brut)} €` : '—'}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {profiles.length > 15 && <div className="px-5 py-3 text-xs text-gray-400 border-t border-gray-100">… et {profiles.length - 15} autres collaborateurs</div>}
          </div>
        </div>
      )}

      {/* === ABSENTÉISME === */}
      {onglet === 'absences' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Taux d\'absentéisme', value: `${absenteisme.taux}%`, color: absenteisme.taux > 5 ? 'text-red-600' : 'text-green-600', sub: 'référence secteur : 4-5%' },
              { label: 'Jours d\'absence', value: absenteisme.joursTotal, sub: `${annee}` },
              { label: 'Congés payés pris', value: demandes.filter((d: any) => d.type_code === 'CP' && d.statut === 'validee').reduce((s: number, d: any) => s + d.nb_jours, 0), sub: 'jours CP' },
              { label: 'RTT pris', value: demandes.filter((d: any) => d.type_code === 'RTT' && d.statut === 'validee').reduce((s: number, d: any) => s + d.nb_jours, 0), sub: 'jours RTT' },
            ].map(s => (
              <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                <p className={`text-xl font-semibold ${(s as any).color ?? 'text-gray-900'}`}>{s.value}</p>
                <p className="text-xs text-gray-400 mt-0.5">{s.sub}</p>
              </div>
            ))}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <BarreHorizontale title="Absences par type"
                items={[
                  { label: 'Congés payés', value: demandes.filter((d: any) => d.type_code === 'CP' && d.statut === 'validee').reduce((s: number, d: any) => s + d.nb_jours, 0), color: '#378ADD' },
                  { label: 'RTT', value: demandes.filter((d: any) => d.type_code === 'RTT' && d.statut === 'validee').reduce((s: number, d: any) => s + d.nb_jours, 0), color: '#1D9E75' },
                  { label: 'Maladie', value: demandes.filter((d: any) => d.type_code === 'MAL').reduce((s: number, d: any) => s + d.nb_jours, 0), color: '#E24B4A' },
                  { label: 'Autres', value: demandes.filter((d: any) => !['CP','RTT','MAL'].includes(d.type_code)).reduce((s: number, d: any) => s + d.nb_jours, 0), color: '#888780' },
                ].filter(i => i.value > 0)} unit=" j" />
            </div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <BarreHorizontale title="Absences par service"
                items={services.map(s => ({
                  label: s,
                  value: demandes.filter((d: any) => d.profile?.departement === s).reduce((sum: number, d: any) => sum + (d.nb_jours ?? 0), 0),
                })).filter(i => i.value > 0)} unit=" j" />
            </div>
          </div>
        </div>
      )}

      {/* === EGAPRO === */}
      {onglet === 'egapro' && (
        <div className="space-y-5">
          <IndexEgaproCard index={index} nbSalaries={profiles.length} />
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Écarts de rémunération F/H par catégorie</h3>
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 text-xs text-blue-700 mb-4">
              Pour un calcul précis de l'index Egapro, renseignez le genre (H/F) et le salaire brut de chaque collaborateur dans leur dossier RH. Les données ci-dessous sont calculées sur la base des salaires disponibles.
            </div>
            <BarreHorizontale
              title="Répartition F/H par service"
              items={services.map(s => {
                const emp = profiles.filter((p: any) => p.departement === s)
                return { label: s, value: emp.length, sublabel: `${emp.filter((p: any) => p.genre === 'F').length}F / ${emp.filter((p: any) => p.genre !== 'F').length}H` }
              })} unit=" pers." />
          </div>
        </div>
      )}

      {/* === BDES === */}
      {onglet === 'bdes' && (
        <div className="space-y-4">
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4">
            <p className="text-sm font-medium text-amber-800 mb-1">BDESE — Base de Données Économiques, Sociales et Environnementales</p>
            <p className="text-xs text-amber-700">Obligatoire pour les entreprises de 50 salariés et plus. Mise à jour annuelle. Support de consultation du CSE.</p>
          </div>

          {[
            {
              section: '1. Investissements',
              items: [
                { label: 'Investissement formation', value: formatEurosM(budgetFormation) },
                { label: 'Heures de formation réalisées', value: `${heuresFormation}h` },
                { label: 'Taux d\'accès à la formation', value: profiles.length > 0 ? `${Math.round(formations.filter(f => f.statut === 'terminee').length / profiles.length * 100)}%` : '—' },
              ]
            },
            {
              section: '2. Égalité professionnelle',
              items: [
                { label: 'Index Egapro', value: index.publiable ? `${index.note_globale}/100` : 'N/A (< 50 sal.)' },
                { label: 'Écart de salaire F/H', value: '—' },
                { label: 'Part des femmes cadres', value: profiles.filter(p => p.statut === 'cadre').length > 0 ? `${Math.round(profiles.filter(p => p.statut === 'cadre' && p.genre === 'F').length / profiles.filter(p => p.statut === 'cadre').length * 100)}%` : '—' },
              ]
            },
            {
              section: '3. Rémunération',
              items: [
                { label: 'Masse salariale annuelle', value: formatEurosM(masseSal.total) },
                { label: 'Salaire brut mensuel moyen', value: salMoyen > 0 ? `${formatMilliers(salMoyen)} €` : '—' },
                { label: 'Rapport salaire max/min', value: '—' },
              ]
            },
            {
              section: '4. Effectifs & conditions de travail',
              items: [
                { label: 'Effectif total', value: profiles.length },
                { label: 'dont CDI', value: cdi },
                { label: 'Taux d\'absentéisme', value: `${absenteisme.taux}%` },
                { label: 'Entretiens professionnels réalisés', value: entretiensSignes },
              ]
            },
          ].map(section => (
            <div key={section.section} className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-semibold text-gray-900 mb-3">{section.section}</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
                {section.items.map(item => (
                  <div key={item.label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-0.5">{item.label}</p>
                    <p className="text-sm font-semibold text-gray-900">{item.value}</p>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* === EXPORTS CSE === */}
      {onglet === 'cse' && (
        <div className="space-y-4">
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-sm font-medium text-blue-900 mb-1">Exports pour le CSE / CSSCT</p>
            <p className="text-xs text-blue-700">Tous les fichiers sont générés au format CSV (compatible Excel) avec encodage UTF-8. Les données sensibles (salaires, informations médicales) sont incluses uniquement sur les exports dédiés.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[
              {
                titre: 'Registre du personnel',
                description: 'Nom, poste, service, contrat, date entrée, ancienneté',
                icon: 'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z',
                fn: () => exportCSV(profiles.map(p => ({
                  Nom: p.nom, Prenom: p.prenom, Poste: p.poste, Service: p.departement,
                  Contrat: p.type_contrat, Entree: p.date_entree, Statut: p.statut,
                })), 'registre_personnel'),
                sensitive: false,
              },
              {
                titre: 'Masse salariale',
                description: 'Salaire brut par collaborateur, par service et total',
                icon: 'M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z',
                fn: () => exportCSV(profiles.map(p => ({
                  Nom: p.nom, Prenom: p.prenom, Service: p.departement,
                  Contrat: p.type_contrat, Salaire_brut_mensuel: p.salaire_brut ?? '',
                  Salaire_brut_annuel: p.salaire_brut ? p.salaire_brut * 12 : '',
                })), 'masse_salariale'),
                sensitive: true,
              },
              {
                titre: 'Bilan des absences',
                description: 'Congés, RTT, maladie, absences par type et par personne',
                icon: 'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z',
                fn: () => exportCSV(demandes.map((d: any) => ({
                  Salarie: `${d.profile?.prenom ?? ''} ${d.profile?.nom ?? ''}`,
                  Service: d.profile?.departement ?? '',
                  Type: d.type_code, Debut: d.date_debut, Fin: d.date_fin,
                  Jours: d.nb_jours, Statut: d.statut,
                })), 'bilan_absences'),
                sensitive: false,
              },
              {
                titre: 'Bilan formation',
                description: 'Formations réalisées, heures, coûts, financement OPCO/CPF',
                icon: 'M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253',
                fn: () => exportCSV(formations.map((f: any) => ({
                  Salarie: `${f.profile?.prenom ?? ''} ${f.profile?.nom ?? ''}`,
                  Formation: f.formation?.titre ?? f.titre_libre ?? '',
                  Organisme: f.formation?.organisme ?? f.organisme_libre ?? '',
                  Duree_h: f.duree_heures ?? '', Cout: f.cout_reel ?? f.cout_estime ?? '',
                  Financement: f.financement, Statut: f.statut,
                })), 'bilan_formation'),
                sensitive: false,
              },
              {
                titre: 'Entretiens professionnels',
                description: 'Suivi des EP obligatoires, notes, objectifs',
                icon: 'M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4',
                fn: () => exportCSV(entretiens.map((e: any) => ({
                  Salarie: `${e.profile?.prenom ?? ''} ${e.profile?.nom ?? ''}`,
                  Type: e.type_code, Date: e.date_prevue ?? '', Statut: e.statut,
                  Note: e.note_globale ?? '', Signe: e.statut === 'signe' ? 'Oui' : 'Non',
                })), 'entretiens_professionnels'),
                sensitive: false,
              },
              {
                titre: 'Index Egapro complet',
                description: 'Indicateurs détaillés pour déclaration sur index.egapro.travail.gouv.fr',
                icon: 'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z',
                fn: () => exportCSV([{
                  Annee: annee, Effectif: profiles.length,
                  Index_global: index.publiable ? index.note_globale : 'NC',
                  Ecarts_remuneration: index.ecarts_remuneration,
                  Ecarts_augmentations: index.ecarts_augmentations,
                  Ecarts_promotions: index.ecarts_promotions,
                  Conges_maternite: index.conges_maternite,
                  Hautes_remunerations: index.hautes_remunerations,
                  Obligation_mesures: index.obligation_mesures ? 'Oui' : 'Non',
                }], 'index_egapro'),
                sensitive: true,
              },
            ].map(exp => (
              <div key={exp.titre} className="bg-white border border-gray-200 rounded-xl p-5 flex items-start gap-4">
                <div className="w-10 h-10 bg-blue-50 rounded-lg flex items-center justify-center flex-shrink-0">
                  <svg className="w-5 h-5 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={exp.icon} />
                  </svg>
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="text-sm font-medium text-gray-900">{exp.titre}</p>
                    {exp.sensitive && (
                      <span className="text-[10px] font-medium bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full border border-amber-200">Sensible</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{exp.description}</p>
                  <button onClick={exp.fn}
                    className="mt-2.5 flex items-center gap-1.5 text-xs font-medium text-blue-600 hover:text-blue-800 border border-blue-200 px-3 py-1.5 rounded-lg hover:bg-blue-50 transition">
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                    </svg>
                    Exporter CSV
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
