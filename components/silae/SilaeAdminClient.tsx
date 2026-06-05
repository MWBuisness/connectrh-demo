'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import { silae } from '@/lib/silae'
import type { SilaeLogEntry } from '@/lib/silae'

interface Props {
  congesNonTransmis: any[]
  compteursNonTransmis: any[]
  stats: {
    congesTransmis: number
    congesEnAttente: number
    compteursTransmis: number
    compteursEnAttente: number
  }
  mois: number
  annee: number
}

const MOIS_FR = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre']
const CODE_LABELS: Record<string, string> = {
  CP: 'Congés payés', RTT: 'RTT', CSS: 'Sans solde', REC: 'Récupération',
  MAL: 'Arrêt maladie', MAT: 'Maternité/paternité', FOR: 'Formation', DEP: 'Déplacement', EV: 'Évènement familial',
}

export default function SilaeAdminClient({ congesNonTransmis, compteursNonTransmis, stats, mois, annee }: Props) {
  const [statut, setStatut] = useState<'inconnu' | 'connecte' | 'erreur'>('inconnu')
  const [statutMsg, setStatutMsg] = useState('')
  const [loading, setLoading] = useState<Record<string, boolean>>({})
  const [logs, setLogs] = useState<SilaeLogEntry[]>([])
  const [onglet, setOnglet] = useState<'conges' | 'heures' | 'logs'>('conges')
  const [congesLocaux, setCongesLocaux] = useState(congesNonTransmis)
  const [compteursLocaux, setCompteursLocaux] = useState(compteursNonTransmis)
  const supabase = createClient()
  const router = useRouter()

  // Health check au chargement
  useEffect(() => {
    async function check() {
      const res = await silae.ping()
      setStatut(res.ok ? 'connecte' : 'erreur')
      setStatutMsg(res.ok ? `Version ${res.data?.version} · Env: ${res.data?.env}` : (res.erreur ?? 'Indisponible'))
      setLogs(silae.getLogs())
    }
    check()
  }, [])

  function setChargement(key: string, val: boolean) {
    setLoading(prev => ({ ...prev, [key]: val }))
  }

  async function transmettreConge(conge: any) {
    const key = `conge-${conge.id}`
    setChargement(key, true)
    const matricule = `MAT-${conge.profile_id.slice(0, 6).toUpperCase()}`

    const res = await silae.transmettreConge({
      matricule,
      codeAbsence: conge.type_code,
      dateDebut: conge.date_debut,
      dateFin: conge.date_fin,
      nbJours: conge.nb_jours,
      demiJourneeDebut: conge.demi_journee_debut,
      demiJourneeFin: conge.demi_journee_fin,
      motif: conge.motif,
    })

    if (res.ok) {
      await supabase.from('demandes_conges').update({
        silae_transmis: true,
        silae_transmis_le: new Date().toISOString(),
        silae_reference: res.data?.referenceExterne,
      }).eq('id', conge.id)
      setCongesLocaux(prev => prev.filter(c => c.id !== conge.id))
    }

    setLogs(silae.getLogs())
    setChargement(key, false)
  }

  async function transmettreCongesAll() {
    setChargement('all-conges', true)
    for (const conge of congesLocaux) {
      await transmettreConge(conge)
    }
    setChargement('all-conges', false)
  }

  async function transmettreCompteur(compteur: any) {
    const key = `compteur-${compteur.id}`
    setChargement(key, true)
    const matricule = `MAT-${compteur.profile_id.slice(0, 6).toUpperCase()}`

    const res = await silae.transmettreHeures({
      matricule,
      mois: compteur.mois,
      annee: compteur.annee,
      heuresSup: compteur.heures_sup ?? 0,
      heuresRecup: compteur.heures_recup ?? 0,
    })

    if (res.ok) {
      await supabase.from('compteurs_temps').update({
        silae_transmis: true,
        silae_transmis_le: new Date().toISOString(),
      }).eq('id', compteur.id)
      setCompteursLocaux(prev => prev.filter(c => c.id !== compteur.id))
    }

    setLogs(silae.getLogs())
    setChargement(key, false)
  }

  async function transmettreCompteursAll() {
    setChargement('all-compteurs', true)
    for (const c of compteursLocaux) {
      await transmettreCompteur(c)
    }
    setChargement('all-compteurs', false)
  }

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Intégration SILAE</h1>
          <p className="text-sm text-gray-500 mt-0.5">Synchronisation des données RH vers le logiciel de paie</p>
        </div>
        {/* Badge mode prototype */}
        <span className="inline-flex items-center gap-1.5 text-xs font-medium bg-amber-100 text-amber-800 px-3 py-1.5 rounded-full">
          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19.428 15.428a2 2 0 00-1.022-.547l-2.387-.477a6 6 0 00-3.86.517l-.318.158a6 6 0 01-3.86.517L6.05 15.21a2 2 0 00-1.806.547M8 4h8l-1 1v5.172a2 2 0 00.586 1.414l5 5c1.26 1.26.367 3.414-1.415 3.414H4.828c-1.782 0-2.674-2.154-1.414-3.414l5-5A2 2 0 009 10.172V5L8 4z" />
          </svg>
          Mode prototype — données simulées
        </span>
      </div>

      {/* Statut connexion */}
      <div className={`rounded-xl border px-4 py-3 flex items-center gap-3 mb-6 ${
        statut === 'connecte' ? 'bg-green-50 border-green-200' :
        statut === 'erreur' ? 'bg-red-50 border-red-200' :
        'bg-gray-50 border-gray-200'
      }`}>
        <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${
          statut === 'connecte' ? 'bg-green-500' :
          statut === 'erreur' ? 'bg-red-500' : 'bg-gray-400'
        }`} />
        <div className="flex-1">
          <p className={`text-sm font-medium ${
            statut === 'connecte' ? 'text-green-800' :
            statut === 'erreur' ? 'text-red-800' : 'text-gray-700'
          }`}>
            SILAE — {statut === 'connecte' ? 'Connecté (simulation)' : statut === 'erreur' ? 'Erreur de connexion' : 'Vérification…'}
          </p>
          <p className="text-xs text-gray-500 mt-0.5">{statutMsg || 'Connexion en cours…'}</p>
        </div>
        <div className="text-xs text-gray-400 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5">
          {new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
        </div>
      </div>

      {/* Cartes stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
        {[
          { label: 'Congés transmis', val: stats.congesTransmis, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Congés en attente', val: congesLocaux.length, color: congesLocaux.length > 0 ? 'text-amber-600' : 'text-gray-500', bg: congesLocaux.length > 0 ? 'bg-amber-50' : 'bg-gray-50' },
          { label: 'Heures transmises', val: stats.compteursTransmis, color: 'text-green-600', bg: 'bg-green-50' },
          { label: 'Heures en attente', val: compteursLocaux.length, color: compteursLocaux.length > 0 ? 'text-amber-600' : 'text-gray-500', bg: compteursLocaux.length > 0 ? 'bg-amber-50' : 'bg-gray-50' },
        ].map(s => (
          <div key={s.label} className={`${s.bg} border border-gray-200 rounded-xl p-4`}>
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-semibold ${s.color}`}>{s.val}</p>
          </div>
        ))}
      </div>

      {/* Onglets */}
      <div className="flex gap-1 bg-gray-100 rounded-lg p-1 mb-5">
        {[
          { id: 'conges', label: `Congés${congesLocaux.length > 0 ? ` (${congesLocaux.length})` : ''}` },
          { id: 'heures', label: `Heures sup${compteursLocaux.length > 0 ? ` (${compteursLocaux.length})` : ''}` },
          { id: 'logs', label: `Journal ${logs.length > 0 ? `(${logs.length})` : ''}` },
        ].map(t => (
          <button key={t.id} onClick={() => setOnglet(t.id as any)}
            className={`flex-1 py-1.5 rounded-md text-sm font-medium transition ${
              onglet === t.id ? 'bg-white text-gray-900 shadow-sm' : 'text-gray-500 hover:text-gray-700'
            }`}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Onglet congés ── */}
      {onglet === 'conges' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-gray-900">Congés validés à transmettre</h2>
              <p className="text-xs text-gray-500 mt-0.5">Demandes validées par RH, non encore envoyées à SILAE</p>
            </div>
            {congesLocaux.length > 0 && (
              <button onClick={transmettreCongesAll} disabled={loading['all-conges']}
                className="flex items-center gap-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                {loading['all-conges'] ? 'Envoi…' : `Tout transmettre (${congesLocaux.length})`}
              </button>
            )}
          </div>

          {congesLocaux.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700">Tout est à jour</p>
              <p className="text-xs text-gray-400 mt-1">Aucun congé en attente de transmission</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {congesLocaux.map((c: any) => {
                const key = `conge-${c.id}`
                const isLoading = loading[key]
                return (
                  <div key={c.id} className="px-5 py-3.5 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-medium text-gray-900">
                          {c.profile?.prenom} {c.profile?.nom}
                        </span>
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full">
                          {CODE_LABELS[c.type_code] ?? c.type_code}
                        </span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {new Date(c.date_debut).toLocaleDateString('fr-FR')} → {new Date(c.date_fin).toLocaleDateString('fr-FR')} · {c.nb_jours} j
                        {c.profile?.poste && ` · ${c.profile.poste}`}
                      </p>
                    </div>
                    <button onClick={() => transmettreConge(c)} disabled={isLoading}
                      className="flex-shrink-0 flex items-center gap-1.5 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg transition disabled:opacity-50">
                      {isLoading ? (
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4" />
                        </svg>
                      )}
                      {isLoading ? 'Envoi…' : 'Transmettre'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Onglet heures sup ── */}
      {onglet === 'heures' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-gray-900">
                Variables de paie — {MOIS_FR[mois - 1]} {annee}
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">Heures supplémentaires et récupérations à transmettre</p>
            </div>
            {compteursLocaux.length > 0 && (
              <button onClick={transmettreCompteursAll} disabled={loading['all-compteurs']}
                className="flex items-center gap-2 text-sm font-medium bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-4 py-2 rounded-lg transition">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                </svg>
                {loading['all-compteurs'] ? 'Envoi…' : `Tout transmettre (${compteursLocaux.length})`}
              </button>
            )}
          </div>

          {compteursLocaux.length === 0 ? (
            <div className="py-12 text-center">
              <div className="w-10 h-10 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-3">
                <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-700">Tout est à jour</p>
              <p className="text-xs text-gray-400 mt-1">Aucune variable de paie en attente pour ce mois</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100">
              {compteursLocaux.map((c: any) => {
                const key = `compteur-${c.id}`
                const isLoading = loading[key]
                return (
                  <div key={c.id} className="px-5 py-3.5 flex items-center gap-4">
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-gray-900">
                        {c.profile?.prenom} {c.profile?.nom}
                      </p>
                      <div className="flex items-center gap-3 mt-0.5">
                        {c.heures_sup > 0 && (
                          <span className="text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded-full">
                            {c.heures_sup}h sup
                          </span>
                        )}
                        {c.heures_recup > 0 && (
                          <span className="text-xs text-purple-700 bg-purple-50 px-2 py-0.5 rounded-full">
                            {c.heures_recup}h récup
                          </span>
                        )}
                        {c.profile?.departement && (
                          <span className="text-xs text-gray-400">{c.profile.departement}</span>
                        )}
                      </div>
                    </div>
                    <button onClick={() => transmettreCompteur(c)} disabled={isLoading}
                      className="flex-shrink-0 flex items-center gap-1.5 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg transition disabled:opacity-50">
                      {isLoading ? (
                        <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"/>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"/>
                        </svg>
                      ) : (
                        <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4" />
                        </svg>
                      )}
                      {isLoading ? 'Envoi…' : 'Transmettre'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      )}

      {/* ── Onglet logs ── */}
      {onglet === 'logs' && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <div>
              <h2 className="text-sm font-medium text-gray-900">Journal de synchronisation</h2>
              <p className="text-xs text-gray-500 mt-0.5">Toutes les communications avec SILAE (session en cours)</p>
            </div>
            {logs.length > 0 && (
              <button onClick={() => { silae.clearLogs(); setLogs([]) }}
                className="text-xs text-gray-500 hover:text-gray-700 border border-gray-200 rounded-lg px-3 py-1.5 transition">
                Effacer
              </button>
            )}
          </div>

          {logs.length === 0 ? (
            <div className="py-10 text-center">
              <p className="text-sm text-gray-400">Aucune action enregistrée dans cette session</p>
              <p className="text-xs text-gray-300 mt-1">Les transmissions apparaîtront ici</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50 font-mono text-xs">
              {logs.map((log) => (
                <div key={log.id} className="px-5 py-2.5 flex items-start gap-3">
                  <span className={`mt-0.5 flex-shrink-0 w-2 h-2 rounded-full ${
                    log.statut === 'succes' ? 'bg-green-400' :
                    log.statut === 'erreur' ? 'bg-red-400' : 'bg-amber-400'
                  }`} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-3">
                      <span className="font-medium text-gray-800">{log.action}</span>
                      {log.matricule && <span className="text-gray-400">{log.matricule}</span>}
                      <span className={`px-1.5 py-0.5 rounded text-[10px] ${
                        log.statut === 'succes' ? 'bg-green-100 text-green-700' :
                        log.statut === 'erreur' ? 'bg-red-100 text-red-700' : 'bg-amber-100 text-amber-700'
                      }`}>{log.statut}</span>
                    </div>
                    {log.message && <p className="text-gray-500 mt-0.5 truncate">{log.message}</p>}
                    <p className="text-gray-300 mt-0.5">{new Date(log.createdAt).toLocaleTimeString('fr-FR')}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Info prototype */}
      <div className="mt-6 bg-amber-50 border border-amber-200 rounded-xl p-4">
        <div className="flex gap-3">
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <div>
            <p className="text-sm font-medium text-amber-800">Mode prototype actif</p>
            <p className="text-xs text-amber-700 mt-1 leading-relaxed">
              L'intégration SILAE est simulée — toutes les transmissions sont fictives mais reproduisent exactement
              le comportement réel (délais, erreurs, logs). Quand vous disposerez de vos clés API SILAE,
              un seul fichier (<code className="bg-amber-100 px-1 rounded">silae-adapter.production.ts</code>) sera à créer
              pour basculer en production.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
