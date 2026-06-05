import { formatHeure, minutesToHHMM } from '@/lib/temps-utils'
import { TYPE_JOURNEE_LABELS, TYPE_JOURNEE_COLORS, type Pointage } from '@/lib/types-temps'

interface Props { pointages: Pointage[] }

const statutStyle: Record<string, string> = {
  en_cours: 'bg-blue-50 text-blue-700 border-blue-200',
  valide:   'bg-green-50 text-green-700 border-green-200',
  anomalie: 'bg-red-50 text-red-700 border-red-200',
}
const statutLabel: Record<string, string> = {
  en_cours: 'En cours',
  valide:   'Validé',
  anomalie: 'Anomalie',
}

export default function HistoriquePointages({ pointages }: Props) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-5 py-4 border-b border-gray-100">
        <h3 className="text-sm font-medium text-gray-900">Historique du mois</h3>
      </div>
      {pointages.length === 0 ? (
        <div className="text-center py-10 text-gray-400 text-sm">Aucun pointage ce mois</div>
      ) : (
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-gray-100">
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Date</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Type</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Arrivée</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Départ</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Pause</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Durée</th>
              <th className="text-left px-5 py-3 text-xs font-medium text-gray-500 uppercase tracking-wide">Statut</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-50">
            {pointages.map(p => (
              <tr key={p.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-5 py-3 font-medium text-gray-900">
                  {new Intl.DateTimeFormat('fr-FR', { weekday: 'short', day: 'numeric', month: 'short' }).format(new Date(p.date))}
                </td>
                <td className="px-5 py-3">
                  <span className="inline-flex items-center gap-1.5 text-xs px-2 py-0.5 rounded-full text-white"
                    style={{ backgroundColor: TYPE_JOURNEE_COLORS[p.type_journee] }}>
                    {TYPE_JOURNEE_LABELS[p.type_journee]}
                  </span>
                </td>
                <td className="px-5 py-3 text-gray-700 tabular-nums">{formatHeure(p.heure_entree)}</td>
                <td className="px-5 py-3 text-gray-700 tabular-nums">{formatHeure(p.heure_sortie)}</td>
                <td className="px-5 py-3 text-gray-500">{p.pause_minutes ? `${p.pause_minutes}min` : '—'}</td>
                <td className="px-5 py-3 font-medium text-gray-900 tabular-nums">{minutesToHHMM(p.duree_minutes)}</td>
                <td className="px-5 py-3">
                  <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium border ${statutStyle[p.statut]}`}>
                    {statutLabel[p.statut]}
                  </span>
                  {p.note && <p className="text-[11px] text-gray-400 mt-0.5 italic">{p.note}</p>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  )
}
