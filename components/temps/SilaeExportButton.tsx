'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { silae } from '@/lib/silae'
import { useRouter } from 'next/navigation'

interface Props { mois: number; annee: number; count: number; compteurs?: any[] }

export default function SilaeExportButton({ mois, annee, count, compteurs = [] }: Props) {
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)
  const [erreur, setErreur] = useState('')
  const router = useRouter()
  const supabase = createClient()

  async function exporterSilae() {
    setLoading(true)
    setErreur('')

    // Construire les variables à partir des compteurs
    const variables = compteurs.flatMap(c => {
      const matricule = `MAT-${c.profile_id?.slice(0, 6).toUpperCase()}`
      const vars = []
      if ((c.heures_sup ?? 0) > 0) vars.push({ matricule, mois, annee, codeRubrique: 'HSUP', libelle: 'Heures supplémentaires', valeur: c.heures_sup, unite: 'heures' as const })
      if ((c.heures_recup ?? 0) > 0) vars.push({ matricule, mois, annee, codeRubrique: 'RECUP', libelle: 'Récupérations', valeur: c.heures_recup, unite: 'heures' as const })
      return vars
    })

    const res = variables.length > 0
      ? await silae.transmettreVariablesBatch(variables)
      : { ok: true }

    if (!res.ok && 'erreur' in res) {
      setErreur(res.erreur ?? 'Erreur SILAE')
      setLoading(false)
      return
    }

    // Marquer en base
    const now = new Date().toISOString()
    await supabase
      .from('compteurs_temps')
      .update({ silae_transmis: true, silae_transmis_le: now })
      .eq('annee', annee)
      .eq('mois', mois)
      .eq('silae_transmis', false)

    setLoading(false)
    setDone(true)
    setTimeout(() => { setDone(false); router.refresh() }, 3000)
  }

  return (
    <div className="flex flex-col items-end gap-1">
      <button
        onClick={exporterSilae}
        disabled={loading || done || count === 0}
        className={`flex items-center gap-2 text-sm font-medium px-4 py-2 rounded-lg transition ${
          done ? 'bg-green-600 text-white'
          : count === 0 ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
          : 'bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white'
        }`}
      >
        <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
            d={done ? "M5 13l4 4L19 7" : "M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4"} />
        </svg>
        {done ? 'Transmis à SILAE !'
          : loading ? 'Transmission…'
          : count === 0 ? 'Tout est à jour'
          : `Transmettre ${count} salarié${count > 1 ? 's' : ''} à SILAE`}
      </button>
      {erreur && <p className="text-xs text-red-600">{erreur}</p>}
    </div>
  )
}
