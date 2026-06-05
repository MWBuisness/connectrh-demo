import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { APTITUDE_LABELS, APTITUDE_COLORS, STATUT_VISITE_LABELS, STATUT_VISITE_COLORS } from '@/lib/types-medical'
import type { VisiteMedicale, AlerteMedicale } from '@/lib/types-medical'

export default async function MedicalPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('id, prenom, nom, date_entree').eq('user_id', user.id).single()
  if (!profile) redirect('/auth/login')

  const [{ data: visites }, { data: alertes }] = await Promise.all([
    supabase.from('visites_medicales')
      .select('*, type:types_visite_medicale(*)')
      .eq('profile_id', profile.id)
      .order('date_realisee', { ascending: false }),
    supabase.from('alertes_medicales')
      .select('*').eq('profile_id', profile.id).eq('lue', false).order('echeance'),
  ])

  const list = (visites ?? []) as VisiteMedicale[]
  const alerts = (alertes ?? []) as AlerteMedicale[]
  const derniere = list.find(v => v.statut === 'realisee')
  const prochaine = list.find(v => v.statut === 'planifiee')

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Suivi médical</h1>
        <p className="text-sm text-gray-500 mt-0.5">Visites médicales · Aptitudes · Documents</p>
      </div>

      {/* Alertes */}
      {alerts.length > 0 && (
        <div className="mb-5 space-y-2">
          {alerts.map(a => (
            <div key={a.id} className={`border rounded-xl px-4 py-3 flex items-start gap-3 ${
              a.urgence === 'critique' ? 'bg-red-50 border-red-200'
              : a.urgence === 'haute' ? 'bg-amber-50 border-amber-200'
              : 'bg-blue-50 border-blue-200'
            }`}>
              <svg className={`w-5 h-5 flex-shrink-0 mt-0.5 ${a.urgence === 'critique' ? 'text-red-500' : a.urgence === 'haute' ? 'text-amber-500' : 'text-blue-500'}`}
                fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <div>
                <p className={`text-sm font-medium ${a.urgence === 'critique' ? 'text-red-800' : a.urgence === 'haute' ? 'text-amber-800' : 'text-blue-800'}`}>
                  {a.message}
                </p>
                {a.echeance && (
                  <p className={`text-xs mt-0.5 ${a.urgence === 'critique' ? 'text-red-600' : a.urgence === 'haute' ? 'text-amber-600' : 'text-blue-600'}`}>
                    Échéance : {new Intl.DateTimeFormat('fr-FR').format(new Date(a.echeance))}
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Visites réalisées', value: list.filter(v => v.statut === 'realisee').length, color: 'text-green-600' },
          { label: 'Prochaine visite', value: prochaine?.date_prevue ? new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(prochaine.date_prevue)) : '—', color: 'text-blue-600' },
          { label: 'Aptitude actuelle', value: derniere?.aptitude ? APTITUDE_LABELS[derniere.aptitude] : '—', color: derniere?.aptitude === 'apte' ? 'text-green-600' : 'text-amber-600' },
          { label: 'Alertes actives', value: alerts.length, color: alerts.length > 0 ? 'text-red-600' : 'text-gray-400' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-lg font-semibold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Prochaine visite */}
      {prochaine && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-5 flex items-center gap-4">
          <div className="w-10 h-10 bg-blue-600 rounded-lg flex items-center justify-center flex-shrink-0">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
          <div className="flex-1">
            <p className="text-sm font-medium text-blue-900">Prochaine visite planifiée</p>
            <p className="text-xs text-blue-700 mt-0.5">
              {prochaine.type?.label} · {prochaine.date_prevue ? new Intl.DateTimeFormat('fr-FR', { dateStyle: 'long' }).format(new Date(prochaine.date_prevue)) : '—'}
              {prochaine.lieu && ` · ${prochaine.lieu}`}
              {prochaine.medecin && ` · Dr ${prochaine.medecin}`}
            </p>
          </div>
          <span className="text-xs font-medium text-blue-700 bg-blue-100 px-2.5 py-1 rounded-full flex-shrink-0">
            {prochaine.service_sst ?? 'SST'}
          </span>
        </div>
      )}

      {/* Historique */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100">
          <h2 className="text-sm font-medium text-gray-900">Historique des visites</h2>
        </div>
        {list.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-sm">Aucune visite enregistrée</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                {['Type', 'Date', 'Médecin / Service', 'Aptitude', 'Prochaine', 'Statut'].map(h => (
                  <th key={h} className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.map(v => (
                <tr key={v.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full flex-shrink-0" style={{ backgroundColor: v.type?.couleur ?? '#888' }} />
                      <div>
                        <p className="font-medium text-gray-900">{v.type?.label ?? v.type_code}</p>
                        {v.type?.periodicite_mois && (
                          <p className="text-[10px] text-gray-400">/ {v.type.periodicite_mois} mois</p>
                        )}
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3 text-gray-600 text-xs">
                    {v.date_realisee
                      ? new Intl.DateTimeFormat('fr-FR').format(new Date(v.date_realisee))
                      : v.date_prevue ? new Intl.DateTimeFormat('fr-FR').format(new Date(v.date_prevue)) : '—'}
                  </td>
                  <td className="px-5 py-3 text-gray-500 text-xs">
                    {v.medecin && <p>Dr {v.medecin}</p>}
                    {v.service_sst && <p className="text-gray-400">{v.service_sst}</p>}
                    {!v.medecin && !v.service_sst && '—'}
                  </td>
                  <td className="px-5 py-3">
                    {v.aptitude ? (
                      <div>
                        <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${APTITUDE_COLORS[v.aptitude]}`}>
                          {APTITUDE_LABELS[v.aptitude]}
                        </span>
                        {v.amenagements && (
                          <p className="text-[10px] text-gray-400 mt-0.5 max-w-xs truncate">{v.amenagements}</p>
                        )}
                      </div>
                    ) : '—'}
                  </td>
                  <td className="px-5 py-3 text-xs text-gray-500">
                    {v.prochaine_date
                      ? new Intl.DateTimeFormat('fr-FR').format(new Date(v.prochaine_date))
                      : '—'}
                  </td>
                  <td className="px-5 py-3">
                    <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUT_VISITE_COLORS[v.statut]}`}>
                      {STATUT_VISITE_LABELS[v.statut]}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Restrictions actives */}
      {list.filter(v => v.statut === 'realisee' && v.restrictions).length > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mt-4">
          <h3 className="text-sm font-medium text-amber-800 mb-2">Restrictions médicales actives</h3>
          {list.filter(v => v.statut === 'realisee' && v.restrictions).slice(0, 1).map(v => (
            <p key={v.id} className="text-xs text-amber-700">{v.restrictions}</p>
          ))}
        </div>
      )}
    </div>
  )
}
