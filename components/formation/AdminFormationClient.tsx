'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { STATUT_LABELS, STATUT_COLORS, FINANCEMENT_LABELS, CATEGORIE_COLORS, CATEGORIE_LABELS } from '@/lib/types-formation'
import type { DemandeFormation, PlanFormation } from '@/lib/types-formation'

export default function AdminFormationClient() {
  const [onglet, setOnglet] = useState<'demandes'|'plan'|'catalogue'|'budget'>('demandes')
  const [demandes, setDemandes] = useState<any[]>([])
  const [plan, setPlan] = useState<PlanFormation | null>(null)
  const [catalogue, setCatalogue] = useState<any[]>([])
  const [loading, setLoading] = useState(false)
  const [actionId, setActionId] = useState<string | null>(null)
  const [motifRefus, setMotifRefus] = useState('')
  const router = useRouter()
  const supabase = createClient()
  const annee = new Date().getFullYear()

  useEffect(() => {
    async function load() {
      const [{ data: d }, { data: p }, { data: c }] = await Promise.all([
        supabase.from('demandes_formation').select('*, formation:formations_catalogue(*), profile:profile_id(prenom,nom,departement,poste)').order('created_at', { ascending: false }),
        supabase.from('plans_formation').select('*').eq('annee', annee).maybeSingle(),
        supabase.from('formations_catalogue').select('*').order('categorie'),
      ])
      setDemandes(d ?? [])
      setPlan(p ?? null)
      setCatalogue(c ?? [])
    }
    load()
  }, [])

  async function creerPlan() {
    setLoading(true)
    const { data } = await supabase.from('plans_formation').insert({
      annee, titre: `Plan de développement des compétences ${annee}`,
      budget_total: 0, statut: 'brouillon'
    }).select().single()
    setPlan(data)
    setLoading(false)
  }

  async function updateBudget(budgetTotal: number) {
    if (!plan) return
    await supabase.from('plans_formation').update({ budget_total: budgetTotal }).eq('id', plan.id)
    setPlan(p => p ? { ...p, budget_total: budgetTotal } : p)
  }

  async function valider(id: string, statut: string) {
    setLoading(true)
    const now = new Date().toISOString()
    const me = await supabase.auth.getUser()
    const { data: myP } = await supabase.from('profiles').select('id').eq('user_id', me.data.user?.id ?? '').single()
    const update: Record<string, unknown> = { statut }
    if (statut === 'validee_manager') { update.validee_manager_par = myP?.id; update.validee_manager_le = now }
    if (statut === 'validee_rh') { update.validee_rh_par = myP?.id; update.validee_rh_le = now }
    if (statut === 'refusee') { update.motif_refus = motifRefus }
    await supabase.from('demandes_formation').update(update).eq('id', id)
    setDemandes(ds => ds.map(d => d.id === id ? { ...d, ...update } : d))
    setActionId(null)
    setMotifRefus('')
    setLoading(false)
  }

  async function planifier(id: string, dateDebut: string, dateFin: string) {
    await supabase.from('demandes_formation').update({ statut: 'planifiee', date_debut: dateDebut, date_fin: dateFin }).eq('id', id)
    setDemandes(ds => ds.map(d => d.id === id ? { ...d, statut: 'planifiee', date_debut: dateDebut, date_fin: dateFin } : d))
  }

  const stats = {
    total: demandes.length,
    enAttente: demandes.filter(d => d.statut === 'demande').length,
    aValiderRh: demandes.filter(d => d.statut === 'validee_manager').length,
    terminees: demandes.filter(d => d.statut === 'terminee').length,
    budgetEngage: demandes.filter(d => !['annulee','refusee'].includes(d.statut)).reduce((s: number, d: any) => s + (d.cout_reel ?? d.cout_estime ?? 0), 0),
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-900' },
          { label: 'À valider (manager)', value: stats.enAttente, color: stats.enAttente > 0 ? 'text-amber-600' : 'text-gray-400' },
          { label: 'À valider (RH)', value: stats.aValiderRh, color: stats.aValiderRh > 0 ? 'text-blue-600' : 'text-gray-400' },
          { label: 'Terminées', value: stats.terminees, color: 'text-green-600' },
          { label: 'Budget engagé', value: `${stats.budgetEngage.toLocaleString('fr-FR')} €`, color: 'text-gray-900' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-0.5">{s.label}</p>
            <p className={`text-lg font-semibold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div className="flex border-b border-gray-200 mb-5 gap-0 overflow-x-auto">
        {[
          { id: 'demandes', label: `Demandes (${demandes.length})` },
          { id: 'plan', label: 'Plan de développement' },
          { id: 'catalogue', label: `Catalogue (${catalogue.length})` },
          { id: 'budget', label: 'Budget & OPCO' },
        ].map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id as any)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${onglet === o.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {o.label}
          </button>
        ))}
      </div>

      {/* Onglet demandes */}
      {onglet === 'demandes' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Salarié</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Formation</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Durée</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Coût</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Financement</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Statut</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {demandes.map((d: any) => (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{d.profile?.prenom} {d.profile?.nom}</p>
                    <p className="text-[11px] text-gray-400">{d.profile?.departement}</p>
                  </td>
                  <td className="px-5 py-3">
                    <p className="text-gray-800">{d.formation?.titre ?? d.titre_libre}</p>
                    {(d.formation?.organisme ?? d.organisme_libre) && (
                      <p className="text-[11px] text-gray-400">{d.formation?.organisme ?? d.organisme_libre}</p>
                    )}
                    {d.description_libre && (
                      <p className="text-[11px] text-gray-400 italic mt-0.5 max-w-xs truncate">{d.description_libre}</p>
                    )}
                  </td>
                  <td className="px-5 py-3 text-gray-600">{d.duree_heures ? `${d.duree_heures}h` : '—'}</td>
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {d.cout_reel ? `${d.cout_reel.toLocaleString('fr-FR')} €` : d.cout_estime ? `~${d.cout_estime.toLocaleString('fr-FR')} €` : '—'}
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500">{FINANCEMENT_LABELS[d.financement as keyof typeof FINANCEMENT_LABELS]}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUT_COLORS[d.statut as keyof typeof STATUT_COLORS]}`}>
                      {STATUT_LABELS[d.statut as keyof typeof STATUT_LABELS]}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {d.statut === 'demande' && (
                      <div className="flex gap-1.5">
                        <button onClick={() => valider(d.id, 'validee_manager')} className="text-xs text-green-700 border border-green-300 px-2 py-0.5 rounded-lg hover:bg-green-50 transition">✓ Valider</button>
                        <button onClick={() => setActionId(d.id)} className="text-xs text-red-600 border border-red-200 px-2 py-0.5 rounded-lg hover:bg-red-50 transition">✗ Refuser</button>
                      </div>
                    )}
                    {d.statut === 'validee_manager' && (
                      <div className="flex gap-1.5">
                        <button onClick={() => valider(d.id, 'validee_rh')} className="text-xs text-blue-700 border border-blue-300 px-2 py-0.5 rounded-lg hover:bg-blue-50 transition">✓ RH valide</button>
                        <button onClick={() => setActionId(d.id)} className="text-xs text-red-600 border border-red-200 px-2 py-0.5 rounded-lg hover:bg-red-50 transition">✗</button>
                      </div>
                    )}
                    {d.statut === 'validee_rh' && (
                      <button onClick={() => valider(d.id, 'planifiee')} className="text-xs text-purple-700 border border-purple-200 px-2 py-0.5 rounded-lg hover:bg-purple-50 transition">Planifier</button>
                    )}
                    {d.statut === 'planifiee' && (
                      <button onClick={() => valider(d.id, 'terminee')} className="text-xs text-green-700 border border-green-200 px-2 py-0.5 rounded-lg hover:bg-green-50 transition">Marquer terminée</button>
                    )}
                    {/* Modal refus */}
                    {actionId === d.id && (
                      <div className="mt-2 space-y-1">
                        <input value={motifRefus} onChange={e => setMotifRefus(e.target.value)} placeholder="Motif du refus…"
                          className="w-full px-2 py-1 text-xs border border-gray-300 rounded focus:outline-none" />
                        <div className="flex gap-1">
                          <button onClick={() => valider(d.id, 'refusee')} className="text-xs bg-red-500 text-white px-2 py-0.5 rounded">Confirmer refus</button>
                          <button onClick={() => setActionId(null)} className="text-xs border px-2 py-0.5 rounded">Annuler</button>
                        </div>
                      </div>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Onglet plan */}
      {onglet === 'plan' && (
        <div className="max-w-2xl">
          {!plan ? (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center">
              <p className="text-sm text-gray-500 mb-4">Aucun plan de développement des compétences pour {annee}</p>
              <button onClick={creerPlan} disabled={loading} className="bg-blue-600 text-white text-sm font-medium px-5 py-2.5 rounded-lg hover:bg-blue-700 transition">
                {loading ? 'Création…' : `Créer le plan ${annee}`}
              </button>
            </div>
          ) : (
            <div className="bg-white border border-gray-200 rounded-xl p-6">
              <div className="flex items-start justify-between mb-5">
                <div>
                  <h3 className="text-base font-semibold text-gray-900">{plan.titre}</h3>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border mt-1 inline-block ${plan.statut === 'valide' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-gray-100 text-gray-600 border-gray-200'}`}>
                    {plan.statut === 'valide' ? 'Validé' : plan.statut === 'cloture' ? 'Clôturé' : 'Brouillon'}
                  </span>
                </div>
                {plan.statut === 'brouillon' && (
                  <button onClick={async () => { await supabase.from('plans_formation').update({ statut: 'valide' }).eq('id', plan.id); setPlan(p => p ? { ...p, statut: 'valide' } : p) }}
                    className="bg-green-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-green-700 transition">
                    Valider le plan
                  </button>
                )}
              </div>
              <div className="mb-5">
                <label className="block text-xs font-medium text-gray-600 mb-1">Budget total alloué (€)</label>
                <input type="number" defaultValue={plan.budget_total}
                  onBlur={e => updateBudget(parseFloat(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-3 gap-4 mb-5">
                {[
                  { label: 'Budget total', value: `${plan.budget_total.toLocaleString('fr-FR')} €` },
                  { label: 'Budget engagé', value: `${stats.budgetEngage.toLocaleString('fr-FR')} €` },
                  { label: 'Restant', value: `${(plan.budget_total - stats.budgetEngage).toLocaleString('fr-FR')} €` },
                ].map(s => (
                  <div key={s.label} className="bg-gray-50 rounded-lg p-3">
                    <p className="text-xs text-gray-500 mb-0.5">{s.label}</p>
                    <p className="text-base font-semibold text-gray-900">{s.value}</p>
                  </div>
                ))}
              </div>
              {plan.budget_total > 0 && (
                <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                  <div className="h-full rounded-full bg-blue-500 transition-all"
                    style={{ width: `${Math.min(100, (stats.budgetEngage / plan.budget_total) * 100)}%` }} />
                </div>
              )}
            </div>
          )}
        </div>
      )}

      {/* Onglet catalogue */}
      {onglet === 'catalogue' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Formation</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Catégorie</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Durée</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Coût moy.</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Modalité</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Options</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {catalogue.map((f: any) => (
                <tr key={f.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <p className="font-medium text-gray-900">{f.titre}</p>
                    {f.organisme && <p className="text-xs text-gray-400">{f.organisme}</p>}
                  </td>
                  <td className="px-5 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                      style={{ backgroundColor: CATEGORIE_COLORS[f.categorie as keyof typeof CATEGORIE_COLORS] ?? '#888' }}>
                      {CATEGORIE_LABELS[f.categorie as keyof typeof CATEGORIE_LABELS] ?? f.categorie}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{f.duree_heures ? `${f.duree_heures}h` : '—'}</td>
                  <td className="px-5 py-3 text-gray-600">{f.cout_moyen ? `${f.cout_moyen.toLocaleString('fr-FR')} €` : <span className="text-green-600">Gratuit</span>}</td>
                  <td className="px-5 py-3 text-gray-500 text-xs capitalize">{f.modalite}</td>
                  <td className="px-5 py-3">
                    <div className="flex gap-1 flex-wrap">
                      {f.certifiante && <span className="text-[10px] bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full border border-green-200">Certifiante</span>}
                      {f.eligible_cpf && <span className="text-[10px] bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full border border-blue-200">CPF</span>}
                      {f.renouvellement_mois && <span className="text-[10px] bg-amber-50 text-amber-700 px-1.5 py-0.5 rounded-full border border-amber-200">/{f.renouvellement_mois}m</span>}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Onglet budget OPCO */}
      {onglet === 'budget' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Répartition par financement</h3>
            {Object.entries(FINANCEMENT_LABELS).map(([code, label]) => {
              const count = demandes.filter((d: any) => d.financement === code && !['annulee','refusee'].includes(d.statut)).length
              const montant = demandes.filter((d: any) => d.financement === code && !['annulee','refusee'].includes(d.statut)).reduce((s: number, d: any) => s + (d.cout_reel ?? d.cout_estime ?? 0), 0)
              if (count === 0) return null
              return (
                <div key={code} className="flex justify-between items-center py-2 border-b border-gray-100 last:border-0">
                  <span className="text-sm text-gray-700">{label}</span>
                  <div className="text-right">
                    <p className="text-sm font-medium text-gray-900">{montant.toLocaleString('fr-FR')} €</p>
                    <p className="text-xs text-gray-400">{count} demande{count > 1 ? 's' : ''}</p>
                  </div>
                </div>
              )
            })}
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Dossiers OPCO à suivre</h3>
            {demandes.filter((d: any) => d.financement === 'opco' && d.dossier_opco_ref).length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Aucun dossier OPCO en cours</p>
            ) : (
              demandes.filter((d: any) => d.financement === 'opco').map((d: any) => (
                <div key={d.id} className="py-2 border-b border-gray-100 last:border-0">
                  <p className="text-sm font-medium text-gray-900">{d.formation?.titre ?? d.titre_libre}</p>
                  <div className="flex justify-between mt-0.5">
                    <span className="text-xs text-gray-500">{d.profile?.prenom} {d.profile?.nom}</span>
                    {d.montant_opco && <span className="text-xs font-medium text-green-700">{d.montant_opco.toLocaleString('fr-FR')} € OPCO</span>}
                  </div>
                  {d.dossier_opco_ref && <p className="text-xs text-gray-400 mt-0.5">Réf : {d.dossier_opco_ref}</p>}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
