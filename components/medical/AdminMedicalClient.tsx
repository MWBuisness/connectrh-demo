'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import {
  APTITUDE_LABELS, APTITUDE_COLORS,
  STATUT_VISITE_LABELS, STATUT_VISITE_COLORS,
  CRITICITE_COLOR, CRITICITE_LABEL,
  type VisiteMedicale, type AlerteMedicale, type DuerRisque
} from '@/lib/types-medical'

export default function AdminMedicalClient() {
  const [onglet, setOnglet] = useState<'tableau_bord'|'visites'|'planifier'|'duer'|'alertes'>('tableau_bord')
  const [visites, setVisites] = useState<any[]>([])
  const [types, setTypes] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [alertes, setAlertes] = useState<any[]>([])
  const [duer, setDuer] = useState<any[]>([])
  const [loading, setLoading] = useState(false)

  // Form nouvelle visite
  const [fProfile, setFProfile] = useState('')
  const [fType, setFType] = useState('VIP')
  const [fDatePrevue, setFDatePrevue] = useState('')
  const [fDateRealisee, setFDateRealisee] = useState('')
  const [fMedecin, setFMedecin] = useState('')
  const [fService, setFService] = useState('')
  const [fLieu, setFLieu] = useState('')
  const [fAptitude, setFAptitude] = useState<string>('')
  const [fAmenagements, setFAmenagements] = useState('')
  const [fRestrictions, setFRestrictions] = useState('')
  const [fRemarques, setFRemarques] = useState('')
  const [fStatut, setFStatut] = useState('planifiee')
  const [editId, setEditId] = useState<string | null>(null)

  // Form DUER
  const [dUnite, setDUnite] = useState('')
  const [dRisque, setDRisque] = useState('')
  const [dDesc, setDDesc] = useState('')
  const [dGravite, setDGravite] = useState(2)
  const [dProba, setDProba] = useState(2)
  const [dMesures, setDMesures] = useState('')
  const [dResponsable, setDResponsable] = useState('')
  const [showDuerForm, setShowDuerForm] = useState(false)

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => { load() }, [])

  async function load() {
    const [{ data: v }, { data: t }, { data: p }, { data: a }, { data: d }] = await Promise.all([
      supabase.from('visites_medicales').select('*, type:types_visite_medicale(*), profile:profile_id(prenom,nom,poste,departement,date_entree)').order('date_prevue', { ascending: false }),
      supabase.from('types_visite_medicale').select('*').order('ordre'),
      supabase.from('profiles').select('id,prenom,nom,departement,poste,date_entree').order('nom'),
      supabase.from('alertes_medicales').select('*, profile:profile_id(prenom,nom)').eq('lue', false).order('urgence').order('echeance'),
      supabase.from('duer_risques').select('*').order('criticite', { ascending: false }),
    ])
    setVisites(v ?? [])
    setTypes(t ?? [])
    setProfiles(p ?? [])
    setAlertes(a ?? [])
    setDuer(d ?? [])
  }

  function resetForm() {
    setFProfile(''); setFType('VIP'); setFDatePrevue(''); setFDateRealisee('')
    setFMedecin(''); setFService(''); setFLieu(''); setFAptitude('')
    setFAmenagements(''); setFRestrictions(''); setFRemarques(''); setFStatut('planifiee')
    setEditId(null)
  }

  function editVisite(v: any) {
    setFProfile(v.profile_id); setFType(v.type_code)
    setFDatePrevue(v.date_prevue ?? ''); setFDateRealisee(v.date_realisee ?? '')
    setFMedecin(v.medecin ?? ''); setFService(v.service_sst ?? '')
    setFLieu(v.lieu ?? ''); setFAptitude(v.aptitude ?? '')
    setFAmenagements(v.amenagements ?? ''); setFRestrictions(v.restrictions ?? '')
    setFRemarques(v.remarques ?? ''); setFStatut(v.statut)
    setEditId(v.id); setOnglet('planifier')
  }

  async function sauvegarderVisite() {
    if (!fProfile || !fType) return
    setLoading(true)
    const data = {
      profile_id: fProfile, type_code: fType,
      date_prevue: fDatePrevue || null, date_realisee: fDateRealisee || null,
      medecin: fMedecin || null, service_sst: fService || null, lieu: fLieu || null,
      aptitude: fAptitude || null, amenagements: fAmenagements || null,
      restrictions: fRestrictions || null, remarques: fRemarques || null,
      statut: fStatut,
    }
    if (editId) {
      await supabase.from('visites_medicales').update(data).eq('id', editId)
      // Créer alerte si inapte
      if (fAptitude === 'inapte') {
        await supabase.from('alertes_medicales').insert({
          profile_id: fProfile, visite_id: editId,
          type_alerte: 'inapte_signalement',
          message: `Inaptitude constatée — action requise`,
          urgence: 'critique',
        })
      }
    } else {
      await supabase.from('visites_medicales').insert(data)
    }
    setLoading(false)
    resetForm()
    await load()
    setOnglet('visites')
  }

  async function ajouterDuer() {
    if (!dUnite || !dRisque) return
    setLoading(true)
    await supabase.from('duer_risques').insert({
      unite_travail: dUnite, risque: dRisque, description: dDesc || null,
      gravite: dGravite, probabilite: dProba,
      mesures_actuelles: dMesures || null, responsable: dResponsable || null,
    })
    setDUnite(''); setDRisque(''); setDDesc(''); setDGravite(2); setDProba(2)
    setDMesures(''); setDResponsable(''); setShowDuerForm(false)
    setLoading(false)
    await load()
  }

  // Calculs tableau de bord
  const retardVisites = profiles.filter(p => {
    const visiteP = visites.filter(v => v.profile_id === p.id && v.statut === 'realisee')
    const entree = new Date(p.date_entree)
    const limite3mois = new Date(entree.getTime() + 90 * 24 * 3600 * 1000)
    return visiteP.length === 0 && limite3mois < new Date()
  })

  const visitesAVenir = visites.filter(v => v.statut === 'planifiee' && v.date_prevue && new Date(v.date_prevue) >= new Date())
  const visitesEnRetard = visites.filter(v => v.statut === 'planifiee' && v.date_prevue && new Date(v.date_prevue) < new Date())
  const inaptes = visites.filter(v => v.aptitude === 'inapte' && v.statut === 'realisee')

  return (
    <div>
      {/* Onglets */}
      <div className="flex border-b border-gray-200 mb-5 gap-0 overflow-x-auto">
        {[
          { id: 'tableau_bord', label: 'Tableau de bord' },
          { id: 'visites', label: `Registre (${visites.length})` },
          { id: 'planifier', label: editId ? 'Modifier visite' : 'Planifier / Saisir' },
          { id: 'duer', label: `DUER (${duer.length})` },
          { id: 'alertes', label: `Alertes${alertes.length > 0 ? ` (${alertes.length})` : ''}` },
        ].map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id as any)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${onglet === o.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {o.label}
          </button>
        ))}
      </div>

      {/* === TABLEAU DE BORD === */}
      {onglet === 'tableau_bord' && (
        <div className="space-y-5">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {[
              { label: 'Salariés sans VIP initiale', value: retardVisites.length, color: retardVisites.length > 0 ? 'text-red-600' : 'text-gray-400', urgence: retardVisites.length > 0 },
              { label: 'Visites planifiées', value: visitesAVenir.length, color: 'text-blue-600', urgence: false },
              { label: 'Visites en retard', value: visitesEnRetard.length, color: visitesEnRetard.length > 0 ? 'text-amber-600' : 'text-gray-400', urgence: visitesEnRetard.length > 0 },
              { label: 'Cas d\'inaptitude actifs', value: inaptes.length, color: inaptes.length > 0 ? 'text-red-600' : 'text-gray-400', urgence: false },
            ].map(s => (
              <div key={s.label} className={`bg-white border rounded-xl p-4 ${s.urgence ? 'border-red-200' : 'border-gray-200'}`}>
                <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
              </div>
            ))}
          </div>

          {/* Salariés sans visite initiale */}
          {retardVisites.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm font-medium text-red-800 mb-3">
                ⚠️ {retardVisites.length} salarié{retardVisites.length > 1 ? 's' : ''} sans visite d'information et de prévention initiale
              </p>
              <div className="space-y-2">
                {retardVisites.slice(0, 5).map((p: any) => (
                  <div key={p.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2">
                    <div>
                      <p className="text-sm font-medium text-gray-900">{p.prenom} {p.nom}</p>
                      <p className="text-xs text-gray-400">{p.poste} · Entrée : {new Intl.DateTimeFormat('fr-FR').format(new Date(p.date_entree))}</p>
                    </div>
                    <button onClick={() => { setFProfile(p.id); setFType('VIP'); setOnglet('planifier') }}
                      className="text-xs text-red-600 border border-red-200 px-2.5 py-1 rounded-lg hover:bg-red-50 transition">
                      Planifier VIP
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Inaptitudes */}
          {inaptes.length > 0 && (
            <div className="bg-red-50 border border-red-200 rounded-xl p-4">
              <p className="text-sm font-medium text-red-800 mb-3">Situations d'inaptitude — action requise</p>
              {inaptes.map((v: any) => (
                <div key={v.id} className="flex items-center justify-between bg-white rounded-lg px-3 py-2 mb-2">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{v.profile?.prenom} {v.profile?.nom}</p>
                    <p className="text-xs text-gray-400">{v.type?.label} · {v.date_realisee ? new Intl.DateTimeFormat('fr-FR').format(new Date(v.date_realisee)) : '—'}</p>
                    {v.restrictions && <p className="text-xs text-red-600 mt-0.5">{v.restrictions}</p>}
                  </div>
                  <span className="text-xs font-medium text-red-700 bg-red-100 px-2 py-0.5 rounded-full">Inapte</span>
                </div>
              ))}
            </div>
          )}

          {/* Prochaines visites */}
          {visitesAVenir.length > 0 && (
            <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
              <div className="px-5 py-4 border-b border-gray-100">
                <h3 className="text-sm font-medium text-gray-900">Prochaines visites planifiées</h3>
              </div>
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-100">
                    {['Salarié', 'Type', 'Date prévue', 'Service', 'Actions'].map(h => (
                      <th key={h} className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {visitesAVenir.slice(0, 8).map((v: any) => (
                    <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-3 font-medium text-gray-900">
                        {v.profile?.prenom} {v.profile?.nom}
                        <p className="text-xs font-normal text-gray-400">{v.profile?.departement}</p>
                      </td>
                      <td className="px-5 py-3">
                        <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium"
                          style={{ backgroundColor: v.type?.couleur ?? '#888' }}>
                          {v.type?.code}
                        </span>
                      </td>
                      <td className="px-5 py-3 text-gray-600 text-xs">
                        {v.date_prevue ? new Intl.DateTimeFormat('fr-FR').format(new Date(v.date_prevue)) : '—'}
                      </td>
                      <td className="px-5 py-3 text-gray-500 text-xs">{v.service_sst ?? '—'}</td>
                      <td className="px-5 py-3">
                        <button onClick={() => editVisite(v)} className="text-xs text-blue-600 font-medium hover:text-blue-800">
                          Saisir résultat
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* === REGISTRE === */}
      {onglet === 'visites' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h3 className="text-sm font-medium text-gray-900">Registre des visites médicales</h3>
            <button onClick={() => { resetForm(); setOnglet('planifier') }}
              className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-3 py-1.5 rounded-lg hover:bg-blue-700 transition">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Nouvelle visite
            </button>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Salarié', 'Type', 'Date', 'Médecin', 'Aptitude', 'Prochaine', 'Statut', ''].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {visites.map((v: any) => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <p className="font-medium text-gray-900">{v.profile?.prenom} {v.profile?.nom}</p>
                    <p className="text-[11px] text-gray-400">{v.profile?.departement}</p>
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: v.type?.couleur ?? '#888' }} />
                      <span className="text-xs text-gray-700">{v.type?.label}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600">
                    {(v.date_realisee ?? v.date_prevue) ? new Intl.DateTimeFormat('fr-FR').format(new Date(v.date_realisee ?? v.date_prevue)) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {v.medecin ? `Dr ${v.medecin}` : '—'}
                  </td>
                  <td className="px-4 py-3">
                    {v.aptitude ? (
                      <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full border ${APTITUDE_COLORS[v.aptitude as keyof typeof APTITUDE_COLORS]}`}>
                        {APTITUDE_LABELS[v.aptitude as keyof typeof APTITUDE_LABELS]}
                      </span>
                    ) : '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-500">
                    {v.prochaine_date ? new Intl.DateTimeFormat('fr-FR').format(new Date(v.prochaine_date)) : '—'}
                  </td>
                  <td className="px-4 py-3">
                    <span className={`text-[11px] font-medium px-1.5 py-0.5 rounded-full border ${STATUT_VISITE_COLORS[v.statut as keyof typeof STATUT_VISITE_COLORS]}`}>
                      {STATUT_VISITE_LABELS[v.statut as keyof typeof STATUT_VISITE_LABELS]}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    <button onClick={() => editVisite(v)} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Modifier</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* === PLANIFIER / SAISIR === */}
      {onglet === 'planifier' && (
        <div className="max-w-3xl">
          <div className="bg-white border border-gray-200 rounded-xl p-6">
            <h3 className="text-sm font-semibold text-gray-900 mb-5">
              {editId ? 'Modifier la visite' : 'Planifier / Saisir une visite médicale'}
            </h3>
            <div className="grid grid-cols-2 gap-4 mb-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Salarié *</label>
                <select value={fProfile} onChange={e => setFProfile(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— Choisir —</option>
                  {profiles.map(p => <option key={p.id} value={p.id}>{p.prenom} {p.nom} · {p.departement}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Type de visite *</label>
                <select value={fType} onChange={e => setFType(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {types.map(t => <option key={t.code} value={t.code}>{t.label}{t.obligatoire ? ' ★' : ''}</option>)}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date prévue</label>
                <input type="date" value={fDatePrevue} onChange={e => setFDatePrevue(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Date réalisée</label>
                <input type="date" value={fDateRealisee} onChange={e => setFDateRealisee(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Médecin du travail</label>
                <input value={fMedecin} onChange={e => setFMedecin(e.target.value)} placeholder="Nom du médecin"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Service de santé au travail</label>
                <input value={fService} onChange={e => setFService(e.target.value)} placeholder="Ex : CIAMT, ACMS…"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Lieu</label>
                <input value={fLieu} onChange={e => setFLieu(e.target.value)} placeholder="Adresse du centre"
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Statut</label>
                <select value={fStatut} onChange={e => setFStatut(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="planifiee">Planifiée</option>
                  <option value="realisee">Réalisée</option>
                  <option value="annulee">Annulée</option>
                  <option value="a_planifier">À planifier</option>
                </select>
              </div>
            </div>

            {/* Résultat (si réalisée) */}
            {fStatut === 'realisee' && (
              <div className="border border-gray-200 rounded-xl p-4 mb-4 space-y-3">
                <h4 className="text-xs font-semibold text-gray-700 uppercase tracking-wider">Résultat de la visite</h4>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Aptitude *</label>
                  <div className="grid grid-cols-2 gap-2">
                    {Object.entries(APTITUDE_LABELS).map(([k, v]) => (
                      <label key={k} className={`flex items-center gap-2 px-3 py-2 rounded-lg border cursor-pointer transition text-sm ${fAptitude === k ? 'border-blue-500 bg-blue-50 font-medium' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input type="radio" name="aptitude" value={k} checked={fAptitude === k} onChange={() => setFAptitude(k)} className="flex-shrink-0" />
                        {v}
                      </label>
                    ))}
                  </div>
                </div>
                {(fAptitude === 'apte_amenagements' || fAptitude === 'inapte_partiel') && (
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Aménagements préconisés</label>
                    <textarea value={fAmenagements} onChange={e => setFAmenagements(e.target.value)} rows={2}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                  </div>
                )}
                {fAptitude === 'inapte' && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-3 text-xs text-red-700">
                    ⚠️ En cas d'inaptitude, l'employeur a 1 mois pour reclasser ou licencier le salarié. Une alerte sera automatiquement créée.
                  </div>
                )}
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Restrictions médicales</label>
                  <textarea value={fRestrictions} onChange={e => setFRestrictions(e.target.value)} rows={2}
                    placeholder="Restrictions de port de charge, posture, horaires…"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Remarques</label>
                  <textarea value={fRemarques} onChange={e => setFRemarques(e.target.value)} rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
              </div>
            )}

            <div className="flex gap-3">
              <button onClick={sauvegarderVisite} disabled={loading || !fProfile || !fType}
                className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                </svg>
                {loading ? 'Enregistrement…' : editId ? 'Mettre à jour' : 'Enregistrer'}
              </button>
              <button onClick={() => { resetForm(); setOnglet('visites') }}
                className="px-5 py-2.5 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition">
                Annuler
              </button>
            </div>
          </div>
        </div>
      )}

      {/* === DUER === */}
      {onglet === 'duer' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">Document Unique d'Évaluation des Risques — {duer.length} risque{duer.length > 1 ? 's' : ''} identifié{duer.length > 1 ? 's' : ''}</p>
            <button onClick={() => setShowDuerForm(true)}
              className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
              </svg>
              Ajouter un risque
            </button>
          </div>

          {showDuerForm && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-4">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Nouveau risque DUER</h3>
              <div className="grid grid-cols-2 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Unité de travail *</label>
                  <input value={dUnite} onChange={e => setDUnite(e.target.value)} placeholder="Ex : Atelier production, Bureau…"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Risque identifié *</label>
                  <input value={dRisque} onChange={e => setDRisque(e.target.value)} placeholder="Ex : Chute de plain-pied, TMS…"
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Gravité (1 à 4)</label>
                  <select value={dGravite} onChange={e => setDGravite(parseInt(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value={1}>1 — Légère</option>
                    <option value={2}>2 — Significative</option>
                    <option value={3}>3 — Grave</option>
                    <option value={4}>4 — Très grave</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Probabilité (1 à 4)</label>
                  <select value={dProba} onChange={e => setDProba(parseInt(e.target.value))}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value={1}>1 — Improbable</option>
                    <option value={2}>2 — Peu probable</option>
                    <option value={3}>3 — Probable</option>
                    <option value={4}>4 — Très probable</option>
                  </select>
                </div>
                <div className="col-span-2">
                  <label className="block text-xs font-medium text-gray-600 mb-1">Mesures de prévention actuelles</label>
                  <textarea value={dMesures} onChange={e => setDMesures(e.target.value)} rows={2}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Responsable action</label>
                  <input value={dResponsable} onChange={e => setDResponsable(e.target.value)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div className="flex items-end">
                  <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 w-full text-center">
                    <p className="text-[10px] text-gray-400">Criticité = Gravité × Probabilité</p>
                    <p className={`text-lg font-bold mt-0.5 ${dGravite * dProba >= 12 ? 'text-red-600' : dGravite * dProba >= 6 ? 'text-amber-600' : 'text-green-600'}`}>
                      {dGravite * dProba} — {CRITICITE_LABEL(dGravite * dProba)}
                    </p>
                  </div>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={ajouterDuer} disabled={loading || !dUnite || !dRisque}
                  className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                  {loading ? 'Ajout…' : 'Ajouter au DUER'}
                </button>
                <button onClick={() => setShowDuerForm(false)} className="border border-gray-300 text-gray-600 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition">Annuler</button>
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  {['Unité de travail', 'Risque', 'G', 'P', 'Criticité', 'Mesures', 'Responsable', 'Statut'].map(h => (
                    <th key={h} className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {duer.map((d: any) => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-4 py-3 font-medium text-gray-900 text-xs">{d.unite_travail}</td>
                    <td className="px-4 py-3 text-gray-700 text-xs">
                      <p className="font-medium">{d.risque}</p>
                      {d.description && <p className="text-gray-400">{d.description}</p>}
                    </td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-700">{d.gravite}</td>
                    <td className="px-4 py-3 text-center font-semibold text-gray-700">{d.probabilite}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${CRITICITE_COLOR(d.criticite)}`}>
                        {d.criticite} — {CRITICITE_LABEL(d.criticite)}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs text-gray-500 max-w-xs truncate">{d.mesures_actuelles ?? '—'}</td>
                    <td className="px-4 py-3 text-xs text-gray-500">{d.responsable ?? '—'}</td>
                    <td className="px-4 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                        d.statut === 'traite' ? 'bg-green-50 text-green-700' : d.statut === 'en_cours' ? 'bg-blue-50 text-blue-700' : 'bg-amber-50 text-amber-700'
                      }`}>
                        {d.statut === 'traite' ? 'Traité' : d.statut === 'en_cours' ? 'En cours' : 'Identifié'}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* === ALERTES === */}
      {onglet === 'alertes' && (
        <div className="space-y-3">
          {alertes.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
              <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-sm font-medium text-gray-500">Aucune alerte médicale active</p>
            </div>
          ) : alertes.map((a: any) => (
            <div key={a.id} className={`border rounded-xl p-4 flex items-start gap-3 ${
              a.urgence === 'critique' ? 'bg-red-50 border-red-200' : a.urgence === 'haute' ? 'bg-amber-50 border-amber-200' : 'bg-blue-50 border-blue-200'
            }`}>
              <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${a.urgence === 'critique' ? 'text-red-500' : a.urgence === 'haute' ? 'text-amber-500' : 'text-blue-500'}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <p className="text-sm font-medium text-gray-900">{a.profile?.prenom} {a.profile?.nom}</p>
                  <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-full ${
                    a.urgence === 'critique' ? 'bg-red-200 text-red-800' : a.urgence === 'haute' ? 'bg-amber-200 text-amber-800' : 'bg-blue-200 text-blue-800'
                  }`}>{a.urgence.toUpperCase()}</span>
                </div>
                <p className="text-xs text-gray-700">{a.message}</p>
                {a.echeance && <p className="text-xs text-gray-500 mt-0.5">Échéance : {new Intl.DateTimeFormat('fr-FR').format(new Date(a.echeance))}</p>}
              </div>
              <button onClick={() => { setFProfile(a.profile_id); setOnglet('planifier') }}
                className="text-xs font-medium border px-2.5 py-1 rounded-lg transition flex-shrink-0 border-gray-300 text-gray-600 hover:bg-white">
                Planifier
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
