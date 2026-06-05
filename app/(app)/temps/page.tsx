import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import BadgeageWidget from '@/components/temps/BadgeageWidget'
import CompteurMensuel from '@/components/temps/CompteurMensuel'
import HistoriquePointages from '@/components/temps/HistoriquePointages'
import { getTodayISO } from '@/lib/temps-utils'
import type { Pointage, CompteurTemps, TeletravailCompteur } from '@/lib/types-temps'

export default async function TempsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('id, prenom, nom, role, temps_travail').eq('user_id', user.id).single()
  if (!profile) redirect('/auth/login')

  const today = getTodayISO()
  const now = new Date()
  const annee = now.getFullYear()
  const mois = now.getMonth() + 1

  // Pointage du jour
  const { data: pointageAujourdhui } = await supabase
    .from('pointages')
    .select('*')
    .eq('profile_id', profile.id)
    .eq('date', today)
    .maybeSingle()

  // Compteur du mois en cours
  const { data: compteur } = await supabase
    .from('compteurs_temps')
    .select('*')
    .eq('profile_id', profile.id)
    .eq('annee', annee)
    .eq('mois', mois)
    .maybeSingle()

  // Historique du mois (30 derniers jours)
  const debutMois = `${annee}-${mois.toString().padStart(2, '0')}-01`
  const { data: historique } = await supabase
    .from('pointages')
    .select('*')
    .eq('profile_id', profile.id)
    .gte('date', debutMois)
    .order('date', { ascending: false })

  // Compteur télétravail
  const { data: ttCompteur } = await supabase
    .from('teletravail_compteurs')
    .select('*')
    .eq('profile_id', profile.id)
    .eq('annee', annee)
    .maybeSingle()

  const pointages = (historique ?? []) as Pointage[]
  const jours_tt = pointages.filter(p => p.type_journee === 'teletravail').length
  const tt = ttCompteur as TeletravailCompteur | null
  const ttPlafond = tt?.plafond_jours ?? 100
  const ttPct = Math.round((jours_tt / ttPlafond) * 100)

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Gestion du temps</h1>
        <p className="text-sm text-gray-500 mt-0.5">Badgeage et suivi de vos heures</p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mb-4">
        {/* Badgeage */}
        <div className="lg:col-span-1">
          <BadgeageWidget
            profileId={profile.id}
            pointageAujourdhui={pointageAujourdhui as Pointage | null}
          />
        </div>

        {/* Compteurs rapides */}
        <div className="lg:col-span-2 grid grid-cols-2 gap-4 content-start">
          {/* Télétravail */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Télétravail ce mois</p>
            <p className="text-2xl font-semibold text-green-700">{jours_tt}j</p>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden mt-2 mb-1">
              <div className="h-full rounded-full bg-green-500 transition-all" style={{ width: `${Math.min(ttPct, 100)}%` }} />
            </div>
            <p className="text-xs text-gray-400">sur {ttPlafond}j de plafond annuel</p>
          </div>

          {/* Heures sup */}
          <div className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">Heures supplémentaires</p>
            <p className={`text-2xl font-semibold ${(compteur?.heures_sup ?? 0) > 0 ? 'text-amber-600' : 'text-gray-400'}`}>
              {compteur?.heures_sup ? `+${compteur.heures_sup.toFixed(1)}h` : '0h'}
            </p>
            <p className="text-xs text-gray-400 mt-2">Ce mois-ci</p>
          </div>

          {/* Répartition jours */}
          <div className="bg-white border border-gray-200 rounded-xl p-4 col-span-2">
            <p className="text-xs font-medium text-gray-500 mb-3">Répartition ce mois</p>
            <div className="grid grid-cols-4 gap-3">
              {[
                { label: 'Présentiel', val: compteur?.jours_bureau ?? 0, color: '#378ADD' },
                { label: 'Télétravail', val: compteur?.jours_teletravail ?? 0, color: '#1D9E75' },
                { label: 'Déplacement', val: compteur?.jours_deplacement ?? 0, color: '#BA7517' },
                { label: 'Absence', val: compteur?.jours_absence ?? 0, color: '#E24B4A' },
              ].map(item => (
                <div key={item.label} className="text-center">
                  <div className="text-xl font-semibold" style={{ color: item.color }}>{item.val}</div>
                  <div className="text-[11px] text-gray-400 mt-0.5">{item.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Compteur mensuel */}
      <div className="mb-4">
        <CompteurMensuel compteur={compteur as CompteurTemps | null} annee={annee} mois={mois} />
      </div>

      {/* Historique */}
      <HistoriquePointages pointages={pointages} />
    </div>
  )
}
