import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import AdminEntretiensClient from '@/components/entretiens/AdminEntretiensClient'

export default async function AdminEntretiensPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: me } = await supabase
    .from('profiles').select('role').eq('user_id', user.id).single()
  if (!me || !['rh_admin', 'responsable'].includes(me.role)) redirect('/dashboard')

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Entretiens & Évaluations</h1>
        <p className="text-sm text-gray-500 mt-0.5">Gestion des entretiens · Alertes légales · Campagnes</p>
      </div>
      <AdminEntretiensClient />
    </div>
  )
}
