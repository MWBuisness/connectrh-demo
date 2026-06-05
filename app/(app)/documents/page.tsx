import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import CoffreFortClient from '@/components/documents/CoffreFortClient'
import type { Document } from '@/lib/types-documents'

export default async function DocumentsPage() {
  const supabase = await createClient()
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) redirect('/auth/login')

  const { data: profile } = await supabase
    .from('profiles').select('id, prenom, nom').eq('user_id', user.id).single()
  if (!profile) redirect('/auth/login')

  const { data: docs } = await supabase
    .from('documents')
    .select('*, categorie:categories_document(*)')
    .eq('profile_id', profile.id)
    .eq('visible_salarie', true)
    .order('created_at', { ascending: false })

  const documents = (docs ?? []) as Document[]
  const nomComplet = `${profile.prenom} ${profile.nom}`

  const stats = {
    total: documents.length,
    bulletins: documents.filter(d => d.categorie_code === 'BULLETIN').length,
    aSignerCount: documents.filter(d => d.signature_requise && !d.signe).length,
    signes: documents.filter(d => d.signe).length,
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Mon coffre-fort</h1>
        <p className="text-sm text-gray-500 mt-0.5">Documents sécurisés · Archivage légal · Signature électronique</p>
      </div>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
        {[
          { label: 'Total documents', value: stats.total, color: 'text-gray-900' },
          { label: 'Bulletins de paie', value: stats.bulletins, color: 'text-green-600' },
          { label: 'Documents signés', value: stats.signes, color: 'text-blue-600' },
          { label: 'À signer', value: stats.aSignerCount, color: stats.aSignerCount > 0 ? 'text-amber-600' : 'text-gray-400' },
        ].map(s => (
          <div key={s.label} className="bg-white border border-gray-200 rounded-xl p-4">
            <p className="text-xs text-gray-500 mb-1">{s.label}</p>
            <p className={`text-2xl font-semibold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Bandeau sécurité */}
      <div className="bg-blue-50 border border-blue-200 rounded-xl px-4 py-3 flex items-center gap-3 mb-6">
        <svg className="w-5 h-5 text-blue-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
        </svg>
        <p className="text-xs text-blue-700">
          Vos documents sont chiffrés et hébergés en Europe. Les bulletins de paie sont conservés 50 ans conformément à la loi. Accès sécurisé par URL temporaire (5 min).
        </p>
      </div>

      <CoffreFortClient
        documents={documents}
        profileId={profile.id}
        nomComplet={nomComplet}
      />
    </div>
  )
}
