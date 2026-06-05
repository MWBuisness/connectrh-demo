import { formatTaille, MOIS_FR, type Document } from '@/lib/types-documents'

interface Props {
  doc: Document
  onTelecharger: (doc: Document) => void
  onSigner?: (doc: Document) => void
  showProfile?: boolean
  profileNom?: string
}

const CATEGORIE_COLORS: Record<string, string> = {
  BULLETIN:  '#1D9E75',
  CONTRAT:   '#378ADD',
  AVENANT:   '#534AB7',
  RUPTURE:   '#E24B4A',
  FORMATION: '#BA7517',
  MEDICAL:   '#D85A30',
  IDENTITE:  '#888780',
  AUTRE:     '#888780',
}

export default function DocumentCard({ doc, onTelecharger, onSigner, showProfile, profileNom }: Props) {
  const color = CATEGORIE_COLORS[doc.categorie_code] ?? '#888780'
  const needsSignature = doc.signature_requise && !doc.signe

  return (
    <div className={`bg-white border rounded-xl p-4 flex items-start gap-3 hover:border-gray-300 transition-colors ${
      needsSignature ? 'border-amber-200 bg-amber-50/30' : 'border-gray-200'
    }`}>
      {/* Icône */}
      <div className="w-10 h-10 rounded-lg flex items-center justify-center flex-shrink-0 text-white"
        style={{ backgroundColor: color }}>
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      </div>

      {/* Infos */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-2">
          <div className="min-w-0">
            <p className="text-sm font-medium text-gray-900 truncate">{doc.titre}</p>
            <p className="text-xs text-gray-400 mt-0.5">
              {doc.categorie?.label ?? doc.categorie_code}
              {doc.periode_mois && doc.periode_annee && (
                <> · {MOIS_FR[doc.periode_mois - 1]} {doc.periode_annee}</>
              )}
              {doc.taille_octets && <> · {formatTaille(doc.taille_octets)}</>}
            </p>
            {showProfile && profileNom && (
              <p className="text-xs text-blue-600 mt-0.5">{profileNom}</p>
            )}
          </div>
          {/* Badges */}
          <div className="flex flex-col gap-1 items-end flex-shrink-0">
            {doc.signe && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-green-700 bg-green-50 border border-green-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Signé
              </span>
            )}
            {needsSignature && (
              <span className="inline-flex items-center gap-1 text-[10px] font-medium text-amber-700 bg-amber-50 border border-amber-200 px-1.5 py-0.5 rounded-full whitespace-nowrap">
                ✍️ À signer
              </span>
            )}
          </div>
        </div>

        {/* Date + actions */}
        <div className="flex items-center justify-between mt-3">
          <p className="text-[11px] text-gray-400">
            Ajouté le {new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short', year: 'numeric' }).format(new Date(doc.created_at))}
            {doc.signe_le && (
              <> · Signé le {new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(doc.signe_le))}</>
            )}
          </p>
          <div className="flex gap-1.5">
            <button
              onClick={() => onTelecharger(doc)}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-900 border border-gray-200 px-2 py-1 rounded-lg hover:bg-gray-50 transition">
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
              Télécharger
            </button>
            {needsSignature && onSigner && (
              <button
                onClick={() => onSigner(doc)}
                className="flex items-center gap-1 text-xs text-white bg-blue-600 hover:bg-blue-700 px-2 py-1 rounded-lg transition">
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                </svg>
                Signer
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
