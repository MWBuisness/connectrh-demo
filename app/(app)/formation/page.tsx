import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import FormationSalarieClient from '@/components/formation/FormationSalarieClient'
import type { DemandeFormation, FormationCatalogue, CpfCompteur, AlerteFormation } from '@/lib/types-formation'

export default async function FormationPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('id, prenom, nom').eq('user_id', user.id).single()
  if (!profile) redirect('/auth/login')

  const [{ data: demandes }, { data: catalogue }, { data: cpf }, { data: alertes }] = await Promise.all([
    supabase.from('demandes_formation').select('*, formation:formations_catalogue(*)').eq('profile_id', profile.id).order('created_at', { ascending: false }),
    supabase.from('formations_catalogue').select('*').eq('actif', true).order('categorie'),
    supabase.from('cpf_compteurs').select('*').eq('profile_id', profile.id).maybeSingle(),
    supabase.from('alertes_formation').select('*').eq('profile_id', profile.id).eq('lue', false).order('echeance'),
  ])

  const planActuel = await supabase.from('plans_formation').select('id').eq('annee', new Date().getFullYear()).maybeSingle()

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Mes formations</h1>
        <p className="text-sm text-gray-500 mt-0.5">Plan de développement · CPF · Demandes</p>
      </div>
      <FormationSalarieClient
        demandes={(demandes ?? []) as DemandeFormation[]}
        catalogue={(catalogue ?? []) as FormationCatalogue[]}
        cpf={cpf as CpfCompteur | null}
        alertes={(alertes ?? []) as AlerteFormation[]}
        profileId={profile.id}
        planId={planActuel.data?.id}
      />
    </div>
  )
}
