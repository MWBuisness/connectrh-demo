import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import NouvelleDemandeForm from '@/components/conges/NouvelleDemandeForm'
import type { TypeAbsence, SoldeConges, JourFerie } from '@/lib/types-conges'

export default async function NouvelleCongesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('id').eq('user_id', user.id).single()
  if (!profile) redirect('/auth/login')

  const { data: types } = await supabase
    .from('types_absence').select('*').order('ordre')

  const { data: soldes } = await supabase
    .from('soldes_conges')
    .select('*, type:types_absence(*)')
    .eq('profile_id', profile.id)
    .eq('annee', new Date().getFullYear())

  const { data: feries } = await supabase
    .from('jours_feries').select('*')
    .gte('date', `${new Date().getFullYear()}-01-01`)

  return (
    <NouvelleDemandeForm
      profileId={profile.id}
      types={(types ?? []) as TypeAbsence[]}
      soldes={(soldes ?? []) as SoldeConges[]}
      feries={(feries ?? []) as JourFerie[]}
    />
  )
}
