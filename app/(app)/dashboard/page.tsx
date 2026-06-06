import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'

export default async function DashboardPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles')
    .select('*')
    .eq('user_id', user.id)
    .single()

  if (!profile) redirect('/auth/login')

  const isRH = ['rh', 'admin'].includes(profile.role)

  // Congés
  const { data: conges, count: congesCount } = isRH
    ? await supabase.from('conges').select('*', { count: 'exact' }).eq('statut', 'en_attente').limit(5)
    : await supabase.from('conges').select('*', { count: 'exact' }).eq('user_id', user.id).order('created_at', { ascending: false }).limit(5)

  // Pointages cette semaine
  const lundiDernier = new Date()
  lundiDernier.setDate(lundiDernier.getDate() - lundiDernier.getDay() + 1)
  const { data: pointages } = await supabase
    .from('pointages')
    .select('*')
    .eq('profile_id', profile.id)
    .gte('date', lundiDernier.toISOString().split('T')[0])
    .order('date', { ascending: false })

  // Entretiens à venir
  const { data: entretiens } = await supabase
    .from('entretiens')
    .select('*')
    .eq('profile_id', profile.id)
    .eq('statut', 'planifie')
    .gte('date_prevue', new Date().toISOString().split('T')[0])
    .order('date_prevue', { ascending: true })
    .limit(3)

  // Documents
  const { count: docsCount } = await supabase
    .from('documents')
    .select('*', { count: 'exact', head: true })
    .eq('profile_id', profile.id)

  const heure = new Date().getHours()
  const salut = heure < 12 ? 'Bonjour' : heure < 18 ? 'Bon après-midi' : 'Bonsoir'

  return (
    <div className="p-6 max-w-7xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">
          {salut}, {profile.prenom} 👋
        </h1>
        <p className="text-gray-500 mt-1">
          {new Date().toLocaleDateString('fr-FR', {
            weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
          })}
        </p>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-8">
        <KPICard
          title={isRH ? 'Demandes en attente' : 'Mes congés'}
          value={String(congesCount ?? 0)}
          subtitle={isRH ? 'à traiter' : 'demandes'}
          color="blue"
          icon="🏖"
        />
        <KPICard
          title="Pointages cette semaine"
          value={String(pointages?.length ?? 0)}
          subtitle="jours pointés"
          color="green"
          icon="⏱"
        />
        <KPICard
          title="Documents"
          value={String(docsCount ?? 0)}
          subtitle="dans ma GED"
          color="purple"
          icon="📄"
        />
        <KPICard
          title="Entretiens à venir"
          value={String(entretiens?.length ?? 0)}
          subtitle="planifiés"
          color="orange"
          icon="💬"
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Congés */}
        <div className="lg:col-span-2 bg-white rounded-xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-semibold text-gray-900">
              {isRH ? 'Demandes de congés en attente' : 'Mes dernières demandes de congés'}
            </h2>
            <a href="/conges" className="text-xs text-blue-600 hover:underline">Voir tout →</a>
          </div>
          {!conges || conges.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              <div className="text-4xl mb-3">🎉</div>
              <p className="text-sm">
                {isRH ? 'Aucune demande en attente' : 'Aucune demande en cours'}
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {conges.map((c: any) => (
                <CongeRow key={c.id} conge={c} />
              ))}
            </div>
          )}
        </div>

        {/* Pointages + Entretiens */}
        <div className="space-y-6">
          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Pointages semaine</h2>
              <a href="/temps" className="text-xs text-blue-600 hover:underline">Voir tout →</a>
            </div>
            {!pointages || pointages.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <div className="text-3xl mb-2">📋</div>
                <p className="text-xs">Aucun pointage cette semaine</p>
              </div>
            ) : (
              <div className="space-y-2">
                {pointages.slice(0, 5).map((p: any) => (
                  <PointageRow key={p.id} pointage={p} />
                ))}
              </div>
            )}
          </div>

          <div className="bg-white rounded-xl border border-gray-200 p-5">
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-semibold text-gray-900">Entretiens à venir</h2>
              <a href="/entretiens" className="text-xs text-blue-600 hover:underline">Voir tout →</a>
            </div>
            {!entretiens || entretiens.length === 0 ? (
              <div className="text-center py-6 text-gray-400">
                <div className="text-3xl mb-2">📅</div>
                <p className="text-xs">Aucun entretien planifié</p>
              </div>
            ) : (
              <div className="space-y-2">
                {entretiens.map((e: any) => (
                  <EntretienRow key={e.id} entretien={e} />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Actions rapides */}
      <div className="mt-6 bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="font-semibold text-gray-900 mb-4">Actions rapides</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <QuickAction href="/conges/nouveau" icon="➕" label="Demander un congé" />
          <QuickAction href="/temps" icon="⏱" label="Pointer ma journée" />
          <QuickAction href="/documents" icon="📤" label="Déposer un document" />
          <QuickAction href="/entretiens" icon="💬" label="Mes entretiens" />
        </div>
      </div>
    </div>
  )
}

function KPICard({ title, value, subtitle, color, icon }: {
  title: string; value: string; subtitle: string; color: string; icon: string
}) {
  const colors: Record<string, string> = {
    blue: 'bg-blue-50 border-blue-100',
    green: 'bg-green-50 border-green-100',
    purple: 'bg-purple-50 border-purple-100',
    orange: 'bg-orange-50 border-orange-100',
  }
  const textColors: Record<string, string> = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    purple: 'text-purple-600',
    orange: 'text-orange-600',
  }
  return (
    <div className={`rounded-xl border p-5 ${colors[color]}`}>
      <div className="flex items-center justify-between mb-3">
        <span className="text-sm font-medium text-gray-600">{title}</span>
        <span className="text-xl">{icon}</span>
      </div>
      <div className={`text-3xl font-bold ${textColors[color]} mb-1`}>{value}</div>
      <div className="text-xs text-gray-500">{subtitle}</div>
    </div>
  )
}

function CongeRow({ conge }: { conge: any }) {
  const statusColors: Record<string, string> = {
    en_attente: 'bg-yellow-100 text-yellow-700',
    approuve: 'bg-green-100 text-green-700',
    refuse: 'bg-red-100 text-red-700',
  }
  const statusLabels: Record<string, string> = {
    en_attente: 'En attente',
    approuve: 'Approuvé',
    refuse: 'Refusé',
  }
  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-50 last:border-0">
      <div>
        <p className="text-sm font-medium text-gray-800">{conge.type || 'Congé payé'}</p>
        <p className="text-xs text-gray-500">
          {new Date(conge.date_debut).toLocaleDateString('fr-FR')} → {new Date(conge.date_fin).toLocaleDateString('fr-FR')}
          {conge.nb_jours ? ` · ${conge.nb_jours}j` : ''}
        </p>
      </div>
      <span className={`text-xs px-2 py-1 rounded-full font-medium ${statusColors[conge.statut] || 'bg-gray-100 text-gray-600'}`}>
        {statusLabels[conge.statut] || conge.statut}
      </span>
    </div>
  )
}

function PointageRow({ pointage }: { pointage: any }) {
  const duree = pointage.duree_minutes
    ? `${Math.floor(pointage.duree_minutes / 60)}h${String(pointage.duree_minutes % 60).padStart(2, '0')}`
    : null

  return (
    <div className="flex items-center justify-between py-1.5">
      <div>
        <p className="text-xs font-medium text-gray-700">
          {new Date(pointage.date).toLocaleDateString('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' })}
        </p>
        <p className="text-xs text-gray-500">
          {pointage.heure_entree?.slice(0, 5) || '—'} → {pointage.heure_sortie?.slice(0, 5) || '—'}
        </p>
      </div>
      {duree && (
        <span className={`text-xs font-semibold ${pointage.duree_minutes >= 420 ? 'text-green-600' : 'text-orange-500'}`}>
          {duree}
        </span>
      )}
    </div>
  )
}

function EntretienRow({ entretien }: { entretien: any }) {
  const typeLabels: Record<string, string> = {
    annuel: 'Entretien annuel',
    professionnel: 'Entretien pro',
    mi_annuel: 'Mi-annuel',
    objectifs: 'Objectifs',
  }
  return (
    <div className="py-2 border-b border-gray-50 last:border-0">
      <p className="text-xs font-medium text-gray-700">
        {typeLabels[entretien.type_code] || entretien.type_code || 'Entretien'}
      </p>
      <p className="text-xs text-gray-500">
        {entretien.date_prevue
          ? new Date(entretien.date_prevue).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' })
          : 'Date à définir'}
        {entretien.heure_prevue ? ` à ${entretien.heure_prevue.slice(0, 5)}` : ''}
        {entretien.lieu ? ` · ${entretien.lieu}` : ''}
      </p>
    </div>
  )
}

function QuickAction({ href, icon, label }: { href: string; icon: string; label: string }) {
  return (
    
      href={href}
      className="flex flex-col items-center gap-2 p-4 rounded-lg border border-gray-200 hover:border-blue-300 hover:bg-blue-50 transition-colors text-center group"
    >
      <span className="text-2xl">{icon}</span>
      <span className="text-xs font-medium text-gray-600 group-hover:text-blue-600">{label}</span>
    </a>
  )
}
