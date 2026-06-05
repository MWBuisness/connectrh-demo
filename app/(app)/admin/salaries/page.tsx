import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { getAnciennete, getInitials, roleLabel, formatDate } from '@/lib/utils'
import type { UserProfile } from '@/lib/types'

export default async function SalariesPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: me } = await supabase.from('profiles').select('role').eq('user_id', user.id).single()
  if (!me || (me.role !== 'rh_admin' && me.role !== 'responsable')) redirect('/dashboard')

  const { data: salaries } = await supabase
    .from('profiles')
    .select('*')
    .order('nom')

  const list = (salaries ?? []) as UserProfile[]

  const stats = {
    total: list.length,
    cdi: list.filter(s => s.type_contrat === 'CDI').length,
    services: [...new Set(list.map(s => s.departement).filter(Boolean))].length,
  }

  return (
    <div className="p-6 max-w-6xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Collaborateurs</h1>
          <p className="text-sm text-gray-500 mt-0.5">{stats.total} collaborateurs · {stats.services} services</p>
        </div>
        {me.role === 'rh_admin' && (
          <Link href="/admin/inviter"
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
            </svg>
            Inviter un salarié
          </Link>
        )}
      </div>

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-6">
        {[
          { label: 'Total collaborateurs', value: stats.total },
          { label: 'CDI', value: stats.cdi },
          { label: 'Services', value: stats.services },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className="text-2xl font-semibold text-gray-900">{s.value}</p>
          </div>
        ))}
      </div>

      {/* Table */}
      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        {list.length === 0 ? (
          <div className="text-center py-16 text-gray-400">
            <svg className="w-12 h-12 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
            <p className="text-sm">Aucun collaborateur pour l'instant</p>
            <Link href="/admin/inviter" className="text-blue-600 text-sm hover:underline mt-1 inline-block">Inviter le premier salarié</Link>
          </div>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-gray-100">
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Collaborateur</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Poste</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Service</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Contrat</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Ancienneté</th>
                <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Rôle</th>
                {me.role === 'rh_admin' && <th className="text-left px-4 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Action</th>}
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {list.map(s => (
                <tr key={s.id} className="hover:bg-gray-50 transition-colors">
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center text-xs font-medium flex-shrink-0">
                        {getInitials(s.prenom || '?', s.nom || '?')}
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">{s.prenom} {s.nom}</p>
                        <p className="text-xs text-gray-400">{s.email}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-gray-600">{s.poste || '—'}</td>
                  <td className="px-4 py-3 text-gray-600">{s.departement || '—'}</td>
                  <td className="px-4 py-3">
                    <span className="inline-flex px-2 py-0.5 rounded-full text-xs font-medium bg-blue-50 text-blue-700">
                      {s.type_contrat}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-gray-500 text-xs">{getAnciennete(s.date_entree)}</td>
                  <td className="px-4 py-3">
                    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium
                      ${s.role === 'rh_admin' ? 'bg-purple-50 text-purple-700' :
                        s.role === 'responsable' ? 'bg-amber-50 text-amber-700' :
                        'bg-gray-100 text-gray-600'}`}>
                      {roleLabel(s.role)}
                    </span>
                  </td>
                  {me.role === 'rh_admin' && (
                    <td className="px-4 py-3">
                      <Link href={`/admin/salaries/${s.id}`}
                        className="text-blue-600 hover:text-blue-800 text-xs font-medium">
                        Modifier
                      </Link>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  )
}
