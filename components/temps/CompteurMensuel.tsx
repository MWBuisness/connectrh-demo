import { heuresLabel, getMoisAnnee, pctColor } from '@/lib/temps-utils'
import type { CompteurTemps } from '@/lib/types-temps'

interface Props { compteur: CompteurTemps | null; annee: number; mois: number }

export default function CompteurMensuel({ compteur, annee, mois }: Props) {
  if (!compteur) {
    return (
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h3 className="text-sm font-medium text-gray-900 mb-3">{getMoisAnnee(annee, mois)}</h3>
        <p className="text-sm text-gray-400 text-center py-4">Aucune donnée pour ce mois</p>
      </div>
    )
  }

  const pct = compteur.heures_contractuelles > 0
    ? Math.round((compteur.heures_realisees / compteur.heures_contractuelles) * 100)
    : 0
  const barColor = pctColor(pct)

  const items = [
    { label: 'Heures réalisées', value: heuresLabel(compteur.heures_realisees), color: 'text-gray-900' },
    { label: 'Heures contractuelles', value: heuresLabel(compteur.heures_contractuelles), color: 'text-gray-500' },
    { label: 'Heures supplémentaires', value: heuresLabel(compteur.heures_sup), color: compteur.heures_sup > 0 ? 'text-amber-600' : 'text-gray-400' },
    { label: 'Jours bureau', value: `${compteur.jours_bureau}j`, color: 'text-blue-600' },
    { label: 'Jours télétravail', value: `${compteur.jours_teletravail}j`, color: 'text-green-600' },
    { label: 'Jours déplacement', value: `${compteur.jours_deplacement}j`, color: 'text-amber-600' },
    { label: 'Jours absence', value: `${compteur.jours_absence}j`, color: 'text-red-500' },
  ]

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-gray-900">{getMoisAnnee(annee, mois)}</h3>
        {compteur.silae_transmis && (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
            </svg>
            Transmis SILAE
          </span>
        )}
      </div>

      {/* Barre de progression */}
      <div className="mb-4">
        <div className="flex justify-between text-xs text-gray-500 mb-1">
          <span>Taux de réalisation</span>
          <span style={{ color: barColor }} className="font-medium">{pct}%</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full transition-all"
            style={{ width: `${Math.min(pct, 100)}%`, backgroundColor: barColor }}
          />
        </div>
      </div>

      {/* Détail */}
      <div className="space-y-2">
        {items.map(item => (
          <div key={item.label} className="flex justify-between text-sm">
            <span className="text-gray-500">{item.label}</span>
            <span className={`font-medium ${item.color}`}>{item.value}</span>
          </div>
        ))}
      </div>
    </div>
  )
}
