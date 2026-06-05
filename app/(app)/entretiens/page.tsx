import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { STATUT_ENTRETIEN_LABELS, STATUT_ENTRETIEN_COLORS } from '@/lib/types-entretiens'
import type { Entretien } from '@/lib/types-entretiens'

export default async function EntretiensPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('id, prenom, nom, role, date_entree').eq('user_id', user.id).single()
  if (!profile) redirect('/auth/login')

  const { data: entretiens } = await supabase
    .from('entretiens')
    .select('*, type:types_entretien(*), manager:manager_id(prenom,nom)')
    .eq('profile_id', profile.id)
    .order('date_prevue', { ascending: false })

  const { data: alertes } = await supabase
    .from('alertes_entretien')
    .select('*').eq('profile_id', profile.id).eq('lue', false)

  const list = (entretiens ?? []) as Entretien[]
  const aVenir = list.filter(e => ['planifie','prep_manager','prep_salarie','en_cours'].includes(e.statut))
  const passes = list.filter(e => ['realise','signe'].includes(e.statut))

  // Calculer prochaine date EP obligatoire
  const dernierEP = list.find(e => e.type_code === 'AEP' && e.statut === 'signe')
  const dateEntree = new Date(profile.date_entree)
  const prochainEP = dernierEP?.realise_le
    ? new Date(new Date(dernierEP.realise_le).getTime() + 2 * 365.25 * 24 * 3600 * 1000)
    : new Date(dateEntree.getTime() + 2 * 365.25 * 24 * 3600 * 1000)
  const joursAvantEP = Math.ceil((prochainEP.getTime() - Date.now()) / (24 * 3600 * 1000))

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Mes entretiens</h1>
        <p className="text-sm text-gray-500 mt-0.5">Évaluations et entretiens professionnels</p>
      </div>

      {/* Alerte EP obligatoire */}
      {joursAvantEP <= 90 && (
        <div className={`border rounded-xl px-4 py-3 mb-5 flex items-center gap-3 ${joursAvantEP <= 30 ? 'bg-red-50 border-red-200' : 'bg-amber-50 border-amber-200'}`}>
          <svg className={`w-5 h-5 flex-shrink-0 ${joursAvantEP <= 30 ? 'text-red-600' : 'text-amber-600'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <div>
            <p className={`text-sm font-medium ${joursAvantEP <= 30 ? 'text-red-800' : 'text-amber-800'}`}>
              Entretien professionnel obligatoire dans {joursAvantEP} jour{joursAvantEP > 1 ? 's' : ''}
            </p>
            <p className={`text-xs ${joursAvantEP <= 30 ? 'text-red-600' : 'text-amber-600'}`}>
              Prévu avant le {new Intl.DateTimeFormat('fr-FR').format(prochainEP)} · Obligatoire tous les 2 ans
            </p>
          </div>
        </div>
      )}

      {/* Alertes */}
      {(alertes?.length ?? 0) > 0 && (
        <div className="bg-blue-50 border border-blue-200 rounded-xl p-3 mb-4">
          {alertes?.map((a: any) => (
            <p key={a.id} className="text-xs text-blue-700">· {a.message}</p>
          ))}
        </div>
      )}

      {/* À venir */}
      <div className="mb-6">
        <h2 className="text-sm font-medium text-gray-700 mb-3">À venir / En cours ({aVenir.length})</h2>
        {aVenir.length === 0 ? (
          <div className="bg-white border border-gray-200 rounded-xl p-8 text-center text-gray-400 text-sm">
            Aucun entretien planifié
          </div>
        ) : (
          <div className="space-y-3">
            {aVenir.map(e => (
              <Link key={e.id} href={`/entretiens/${e.id}`}
                className="block bg-white border border-gray-200 rounded-xl p-4 hover:border-blue-300 hover:shadow-sm transition-all">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-start gap-3">
                    <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0 text-white text-xs font-bold"
                      style={{ backgroundColor: e.type?.couleur ?? '#378ADD' }}>
                      {e.type?.code?.slice(0, 2)}
                    </div>
                    <div>
                      <p className="text-sm font-medium text-gray-900">{e.type?.label}</p>
                      {e.date_prevue && (
                        <p className="text-xs text-gray-500 mt-0.5">
                          {new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' }).format(new Date(e.date_prevue))}
                          {e.heure_prevue && ` à ${e.heure_prevue.slice(0,5)}`}
                          {e.lieu && ` · ${e.lieu}`}
                        </p>
                      )}
                      {e.manager && <p className="text-xs text-gray-400 mt-0.5">Manager : {e.manager.prenom} {e.manager.nom}</p>}
                    </div>
                  </div>
                  <span className={`text-xs font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${STATUT_ENTRETIEN_COLORS[e.statut]}`}>
                    {STATUT_ENTRETIEN_LABELS[e.statut]}
                  </span>
                </div>
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Historique */}
      {passes.length > 0 && (
        <div>
          <h2 className="text-sm font-medium text-gray-700 mb-3">Historique ({passes.length})</h2>
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-gray-100">
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Note</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Statut</th>
                  <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-50">
                {passes.map(e => (
                  <tr key={e.id} className="hover:bg-gray-50 transition-colors">
                    <td className="px-5 py-3">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: e.type?.couleur ?? '#888' }} />
                        <span className="text-gray-700">{e.type?.label}</span>
                      </div>
                    </td>
                    <td className="px-5 py-3 text-gray-500 text-xs">
                      {e.realise_le ? new Intl.DateTimeFormat('fr-FR').format(new Date(e.realise_le)) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      {e.note_globale ? (
                        <div className="flex items-center gap-1">
                          {'★'.repeat(Math.round(e.note_globale)).split('').map((s,i) => (
                            <span key={i} className="text-amber-400 text-sm">{s}</span>
                          ))}
                          <span className="text-xs text-gray-400 ml-1">{e.note_globale}/5</span>
                        </div>
                      ) : '—'}
                    </td>
                    <td className="px-5 py-3">
                      <span className={`text-xs font-medium px-2 py-0.5 rounded-full border ${STATUT_ENTRETIEN_COLORS[e.statut]}`}>
                        {STATUT_ENTRETIEN_LABELS[e.statut]}
                      </span>
                    </td>
                    <td className="px-5 py-3">
                      <Link href={`/entretiens/${e.id}`} className="text-xs text-blue-600 hover:text-blue-800 font-medium">
                        Consulter
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
