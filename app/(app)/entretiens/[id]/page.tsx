import { createClient } from '@/lib/supabase/server'
import { redirect, notFound } from 'next/navigation'
import EntretienForm from '@/components/entretiens/EntretienForm'
import type { Entretien, CompetenceReferentiel } from '@/lib/types-entretiens'

export default async function EntretienPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: myProfile } = await supabase
    .from('profiles').select('id, role').eq('user_id', user.id).single()
  if (!myProfile) redirect('/auth/login')

  const { data: entretien } = await supabase
    .from('entretiens')
    .select('*, type:types_entretien(*), profile:profile_id(prenom,nom,poste,departement,date_entree), manager:manager_id(prenom,nom)')
    .eq('id', id)
    .single()

  if (!entretien) notFound()

  const { data: competencesRef } = await supabase
    .from('competences_referentiel').select('*').order('ordre')

  const isManager = myProfile.id === entretien.manager_id || myProfile.role === 'rh_admin'

  return (
    <div className="p-6 max-w-5xl mx-auto">
      <EntretienForm
        entretien={entretien as Entretien}
        currentProfileId={myProfile.id}
        currentRole={myProfile.role}
        competencesRef={(competencesRef ?? []) as CompetenceReferentiel[]}
        isManager={isManager}
      />
    </div>
  )
}
