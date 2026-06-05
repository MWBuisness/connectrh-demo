import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ValidationActions from '@/components/conges/ValidationActions'
import { formatDateFR, statutColor, statutLabel } from '@/lib/conges-utils'
import type { DemandeConges } from '@/lib/types-conges'

export default async function ValidationsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: me } = await supabase
    .from('profiles').select('id, role, prenom, nom').eq('user_id', user.id).single()
  if (!me || !['responsable', 'rh_admin'].includes(me.role)) redirect('/dashboard')

  // Demandes en attente de l'équipe
  const { data: demandesRaw } = await supabase
    .from('demandes_conges')
    .select('*, type:types_absence(*), profile:profile_id(prenom,nom,departement,poste,responsable_id)')
    .eq('statut', 'en_attente')
    .order('created_at')

  // Pour responsable : filtrer son équipe uniquement
  let demandes = (demandesRaw ?? []) as DemandeConges[]
  if (me.role === 'responsable') {
    demandes = demandes.filter((d: any) => d.profile?.responsable_id === me.id)
  }

  // Historique récent des validées/refusées
  const { data: historique } = await supabase
    .from('demandes_conges')
    .select('*, type:types_absence(*), profile:profile_id(prenom,nom,departement)')
    .in('statut', ['validee', 'refusee'])
    .order('validee_le', { ascending: false })
    .limit(10)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Demandes à valider</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          {demandes.length} demande{demandes.length > 1 ? 's' : ''} en attente
        </p>
      </div>

      {/* En attente */}
      {demandes.length === 0 ? (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center text-gray-400">
          <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <p className="text-sm font-medium text-gray-500">Aucune demande en attente</p>
          <p className="text-xs mt-1">Toutes les demandes ont été traitées.</p>
        </div>
      ) : (
        <div className="space-y-3 mb-8">
          {demandes.map((d: any) => (
            <div key={d.id} className="bg-white border border-gray-200 rounded-xl p-5">
              <div className="flex items-start gap-4">
                <div className="w-10 h-10 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-sm font-medium flex-shrink-0">
                  {d.profile?.prenom?.[0]}{d.profile?.nom?.[0]}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-4">
                    <div>
                      <p className="font-medium text-gray-900">
                        {d.profile?.prenom} {d.profile?.nom}
                      </p>
                      <p className="text-xs text-gray-500">{d.profile?.poste} · {d.profile?.departement}</p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="flex items-center gap-1.5 justify-end">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.type?.couleur ?? '#888' }} />
                        <span className="text-sm font-medium text-gray-900">{d.type?.label ?? d.type_code}</span>
                      </div>
                      <p className="text-xs text-gray-500 mt-0.5">
                        {formatDateFR(d.date_debut)} → {formatDateFR(d.date_fin)}
                      </p>
                      <p className="text-sm font-semibold text-gray-900 mt-0.5">{d.nb_jours} jour{d.nb_jours > 1 ? 's' : ''}</p>
                    </div>
                  </div>
                  {d.motif && (
                    <p className="text-xs text-gray-500 mt-2 bg-gray-50 rounded px-2 py-1">
                      Motif : {d.motif}
                    </p>
                  )}
                  <p className="text-[11px] text-gray-400 mt-2">
                    Demandé le {formatDateFR(d.created_at.split('T')[0])}
                  </p>
                </div>
              </div>
              <div className="mt-4 pt-4 border-t border-gray-100">
                <ValidationActions demande={d} valideurId={me.id} />
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Historique */}
      {(historique?.length ?? 0) > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <div className="px-5 py-4 border-b border-gray-100">
            <h3 className="text-sm font-medium text-gray-900">Traitées récemment</h3>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Collaborateur</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Période</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Statut</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">SILAE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {(historique ?? []).map((d: any) => (
                <tr key={d.id} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {d.profile?.prenom} {d.profile?.nom}
                    <p className="text-xs font-normal text-gray-400">{d.profile?.departement}</p>
                  </td>
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: d.type?.couleur ?? '#888' }} />
                      <span className="text-gray-600">{d.type?.label}</span>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {formatDateFR(d.date_debut)} → {formatDateFR(d.date_fin)} · {d.nb_jours}j
                  </td>
                  <td className="px-5 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${statutColor(d.statut)}`}>
                      {statutLabel(d.statut)}
                    </span>
                  </td>
                  <td className="px-5 py-3">
                    {d.silae_transmis ? (
                      <span className="text-[11px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">✓ Transmis</span>
                    ) : (
                      <span className="text-gray-300 text-xs">—</span>
                    )}
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
