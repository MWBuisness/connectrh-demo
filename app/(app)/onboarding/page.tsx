import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import OnboardingChecklist from '@/components/onboarding/OnboardingChecklist'
import MaterielSalarieClient from '@/components/onboarding/MaterielSalarieClient'
import type { DossierOnboarding, AttributionMateriel } from '@/lib/types-onboarding'

export default async function OnboardingPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('id, prenom, nom, poste').eq('user_id', user.id).single()
  if (!profile) redirect('/auth/login')

  const { data: dossier } = await supabase
    .from('dossiers_onboarding')
    .select('*, template:templates_onboarding(*)')
    .eq('profile_id', profile.id)
    .eq('type', 'onboarding')
    .maybeSingle()

  const { data: attributions } = await supabase
    .from('attributions_materiel')
    .select('*, materiel:materiels(*, type:types_materiel(*))')
    .eq('profile_id', profile.id)
    .eq('statut', 'actif')

  const nomComplet = `${profile.prenom} ${profile.nom}`

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Mon intégration</h1>
        <p className="text-sm text-gray-500 mt-0.5">Checklist d'onboarding et matériel attribué</p>
      </div>

      {dossier ? (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
          <div className="lg:col-span-2">
            <div className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
              <h2 className="text-sm font-medium text-gray-900 mb-4">Checklist d'intégration</h2>
              <OnboardingChecklist dossier={dossier as DossierOnboarding} />
            </div>
          </div>

          <div>
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h2 className="text-sm font-medium text-gray-900 mb-4">Mon matériel</h2>
              {(attributions?.length ?? 0) === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">Aucun matériel attribué</p>
              ) : (
                <MaterielSalarieClient
                  attributions={(attributions ?? []) as AttributionMateriel[]}
                  nomSalarie={nomComplet}
                />
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl p-12 text-center">
          <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
          </svg>
          <p className="text-sm text-gray-500">Aucun dossier d'intégration ouvert</p>
          <p className="text-xs text-gray-400 mt-1">Votre responsable RH ouvrira votre dossier à votre arrivée</p>
        </div>
      )}
    </div>
  )
}
