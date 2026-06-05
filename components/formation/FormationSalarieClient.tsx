'use client'
import { useState } from 'react'
import DemandeFormationForm from './DemandeFormationForm'
import { STATUT_LABELS, STATUT_COLORS, FINANCEMENT_LABELS, CATEGORIE_COLORS } from '@/lib/types-formation'
import type { DemandeFormation, FormationCatalogue, CpfCompteur, AlerteFormation } from '@/lib/types-formation'

interface Props {
  demandes: DemandeFormation[]
  catalogue: FormationCatalogue[]
  cpf: CpfCompteur | null
  alertes: AlerteFormation[]
  profileId: string
  planId?: string
}

export default function FormationSalarieClient({ demandes, catalogue, cpf, alertes, profileId, planId }: Props) {
  const [showForm, setShowForm] = useState(false)

  const cpfDroit = cpf?.heures_droit ?? 500
  const cpfUtilise = cpf?.heures_utilise ?? 0
  const cpfDispo = cpfDroit - cpfUtilise
  const cpfPct = Math.round((cpfUtilise / cpfDroit) * 100)

  const aVenir = demandes.filter(d => !['terminee','annulee','refusee'].includes(d.statut))
  const passees = demandes.filter(d => ['terminee','annulee','refusee'].includes(d.statut))
  const heuresFormees = passees.filter(d => d.statut === 'terminee').reduce((s, d) => s + (d.duree_heures ?? 0), 0)

  return (
    <div>
      {showForm && (
        <DemandeFormationForm
          profileId={profileId}
          catalogue={catalogue}
          cpf={cpf}
          planId={planId}
          onClose={() => setShowForm(false)}
        />
      )}

      {/* Alertes */}
      {alertes.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-5">
          <p className="text-sm font-medium text-red-800 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {alertes.length} formation{alertes.length > 1 ? 's' : ''} réglementaire{alertes.length > 1 ? 's' : ''} à renouveler
          </p>
          {alertes.map(a => (
            <div key={a.id} className="flex justify-between items-center text-xs text-red-700 py-1">
              <span>· {a.titre}</span>
              <span className="font-medium">Avant le {new Intl.DateTimeFormat('fr-FR').format(new Date(a.echeance))}</span>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">Formations suivies</p>
          <p className="text-2xl font-semibold text-gray-900">{passees.filter(d => d.statut === 'terminee').length}</p>
          <p className="text-xs text-gray-400 mt-0.5">{heuresFormees}h au total</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <p className="text-xs text-gray-500 mb-1">En cours / planifiées</p>
          <p className="text-2xl font-semibold text-blue-600">{aVenir.length}</p>
        </div>
        <div className="bg-white border border-gray-200 rounded-xl p-4 md:col-span-2">
          <p className="text-xs text-gray-500 mb-2">Solde CPF</p>
          <div className="flex items-baseline gap-1 mb-1.5">
            <span className="text-2xl font-semibold text-gray-900">{cpfDispo}h</span>
            <span className="text-sm text-gray-400">/ {cpfDroit}h</span>
          </div>
          <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
            <div className="h-full bg-blue-500 rounded-full" style={{ width: `${cpfPct}%` }} />
          </div>
          <p className="text-xs text-gray-400 mt-1">{cpfUtilise}h utilisées</p>
        </div>
      </div>

      {/* Bouton + demandes en cours */}
      <div className="flex justify-between items-center mb-4">
        <h2 className="text-sm font-medium text-gray-700">Mes demandes ({demandes.length})</h2>
        <button onClick={() => setShowForm(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle demande
        </button>
      </div>

      {/* En cours */}
      {aVenir.length > 0 && (
        <div className="space-y-3 mb-6">
          {aVenir.map(d => (
            <DemandeCard key={d.id} demande={d} />
          ))}
        </div>
      )}

      {/* Historique */}
      {passees.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-600 mb-3">Historique</h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Formation</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Période</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Durée</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Financement</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Statut</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Note</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {passees.map(d => (
                  <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <p className="font-medium text-gray-900">{d.formation?.titre ?? d.titre_libre}</p>
                      {(d.formation?.organisme ?? d.organisme_libre) && (
                        <p className="text-xs text-gray-400">{d.formation?.organisme ?? d.organisme_libre}</p>
                      )}
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {d.date_debut ? new Intl.DateTimeFormat('fr-FR').format(new Date(d.date_debut)) : '—'}
                    </td>
                    <td className="px-5 py-3 text-gray-600">{d.duree_heures ? `${d.duree_heures}h` : '—'}</td>
                    <td className="px-5 py-3 text-xs text-gray-500">{FINANCEMENT_LABELS[d.financement]}</td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUT_COLORS[d.statut]}`}>
                        {STATUT_LABELS[d.statut]}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      {d.note_satisfaction ? (
                        <span className="text-amber-500">{'★'.repeat(d.note_satisfaction)}</span>
                      ) : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {demandes.length === 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
          </svg>
          <p className="text-sm font-medium text-gray-500">Aucune formation pour l'instant</p>
          <p className="text-xs mt-1">Cliquez sur "Nouvelle demande" pour commencer</p>
        </div>
      )}
    </div>
  )
}

function DemandeCard({ demande }: { demande: DemandeFormation }) {
  const titre = demande.formation?.titre ?? demande.titre_libre ?? '—'
  const organisme = demande.formation?.organisme ?? demande.organisme_libre
  const couleur = CATEGORIE_COLORS[demande.formation?.categorie ?? 'autre']

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 min-w-0">
          <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
            style={{ backgroundColor: couleur }}>
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{titre}</p>
            <div className="flex items-center gap-2 mt-0.5 flex-wrap">
              {organisme && <span className="text-xs text-gray-400">{organisme}</span>}
              {demande.duree_heures && <span className="text-xs text-gray-400">·  {demande.duree_heures}h</span>}
              {demande.cout_estime && <span className="text-xs text-gray-400">· {demande.cout_estime.toLocaleString('fr-FR')} €</span>}
              <span className="text-xs text-gray-400">· {FINANCEMENT_LABELS[demande.financement]}</span>
            </div>
            {demande.date_souhaitee && (
              <p className="text-xs text-gray-400 mt-0.5">
                Souhaitée : {new Intl.DateTimeFormat('fr-FR').format(new Date(demande.date_souhaitee))}
              </p>
            )}
          </div>
        </div>
        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${STATUT_COLORS[demande.statut]}`}>
          {STATUT_LABELS[demande.statut]}
        </span>
      </div>
      {demande.motif_refus && (
        <div className="mt-3 bg-red-50 rounded-lg px-3 py-2 text-xs text-red-700">
          Motif du refus : {demande.motif_refus}
        </div>
      )}
    </div>
  )
}
