import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import SilaeAdminClient from '@/components/silae/SilaeAdminClient'

export default async function AdminSilaePage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: me } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).single()
  if (!me || me.role !== 'rh_admin') redirect('/dashboard')

  const now = new Date()
  const annee = now.getFullYear()
  const mois = now.getMonth() + 1

  // Congés en attente de transmission SILAE
  const { data: congesNonTransmis } = await supabase
    .from('demandes_conges')
    .select('*, profile:profile_id(prenom, nom, poste)')
    .eq('statut', 'validee')
    .eq('silae_transmis', false)
    .order('created_at', { ascending: false })

  // Compteurs temps non transmis du mois en cours
  const { data: compteursNonTransmis } = await supabase
    .from('compteurs_temps')
    .select('*, profile:profile_id(prenom, nom, poste, departement)')
    .eq('annee', annee)
    .eq('mois', mois)
    .eq('silae_transmis', false)
    .gt('heures_sup', 0)

  // Stats globales transmissions
  const { data: statsConges } = await supabase
    .from('demandes_conges')
    .select('silae_transmis, created_at')
    .eq('statut', 'validee')

  const { data: statsCompteurs } = await supabase
    .from('compteurs_temps')
    .select('silae_transmis, annee, mois')
    .eq('annee', annee)
    .eq('mois', mois)

  const totalCongesTransmis = (statsConges ?? []).filter(c => c.silae_transmis).length
  const totalCongesEnAttente = (statsConges ?? []).filter(c => !c.silae_transmis).length
  const totalCompteursTransmis = (statsCompteurs ?? []).filter(c => c.silae_transmis).length
  const totalCompteursEnAttente = (statsCompteurs ?? []).filter(c => !c.silae_transmis).length

  return (
    <SilaeAdminClient
      congesNonTransmis={(congesNonTransmis ?? []) as any[]}
      compteursNonTransmis={(compteursNonTransmis ?? []) as any[]}
      stats={{
        congesTransmis: totalCongesTransmis,
        congesEnAttente: totalCongesEnAttente,
        compteursTransmis: totalCompteursTransmis,
        compteursEnAttente: totalCompteursEnAttente,
      }}
      mois={mois}
      annee={annee}
    />
  )
}
