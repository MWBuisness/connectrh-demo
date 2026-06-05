import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminOnboardingClient from '@/components/onboarding/AdminOnboardingClient'

export default async function AdminOnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: me } = await supabase.from('profiles').select('role, id').eq('user_id', user.id).single()
  if (!me || !['rh_admin', 'responsable'].includes(me.role)) redirect('/dashboard')

  const { data: profiles } = await supabase
    .from('profiles').select('id, prenom, nom, poste, departement, date_entree').order('nom')

  const { data: dossiers } = await supabase
    .from('dossiers_onboarding')
    .select('*, profile:profile_id(prenom,nom,poste,departement), template:templates_onboarding(nom)')
    .order('created_at', { ascending: false })

  const { data: templates } = await supabase
    .from('templates_onboarding').select('*').order('nom')

  const { data: attributions } = await supabase
    .from('attributions_materiel')
    .select('*, materiel:materiels(libelle,type_code,type:types_materiel(label,couleur)), profile:profile_id(prenom,nom)')
    .order('created_at', { ascending: false }).limit(30)

  const { data: materiels } = await supabase
    .from('materiels').select('*, type:types_materiel(*)').order('type_code')

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Onboarding & Matériel</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gestion des intégrations, offboardings et parc matériel</p>
      </div>
      <AdminOnboardingClient
        profiles={profiles ?? []}
        dossiers={dossiers ?? []}
        templates={templates ?? []}
        attributions={attributions ?? []}
        materiels={materiels ?? []}
        adminId={me.id}
      />
    </div>
  )
}
