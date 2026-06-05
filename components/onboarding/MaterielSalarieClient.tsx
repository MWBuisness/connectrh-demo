'use client'
import { useState } from 'react'
import EtatDesLieuxForm from './EtatDesLieuxForm'
import type { AttributionMateriel } from '@/lib/types-onboarding'

interface Props { attributions: AttributionMateriel[]; nomSalarie: string }

const MATERIEL_ICONS: Record<string, string> = {
  VEHICULE: 'M19 16H5m0 0l3-3m-3 3l3 3M5 8h14m0 0l-3-3m3 3l-3 3',
  PC_PORTABLE: 'M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z',
  TELEPHONE: 'M12 18h.01M8 21h8a2 2 0 002-2V5a2 2 0 00-2-2H8a2 2 0 00-2 2v14a2 2 0 002 2z',
  BADGE: 'M10 6H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V8a2 2 0 00-2-2h-5m-4 0V5a2 2 0 114 0v1m-4 0a2 2 0 104 0',
  CLE: 'M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z',
  AUTRE: 'M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z',
}

export default function MaterielSalarieClient({ attributions, nomSalarie }: Props) {
  const [edlOuvert, setEdlOuvert] = useState<{ attr: AttributionMateriel; mode: 'remise' | 'restitution' } | null>(null)

  return (
    <div className="space-y-3">
      {edlOuvert && (
        <EtatDesLieuxForm
          attribution={edlOuvert.attr}
          mode={edlOuvert.mode}
          champsEdl={edlOuvert.attr.materiel?.type?.champs_edl ?? []}
          nomSalarie={nomSalarie}
          onClose={() => setEdlOuvert(null)}
        />
      )}

      {attributions.map(attr => {
        const type = attr.materiel?.type
        const iconPath = MATERIEL_ICONS[attr.materiel?.type_code ?? 'AUTRE'] ?? MATERIEL_ICONS.AUTRE
        const edlFait = !!attr.signe_remise_le

        return (
          <div key={attr.id} className="border border-gray-200 rounded-xl p-4">
            <div className="flex items-start gap-3">
              <div className="w-9 h-9 rounded-lg flex items-center justify-center flex-shrink-0"
                style={{ backgroundColor: (type?.couleur ?? '#888') + '20', color: type?.couleur ?? '#888' }}>
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d={iconPath} />
                </svg>
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{attr.materiel?.libelle}</p>
                <p className="text-xs text-gray-400">{type?.label}</p>
                {attr.materiel?.reference && (
                  <p className="text-[11px] text-gray-400 font-mono mt-0.5">{attr.materiel.reference}</p>
                )}
              </div>
            </div>

            <div className="mt-3 pt-3 border-t border-gray-100 flex items-center justify-between">
              {edlFait ? (
                <span className="flex items-center gap-1 text-xs font-medium text-green-700 bg-green-50 px-2 py-0.5 rounded-full border border-green-200">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  EDL signé le {new Intl.DateTimeFormat('fr-FR').format(new Date(attr.signe_remise_le!))}
                </span>
              ) : (
                <span className="text-xs text-amber-600 font-medium">⚠️ EDL à signer</span>
              )}
              <button
                onClick={() => setEdlOuvert({ attr, mode: edlFait ? 'restitution' : 'remise' })}
                className="text-xs text-blue-600 hover:text-blue-800 font-medium border border-blue-200 px-2.5 py-1 rounded-lg hover:bg-blue-50 transition">
                {edlFait ? 'Voir / Restituer' : "Faire l'EDL"}
              </button>
            </div>
          </div>
        )
      })}
    </div>
  )
}
