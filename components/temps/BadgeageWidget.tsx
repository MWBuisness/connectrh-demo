'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import { getCurrentTime, getTodayISO, minutesToHHMM } from '@/lib/temps-utils'
import { TYPE_JOURNEE_LABELS, TYPE_JOURNEE_COLORS, type TypeJournee, type Pointage } from '@/lib/types-temps'
import { useRouter } from 'next/navigation'

interface Props {
  profileId: string
  pointageAujourdhui: Pointage | null
}

export default function BadgeageWidget({ profileId, pointageAujourdhui: initial }: Props) {
  const [pointage, setPointage] = useState<Pointage | null>(initial)
  const [typeJournee, setTypeJournee] = useState<TypeJournee>('bureau')
  const [note, setNote] = useState('')
  const [pause, setPause] = useState(60)
  const [loading, setLoading] = useState(false)
  const [heure, setHeure] = useState(getCurrentTime())
  const router = useRouter()
  const supabase = createClient()

  useEffect(() => {
    const interval = setInterval(() => setHeure(getCurrentTime()), 30000)
    return () => clearInterval(interval)
  }, [])

  const today = getTodayISO()
  const isEnCours = pointage && pointage.heure_entree && !pointage.heure_sortie
  const isTermine = pointage && pointage.heure_entree && pointage.heure_sortie

  async function badgerEntree() {
    setLoading(true)
    const { data, error } = await supabase
      .from('pointages')
      .upsert({
        profile_id: profileId,
        date: today,
        heure_entree: heure,
        type_journee: typeJournee,
        note: note || null,
        statut: 'en_cours',
      }, { onConflict: 'profile_id,date' })
      .select()
      .single()

    if (!error && data) setPointage(data as Pointage)
    setLoading(false)
    router.refresh()
  }

  async function badgerSortie() {
    if (!pointage) return
    setLoading(true)
    const { data, error } = await supabase
      .from('pointages')
      .update({
        heure_sortie: heure,
        pause_minutes: pause,
        statut: 'valide',
      })
      .eq('id', pointage.id)
      .select()
      .single()

    if (!error && data) setPointage(data as Pointage)
    setLoading(false)
    router.refresh()
  }

  const typeColor = TYPE_JOURNEE_COLORS[pointage?.type_journee ?? typeJournee]

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      {/* Horloge */}
      <div className="text-center mb-5">
        <div className="text-4xl font-semibold text-gray-900 tabular-nums">{heure}</div>
        <div className="text-sm text-gray-400 mt-1">
          {new Intl.DateTimeFormat('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date())}
        </div>
      </div>

      {/* État actuel */}
      {isTermine ? (
        <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4 text-center">
          <div className="flex items-center justify-center gap-2 text-green-700 font-medium mb-1">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            Journée terminée
          </div>
          <div className="text-sm text-green-600">
            {pointage.heure_entree?.slice(0,5)} → {pointage.heure_sortie?.slice(0,5)}
            &nbsp;·&nbsp;
            <strong>{minutesToHHMM(pointage.duree_minutes)}</strong> travaillées
          </div>
          <div className="inline-flex items-center gap-1.5 mt-2 text-xs px-2 py-0.5 rounded-full text-white"
            style={{ backgroundColor: TYPE_JOURNEE_COLORS[pointage.type_journee] }}>
            {TYPE_JOURNEE_LABELS[pointage.type_journee]}
          </div>
        </div>
      ) : isEnCours ? (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4 text-center">
          <div className="flex items-center justify-center gap-2 text-blue-700 font-medium mb-1">
            <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse"></span>
            En cours depuis {pointage.heure_entree?.slice(0,5)}
          </div>
          <div className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full text-white mt-1"
            style={{ backgroundColor: TYPE_JOURNEE_COLORS[pointage.type_journee] }}>
            {TYPE_JOURNEE_LABELS[pointage.type_journee]}
          </div>
        </div>
      ) : (
        // Pas encore badgé
        <div className="mb-4">
          <p className="text-xs font-medium text-gray-600 mb-2">Type de journée</p>
          <div className="grid grid-cols-2 gap-2 mb-3">
            {(Object.entries(TYPE_JOURNEE_LABELS) as [TypeJournee, string][])
              .filter(([k]) => k !== 'absent')
              .map(([key, label]) => (
              <button key={key} type="button"
                onClick={() => setTypeJournee(key)}
                className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition ${
                  typeJournee === key ? 'border-2 font-medium text-white' : 'border-gray-200 text-gray-600 hover:border-gray-300'
                }`}
                style={typeJournee === key ? { borderColor: TYPE_JOURNEE_COLORS[key], backgroundColor: TYPE_JOURNEE_COLORS[key] } : {}}>
                <span className="w-2 h-2 rounded-full flex-shrink-0"
                  style={{ backgroundColor: typeJournee === key ? 'white' : TYPE_JOURNEE_COLORS[key] }} />
                {label}
              </button>
            ))}
          </div>
          <input
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder="Note optionnelle (lieu de déplacement, etc.)"
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>
      )}

      {/* Pause (si en cours) */}
      {isEnCours && (
        <div className="mb-4">
          <label className="block text-xs font-medium text-gray-600 mb-1">Pause déjeuner</label>
          <select value={pause} onChange={e => setPause(parseInt(e.target.value))}
            className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
            {[0,30,45,60,75,90].map(m => (
              <option key={m} value={m}>{m === 0 ? 'Sans pause' : `${m} minutes`}</option>
            ))}
          </select>
        </div>
      )}

      {/* Bouton principal */}
      {!isTermine && (
        <button
          onClick={isEnCours ? badgerSortie : badgerEntree}
          disabled={loading}
          className={`w-full py-3 rounded-xl text-white font-medium text-sm transition flex items-center justify-center gap-2 ${
            isEnCours
              ? 'bg-red-500 hover:bg-red-600'
              : 'bg-blue-600 hover:bg-blue-700'
          } disabled:opacity-50`}
        >
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2}
              d={isEnCours
                ? "M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1"
                : "M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1"
              } />
          </svg>
          {loading ? 'Enregistrement…' : isEnCours ? 'Badger ma sortie' : 'Badger mon arrivée'}
        </button>
      )}
    </div>
  )
}
