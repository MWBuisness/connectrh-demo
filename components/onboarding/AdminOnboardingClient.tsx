'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import OnboardingChecklist from './OnboardingChecklist'
import EtatDesLieuxForm from './EtatDesLieuxForm'
import { STATUT_MATERIEL_LABELS, STATUT_MATERIEL_COLORS, type AttributionMateriel, type DossierOnboarding } from '@/lib/types-onboarding'

interface Props {
  profiles: any[]; dossiers: any[]; templates: any[]
  attributions: any[]; materiels: any[]; adminId: string
}

export default function AdminOnboardingClient({ profiles, dossiers, templates, attributions, materiels, adminId }: Props) {
  const [onglet, setOnglet] = useState<'dossiers'|'materiel'|'parc'>('dossiers')
  const [edlOuvert, setEdlOuvert] = useState<{attr: AttributionMateriel; mode: 'remise'|'restitution'} | null>(null)
  const [creerDossier, setCreerDossier] = useState(false)
  const [creerAttrib, setCreerAttrib] = useState(false)
  const [dossierOuvert, setDossierOuvert] = useState<any | null>(null)

  // Form dossier
  const [fdProfile, setFdProfile] = useState('')
  const [fdTemplate, setFdTemplate] = useState('')
  const [fdType, setFdType] = useState<'onboarding'|'offboarding'>('onboarding')
  const [fdDateCible, setFdDateCible] = useState('')

  // Form attribution
  const [faProfile, setFaProfile] = useState('')
  const [faMateriel, setFaMateriel] = useState('')
  const [faDate, setFaDate] = useState(new Date().toISOString().split('T')[0])

  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  async function creerNouveauDossier() {
    if (!fdProfile || !fdTemplate) return
    setLoading(true)
    await supabase.from('dossiers_onboarding').upsert({
      profile_id: fdProfile, template_id: fdTemplate,
      type: fdType, date_cible: fdDateCible || null,
      statut: 'en_cours', progression: 0, taches_faites: []
    }, { onConflict: 'profile_id,type' })
    setLoading(false)
    setCreerDossier(false)
    router.refresh()
  }

  async function attribuerMateriel() {
    if (!faProfile || !faMateriel) return
    setLoading(true)
    await supabase.from('attributions_materiel').insert({
      profile_id: faProfile, materiel_id: faMateriel,
      date_remise: faDate, remis_par: adminId,
      edl_remise: {}, statut: 'actif'
    })
    await supabase.from('materiels').update({ statut: 'attribue' }).eq('id', faMateriel)
    setLoading(false)
    setCreerAttrib(false)
    router.refresh()
  }

  const onglets = [
    { id: 'dossiers', label: `Dossiers (${dossiers.length})` },
    { id: 'materiel', label: `Attributions (${attributions.length})` },
    { id: 'parc', label: `Parc matériel (${materiels.length})` },
  ]

  return (
    <div>
      {edlOuvert && (
        <EtatDesLieuxForm
          attribution={edlOuvert.attr}
          mode={edlOuvert.mode}
          champsEdl={edlOuvert.attr.materiel?.type?.champs_edl ?? []}
          nomSalarie={`${(edlOuvert.attr as any).profile?.prenom ?? ''} ${(edlOuvert.attr as any).profile?.nom ?? ''}`}
          onClose={() => setEdlOuvert(null)}
        />
      )}

      {/* Onglets */}
      <div className="flex border-b border-gray-200 mb-6 gap-0">
        {onglets.map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id as any)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${onglet === o.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {o.label}
          </button>
        ))}
      </div>

      {/* Onglet : Dossiers */}
      {onglet === 'dossiers' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{dossiers.length} dossier{dossiers.length > 1 ? 's' : ''} actif{dossiers.length > 1 ? 's' : ''}</p>
            <button onClick={() => setCreerDossier(true)} className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Ouvrir un dossier
            </button>
          </div>

          {creerDossier && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-4">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Nouveau dossier</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Salarié</label>
                  <select value={fdProfile} onChange={e => setFdProfile(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Choisir —</option>
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Type</label>
                  <select value={fdType} onChange={e => setFdType(e.target.value as any)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="onboarding">Onboarding</option>
                    <option value="offboarding">Offboarding</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Template</label>
                  <select value={fdTemplate} onChange={e => setFdTemplate(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Choisir —</option>
                    {templates.filter(t => t.type === fdType).map(t => <option key={t.id} value={t.id}>{t.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date cible</label>
                  <input type="date" value={fdDateCible} onChange={e => setFdDateCible(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={creerNouveauDossier} disabled={loading || !fdProfile || !fdTemplate} className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                  {loading ? 'Création…' : 'Créer le dossier'}
                </button>
                <button onClick={() => setCreerDossier(false)} className="border border-gray-300 text-gray-600 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition">Annuler</button>
              </div>
            </div>
          )}

          <div className="space-y-3">
            {dossiers.map((d: any) => (
              <div key={d.id} className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-5 py-4 flex items-center gap-4 cursor-pointer hover:bg-gray-50 transition"
                  onClick={() => setDossierOuvert(dossierOuvert?.id === d.id ? null : d)}>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-gray-900">{d.profile?.prenom} {d.profile?.nom}</p>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border ${d.type === 'onboarding' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {d.type === 'onboarding' ? 'Onboarding' : 'Offboarding'}
                      </span>
                    </div>
                    <p className="text-xs text-gray-400">{d.profile?.poste} · {d.profile?.departement}</p>
                  </div>
                  <div className="text-right">
                    <div className="text-sm font-semibold text-gray-900">{d.progression}%</div>
                    <div className="w-24 h-1.5 bg-gray-100 rounded-full overflow-hidden mt-1">
                      <div className={`h-full rounded-full ${d.progression === 100 ? 'bg-green-500' : 'bg-blue-500'}`} style={{ width: `${d.progression}%` }} />
                    </div>
                  </div>
                </div>
                {dossierOuvert?.id === d.id && (
                  <div className="border-t border-gray-100 p-5">
                    <OnboardingChecklist dossier={{ ...d, template: templates.find((t:any) => t.id === d.template_id) } as DossierOnboarding} />
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Onglet : Attributions */}
      {onglet === 'materiel' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{attributions.length} attribution{attributions.length > 1 ? 's' : ''}</p>
            <button onClick={() => setCreerAttrib(true)} className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Attribuer du matériel
            </button>
          </div>

          {creerAttrib && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-4">
              <h3 className="text-sm font-medium text-gray-900 mb-3">Attribuer du matériel</h3>
              <div className="grid grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Salarié</label>
                  <select value={faProfile} onChange={e => setFaProfile(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Choisir —</option>
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Matériel disponible</label>
                  <select value={faMateriel} onChange={e => setFaMateriel(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Choisir —</option>
                    {materiels.filter((m:any) => m.statut === 'disponible').map((m:any) => (
                      <option key={m.id} value={m.id}>{m.libelle} ({m.type?.label})</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date de remise</label>
                  <input type="date" value={faDate} onChange={e => setFaDate(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={attribuerMateriel} disabled={loading || !faProfile || !faMateriel} className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                  {loading ? 'Attribution…' : 'Attribuer + faire EDL'}
                </button>
                <button onClick={() => setCreerAttrib(false)} className="border border-gray-300 text-gray-600 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition">Annuler</button>
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Salarié</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Matériel</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Remise</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">EDL remise</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Statut</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {attributions.map((a: any) => (
                  <tr key={a.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3 font-medium text-gray-900">{a.profile?.prenom} {a.profile?.nom}</td>
                    <td className="px-5 py-3">
                      <p className="text-gray-800">{a.materiel?.libelle}</p>
                      <p className="text-xs text-gray-400">{a.materiel?.type?.label}</p>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {a.date_remise ? new Intl.DateTimeFormat('fr-FR').format(new Date(a.date_remise)) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      {a.signe_remise_le ? (
                        <span className="text-[11px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">✓ Signé</span>
                      ) : (
                        <span className="text-[11px] font-medium text-amber-600 bg-amber-50 px-2 py-0.5 rounded-full border border-amber-200">À faire</span>
                      )}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full border ${a.statut === 'actif' ? 'bg-blue-50 text-blue-700 border-blue-200' : a.statut === 'restitue' ? 'bg-gray-100 text-gray-600 border-gray-200' : 'bg-red-50 text-red-700 border-red-200'}`}>
                        {a.statut === 'actif' ? 'Actif' : a.statut === 'restitue' ? 'Restitué' : 'Litige'}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {a.statut === 'actif' && (
                        <button onClick={() => setEdlOuvert({ attr: a as AttributionMateriel, mode: a.signe_remise_le ? 'restitution' : 'remise' })}
                          className="text-xs text-blue-600 hover:text-blue-800 font-medium border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition">
                          {a.signe_remise_le ? 'Restituer' : 'EDL remise'}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Onglet : Parc matériel */}
      {onglet === 'parc' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Matériel</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Référence</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {materiels.map((m: any) => (
                <tr key={m.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900">{m.libelle}</td>
                  <td className="px-5 py-3">
                    <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: m.type?.couleur ?? '#888' }}>
                      {m.type?.label ?? m.type_code}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-500 font-mono text-xs">{m.reference ?? '—'}</td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUT_MATERIEL_COLORS[m.statut as keyof typeof STATUT_MATERIEL_COLORS]}`}>
                      {STATUT_MATERIEL_LABELS[m.statut as keyof typeof STATUT_MATERIEL_LABELS]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}
