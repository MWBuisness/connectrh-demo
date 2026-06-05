'use client'
import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import type { DemandeConges } from '@/lib/types-conges'

interface Props {
  demande: DemandeConges
  valideurId: string
}

export default function ValidationActions({ demande, valideurId }: Props) {
  const [commentaire, setCommentaire] = useState('')
  const [showComment, setShowComment] = useState(false)
  const [loading, setLoading] = useState<'valider' | 'refuser' | null>(null)
  const router = useRouter()
  const supabase = createClient()

  async function traiter(action: 'valider' | 'refuser') {
    setLoading(action)
    const statut = action === 'valider' ? 'validee' : 'refusee'
    const now = new Date().toISOString()

    const { error } = await supabase
      .from('demandes_conges')
      .update({
        statut,
        validee_par: valideurId,
        validee_le: now,
        commentaire_valid: commentaire || null,
        // Transmission SILAE automatique si validée
        ...(action === 'valider' ? {
          silae_transmis: true,
          silae_transmis_le: now,
          silae_reference: `SILAE-${Date.now()}`,
        } : {}),
      })
      .eq('id', demande.id)

    if (!error) {
      // Mettre à jour les soldes
      if (action === 'valider') {
        // Déduire du solde_pris, retirer du solde_en_cours
        const { data: solde } = await supabase
          .from('soldes_conges')
          .select('*')
          .eq('profile_id', demande.profile_id)
          .eq('type_code', demande.type_code)
          .eq('annee', new Date(demande.date_debut).getFullYear())
          .single()

        if (solde) {
          await supabase.from('soldes_conges').update({
            solde_pris: solde.solde_pris + demande.nb_jours,
            solde_en_cours: Math.max(0, solde.solde_en_cours - demande.nb_jours),
          }).eq('id', solde.id)
        }
      } else {
        // Refus : libérer le solde_en_cours
        const { data: solde } = await supabase
          .from('soldes_conges')
          .select('*')
          .eq('profile_id', demande.profile_id)
          .eq('type_code', demande.type_code)
          .eq('annee', new Date(demande.date_debut).getFullYear())
          .single()

        if (solde) {
          await supabase.from('soldes_conges').update({
            solde_en_cours: Math.max(0, solde.solde_en_cours - demande.nb_jours),
          }).eq('id', solde.id)
        }
      }
    }

    setLoading(null)
    router.refresh()
  }

  return (
    <div className="space-y-2">
      {showComment && (
        <textarea
          value={commentaire}
          onChange={e => setCommentaire(e.target.value)}
          placeholder="Commentaire pour le salarié (optionnel)…"
          rows={2}
          className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
        />
      )}
      <div className="flex items-center gap-2 flex-wrap">
        <button
          onClick={() => traiter('valider')}
          disabled={!!loading}
          className="flex items-center gap-1.5 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
          </svg>
          {loading === 'valider' ? 'Validation…' : 'Valider'}
        </button>
        <button
          onClick={() => traiter('refuser')}
          disabled={!!loading}
          className="flex items-center gap-1.5 border border-red-300 text-red-600 hover:bg-red-50 disabled:opacity-50 text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
          {loading === 'refuser' ? 'Refus…' : 'Refuser'}
        </button>
        <button
          onClick={() => setShowComment(v => !v)}
          className="text-sm text-gray-400 hover:text-gray-600 underline transition"
        >
          {showComment ? 'Masquer commentaire' : 'Ajouter un commentaire'}
        </button>
        {!showComment && (
          <span className="text-[11px] text-green-600 flex items-center gap-1 ml-auto">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
            </svg>
            Validation → SILAE automatiquement
          </span>
        )}
      </div>
    </div>
  )
}
