import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import SoldesCards from '@/components/conges/SoldesCards'
import CalendrierConges from '@/components/conges/CalendrierConges'
import { statutColor, statutLabel, formatDateFR } from '@/lib/conges-utils'
import type { DemandeConges, SoldeConges, JourFerie } from '@/lib/types-conges'

export default async function CongesPage({ searchParams }: { searchParams: Promise<{ success?: string }> }) {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const sp = await searchParams

  const { data: profile } = await supabase
    .from('profiles').select('id, prenom, nom, role').eq('user_id', user.id).single()
  if (!profile) redirect('/auth/login')

  // Soldes
  const { data: soldesRaw } = await supabase
    .from('soldes_conges')
    .select('*, type:types_absence(*)')
    .eq('profile_id', profile.id)
    .eq('annee', new Date().getFullYear())
    .order('type(ordre)')

  // Demandes
  const { data: demandesRaw } = await supabase
    .from('demandes_conges')
    .select('*, type:types_absence(*), valideur:validee_par(prenom,nom)')
    .eq('profile_id', profile.id)
    .order('created_at', { ascending: false })

  // Jours fériés
  const { data: feriesRaw } = await supabase
    .from('jours_feries').select('*').gte('date', `${new Date().getFullYear()}-01-01`)

  const soldes = (soldesRaw ?? []) as SoldeConges[]
  const demandes = (demandesRaw ?? []) as DemandeConges[]
  const feries = (feriesRaw ?? []) as JourFerie[]

  const enAttente = demandes.filter(d => d.statut === 'en_attente')
  const passees = demandes.filter(d => d.statut !== 'en_attente')

  return (
    <div className="p-6 max-w-5xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Congés & absences</h1>
          <p className="text-sm text-gray-500 mt-0.5">Gérez vos demandes et suivez vos soldes</p>
        </div>
        <Link href="/conges/nouvelle"
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
          </svg>
          Nouvelle demande
        </Link>
      </div>

      {sp?.success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Demande soumise — votre responsable recevra une notification.
        </div>
      )}

      {/* Soldes */}
      <SoldesCards soldes={soldes} />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Calendrier */}
        <div className="lg:col-span-2">
          <CalendrierConges demandes={demandes} feries={feries} />
        </div>

        {/* En attente */}
        <div className="bg-white border border-gray-200 rounded-xl p-4">
          <h3 className="text-sm font-medium text-gray-900 mb-3">
            En attente de validation
            {enAttente.length > 0 && (
              <span className="ml-2 bg-amber-100 text-amber-700 text-[10px] font-medium px-1.5 py-0.5 rounded-full">
                {enAttente.length}
              </span>
            )}
          </h3>
          {enAttente.length === 0 ? (
            <p className="text-sm text-gray-400 text-center py-6">Aucune demande en attente</p>
          ) : (
            <div className="space-y-2">
              {enAttente.map(d => (
                <div key={d.id} className="border border-amber-200 bg-amber-50 rounded-lg p-3">
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-xs font-medium text-amber-700">{d.type?.label ?? d.type_code}</span>
                    <span className="text-xs text-amber-600 font-medium">{d.nb_jours}j</span>
                  </div>
                  <p className="text-xs text-gray-600">
                    {formatDateFR(d.date_debut)} → {formatDateFR(d.date_fin)}
                  </p>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Historique */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h3 className="text-sm font-medium text-gray-900">Historique des demandes</h3>
        </div>
        {demandes.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">Aucune demande pour l'instant</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Période</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Jours</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Statut</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">SILAE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {demandes.map(d => (
                <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.type?.couleur ?? '#888' }} />
                      <span className="text-gray-700">{d.type?.label ?? d.type_code}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {formatDateFR(d.date_debut)} → {formatDateFR(d.date_fin)}
                  </td>
                  <td className="px-5 py-3 font-medium text-gray-900">{d.nb_jours}j</td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium border ${statutColor(d.statut)}`}>
                      {statutLabel(d.statut)}
                    </span>
                    {d.commentaire_valid && (
                      <p className="text-[11px] text-gray-400 mt-0.5 italic">"{d.commentaire_valid}"</p>
                    )}
                  </td>
                  <td className="px-5 py-3">
                    {d.silae_transmis ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Transmis
                      </span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
