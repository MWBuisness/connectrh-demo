import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { getAnciennete, formatDate } from '@/lib/utils'
import type { UserProfile } from '@/lib/types'
import DashboardAdmin from '@/components/dashboard/DashboardAdmin'
import DashboardResponsable from '@/components/dashboard/DashboardResponsable'
import DashboardSalarie from '@/components/dashboard/DashboardSalarie'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('*').eq('user_id', user.id).single()
  if (!profile) redirect('/auth/login')

  const p = profile as UserProfile
  const now = new Date()
  const annee = now.getFullYear()
  const mois  = now.getMonth() + 1

  // ── Données communes ─────────────────────────────────────
  const { data: soldes } = await supabase
    .from('soldes_conges')
    .select('*')
    .eq('profile_id', p.id)
    .eq('annee', annee)

  const { data: pointageAujourdhui } = await supabase
    .from('pointages')
    .select('*')
    .eq('profile_id', p.id)
    .eq('date', now.toISOString().split('T')[0])
    .maybeSingle()

  const { data: demandesEnCours } = await supabase
    .from('demandes_conges')
    .select('*')
    .eq('profile_id', p.id)
    .in('statut', ['en_attente', 'validee'])
    .gte('date_fin', now.toISOString().split('T')[0])
    .order('date_debut')
    .limit(3)

  // ── Admin RH ─────────────────────────────────────────────
  if (p.role === 'rh_admin') {
    const [
      { count: totalSalaries },
      { data: demandesAttente },
      { data: alertesMed },
      { data: compteurs },
      { data: congesNonTransmis },
      { data: entretiensAVenir },
    ] = await Promise.all([
      supabase.from('profiles').select('*', { count: 'exact', head: true }),
      supabase.from('demandes_conges').select('*, profile:profile_id(prenom,nom,poste)').eq('statut', 'en_attente').order('created_at').limit(5),
      supabase.from('alertes_medicales').select('*, profile:profile_id(prenom,nom)').eq('lue', false).in('urgence', ['haute','critique']).limit(4),
      supabase.from('compteurs_temps').select('heures_sup').eq('annee', annee).eq('mois', mois).eq('silae_transmis', false),
      supabase.from('demandes_conges').select('id').eq('statut', 'validee').eq('silae_transmis', false),
      supabase.from('entretiens').select('*, profile:profile_id(prenom,nom)').eq('statut','planifie').gte('date_prevue', now.toISOString().split('T')[0]).order('date_prevue').limit(4),
    ])

    const totalHSup = (compteurs ?? []).reduce((s, c) => s + (c.heures_sup ?? 0), 0)

    return <DashboardAdmin
      profile={p}
      stats={{
        totalSalaries: totalSalaries ?? 0,
        demandesAttente: (demandesAttente ?? []).length,
        alertesMedicales: (alertesMed ?? []).length,
        hSuperATransmettre: totalHSup,
        congesATransmettre: (congesNonTransmis ?? []).length,
      }}
      demandesAttente={(demandesAttente ?? []) as any[]}
      alertesMedicales={(alertesMed ?? []) as any[]}
      entretiensAVenir={(entretiensAVenir ?? []) as any[]}
    />
  }

  // ── Responsable ──────────────────────────────────────────
  if (p.role === 'responsable') {
    const [
      { data: equipe },
      { data: demandesEquipe },
      { data: pointagesEquipe },
    ] = await Promise.all([
      supabase.from('profiles').select('*').eq('responsable_id', p.id),
      supabase.from('demandes_conges')
        .select('*, profile:profile_id(prenom,nom,poste)')
        .eq('statut', 'en_attente')
        .in('profile_id', (await supabase.from('profiles').select('id').eq('responsable_id', p.id)).data?.map(e => e.id) ?? [])
        .limit(5),
      supabase.from('pointages')
        .select('*, profile:profile_id(prenom,nom)')
        .eq('date', now.toISOString().split('T')[0])
        .in('profile_id', (await supabase.from('profiles').select('id').eq('responsable_id', p.id)).data?.map(e => e.id) ?? []),
    ])

    return <DashboardResponsable
      profile={p}
      equipe={(equipe ?? []) as UserProfile[]}
      demandesAttente={(demandesEquipe ?? []) as any[]}
      pointagesAujourdhui={(pointagesEquipe ?? []) as any[]}
      soldes={soldes ?? []}
    />
  }

  // ── Salarié ──────────────────────────────────────────────
  const { data: entretiens } = await supabase
    .from('entretiens')
    .select('*')
    .eq('profile_id', p.id)
    .order('created_at', { ascending: false })
    .limit(3)

  const { data: compteurMois } = await supabase
    .from('compteurs_temps')
    .select('*')
    .eq('profile_id', p.id)
    .eq('annee', annee)
    .eq('mois', mois)
    .maybeSingle()

  return <DashboardSalarie
    profile={p}
    soldes={soldes ?? []}
    pointageAujourdhui={pointageAujourdhui as any}
    demandesEnCours={(demandesEnCours ?? []) as any[]}
    entretiens={(entretiens ?? []) as any[]}
    compteurMois={compteurMois as any}
  />
}
