import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { formatDateFR, statutColor, statutLabel } from '@/lib/conges-utils'
import type { DemandeConges } from '@/lib/types-conges'

export default async function AdminCongesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: me } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).single()
  if (!me || me.role !== 'rh_admin') redirect('/dashboard')

  const { data: demandesRaw } = await supabase
    .from('demandes_conges')
    .select('*, type:types_absence(*), profile:profile_id(prenom,nom,departement,poste)')
    .order('created_at', { ascending: false })

  const demandes = (demandesRaw ?? []) as DemandeConges[]

  const stats = {
    total: demandes.length,
    enAttente: demandes.filter(d => d.statut === 'en_attente').length,
    validees: demandes.filter(d => d.statut === 'validee').length,
    silaePending: demandes.filter(d => d.statut === 'validee' && !d.silae_transmis).length,
    silaeTransmis: demandes.filter(d => d.silae_transmis).length,
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Gestion des congés & absences</h1>
        <p className="text-sm text-gray-500 mt-0.5">Vue globale de toutes les demandes</p>
      </div>

      {/* Bandeau SILAE */}
      <div className="bg-green-50 border border-green-200 rounded-xl px-5 py-4 flex items-center gap-4 mb-6">
        <div className="w-9 h-9 bg-green-600 rounded-lg flex items-center justify-center flex-shrink-0">
          <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
          </svg>
        </div>
        <div className="flex-1">
          <p className="text-sm font-medium text-green-900">SILAE — Cycle de paie en cours</p>
          <p className="text-xs text-green-600">
            {stats.silaeTransmis} absence{stats.silaeTransmis > 1 ? 's' : ''} transmise{stats.silaeTransmis > 1 ? 's' : ''} au cycle
            {stats.silaePending > 0 && ` · ${stats.silaePending} en attente de transmission`}
          </p>
        </div>
        <div className="flex items-center gap-1.5 text-xs font-medium text-green-700 bg-green-100 px-3 py-1.5 rounded-full">
          <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>
          Synchronisé
        </div>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total demandes', value: stats.total, color: 'text-gray-900' },
          { label: 'En attente', value: stats.enAttente, color: stats.enAttente > 0 ? 'text-amber-600' : 'text-gray-900' },
          { label: 'Validées', value: stats.validees, color: 'text-green-600' },
          { label: 'Transmises SILAE', value: stats.silaeTransmis, color: 'text-blue-600' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Toutes les demandes</h3>
          <div className="flex gap-2">
            {['Toutes','En attente','Validées','Refusées'].map(f => (
              <span key={f} className="text-xs text-gray-500 hover:text-gray-900 cursor-pointer px-2 py-1 rounded hover:bg-gray-100 transition">{f}</span>
            ))}
          </div>
        </div>
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Collaborateur</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Période</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Jours</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Statut</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">SILAE</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {demandes.map((d: any) => (
              <tr key={d.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3">
                  <p className="font-medium text-gray-900">{d.profile?.prenom} {d.profile?.nom}</p>
                  <p className="text-[11px] text-gray-400">{d.profile?.departement}</p>
                </td>
                <td className="px-5 py-3">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: d.type?.couleur ?? '#888' }} />
                    <span className="text-gray-600 text-xs">{d.type?.label}</span>
                  </div>
                </td>
                <td className="px-5 py-3 text-gray-500 text-xs">
                  {formatDateFR(d.date_debut)}<br />{formatDateFR(d.date_fin)}
                </td>
                <td className="px-5 py-3 font-semibold text-gray-900">{d.nb_jours}j</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${statutColor(d.statut)}`}>
                    {statutLabel(d.statut)}
                  </span>
                </td>
                <td className="px-5 py-3">
                  {d.silae_transmis ? (
                    <div>
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
                        <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                        </svg>
                        Transmis
                      </span>
                      {d.silae_reference && (
                        <p className="text-[10px] text-gray-400 mt-0.5">{d.silae_reference}</p>
                      )}
                    </div>
                  ) : d.statut === 'validee' ? (
                    <span className="text-[11px] text-amber-600">En attente</span>
                  ) : (
                    <span className="text-gray-300 text-xs">—</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}
