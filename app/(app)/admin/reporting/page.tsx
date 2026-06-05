import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import ReportingDashboard from '@/components/reporting/ReportingDashboard'

export default async function ReportingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: me } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).single()
  if (!me || me.role !== 'rh_admin') redirect('/dashboard')

  const annee = new Date().getFullYear()

  const [
    { data: profiles },
    { data: demandes },
    { data: entretiens },
    { data: formations },
  ] = await Promise.all([
    supabase.from('profiles').select('*').order('nom'),
    supabase.from('demandes_conges').select('*, profile:profile_id(prenom,nom,departement)').order('created_at', { ascending: false }),
    supabase.from('entretiens').select('*, type:types_entretien(*), profile:profile_id(prenom,nom,poste,departement)').order('created_at', { ascending: false }),
    supabase.from('demandes_formation').select('*, formation:formations_catalogue(*), profile:profile_id(prenom,nom,departement)').order('created_at', { ascending: false }),
  ])

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Reporting RH & BDES</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Tableaux de bord · Index Egapro · Bilan social · Exports CSE — {annee}
          </p>
        </div>
        <div className="flex items-center gap-2 bg-green-50 border border-green-200 rounded-lg px-3 py-2">
          <span className="w-2 h-2 rounded-full bg-green-500"></span>
          <span className="text-xs font-medium text-green-700">Données temps réel</span>
        </div>
      </div>

      <ReportingDashboard
        profiles={profiles ?? []}
        demandes={demandes ?? []}
        entretiens={entretiens ?? []}
        formations={formations ?? []}
        annee={annee}
      />
    </div>
  )
}
