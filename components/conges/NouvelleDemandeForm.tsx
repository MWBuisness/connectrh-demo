'use client'
import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { calculerJoursOuvres, feriesSet, formatDateFR } from '@/lib/conges-utils'
import type { TypeAbsence, SoldeConges, JourFerie } from '@/lib/types-conges'

interface Props {
  profileId: string
  types: TypeAbsence[]
  soldes: SoldeConges[]
  feries: JourFerie[]
}

export default function NouvelleDemandeForm({ profileId, types, soldes, feries }: Props) {
  const router = useRouter()
  const supabase = createClient()
  const ferSet = feriesSet(feries)

  const [typeCode, setTypeCode] = useState('CP')
  const [dateDebut, setDateDebut] = useState('')
  const [dateFin, setDateFin] = useState('')
  const [motif, setMotif] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [nbJours, setNbJours] = useState(0)

  useEffect(() => {
    if (dateDebut && dateFin && dateFin >= dateDebut) {
      setNbJours(calculerJoursOuvres(new Date(dateDebut), new Date(dateFin), ferSet))
    } else {
      setNbJours(0)
    }
  }, [dateDebut, dateFin])

  const solde = soldes.find(s => s.type_code === typeCode)
  const soldeDisponible = solde ? solde.solde_acquis - solde.solde_pris - solde.solde_en_cours : null
  const typeSelected = types.find(t => t.code === typeCode)
  const depasseSolde = typeSelected?.decompte && soldeDisponible !== null && nbJours > soldeDisponible

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!dateDebut || !dateFin || nbJours === 0) {
      setError('Veuillez sélectionner des dates valides.')
      return
    }
    if (depasseSolde) {
      setError(`Solde insuffisant. Disponible : ${soldeDisponible} jour(s).`)
      return
    }
    setLoading(true)
    setError('')

    const { error: err } = await supabase.from('demandes_conges').insert({
      profile_id: profileId,
      type_code: typeCode,
      date_debut: dateDebut,
      date_fin: dateFin,
      nb_jours: nbJours,
      motif: motif || null,
      statut: 'en_attente',
    })

    if (err) {
      setError(err.message)
      setLoading(false)
      return
    }

    // Mettre à jour solde_en_cours
    if (solde) {
      await supabase.from('soldes_conges')
        .update({ solde_en_cours: (solde.solde_en_cours + nbJours) })
        .eq('id', solde.id)
    }

    router.push('/conges?success=1')
    router.refresh()
  }

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <button onClick={() => router.back()} className="text-gray-400 hover:text-gray-600 transition">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
        </button>
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Nouvelle demande d'absence</h1>
          <p className="text-sm text-gray-500 mt-0.5">La demande sera soumise à votre responsable</p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Type */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-medium text-gray-900 mb-3">Type d'absence</h2>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-3">
            {types.map(t => (
              <button
                key={t.code}
                type="button"
                onClick={() => setTypeCode(t.code)}
                className={`flex items-center gap-2 px-3 py-2.5 rounded-lg border text-sm text-left transition ${
                  typeCode === t.code
                    ? 'border-2 font-medium'
                    : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
                style={typeCode === t.code ? { borderColor: t.couleur, color: t.couleur, backgroundColor: t.couleur + '10' } : {}}
              >
                <span
                  className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                  style={{ backgroundColor: t.couleur }}
                />
                {t.label}
              </button>
            ))}
          </div>

          {/* Solde disponible */}
          {soldeDisponible !== null && typeSelected?.decompte && (
            <div className={`mt-3 px-3 py-2 rounded-lg text-sm flex items-center gap-2 ${
              depasseSolde ? 'bg-red-50 text-red-700' : 'bg-blue-50 text-blue-700'
            }`}>
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Solde disponible : <strong>{soldeDisponible} jour(s)</strong>
              {nbJours > 0 && ` → après cette demande : ${(soldeDisponible - nbJours).toFixed(1)} j`}
            </div>
          )}
        </div>

        {/* Dates */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-medium text-gray-900 mb-3">Période</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date de début *</label>
              <input
                type="date"
                required
                value={dateDebut}
                min={new Date().toISOString().split('T')[0]}
                onChange={e => setDateDebut(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date de fin *</label>
              <input
                type="date"
                required
                value={dateFin}
                min={dateDebut || new Date().toISOString().split('T')[0]}
                onChange={e => setDateFin(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {/* Résumé jours */}
          {nbJours > 0 && (
            <div className="mt-3 bg-gray-50 rounded-lg px-4 py-3 flex items-center justify-between">
              <div className="text-sm text-gray-600">
                {formatDateFR(dateDebut)} → {formatDateFR(dateFin)}
              </div>
              <div className="text-sm font-semibold text-gray-900 flex items-center gap-1">
                <span
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: typeSelected?.couleur ?? '#378ADD' }}
                />
                {nbJours} jour{nbJours > 1 ? 's' : ''} ouvré{nbJours > 1 ? 's' : ''}
              </div>
            </div>
          )}
        </div>

        {/* Motif */}
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h2 className="text-sm font-medium text-gray-900 mb-3">Motif <span className="font-normal text-gray-400">(optionnel)</span></h2>
          <textarea
            value={motif}
            onChange={e => setMotif(e.target.value)}
            rows={2}
            placeholder="Ex : vacances d'été, rendez-vous médical…"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
          />
        </div>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">
            {error}
          </div>
        )}

        <div className="flex gap-3">
          <button
            type="submit"
            disabled={loading || nbJours === 0 || !!depasseSolde}
            className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
            </svg>
            {loading ? 'Envoi en cours…' : 'Soumettre la demande'}
          </button>
          <button
            type="button"
            onClick={() => router.back()}
            className="px-5 py-2.5 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition"
          >
            Annuler
          </button>
        </div>

        <p className="text-xs text-gray-400 text-center">
          Votre responsable recevra une notification et devra valider la demande.
          Une fois validée, elle sera automatiquement transmise à SILAE.
        </p>
      </form>
    </div>
  )
}
