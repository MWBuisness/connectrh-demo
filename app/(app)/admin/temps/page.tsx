import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getTodayISO, minutesToHHMM, getMoisAnnee } from '@/lib/temps-utils'
import { TYPE_JOURNEE_LABELS, TYPE_JOURNEE_COLORS } from '@/lib/types-temps'
import SilaeExportButton from '@/components/temps/SilaeExportButton'

export default async function AdminTempsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: me } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).single()
  if (!me || !['responsable', 'rh_admin'].includes(me.role)) redirect('/dashboard')

  const today = getTodayISO()
  const now = new Date()
  const annee = now.getFullYear()
  const mois = now.getMonth() + 1

  // Présence aujourd'hui
  const { data: presencesRaw } = await supabase
    .from('pointages')
    .select('*, profile:profile_id(prenom, nom, departement, poste)')
    .eq('date', today)

  // Compteurs du mois pour tous
  const { data: compteursRaw } = await supabase
    .from('compteurs_temps')
    .select('*, profile:profile_id(prenom, nom, departement)')
    .eq('annee', annee)
    .eq('mois', mois)
    .order('profile(nom)')

  // Alertes non lues
  const { data: alertes } = await supabase
    .from('alertes_temps')
    .select('*, profile:profile_id(prenom, nom)')
    .eq('lue', false)
    .order('created_at', { ascending: false })
    .limit(10)

  const presences = (presencesRaw ?? []) as any[]
  const compteurs = (compteursRaw ?? []) as any[]

  const stats = {
    presents: presences.filter(p => p.heure_entree && !p.heure_sortie).length,
    partis: presences.filter(p => p.heure_sortie).length,
    teletravail: presences.filter(p => p.type_journee === 'teletravail').length,
    nonBadge: presences.filter(p => !p.heure_entree).length,
  }

  const nonTransmis = compteurs.filter(c => !c.silae_transmis)

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Gestion du temps — Admin</h1>
          <p className="text-sm text-gray-500 mt-0.5">Présence en temps réel & export SILAE</p>
        </div>
        {me.role === 'rh_admin' && nonTransmis.length > 0 && (
          <SilaeExportButton mois={mois} annee={annee} count={nonTransmis.length} />
        )}
      </div>

      {/* Stats du jour */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'En poste', value: stats.presents, color: 'text-green-600' },
          { label: 'Télétravail', value: stats.teletravail, color: 'text-blue-600' },
          { label: 'Partis', value: stats.partis, color: 'text-gray-500' },
          { label: 'Non badgés', value: stats.nonBadge, color: stats.nonBadge > 0 ? 'text-amber-600' : 'text-gray-400' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
            <p className="text-xs text-gray-400 mt-0.5">Aujourd'hui</p>
          </div>
        ))}
      </div>

      {/* Alertes */}
      {(alertes?.length ?? 0) > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
          <h3 className="text-sm font-medium text-amber-800 mb-2 flex items-center gap-2">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            {alertes?.length} alerte{(alertes?.length ?? 0) > 1 ? 's' : ''} active{(alertes?.length ?? 0) > 1 ? 's' : ''}
          </h3>
          <div className="space-y-1.5">
            {alertes?.map((a: any) => (
              <div key={a.id} className="flex items-start gap-2 text-sm text-amber-700">
                <span className="mt-0.5">·</span>
                <span><strong>{a.profile?.prenom} {a.profile?.nom}</strong> — {a.message}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Présences du jour */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Présences aujourd'hui</h3>
          <span className="text-xs text-gray-400">
            {new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}
          </span>
        </div>
        {presences.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">Aucun badgeage aujourd'hui</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Collaborateur</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Arrivée</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Départ</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Durée</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Statut</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {presences.map((p: any) => (
                <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3">
                    <div className="flex items-center gap-2">
                      <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-medium">
                        {p.profile?.prenom?.[0]}{p.profile?.nom?.[0]}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{p.profile?.prenom} {p.profile?.nom}</p>
                        <p className="text-[11px] text-gray-400">{p.profile?.departement}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-5 py-3">
                    <span className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded-full text-white"
                      style={{ backgroundColor: TYPE_JOURNEE_COLORS[p.type_journee as keyof typeof TYPE_JOURNEE_COLORS] }}>
                      {TYPE_JOURNEE_LABELS[p.type_journee as keyof typeof TYPE_JOURNEE_LABELS]}
                    </span>
                  </td>
                  <td className="px-5 py-3 tabular-nums text-gray-700">{p.heure_entree?.slice(0,5) ?? '—'}</td>
                  <td className="px-5 py-3 tabular-nums text-gray-700">{p.heure_sortie?.slice(0,5) ?? (p.heure_entree ? <span className="text-green-500 font-medium">En poste</span> : '—')}</td>
                  <td className="px-5 py-3 font-medium text-gray-900 tabular-nums">{minutesToHHMM(p.duree_minutes)}</td>
                  <td className="px-5 py-3">
                    {!p.heure_entree ? (
                      <span className="text-xs text-amber-600 font-medium">Non badgé</span>
                    ) : !p.heure_sortie ? (
                      <span className="flex items-center gap-1 text-xs text-green-600 font-medium">
                        <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse"></span>
                        En cours
                      </span>
                    ) : (
                      <span className="text-xs text-gray-500">Terminé</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Compteurs mensuels */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="px-5 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-sm font-medium text-gray-900">Compteurs — {getMoisAnnee(annee, mois)}</h3>
          {nonTransmis.length > 0 && (
            <span className="text-xs text-amber-600 font-medium">{nonTransmis.length} à transmettre à SILAE</span>
          )}
        </div>
        {compteurs.length === 0 ? (
          <div className="text-center py-8 text-gray-400 text-sm">Aucun compteur ce mois</div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Collaborateur</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Réalisé</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Contractuel</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Heures sup</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Télétravail</th>
                <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">SILAE</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {compteurs.map((c: any) => (
                <tr key={c.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-5 py-3 font-medium text-gray-900">
                    {c.profile?.prenom} {c.profile?.nom}
                    <p className="text-[11px] font-normal text-gray-400">{c.profile?.departement}</p>
                  </td>
                  <td className="px-5 py-3 font-medium text-gray-900">{c.heures_realisees?.toFixed(1)}h</td>
                  <td className="px-5 py-3 text-gray-500">{c.heures_contractuelles?.toFixed(1)}h</td>
                  <td className="px-5 py-3">
                    <span className={c.heures_sup > 0 ? 'text-amber-600 font-medium' : 'text-gray-400'}>
                      {c.heures_sup > 0 ? `+${c.heures_sup?.toFixed(1)}h` : '—'}
                    </span>
                  </td>
                  <td className="px-5 py-3 text-gray-600">{c.jours_teletravail}j</td>
                  <td className="px-5 py-3">
                    {c.silae_transmis ? (
                      <span className="text-[11px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">✓ Transmis</span>
                    ) : (
                      <span className="text-[11px] text-amber-600">En attente</span>
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
