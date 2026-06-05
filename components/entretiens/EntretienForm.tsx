'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import NoteEtoiles from './NoteEtoiles'
import type { Entretien, Objectif, CompetenceNote, CompetenceReferentiel } from '@/lib/types-entretiens'
import { STATUT_ENTRETIEN_LABELS, STATUT_ENTRETIEN_COLORS } from '@/lib/types-entretiens'

interface Props {
  entretien: Entretien
  currentProfileId: string
  currentRole: string
  competencesRef: CompetenceReferentiel[]
  isManager: boolean
}

export default function EntretienForm({ entretien, currentProfileId, currentRole, competencesRef, isManager }: Props) {
  const [onglet, setOnglet] = useState<'preparation'|'objectifs'|'competences'|'cr'|'signature'>('preparation')
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  // Préparation
  const champPrep = isManager ? 'prep_manager' : 'prep_salarie'
  const [prep, setPrep] = useState<Record<string,string>>(
    isManager ? entretien.prep_manager : entretien.prep_salarie
  )

  // Objectifs actuels
  const [objActuels, setObjActuels] = useState<Objectif[]>(entretien.objectifs_actuels ?? [])

  // Objectifs nouveaux
  const [objNouveaux, setObjNouveaux] = useState<Objectif[]>(entretien.objectifs_nouveaux ?? [])

  // Compétences
  const [competences, setCompetences] = useState<CompetenceNote[]>(
    entretien.competences.length > 0
      ? entretien.competences
      : competencesRef.slice(0, 8).map(c => ({ id: c.id, label: c.label, categorie: c.categorie, note_1_5: 0 }))
  )

  // Compte-rendu
  const [cr, setCr] = useState<Record<string,string>>(entretien.compte_rendu ?? {})

  // Note globale
  const [noteGlobale, setNoteGlobale] = useState(entretien.note_globale ?? 0)

  const isSalarie = currentProfileId === entretien.profile_id
  const readonly = entretien.statut === 'signe'

  function setComp(id: string, field: 'note_1_5'|'commentaire', val: string|number) {
    setCompetences(cs => cs.map(c => c.id === id ? { ...c, [field]: val } : c))
  }

  function addObj(type: 'actuels'|'nouveaux') {
    const newObj: Objectif = { id: Date.now().toString(), titre: '', description: '', priorite: 'moyenne' }
    if (type === 'actuels') setObjActuels(o => [...o, newObj])
    else setObjNouveaux(o => [...o, newObj])
  }

  function setObj(type: 'actuels'|'nouveaux', id: string, field: keyof Objectif, val: string|number|boolean) {
    const setter = type === 'actuels' ? setObjActuels : setObjNouveaux
    setter(os => os.map(o => o.id === id ? { ...o, [field]: val } : o))
  }

  function removeObj(type: 'actuels'|'nouveaux', id: string) {
    if (type === 'actuels') setObjActuels(o => o.filter(x => x.id !== id))
    else setObjNouveaux(o => o.filter(x => x.id !== id))
  }

  async function sauvegarder() {
    setSaving(true)
    const now = new Date().toISOString()
    const update: Record<string,unknown> = {
      [champPrep]: prep,
      objectifs_actuels: objActuels,
      objectifs_nouveaux: objNouveaux,
      competences,
      compte_rendu: cr,
      note_globale: noteGlobale || null,
    }
    if (isManager && !entretien.prep_manager_le) update.prep_manager_le = now
    if (!isManager && !entretien.prep_salarie_le) update.prep_salarie_le = now

    // Avancer le statut
    if (entretien.statut === 'planifie' && isManager) update.statut = 'prep_manager'
    if (entretien.statut === 'prep_manager' && !isManager) update.statut = 'prep_salarie'

    await supabase.from('entretiens').update(update).eq('id', entretien.id)
    setSaving(false)
    setSaved(true)
    setTimeout(() => { setSaved(false); router.refresh() }, 2000)
  }

  async function signerEntretien() {
    setSaving(true)
    const now = new Date().toISOString()
    const update: Record<string,unknown> = {}
    if (isManager) { update.signe_manager = true; update.signe_manager_le = now }
    else { update.signe_salarie = true; update.signe_salarie_le = now }
    if ((isManager ? entretien.signe_salarie : entretien.signe_manager) || true) {
      if (entretien.signe_manager || isManager) {
        if (entretien.signe_salarie || !isManager) {
          update.statut = 'signe'
          update.realise_le = now
        } else { update.statut = 'realise' }
      }
    }
    await supabase.from('entretiens').update(update).eq('id', entretien.id)
    setSaving(false)
    router.refresh()
  }

  const onglets = [
    { id: 'preparation', label: 'Préparation' },
    { id: 'objectifs', label: `Objectifs (${objActuels.length + objNouveaux.length})` },
    { id: 'competences', label: 'Compétences' },
    { id: 'cr', label: 'Compte-rendu' },
    { id: 'signature', label: 'Signature' },
  ]

  return (
    <div>
      {/* Header entretien */}
      <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <div className="flex items-start justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="text-xs font-medium px-2 py-0.5 rounded-full text-white"
                style={{ backgroundColor: entretien.type?.couleur ?? '#378ADD' }}>
                {entretien.type?.label ?? entretien.type_code}
              </span>
              <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUT_ENTRETIEN_COLORS[entretien.statut]}`}>
                {STATUT_ENTRETIEN_LABELS[entretien.statut]}
              </span>
            </div>
            <h2 className="text-base font-semibold text-gray-900">
              {entretien.profile?.prenom} {entretien.profile?.nom}
            </h2>
            <p className="text-xs text-gray-400 mt-0.5">
              {entretien.profile?.poste} · {entretien.profile?.departement}
              {entretien.manager && ` · Manager : ${entretien.manager.prenom} ${entretien.manager.nom}`}
            </p>
          </div>
          <div className="text-right flex-shrink-0">
            {entretien.date_prevue && (
              <p className="text-sm font-medium text-gray-900">
                {new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(entretien.date_prevue))}
              </p>
            )}
            {entretien.heure_prevue && <p className="text-xs text-gray-400">{entretien.heure_prevue.slice(0,5)}</p>}
            {entretien.lieu && <p className="text-xs text-gray-400">{entretien.lieu}</p>}
          </div>
        </div>
      </div>

      {/* Onglets */}
      <div className="flex border-b border-gray-200 mb-5 overflow-x-auto">
        {onglets.map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id as any)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 -mb-px whitespace-nowrap transition-colors ${onglet === o.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
            {o.label}
          </button>
        ))}
      </div>

      {/* === PRÉPARATION === */}
      {onglet === 'preparation' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Préparation manager */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-900 mb-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-amber-400"></span>
              Préparation du manager
              {entretien.prep_manager_le && <span className="text-[10px] text-gray-400 font-normal ml-auto">Complété</span>}
            </h3>
            <div className="space-y-3 mt-3">
              {[
                { id: 'bilan_periode', label: 'Bilan de la période', rows: 3 },
                { id: 'points_forts', label: 'Points forts', rows: 2 },
                { id: 'axes_amelioration', label: 'Axes d\'amélioration', rows: 2 },
                { id: 'evolution_souhaitee', label: 'Évolution envisagée', rows: 2 },
              ].map(f => (
                <div key={f.id}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <textarea
                    value={isManager ? (prep[f.id] ?? '') : (entretien.prep_manager[f.id] ?? '')}
                    onChange={e => isManager && setPrep(p => ({ ...p, [f.id]: e.target.value }))}
                    readOnly={!isManager || readonly}
                    rows={f.rows}
                    className={`w-full px-3 py-2 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isManager || readonly ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`}
                  />
                </div>
              ))}
            </div>
          </div>

          {/* Préparation salarié */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-900 mb-1 flex items-center gap-2">
              <span className="w-2 h-2 rounded-full bg-blue-500"></span>
              Préparation du salarié
              {entretien.prep_salarie_le && <span className="text-[10px] text-gray-400 font-normal ml-auto">Complété</span>}
            </h3>
            <div className="space-y-3 mt-3">
              {[
                { id: 'bilan_salarie', label: 'Mon bilan de la période', rows: 3 },
                { id: 'satisfaction', label: 'Satisfaction au travail', rows: 2 },
                { id: 'besoins_formation', label: 'Besoins en formation', rows: 2 },
                { id: 'souhaits_evolution', label: 'Souhaits d\'évolution', rows: 2 },
              ].map(f => (
                <div key={f.id}>
                  <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                  <textarea
                    value={isSalarie ? (prep[f.id] ?? '') : (entretien.prep_salarie[f.id] ?? '')}
                    onChange={e => isSalarie && setPrep(p => ({ ...p, [f.id]: e.target.value }))}
                    readOnly={!isSalarie || readonly}
                    rows={f.rows}
                    className={`w-full px-3 py-2 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isSalarie || readonly ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* === OBJECTIFS === */}
      {onglet === 'objectifs' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Objectifs période précédente */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900">Bilan des objectifs</h3>
              {!readonly && <button onClick={() => addObj('actuels')} className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Ajouter</button>}
            </div>
            {objActuels.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Aucun objectif de la période précédente</p>
            ) : (
              <div className="space-y-4">
                {objActuels.map(obj => (
                  <div key={obj.id} className="border border-gray-200 rounded-lg p-3">
                    <input value={obj.titre} onChange={e => setObj('actuels', obj.id, 'titre', e.target.value)}
                      placeholder="Titre de l'objectif" readOnly={readonly}
                      className="w-full text-sm font-medium text-gray-900 border-none outline-none bg-transparent mb-2" />
                    <textarea value={obj.description ?? ''} onChange={e => setObj('actuels', obj.id, 'description', e.target.value)}
                      placeholder="Description…" rows={2} readOnly={readonly}
                      className="w-full text-xs text-gray-500 border-none outline-none bg-transparent resize-none mb-2" />
                    <div className="flex items-center gap-3">
                      <NoteEtoiles value={obj.note ?? 0} onChange={v => setObj('actuels', obj.id, 'note', v)} readonly={readonly} size="sm" />
                      <label className="flex items-center gap-1.5 text-xs text-gray-500 cursor-pointer">
                        <input type="checkbox" checked={obj.atteint ?? false}
                          onChange={e => setObj('actuels', obj.id, 'atteint', e.target.checked)}
                          disabled={readonly} className="rounded" />
                        Atteint
                      </label>
                      {!readonly && (
                        <button onClick={() => removeObj('actuels', obj.id)} className="ml-auto text-gray-300 hover:text-red-500 transition">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Nouveaux objectifs */}
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-medium text-gray-900">Nouveaux objectifs SMART</h3>
              {!readonly && <button onClick={() => addObj('nouveaux')} className="text-xs text-blue-600 hover:text-blue-800 font-medium">+ Ajouter</button>}
            </div>
            {objNouveaux.length === 0 ? (
              <p className="text-sm text-gray-400 text-center py-6">Aucun objectif défini pour la prochaine période</p>
            ) : (
              <div className="space-y-4">
                {objNouveaux.map(obj => (
                  <div key={obj.id} className="border border-gray-200 rounded-lg p-3">
                    <input value={obj.titre} onChange={e => setObj('nouveaux', obj.id, 'titre', e.target.value)}
                      placeholder="Titre de l'objectif (SMART)" readOnly={readonly}
                      className="w-full text-sm font-medium text-gray-900 border-none outline-none bg-transparent mb-1" />
                    <textarea value={obj.description ?? ''} onChange={e => setObj('nouveaux', obj.id, 'description', e.target.value)}
                      placeholder="Description, critères de succès, mesure…" rows={2} readOnly={readonly}
                      className="w-full text-xs text-gray-500 border-none outline-none bg-transparent resize-none mb-2" />
                    <div className="flex items-center gap-3 flex-wrap">
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-0.5">Échéance</label>
                        <input type="date" value={obj.echeance ?? ''} onChange={e => setObj('nouveaux', obj.id, 'echeance', e.target.value)}
                          readOnly={readonly} className="text-xs border border-gray-200 rounded px-2 py-0.5 focus:outline-none" />
                      </div>
                      <div>
                        <label className="block text-[10px] text-gray-400 mb-0.5">Priorité</label>
                        <select value={obj.priorite ?? 'moyenne'} onChange={e => setObj('nouveaux', obj.id, 'priorite', e.target.value)}
                          disabled={readonly} className="text-xs border border-gray-200 rounded px-2 py-0.5 focus:outline-none">
                          <option value="haute">Haute</option>
                          <option value="moyenne">Moyenne</option>
                          <option value="faible">Faible</option>
                        </select>
                      </div>
                      {!readonly && (
                        <button onClick={() => removeObj('nouveaux', obj.id)} className="ml-auto text-gray-300 hover:text-red-500 transition">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
                        </button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* === COMPÉTENCES === */}
      {onglet === 'competences' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <div className="flex items-center justify-between mb-5">
            <h3 className="text-sm font-medium text-gray-900">Évaluation des compétences</h3>
            <div className="flex items-center gap-2">
              <span className="text-xs text-gray-500">Note globale :</span>
              <NoteEtoiles value={noteGlobale} onChange={!readonly ? setNoteGlobale : undefined} readonly={readonly} />
            </div>
          </div>

          {Object.entries(
            competences.reduce((acc, c) => {
              if (!acc[c.categorie]) acc[c.categorie] = []
              acc[c.categorie].push(c)
              return acc
            }, {} as Record<string, CompetenceNote[]>)
          ).map(([cat, comps]) => (
            <div key={cat} className="mb-5">
              <h4 className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">{cat}</h4>
              <div className="space-y-3">
                {comps.map(comp => (
                  <div key={comp.id} className="flex items-start gap-4">
                    <div className="flex-1">
                      <p className="text-sm text-gray-800 mb-1">{comp.label}</p>
                      <NoteEtoiles value={comp.note_1_5} onChange={!readonly ? v => setComp(comp.id, 'note_1_5', v) : undefined} readonly={readonly} size="sm" />
                    </div>
                    <div className="flex-1">
                      <textarea
                        value={comp.commentaire ?? ''}
                        onChange={e => !readonly && setComp(comp.id, 'commentaire', e.target.value)}
                        readOnly={readonly}
                        rows={1}
                        placeholder="Commentaire…"
                        className={`w-full px-2.5 py-1.5 text-xs border rounded-lg resize-none focus:outline-none focus:ring-1 focus:ring-blue-500 ${readonly ? 'bg-gray-50 text-gray-400' : 'border-gray-300'}`}
                      />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* === COMPTE-RENDU === */}
      {onglet === 'cr' && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h3 className="text-sm font-medium text-gray-900 mb-4">Compte-rendu d'entretien</h3>
          <div className="space-y-4">
            {[
              { id: 'synthese', label: 'Synthèse générale', rows: 4, placeholder: 'Résumé des échanges, points clés abordés…' },
              { id: 'formation_identifiee', label: 'Besoins en formation identifiés', rows: 3, placeholder: 'Formations souhaitées, certifications, compétences à développer…' },
              { id: 'evolution_poste', label: 'Évolution de poste / mobilité', rows: 3, placeholder: 'Souhaits d\'évolution, mobilité envisagée, promotion…' },
              { id: 'mesures_accompagnement', label: 'Mesures d\'accompagnement', rows: 3, placeholder: 'Mentorat, coaching, aménagement de poste…' },
              { id: 'prochaine_etape', label: 'Prochaines étapes', rows: 2, placeholder: 'Actions à suivre, prochain point…' },
            ].map(f => (
              <div key={f.id}>
                <label className="block text-xs font-medium text-gray-600 mb-1">{f.label}</label>
                <textarea
                  value={cr[f.id] ?? ''}
                  onChange={e => !readonly && setCr(c => ({ ...c, [f.id]: e.target.value }))}
                  readOnly={readonly}
                  rows={f.rows}
                  placeholder={f.placeholder}
                  className={`w-full px-3 py-2 text-sm border rounded-lg resize-none focus:outline-none focus:ring-2 focus:ring-blue-500 ${readonly ? 'bg-gray-50 text-gray-400 cursor-not-allowed' : 'border-gray-300'}`}
                />
              </div>
            ))}
          </div>
        </div>
      )}

      {/* === SIGNATURE === */}
      {onglet === 'signature' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
          {/* Signature manager */}
          <div className={`border rounded-xl p-5 ${entretien.signe_manager ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Signature du manager
            </h3>
            {entretien.signe_manager ? (
              <div className="flex items-center gap-2 text-green-700">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium">Signé</p>
                  <p className="text-xs">{entretien.manager?.prenom} {entretien.manager?.nom}</p>
                  {entretien.signe_manager_le && (
                    <p className="text-xs opacity-70">
                      {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(entretien.signe_manager_le))}
                    </p>
                  )}
                </div>
              </div>
            ) : isManager ? (
              <button onClick={signerEntretien} disabled={saving}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Signer en tant que manager
              </button>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">En attente de la signature du manager</p>
            )}
          </div>

          {/* Signature salarié */}
          <div className={`border rounded-xl p-5 ${entretien.signe_salarie ? 'border-green-200 bg-green-50' : 'border-gray-200 bg-white'}`}>
            <h3 className="text-sm font-medium text-gray-900 mb-3 flex items-center gap-2">
              <svg className="w-4 h-4 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
              </svg>
              Signature du salarié
            </h3>
            {entretien.signe_salarie ? (
              <div className="flex items-center gap-2 text-green-700">
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <div>
                  <p className="text-sm font-medium">Signé</p>
                  <p className="text-xs">{entretien.profile?.prenom} {entretien.profile?.nom}</p>
                  {entretien.signe_salarie_le && (
                    <p className="text-xs opacity-70">
                      {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'short' }).format(new Date(entretien.signe_salarie_le))}
                    </p>
                  )}
                </div>
              </div>
            ) : isSalarie ? (
              <button onClick={signerEntretien} disabled={saving}
                className="w-full bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Signer en tant que salarié
              </button>
            ) : (
              <p className="text-sm text-gray-400 text-center py-4">En attente de la signature du salarié</p>
            )}
          </div>

          {entretien.statut === 'signe' && (
            <div className="md:col-span-2 bg-green-50 border border-green-200 rounded-xl p-4 flex items-center gap-3">
              <svg className="w-6 h-6 text-green-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <div>
                <p className="text-sm font-medium text-green-800">Entretien signé par les deux parties</p>
                <p className="text-xs text-green-600">Le compte-rendu est archivé dans les dossiers RH et transmis à SILAE</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Bouton sauvegarde */}
      {!readonly && onglet !== 'signature' && (
        <div className="mt-5 flex justify-end">
          <button onClick={sauvegarder} disabled={saving}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium px-5 py-2.5 rounded-lg text-sm transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
            </svg>
            {saving ? 'Enregistrement…' : saved ? '✓ Enregistré' : 'Enregistrer'}
          </button>
        </div>
      )}
    </div>
  )
}
