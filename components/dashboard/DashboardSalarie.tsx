'use client'
import Link from 'next/link'
import type { UserProfile } from '@/lib/types'
import { getAnciennete, formatDate } from '@/lib/utils'

const STATUT_COLORS: Record<string,string> = {
  en_attente: 'bg-amber-100 text-amber-700',
  validee: 'bg-green-100 text-green-700',
  refusee: 'bg-red-100 text-red-700',
}
const STATUT_LABELS: Record<string,string> = {
  en_attente: 'En attente', validee: 'Validée', refusee: 'Refusée',
}
const TYPE_LABELS: Record<string,string> = {
  CP:'CP', RTT:'RTT', CSS:'Sans solde', REC:'Récupération',
}
const ENT_TYPE_LABELS: Record<string,string> = {
  AEA:'Entretien annuel', AEP:'Entretien professionnel',
  AMI:'Mi-année', APE:"Période d'essai", ARE:'Retour absence',
}

interface Props {
  profile: UserProfile
  soldes: any[]
  pointageAujourdhui: any
  demandesEnCours: any[]
  entretiens: any[]
  compteurMois: any
}

export default function DashboardSalarie({ profile, soldes, pointageAujourdhui, demandesEnCours, entretiens, compteurMois }: Props) {
  const now = new Date()
  const cp  = soldes.find(s => s.type_code === 'CP')
  const rtt = soldes.find(s => s.type_code === 'RTT')
  const rec = soldes.find(s => s.type_code === 'REC')

  const cpRestant  = cp  ? cp.solde_acquis  - cp.solde_pris  : 0
  const rttRestant = rtt ? rtt.solde_acquis - rtt.solde_pris : 0

  const prochainePaie = (() => {
    const d = new Date(now.getFullYear(), now.getMonth() + 1, 25)
    return d.toLocaleDateString('fr-FR', { day:'numeric', month:'long' })
  })()

  return (
    <div className="p-6 max-w-4xl mx-auto space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl font-semibold text-gray-900">Bonjour, {profile.prenom} 👋</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {new Intl.DateTimeFormat('fr-FR', { weekday:'long', day:'numeric', month:'long', year:'numeric' }).format(now)}
        </p>
      </div>

      {/* Badgeage du jour */}
      <div className={`rounded-xl border px-5 py-4 flex items-center gap-4 ${
        pointageAujourdhui?.heure_entree && !pointageAujourdhui?.heure_sortie
          ? 'bg-green-50 border-green-200'
          : pointageAujourdhui?.heure_sortie
          ? 'bg-gray-50 border-gray-200'
          : 'bg-blue-50 border-blue-200'
      }`}>
        <div className={`w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0 ${
          pointageAujourdhui?.heure_entree ? 'bg-green-100' : 'bg-blue-100'
        }`}>
          <svg className={`w-5 h-5 ${pointageAujourdhui?.heure_entree ? 'text-green-600' : 'text-blue-600'}`}
            fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
        </div>
        <div className="flex-1">
          {pointageAujourdhui?.heure_entree && !pointageAujourdhui?.heure_sortie ? (
            <>
              <p className="text-sm font-medium text-green-800">En cours — arrivée {pointageAujourdhui.heure_entree.slice(0,5)}</p>
              <p className="text-xs text-green-600 mt-0.5 capitalize">{pointageAujourdhui.type_journee === 'teletravail' ? 'Télétravail' : pointageAujourdhui.type_journee}</p>
            </>
          ) : pointageAujourdhui?.heure_sortie ? (
            <>
              <p className="text-sm font-medium text-gray-700">Journée terminée · {pointageAujourdhui.heure_entree?.slice(0,5)} → {pointageAujourdhui.heure_sortie?.slice(0,5)}</p>
              <p className="text-xs text-gray-500 mt-0.5">{Math.floor((pointageAujourdhui.duree_minutes ?? 0) / 60)}h{String((pointageAujourdhui.duree_minutes ?? 0) % 60).padStart(2,'0')} travaillées</p>
            </>
          ) : (
            <>
              <p className="text-sm font-medium text-blue-800">Pas encore badgé aujourd'hui</p>
              <p className="text-xs text-blue-600 mt-0.5">Enregistrez votre arrivée</p>
            </>
          )}
        </div>
        <Link href="/temps"
          className="flex-shrink-0 text-sm font-medium bg-white border border-gray-200 hover:border-gray-300 text-gray-700 px-3 py-2 rounded-lg transition">
          Gérer
        </Link>
      </div>

      {/* Soldes de congés */}
      <div className="grid grid-cols-3 gap-4">
        {[
          { label: 'Congés payés', restant: cpRestant, total: cp?.solde_acquis ?? 0, color: 'blue' },
          { label: 'RTT', restant: rttRestant, total: rtt?.solde_acquis ?? 0, color: 'purple' },
          { label: 'Récupérations', restant: rec?.solde_restant ?? 0, total: rec?.solde_acquis ?? 0, color: 'green' },
        ].map(s => {
          const pct = s.total > 0 ? (s.restant / s.total) * 100 : 0
          const barColor = s.color === 'blue' ? 'bg-blue-500' : s.color === 'purple' ? 'bg-purple-500' : 'bg-green-500'
          const bgBar   = s.color === 'blue' ? 'bg-blue-100' : s.color === 'purple' ? 'bg-purple-100' : 'bg-green-100'
          return (
            <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
              <p className="text-xs text-gray-500 mb-2">{s.label}</p>
              <div className="flex items-baseline gap-1 mb-2">
                <span className="text-2xl font-bold text-gray-900">{s.restant}</span>
                <span className="text-xs text-gray-400">/ {s.total} j</span>
              </div>
              <div className={`h-1.5 rounded-full ${bgBar}`}>
                <div className={`h-full rounded-full ${barColor} transition-all`} style={{ width: `${Math.min(pct, 100)}%` }} />
              </div>
            </div>
          )
        })}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
        {/* Mes demandes en cours */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
            <h2 className="text-sm font-medium text-gray-900">Mes congés à venir</h2>
            <Link href="/conges" className="text-xs text-blue-600 hover:text-blue-700 font-medium">Gérer →</Link>
          </div>
          {demandesEnCours.length === 0 ? (
            <div className="py-8 text-center">
              <p className="text-sm text-gray-400">Aucune demande en cours</p>
              <Link href="/conges/nouvelle" className="mt-2 inline-block text-xs text-blue-600 hover:underline">Faire une demande</Link>
            </div>
          ) : (
            <div className="divide-y divide-gray-50">
              {demandesEnCours.map((d: any) => (
                <div key={d.id} className="px-5 py-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{TYPE_LABELS[d.type_code] ?? d.type_code}</p>
                    <p className="text-xs text-gray-500">{new Date(d.date_debut).toLocaleDateString('fr-FR')} → {new Date(d.date_fin).toLocaleDateString('fr-FR')} · {d.nb_jours} j</p>
                  </div>
                  <span className={`text-[11px] font-medium px-2 py-0.5 rounded-full ${STATUT_COLORS[d.statut] ?? 'bg-gray-100 text-gray-500'}`}>
                    {STATUT_LABELS[d.statut] ?? d.statut}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Infos perso + prochaine paie */}
        <div className="space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h2 className="text-sm font-medium text-gray-900 mb-3">Mon dossier</h2>
            <div className="space-y-2">
              {[
                { label: 'Poste', value: profile.poste || '—' },
                { label: 'Service', value: profile.departement || '—' },
                { label: 'Contrat', value: profile.type_contrat },
                { label: 'Temps de travail', value: `${profile.temps_travail}%` },
                { label: 'Ancienneté', value: getAnciennete(profile.date_entree) },
              ].map(r => (
                <div key={r.label} className="flex justify-between text-sm">
                  <span className="text-gray-500">{r.label}</span>
                  <span className="font-medium text-gray-900">{r.value}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-indigo-50 border border-indigo-200 rounded-xl p-4 flex items-center gap-3">
            <div className="w-9 h-9 rounded-lg bg-indigo-100 flex items-center justify-center flex-shrink-0">
              <svg className="w-5 h-5 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-indigo-900">Prochaine paie</p>
              <p className="text-xs text-indigo-700 mt-0.5">{prochainePaie} · via SILAE</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}
