'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { DossierOnboarding, TacheFaite } from '@/lib/types-onboarding'

interface Props { dossier: DossierOnboarding; readonly?: boolean }

const RESPONSABLE_LABELS: Record<string, string> = {
  rh: 'RH', manager: 'Responsable', it: 'IT', salarie: 'Salarié'
}
const RESPONSABLE_COLORS: Record<string, string> = {
  rh: 'bg-blue-50 text-blue-700', manager: 'bg-amber-50 text-amber-700',
  it: 'bg-purple-50 text-purple-700', salarie: 'bg-green-50 text-green-700'
}

export default function OnboardingChecklist({ dossier, readonly }: Props) {
  const [tachesFaites, setTachesFaites] = useState<TacheFaite[]>(dossier.taches_faites ?? [])
  const [saving, setSaving] = useState<string | null>(null)
  const router = useRouter()
  const supabase = createClient()

  const etapes = dossier.template?.etapes ?? []
  const totalTaches = etapes.flatMap(e => e.taches).length
  const nbFaites = tachesFaites.length
  const progression = totalTaches > 0 ? Math.round((nbFaites / totalTaches) * 100) : 0

  function isFaite(id: string) { return tachesFaites.some(t => t.id === id) }

  async function toggleTache(id: string) {
    if (readonly) return
    setSaving(id)
    const now = new Date().toISOString()
    let newTaches: TacheFaite[]
    if (isFaite(id)) {
      newTaches = tachesFaites.filter(t => t.id !== id)
    } else {
      newTaches = [...tachesFaites, { id, fait_le: now, fait_par: 'current_user' }]
    }
    const newProg = totalTaches > 0 ? Math.round((newTaches.length / totalTaches) * 100) : 0
    await supabase.from('dossiers_onboarding').update({
      taches_faites: newTaches,
      progression: newProg,
      statut: newProg === 100 ? 'complete' : 'en_cours',
    }).eq('id', dossier.id)
    setTachesFaites(newTaches)
    setSaving(null)
    router.refresh()
  }

  return (
    <div>
      {/* Progression */}
      <div className="mb-5">
        <div className="flex items-center justify-between text-sm mb-2">
          <span className="font-medium text-gray-700">Progression globale</span>
          <span className={`font-semibold ${progression === 100 ? 'text-green-600' : 'text-blue-600'}`}>{progression}%</span>
        </div>
        <div className="h-2.5 bg-gray-100 rounded-full overflow-hidden">
          <div className={`h-full rounded-full transition-all ${progression === 100 ? 'bg-green-500' : 'bg-blue-500'}`}
            style={{ width: `${progression}%` }} />
        </div>
        <p className="text-xs text-gray-400 mt-1">{nbFaites} / {totalTaches} tâches complétées</p>
      </div>

      {/* Étapes */}
      <div className="space-y-4">
        {etapes.map(etape => {
          const tachesFaitesEtape = etape.taches.filter(t => isFaite(t.id)).length
          const etapeComplete = tachesFaitesEtape === etape.taches.length
          return (
            <div key={etape.id} className={`border rounded-xl overflow-hidden ${etapeComplete ? 'border-green-200' : 'border-gray-200'}`}>
              <div className={`px-4 py-3 flex items-center justify-between ${etapeComplete ? 'bg-green-50' : 'bg-gray-50'}`}>
                <div className="flex items-center gap-2">
                  {etapeComplete ? (
                    <svg className="w-4 h-4 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  ) : (
                    <div className="w-4 h-4 rounded-full border-2 border-gray-400" />
                  )}
                  <span className="text-sm font-medium text-gray-900">{etape.label}</span>
                </div>
                <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${etapeComplete ? 'bg-green-100 text-green-700' : 'bg-gray-200 text-gray-600'}`}>
                  {tachesFaitesEtape}/{etape.taches.length}
                </span>
              </div>
              <div className="divide-y divide-gray-100">
                {etape.taches.map(tache => {
                  const fait = isFaite(tache.id)
                  const tf = tachesFaites.find(t => t.id === tache.id)
                  return (
                    <div key={tache.id}
                      onClick={() => toggleTache(tache.id)}
                      className={`flex items-center gap-3 px-4 py-3 transition-colors ${readonly ? '' : 'cursor-pointer hover:bg-gray-50'} ${saving === tache.id ? 'opacity-50' : ''}`}>
                      <div className={`w-5 h-5 rounded flex items-center justify-center flex-shrink-0 border-2 transition-all ${fait ? 'bg-green-500 border-green-500' : 'border-gray-300 bg-white'}`}>
                        {fait && (
                          <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                          </svg>
                        )}
                      </div>
                      <span className={`flex-1 text-sm ${fait ? 'line-through text-gray-400' : 'text-gray-700'}`}>{tache.label}</span>
                      <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full ${RESPONSABLE_COLORS[tache.responsable] ?? 'bg-gray-100 text-gray-600'}`}>
                        {RESPONSABLE_LABELS[tache.responsable] ?? tache.responsable}
                      </span>
                      {fait && tf && (
                        <span className="text-[10px] text-gray-400">
                          {new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(tf.fait_le))}
                        </span>
                      )}
                    </div>
                  )
                })}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
