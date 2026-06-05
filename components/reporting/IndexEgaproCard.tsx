import type { IndexEgapro } from '@/lib/calculs-reporting'

interface Props { index: IndexEgapro; nbSalaries: number }

function Jauge({ note, max, label, color }: { note: number; max: number; label: string; color: string }) {
  const pct = Math.round(note / max * 100)
  return (
    <div className="flex items-center gap-3">
      <div className="flex-1">
        <div className="flex justify-between text-xs mb-1">
          <span className="text-gray-600">{label}</span>
          <span className="font-semibold text-gray-900">{note}/{max}</span>
        </div>
        <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
          <div className="h-full rounded-full transition-all" style={{ width: `${pct}%`, backgroundColor: color }} />
        </div>
      </div>
    </div>
  )
}

export default function IndexEgaproCard({ index, nbSalaries }: Props) {
  const couleurNote = index.note_globale >= 85 ? '#1D9E75' : index.note_globale >= 75 ? '#378ADD' : index.note_globale >= 65 ? '#BA7517' : '#E24B4A'
  const labelNote = index.note_globale >= 85 ? 'Excellent' : index.note_globale >= 75 ? 'Satisfaisant' : index.note_globale >= 65 ? 'À améliorer' : 'Insuffisant'

  return (
    <div className="bg-white border border-gray-200 rounded-xl p-5">
      <div className="flex items-start justify-between mb-4">
        <div>
          <h3 className="text-sm font-semibold text-gray-900">Index Égalité Professionnelle F/H</h3>
          <p className="text-xs text-gray-400 mt-0.5">Egapro — Obligatoire dès 50 salariés</p>
        </div>
        {index.publiable ? (
          <div className="text-center">
            <div className="text-3xl font-bold" style={{ color: couleurNote }}>{index.note_globale}</div>
            <div className="text-xs font-medium" style={{ color: couleurNote }}>/100 · {labelNote}</div>
          </div>
        ) : (
          <div className="text-center bg-gray-100 rounded-lg px-3 py-2">
            <p className="text-xs text-gray-500">Non calculable</p>
            <p className="text-[10px] text-gray-400">{nbSalaries} sal. (min. 50)</p>
          </div>
        )}
      </div>

      {index.publiable ? (
        <>
          <div className="space-y-2.5 mb-4">
            <Jauge note={index.ecarts_remuneration} max={40} label="Écarts de rémunération" color="#378ADD" />
            <Jauge note={index.ecarts_augmentations} max={20} label="Écarts d'augmentations individuelles" color="#1D9E75" />
            <Jauge note={index.ecarts_promotions} max={15} label="Écarts de promotions" color="#534AB7" />
            <Jauge note={index.conges_maternite} max={15} label="Retour congé maternité" color="#BA7517" />
            <Jauge note={index.hautes_remunerations} max={10} label="Hautes rémunérations" color="#D85A30" />
          </div>

          {index.obligation_mesures && (
            <div className="bg-red-50 border border-red-200 rounded-lg px-3 py-2 text-xs text-red-700">
              ⚠️ Score &lt; 75 — Obligation de définir et publier des mesures correctives (délai 3 ans)
            </div>
          )}
          {!index.obligation_mesures && (
            <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs text-green-700">
              ✓ Score ≥ 75 — Conformité atteinte · Publication annuelle sur le site du MTEI requise
            </div>
          )}
        </>
      ) : (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-xs text-blue-700">
          L'index Egapro est obligatoire pour les entreprises de 50 salariés et plus. Actuellement : {nbSalaries} salarié{nbSalaries > 1 ? 's' : ''}.
          Les données de genre et de salaire brut doivent être renseignées dans les profils pour le calcul.
        </div>
      )}
    </div>
  )
}
