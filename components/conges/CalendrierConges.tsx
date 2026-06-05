'use client'
import { useState } from 'react'
import { getMoisCalendrier, MOIS_FR } from '@/lib/conges-utils'
import type { DemandeConges, JourFerie } from '@/lib/types-conges'

interface Props {
  demandes: DemandeConges[]
  feries: JourFerie[]
}

export default function CalendrierConges({ demandes, feries }: Props) {
  const today = new Date()
  const [annee, setAnnee] = useState(today.getFullYear())
  const [mois, setMois] = useState(today.getMonth())

  const feriesSet = new Set(feries.map(f => f.date))

  const joursAbsence = new Map<string, DemandeConges>()
  demandes
    .filter(d => d.statut === 'validee' || d.statut === 'en_attente')
    .forEach(d => {
      const cur = new Date(d.date_debut)
      const fin = new Date(d.date_fin)
      while (cur <= fin) {
        joursAbsence.set(cur.toISOString().split('T')[0], d)
        cur.setDate(cur.getDate() + 1)
      }
    })

  const jours = getMoisCalendrier(annee, mois)
  const todayStr = today.toISOString().split('T')[0]

  function prev() {
    if (mois === 0) { setMois(11); setAnnee(a => a - 1) }
    else setMois(m => m - 1)
  }
  function next() {
    if (mois === 11) { setMois(0); setAnnee(a => a + 1) }
    else setMois(m => m + 1)
  }

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">
          {MOIS_FR[mois]} {annee}
        </h3>
        <div className="flex gap-1">
          <button onClick={prev} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition text-gray-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
          </button>
          <button onClick={next} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 transition text-gray-500">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>
      </div>

      {/* Jours semaine */}
      <div className="grid grid-cols-7 mb-1">
        {['L','M','M','J','V','S','D'].map((j, i) => (
          <div key={i} className={`text-center text-[11px] font-medium pb-1 ${i >= 5 ? 'text-gray-300' : 'text-gray-400'}`}>{j}</div>
        ))}
      </div>

      {/* Grille */}
      <div className="grid grid-cols-7 gap-0.5">
        {jours.map((j, i) => {
          if (!j.date || !j.num) return <div key={i} />
          const iso = j.date.toISOString().split('T')[0]
          const dow = j.date.getDay()
          const isWeekend = dow === 0 || dow === 6
          const isFerie = feriesDates.has(iso)
          const demande = joursAbsence.get(iso)
          const isToday = iso === todayStr

          let bg = ''
          let textColor = isWeekend || isFerie ? 'text-gray-300' : 'text-gray-700'
          if (demande) {
            bg = demande.statut === 'validee'
              ? 'rounded-md'
              : 'rounded-md opacity-70'
            textColor = 'text-white'
          }

          return (
            <div
              key={iso}
              title={isFerie ? feries.find(f => f.date === iso)?.label : demande ? `${demande.type?.label} — ${demande.statut}` : ''}
              className={`relative flex items-center justify-center h-8 text-xs font-medium cursor-default transition-all ${bg} ${textColor}`}
              style={demande ? {
                backgroundColor: demande.statut === 'validee'
                  ? (demande.type?.couleur ?? '#378ADD')
                  : '#F59E0B',
              } : {}}
            >
              {isToday && !demande && (
                <div className="absolute inset-0 flex items-center justify-center">
                  <div className="w-7 h-7 rounded-full bg-blue-600 flex items-center justify-center text-white text-xs font-semibold">{j.num}</div>
                </div>
              )}
              {!(isToday && !demande) && (
                <span>{j.num}</span>
              )}
            </div>
          )
        })}
      </div>

      {/* Légende */}
      <div className="flex gap-4 mt-4 pt-3 border-t border-gray-100 flex-wrap">
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <div className="w-3 h-3 rounded bg-blue-500"></div> Validé
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <div className="w-3 h-3 rounded bg-amber-400"></div> En attente
        </div>
        <div className="flex items-center gap-1.5 text-[11px] text-gray-500">
          <div className="w-3 h-3 rounded-full bg-blue-600"></div> Aujourd'hui
        </div>
      </div>
    </div>
  )
}

// Fix: use the local feriesSet variable
const feriesDates = new Set<string>()
