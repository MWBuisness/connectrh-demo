'use client'
import Link from 'next/link'
import type { UserProfile } from '@/lib/types'
import { getInitials } from '@/lib/utils'

const TYPE_LABELS: Record<string,string> = {
  CP:'Congés payés', RTT:'RTT', REC:'Récupération', CSS:'Sans solde',
  MAL:'Maladie', MAT:'Maternité', FOR:'Formation', DEP:'Déplacement',
}
const TJ_COLORS: Record<string,string> = {
  bureau:'bg-green-100 text-green-700',
  teletravail:'bg-blue-100 text-blue-700',
  deplacement:'bg-amber-100 text-amber-700',
  absent:'bg-red-100 text-red-700',
}
const TJ_LABELS: Record<string,string> = {
  bureau:'Bureau', teletravail:'Télétravail', deplacement:'Déplacement', absent:'Absent',
}

interface Props {
  profile: UserProfile
  equipe: UserProfile[]
  demandesAttente: any[]
  pointagesAujourdhui: any[]
  soldes: any[]
}

export default function DashboardResponsable({ profile, equipe, demandesAttente, pointagesAujourdhui, soldes }: Props) {
  const now = new Date()

  const presentsIds = new Set(pointagesAujourdhui.map(p => p.profile_id))
  const presents = pointagesAujourdhui.filter(p => p.heure_entree && !p.heure_sortie)
  const teletravail = pointagesAujourdhui.filter(p => p.type_journee === 'teletravail')

  const cp = soldes.find(s => s.type_code === 'CP')
  const rtt = soldes.find(s => s.type_code === 'RTT')

  return (
    <div className="p-6 max-w-5xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Bonjour, {profile.prenom} 👋</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Intl.DateTimeFormat('fr-FR', { weekday:'long', day:'numeric', month:'long' }).format(now)}
          </p>
        </div>
        <Link href="/validations"
          className={`flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium transition ${
            demandesAttente.length > 0 ? 'bg-amber-50 text-amber-700 border border-amber-200' : 'bg-gray-100 text-gray-600'
          }`}>
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {demandesAttente.length > 0 ? `${demandesAttente.length} demande${demandesAttente.length > 1 ? 's' : ''} à valider` : 'Aucune demande'}
        </Link>
      </div>

      {/* Mes soldes personnels */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {[
          { label: 'CP disponibles', value: cp ? cp.solde_acquis - cp.solde_pris : '—', unit: 'jours', color: 'blue' },
          { label: 'RTT disponibles', value: rtt ? rtt.solde_acquis - rtt.solde_pris : '—', unit: 'jours', color: 'purple' },
          { label: 'Mon équipe', value: equipe.length, unit: 'personnes', color: 'green' },
          { label: 'Présents aujourd\'hui', value: presents.length, unit: `sur ${equipe.length}`, color: presents.length === equipe.length ? 'green' : 'amber' },
        ].map(k => (
          <div key={k.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{k.label}</p>
            <p className="text-2xl font-bold text-gray-900">{k.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">{k.unit}</p>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Présence équipe aujourd'hui */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-900">Équipe — aujourd'hui</h2>
            <Link href="/planning" className="text-xs text-blue-600 hover:text-blue-700 font-medium">Planning →</Link>
          </div>
          <div className="divide-y divide-gray-50">
            {equipe.map(m => {
              const pt = pointagesAujourdhui.find(p => p.profile_id === m.id)
              return (
                <div key={m.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-medium flex items-center justify-center flex-shrink-0">
                    {getInitials(m.prenom, m.nom)}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{m.prenom} {m.nom}</p>
                    <p className="text-xs text-gray-500">{m.poste}</p>
                  </div>
                  {pt ? (
                    <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${TJ_COLORS[pt.type_journee] ?? 'bg-gray-100 text-gray-600'}`}>
                      {TJ_LABELS[pt.type_journee] ?? pt.type_journee}
                      {pt.heure_entree && <span className="ml-1 opacity-70">{pt.heure_entree.slice(0,5)}</span>}
                    </span>
                  ) : (
                    <span className="text-[11px] font-medium px-2 py-0.5 rounded-full bg-gray-100 text-gray-500">Non badgé</span>
                  )}
                </div>
              )
            })}
          </div>
        </div>

        {/* Demandes à valider */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-900">Demandes à valider</h2>
            <Link href="/validations" className="text-xs text-blue-600 hover:text-blue-700 font-medium">Tout voir →</Link>
          </div>
          {demandesAttente.length === 0 ? (
            <div className="py-10 text-center">
              <div className="w-8 h-8 rounded-full bg-green-100 flex items-center justify-center mx-auto mb-2">
                <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <p className="text-sm text-gray-500">Aucune demande en attente</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {demandesAttente.map((d: any) => (
                <div key={d.id} className="px-5 py-3 flex items-center gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{d.profile?.prenom} {d.profile?.nom}</p>
                    <p className="text-xs text-gray-500">
                      {TYPE_LABELS[d.type_code] ?? d.type_code} · {new Date(d.date_debut).toLocaleDateString('fr-FR')} → {new Date(d.date_fin).toLocaleDateString('fr-FR')}
                    </p>
                  </div>
                  <span className="text-xs font-semibold text-gray-900">{d.nb_jours} j</span>
                  <Link href="/validations"
                    className="text-xs font-medium bg-amber-50 hover:bg-amber-100 text-amber-700 px-2.5 py-1.5 rounded-lg transition">
                    Valider
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
