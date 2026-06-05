'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { STATUT_ENTRETIEN_LABELS, STATUT_ENTRETIEN_COLORS } from '@/lib/types-entretiens'

export default function AdminEntretiensClient() {
  const [onglet, setOnglet] = useState<'entretiens'|'campagnes'|'alertes'>('entretiens')
  const [entretiens, setEntretiens] = useState<any[]>([])
  const [campagnes, setCampagnes] = useState<any[]>([])
  const [profiles, setProfiles] = useState<any[]>([])
  const [types, setTypes] = useState<any[]>([])
  const [alertes, setAlertes] = useState<any[]>([])
  const [creer, setCreer] = useState(false)
  const [loading, setLoading] = useState(false)

  // Form nouvel entretien
  const [fProfile, setFProfile] = useState('')
  const [fManager, setFManager] = useState('')
  const [fType, setFType] = useState('AEA')
  const [fDate, setFDate] = useState('')
  const [fHeure, setFHeure] = useState('')
  const [fLieu, setFLieu] = useState('')

  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    async function load() {
      const [{ data: e }, { data: c }, { data: p }, { data: t }, { data: a }] = await Promise.all([
        supabase.from('entretiens').select('*, type:types_entretien(*), profile:profile_id(prenom,nom,departement), manager:manager_id(prenom,nom)').order('date_prevue', { ascending: false }).limit(50),
        supabase.from('campagnes_entretien').select('*, type:types_entretien(*)').order('date_debut', { ascending: false }),
        supabase.from('profiles').select('id,prenom,nom,departement,role').order('nom'),
        supabase.from('types_entretien').select('*').order('ordre'),
        supabase.from('alertes_entretien').select('*, profile:profile_id(prenom,nom)').eq('lue', false).limit(20),
      ])
      setEntretiens(e ?? [])
      setCampagnes(c ?? [])
      setProfiles(p ?? [])
      setTypes(t ?? [])
      setAlertes(a ?? [])
    }
    load()
  }, [])

  async function creerEntretien() {
    if (!fProfile || !fType) return
    setLoading(true)
    await supabase.from('entretiens').insert({
      profile_id: fProfile,
      manager_id: fManager || null,
      type_code: fType,
      date_prevue: fDate || null,
      heure_prevue: fHeure || null,
      lieu: fLieu || null,
      statut: 'planifie',
      prep_manager: {}, prep_salarie: {}, compte_rendu: {},
      objectifs_actuels: [], objectifs_nouveaux: [], competences: [],
    })
    setLoading(false)
    setCreer(false)
    router.refresh()
    const { data: e } = await supabase.from('entretiens').select('*, type:types_entretien(*), profile:profile_id(prenom,nom,departement), manager:manager_id(prenom,nom)').order('date_prevue', { ascending: false }).limit(50)
    setEntretiens(e ?? [])
  }

  const stats = {
    total: entretiens.length,
    planifies: entretiens.filter(e => e.statut === 'planifie').length,
    enCours: entretiens.filter(e => ['prep_manager','prep_salarie','en_cours'].includes(e.statut)).length,
    signes: entretiens.filter(e => e.statut === 'signe').length,
    alertesCount: alertes.length,
  }

  return (
    <div>
      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-5">
        {[
          { label: 'Total', value: stats.total, color: 'text-gray-900' },
          { label: 'Planifiés', value: stats.planifies, color: 'text-gray-600' },
          { label: 'En préparation', value: stats.enCours, color: 'text-blue-600' },
          { label: 'Signés', value: stats.signes, color: 'text-green-600' },
          { label: 'Alertes légales', value: stats.alertesCount, color: stats.alertesCount > 0 ? 'text-red-600' : 'text-gray-400' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-3">
            <p className="text-xs text-gray-500 mb-0.5">{s.label}</p>
            <p className={`text-xl font-semibold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div className="flex border-b border-gray-200 mb-5 gap-0">
        {[
          { id: 'entretiens', label: `Entretiens (${entretiens.length})` },
          { id: 'campagnes', label: `Campagnes (${campagnes.length})` },
          { id: 'alertes', label: `Alertes légales${alertes.length > 0 ? ` (${alertes.length})` : ''}` },
        ].map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id as any)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px transition-colors ${onglet === o.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {o.label}
          </button>
        ))}
      </div>

      {/* Onglet entretiens */}
      {onglet === 'entretiens' && (
        <div>
          <div className="flex justify-between items-center mb-4">
            <p className="text-sm text-gray-500">{entretiens.length} entretien{entretiens.length > 1 ? 's' : ''}</p>
            <button onClick={() => setCreer(true)} className="flex items-center gap-2 bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 transition">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" /></svg>
              Planifier un entretien
            </button>
          </div>

          {creer && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-5 mb-4">
              <h3 className="text-sm font-medium text-gray-900 mb-4">Nouvel entretien</h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Salarié *</label>
                  <select value={fProfile} onChange={e => setFProfile(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Choisir —</option>
                    {profiles.map(p => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Type d'entretien *</label>
                  <select value={fType} onChange={e => setFType(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    {types.map(t => <option key={t.code} value={t.code}>{t.label}{t.obligatoire ? ' ★' : ''}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Manager</label>
                  <select value={fManager} onChange={e => setFManager(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="">— Non assigné —</option>
                    {profiles.filter(p => p.role !== 'salarie').map(p => <option key={p.id} value={p.id}>{p.prenom} {p.nom}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Date prévue</label>
                  <input type="date" value={fDate} onChange={e => setFDate(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Heure</label>
                  <input type="time" value={fHeure} onChange={e => setFHeure(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Lieu</label>
                  <input value={fLieu} onChange={e => setFLieu(e.target.value)} placeholder="Salle de réunion, visio…" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={creerEntretien} disabled={loading || !fProfile || !fType} className="bg-blue-600 text-white text-sm font-medium px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50 transition">
                  {loading ? 'Création…' : 'Créer et notifier'}
                </button>
                <button onClick={() => setCreer(false)} className="border border-gray-300 text-gray-600 text-sm px-4 py-2 rounded-lg hover:bg-gray-50 transition">Annuler</button>
              </div>
            </div>
          )}

          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Salarié</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Manager</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Statut</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Note</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {entretiens.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{e.profile?.prenom} {e.profile?.nom}</p>
                      <p className="text-[11px] text-gray-400">{e.profile?.departement}</p>
                    </td>
                    <td className="px-5 py-3">
                      <span className="text-xs px-2 py-0.5 rounded-full text-white font-medium" style={{ backgroundColor: e.type?.couleur ?? '#888' }}>
                        {e.type?.label}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {e.date_prevue ? new Intl.DateTimeFormat('fr-FR').format(new Date(e.date_prevue)) : '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">{e.manager ? `${e.manager.prenom} ${e.manager.nom}` : '—'}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUT_ENTRETIEN_COLORS[e.statut as keyof typeof STATUT_ENTRETIEN_COLORS]}`}>
                        {STATUT_ENTRETIEN_LABELS[e.statut as keyof typeof STATUT_ENTRETIEN_LABELS]}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {e.note_globale ? (
                        <span className="text-xs text-amber-600 font-medium">★ {e.note_globale}/5</span>
                      ) : <span className="text-gray-300">—</span>}
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/entretiens/${e.id}`} className="text-xs text-blue-600 hover:text-blue-800 font-medium">Ouvrir</Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Onglet alertes légales */}
      {onglet === 'alertes' && (
        <div>
          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-4">
            <p className="text-sm font-medium text-amber-800 mb-1">Obligations légales — Entretien professionnel</p>
            <p className="text-xs text-amber-600">La loi du 5 mars 2014 impose un entretien professionnel tous les 2 ans et un bilan de parcours tous les 6 ans. En cas de manquement, l'entreprise peut devoir abonder le CPF du salarié (3 000 €).</p>
          </div>
          {alertes.length === 0 ? (
            <div className="bg-white border border-gray-200 rounded-xl p-10 text-center text-gray-400 text-sm">
              <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Aucune alerte légale active
            </div>
          ) : (
            <div className="space-y-2">
              {alertes.map((a: any) => (
                <div key={a.id} className="bg-white border border-red-200 rounded-xl p-4 flex items-start gap-3">
                  <svg className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="flex-1">
                    <p className="text-sm font-medium text-gray-900">{a.profile?.prenom} {a.profile?.nom}</p>
                    <p className="text-xs text-red-600 mt-0.5">{a.message}</p>
                    {a.echeance && <p className="text-xs text-gray-400 mt-0.5">Échéance : {new Intl.DateTimeFormat('fr-FR').format(new Date(a.echeance))}</p>}
                  </div>
                  <button onClick={() => setOnglet('entretiens')} className="text-xs text-blue-600 font-medium border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition flex-shrink-0">
                    Planifier
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Onglet campagnes */}
      {onglet === 'campagnes' && (
        <div className="text-center py-12 text-gray-400">
          <p className="text-sm">Fonctionnalité campagnes en cours de déploiement</p>
          <p className="text-xs mt-1">Planification en masse pour tous les salariés d'un service</p>
        </div>
      )}
    </div>
  )
}
