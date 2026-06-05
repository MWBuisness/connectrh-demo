import type { SoldeConges } from '@/lib/types-conges'

interface Props { soldes: SoldeConges[] }

export default function SoldesCards({ soldes }: Props) {
  const main = soldes.filter(s => ['CP', 'RTT', 'REC'].includes(s.type_code))

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
      {main.map(s => {
        const disponible = s.solde_acquis - s.solde_pris - s.solde_en_cours
        const pct = s.solde_acquis > 0
          ? Math.round((s.solde_pris / s.solde_acquis) * 100)
          : 0
        return (
          <div key={s.type_code} className="bg-white border border-gray-200 rounded-xl p-4">
            <div className="flex items-start justify-between mb-3">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">{s.type?.label ?? s.type_code}</p>
                <p className="text-2xl font-semibold text-gray-900">{disponible} <span className="text-sm font-normal text-gray-400">jours</span></p>
              </div>
              <div
                className="w-8 h-8 rounded-lg flex items-center justify-center text-white text-xs font-bold flex-shrink-0"
                style={{ backgroundColor: s.type?.couleur ?? '#378ADD' }}
              >
                {s.type_code}
              </div>
            </div>
            <div className="space-y-1.5">
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full rounded-full transition-all"
                  style={{ width: `${pct}%`, backgroundColor: s.type?.couleur ?? '#378ADD' }}
                />
              </div>
              <div className="flex justify-between text-[11px] text-gray-400">
                <span>{s.solde_pris} pris</span>
                {s.solde_en_cours > 0 && (
                  <span className="text-amber-600">{s.solde_en_cours} en attente</span>
                )}
                <span>{s.solde_acquis} acquis</span>
              </div>
            </div>
          </div>
        )
      })}
      {main.length === 0 && (
        <div className="col-span-3 bg-amber-50 border border-amber-200 rounded-xl p-4 text-sm text-amber-700">
          Soldes non initialisés — contactez votre administrateur RH.
        </div>
      )}
    </div>
  )
}
