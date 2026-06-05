import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { MOIS_FR } from '@/lib/conges-utils'
import type { DemandeConges } from '@/lib/types-conges'

const SEMAINES = ['Sem. 27', 'Sem. 28', 'Sem. 29', 'Sem. 30', 'Sem. 31', 'Sem. 32']
const DATES_SEM = [
  { start: '2025-06-30', end: '2025-07-04' },
  { start: '2025-07-07', end: '2025-07-11' },
  { start: '2025-07-14', end: '2025-07-18' },
  { start: '2025-07-21', end: '2025-07-25' },
  { start: '2025-07-28', end: '2025-08-01' },
  { start: '2025-08-04', end: '2025-08-08' },
]

function intersecte(ds: string, df: string, start: string, end: string) {
  return ds <= end && df >= start
}

export default async function PlanningPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: me } = await supabase
    .from('profiles').select('id, role').eq('user_id', user.id).single()
  if (!me || !['responsable', 'rh_admin'].includes(me.role)) redirect('/dashboard')

  const { data: salaries } = await supabase
    .from('profiles')
    .select('id, prenom, nom, departement')
    .order('nom')

  const { data: demandes } = await supabase
    .from('demandes_conges')
    .select('profile_id, date_debut, date_fin, statut, type_code, nb_jours, type:types_absence(label, couleur)')
    .in('statut', ['validee', 'en_attente'])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Planning équipe</h1>
        <p className="text-sm text-gray-500 mt-0.5">Aperçu des absences par semaine</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-x-auto">
        <table className="w-full text-sm min-w-[640px]">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide w-48">Collaborateur</th>
              {SEMAINES.map((s, i) => (
                <th key={s} className="text-center px-2 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">
                  <div>{s}</div>
                  <div className="font-normal text-[10px] text-gray-400">
                    {new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(DATES_SEM[i].start))}
                  </div>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {(salaries ?? []).map(s => {
              const demandesS = (demandes ?? []).filter((d: any) => d.profile_id === s.id)
              return (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                        {s.prenom?.[0]}{s.nom?.[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900 text-xs">{s.prenom} {s.nom}</p>
                        <p className="text-[10px] text-gray-400">{s.departement}</p>
                      </div>
                    </div>
                  </td>
                  {DATES_SEM.map((sem, i) => {
                    const abs = demandesS.find((d: any) =>
                      intersecte(d.date_debut, d.date_fin, sem.start, sem.end)
                    ) as any
                    return (
                      <td key={i} className="px-2 py-3 text-center">
                        {abs ? (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium text-white"
                            style={{ backgroundColor: abs.type?.couleur ?? '#378ADD', opacity: abs.statut === 'en_attente' ? 0.6 : 1 }}
                            title={`${abs.type?.label} · ${abs.statut === 'en_attente' ? 'En attente' : 'Validé'}`}
                          >
                            {abs.statut === 'en_attente' ? '?' : abs.type?.label?.slice(0, 3) ?? 'ABS'}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-50 text-green-600">
                            Présent
                          </span>
                        )}
                      </td>
                    )
                  })}
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>

      {/* Légende */}
      <div className="flex gap-4 mt-4 flex-wrap">
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-3 h-3 rounded bg-green-100"></span> Présent
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-3 h-3 rounded bg-blue-500"></span> Congés validés
        </div>
        <div className="flex items-center gap-1.5 text-xs text-gray-500">
          <span className="w-3 h-3 rounded bg-blue-300 opacity-60"></span> En attente (?)
        </div>
      </div>
    </div>
  )
}
