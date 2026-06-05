'use client'
import Link from 'next/link'
import type { UserProfile } from '@/lib/types'
import { formatDate } from '@/lib/utils'

const MOIS = ['Jan','Fév','Mar','Avr','Mai','Juin','Juil','Août','Sep','Oct','Nov','Déc']
const TYPE_LABELS: Record<string,string> = {
  CP:'Congés payés', RTT:'RTT', CSS:'Sans solde', REC:'Récupération',
  MAL:'Maladie', MAT:'Maternité', FOR:'Formation', DEP:'Déplacement', EV:'Évènement',
}

interface Props {
  profile: UserProfile
  stats: {
    totalSalaries: number
    demandesAttente: number
    alertesMedicales: number
    hSuperATransmettre: number
    congesATransmettre: number
  }
  demandesAttente: any[]
  alertesMedicales: any[]
  entretiensAVenir: any[]
}

export default function DashboardAdmin({ profile, stats, demandesAttente, alertesMedicales, entretiensAVenir }: Props) {
  const now = new Date()
  const mois = MOIS[now.getMonth()]
  const annee = now.getFullYear()

  const kpis = [
    {
      label: 'Collaborateurs',
      value: stats.totalSalaries,
      sub: 'actifs',
      href: '/admin/salaries',
      color: 'blue',
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      ),
    },
    {
      label: 'Demandes en attente',
      value: stats.demandesAttente,
      sub: 'à valider',
      href: '/admin/conges',
      color: stats.demandesAttente > 0 ? 'amber' : 'green',
      alert: stats.demandesAttente > 0,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
    },
    {
      label: 'Congés → SILAE',
      value: stats.congesATransmettre,
      sub: 'à transmettre',
      href: '/admin/silae',
      color: stats.congesATransmettre > 0 ? 'orange' : 'green',
      alert: stats.congesATransmettre > 0,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
    },
    {
      label: 'Alertes médicales',
      value: stats.alertesMedicales,
      sub: 'non traitées',
      href: '/admin/medical',
      color: stats.alertesMedicales > 0 ? 'red' : 'green',
      alert: stats.alertesMedicales > 0,
      icon: (
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M4.318 6.318a4.5 4.5 0 000 6.364L12 20.364l7.682-7.682a4.5 4.5 0 00-6.364-6.364L12 7.636l-1.318-1.318a4.5 4.5 0 00-6.364 0z" />
        </svg>
      ),
    },
  ]

  const colorMap: Record<string, { bg: string; text: string; ring: string; iconBg: string; iconText: string }> = {
    blue:   { bg: 'bg-blue-50',   text: 'text-blue-700',   ring: 'ring-blue-200',   iconBg: 'bg-blue-100',   iconText: 'text-blue-600' },
    green:  { bg: 'bg-green-50',  text: 'text-green-700',  ring: 'ring-green-200',  iconBg: 'bg-green-100',  iconText: 'text-green-600' },
    amber:  { bg: 'bg-amber-50',  text: 'text-amber-700',  ring: 'ring-amber-200',  iconBg: 'bg-amber-100',  iconText: 'text-amber-600' },
    orange: { bg: 'bg-orange-50', text: 'text-orange-700', ring: 'ring-orange-200', iconBg: 'bg-orange-100', iconText: 'text-orange-600' },
    red:    { bg: 'bg-red-50',    text: 'text-red-700',    ring: 'ring-red-200',    iconBg: 'bg-red-100',    iconText: 'text-red-600' },
  }

  return (
    <div className="p-6 max-w-6xl mx-auto space-y-6">
      {/* En-tête */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Bonjour, {profile.prenom} 👋</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Intl.DateTimeFormat('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' }).format(now)}
          </p>
        </div>
        {/* Bandeau SILAE compact */}
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-xl px-3 py-2">
          <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-xs font-medium text-green-800">SILAE connecté</span>
          <span className="text-xs text-green-600">· Cycle {mois} {annee}</span>
        </div>
      </div>

      {/* KPIs */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map(k => {
          const c = colorMap[k.color]
          return (
            <Link key={k.label} href={k.href}
              className={`relative bg-white border rounded-xl p-4 hover:shadow-md transition-shadow ring-1 ${c.ring} group`}>
              {k.alert && (
                <span className="absolute -top-1.5 -right-1.5 w-3.5 h-3.5 rounded-full bg-red-500 border-2 border-white" />
              )}
              <div className={`w-9 h-9 rounded-lg ${c.iconBg} ${c.iconText} flex items-center justify-center mb-3`}>
                {k.icon}
              </div>
              <p className={`text-2xl font-bold ${k.alert ? c.text : 'text-gray-900'}`}>{k.value}</p>
              <p className="text-xs text-gray-500 mt-0.5">{k.label}</p>
              <p className="text-[11px] text-gray-400">{k.sub}</p>
            </Link>
          )
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-5">
        {/* Demandes en attente */}
        <div className="md:col-span-2 bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-900">Demandes de congés à valider</h2>
            <Link href="/admin/conges" className="text-xs text-blue-600 hover:text-blue-700 font-medium">Tout voir →</Link>
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
                  <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 text-xs font-medium flex items-center justify-center flex-shrink-0">
                    {d.profile?.prenom?.[0]}{d.profile?.nom?.[0]}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-gray-900">{d.profile?.prenom} {d.profile?.nom}</p>
                    <p className="text-xs text-gray-500">
                      {TYPE_LABELS[d.type_code] ?? d.type_code} · {new Date(d.date_debut).toLocaleDateString('fr-FR')} → {new Date(d.date_fin).toLocaleDateString('fr-FR')} · <span className="font-medium">{d.nb_jours} j</span>
                    </p>
                  </div>
                  <Link href="/admin/conges"
                    className="flex-shrink-0 text-xs font-medium bg-blue-50 hover:bg-blue-100 text-blue-700 px-3 py-1.5 rounded-lg transition">
                    Valider
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Colonne droite */}
        <div className="space-y-4">
          {/* Alertes médicales */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-900">Alertes médicales</h2>
              <Link href="/admin/medical" className="text-xs text-blue-600 hover:text-blue-700 font-medium">Voir →</Link>
            </div>
            {alertesMedicales.length === 0 ? (
              <p className="px-4 py-6 text-xs text-center text-gray-400">Aucune alerte urgente</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {alertesMedicales.map((a: any) => (
                  <div key={a.id} className="px-4 py-2.5 flex items-start gap-2.5">
                    <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${a.urgence === 'critique' ? 'bg-red-500' : 'bg-amber-500'}`} />
                    <div className="min-w-0">
                      <p className="text-xs font-medium text-gray-800">{a.profile?.prenom} {a.profile?.nom}</p>
                      <p className="text-[11px] text-gray-500 leading-tight mt-0.5">{a.message}</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Entretiens à venir */}
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <div className="px-4 py-3 border-b border-gray-100 flex items-center justify-between">
              <h2 className="text-sm font-medium text-gray-900">Entretiens planifiés</h2>
              <Link href="/admin/entretiens" className="text-xs text-blue-600 hover:text-blue-700 font-medium">Voir →</Link>
            </div>
            {entretiensAVenir.length === 0 ? (
              <p className="px-4 py-6 text-xs text-center text-gray-400">Aucun entretien planifié</p>
            ) : (
              <div className="divide-y divide-gray-50">
                {entretiensAVenir.map((e: any) => (
                  <div key={e.id} className="px-4 py-2.5">
                    <p className="text-xs font-medium text-gray-800">{e.profile?.prenom} {e.profile?.nom}</p>
                    <p className="text-[11px] text-gray-500">{formatDate(e.date_prevue)} · {e.lieu || 'Lieu à définir'}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Accès rapides modules */}
      <div>
        <h2 className="text-sm font-medium text-gray-700 mb-3">Accès rapides</h2>
        <div className="grid grid-cols-3 md:grid-cols-6 gap-3">
          {[
            { href:'/admin/salaries', label:'Salariés', icon:'M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z', color:'bg-blue-100 text-blue-700' },
            { href:'/admin/conges', label:'Congés', icon:'M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z', color:'bg-green-100 text-green-700' },
            { href:'/admin/temps', label:'Temps', icon:'M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z', color:'bg-purple-100 text-purple-700' },
            { href:'/admin/documents', label:'Documents', icon:'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z', color:'bg-amber-100 text-amber-700' },
            { href:'/admin/silae', label:'SILAE', icon:'M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4', color:'bg-indigo-100 text-indigo-700' },
            { href:'/admin/reporting', label:'Reporting', icon:'M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z', color:'bg-rose-100 text-rose-700' },
          ].map(item => (
            <Link key={item.href} href={item.href}
              className="flex flex-col items-center gap-2 bg-white border border-gray-200 rounded-xl p-4 hover:shadow-sm hover:border-gray-300 transition text-center">
              <div className={`w-9 h-9 rounded-lg ${item.color} flex items-center justify-center`}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={item.icon} />
                </svg>
              </div>
              <span className="text-xs font-medium text-gray-700">{item.label}</span>
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
