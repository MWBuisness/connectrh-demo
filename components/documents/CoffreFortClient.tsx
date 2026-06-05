'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import DocumentCard from './DocumentCard'
import SignatureCanvas from './SignatureCanvas'
import type { Document } from '@/lib/types-documents'
import { useRouter } from 'next/navigation'

interface Props {
  documents: Document[]
  profileId: string
  nomComplet: string
  categoriesFiltres?: string[]
}

export default function CoffreFortClient({ documents, profileId, nomComplet, categoriesFiltres }: Props) {
  const [filtre, setFiltre] = useState<string>('TOUS')
  const [docASignerState, setDocASignerState] = useState<Document | null>(null)
  const [signatureOk, setSignatureOk] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadError, setUploadError] = useState('')
  const router = useRouter()
  const supabase = createClient()

  const categories = ['TOUS', ...Array.from(new Set(documents.map(d => d.categorie_code)))]

  const docsFiltres = filtre === 'TOUS' ? documents
    : documents.filter(d => d.categorie_code === filtre)

  const aSignerCount = documents.filter(d => d.signature_requise && !d.signe).length

  async function handleTelecharger(doc: Document) {
    const { data } = await supabase.storage
      .from('documents-rh')
      .createSignedUrl(doc.storage_path, 300) // 5 minutes
    if (data?.signedUrl) window.open(data.signedUrl, '_blank')
  }

  async function handleSignatureComplete(data: { initiales: string; traceSvg: string; timestamp: string }) {
    if (!docASignerState) return

    const hash = btoa(docASignerState.id + data.timestamp + nomComplet)
      .replace(/=/g, '').substring(0, 32)

    const signatureData = JSON.stringify({
      initiales: data.initiales,
      traceSvg: data.traceSvg,
      timestamp: data.timestamp,
      signataire: nomComplet,
      profile_id: profileId,
      document_id: docASignerState.id,
      ip: 'collectée côté serveur',
      user_agent: navigator.userAgent.substring(0, 100),
    })

    await supabase.from('documents').update({
      signe: true,
      signe_le: data.timestamp,
      signature_data: signatureData,
      signature_hash: hash,
    }).eq('id', docASignerState.id)

    // Mettre à jour la demande de signature
    await supabase.from('demandes_signature').update({
      statut: 'signe',
      signe_le: data.timestamp,
    }).eq('document_id', docASignerState.id).eq('profile_id', profileId)

    setDocASignerState(null)
    setSignatureOk(true)
    setTimeout(() => { setSignatureOk(false); router.refresh() }, 3000)
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setUploading(true)
    setUploadError('')

    const ext = file.name.split('.').pop()
    const path = `${profileId}/${Date.now()}-${file.name}`

    const { error: storageErr } = await supabase.storage
      .from('documents-rh')
      .upload(path, file, { contentType: file.type })

    if (storageErr) { setUploadError('Erreur upload : ' + storageErr.message); setUploading(false); return }

    await supabase.from('documents').insert({
      profile_id: profileId,
      categorie_code: 'AUTRE',
      titre: file.name.replace(`.${ext}`, ''),
      storage_path: path,
      nom_fichier: file.name,
      taille_octets: file.size,
      mime_type: file.type,
      emis_par: profileId,
      visible_salarie: true,
    })

    setUploading(false)
    router.refresh()
  }

  const categorieLabels: Record<string, string> = {
    TOUS: 'Tous', BULLETIN: 'Bulletins', CONTRAT: 'Contrats',
    AVENANT: 'Avenants', RUPTURE: 'Ruptures', FORMATION: 'Formations',
    MEDICAL: 'Médical', IDENTITE: 'Identité', AUTRE: 'Autres',
  }

  return (
    <div>
      {/* Modal signature */}
      {docASignerState && (
        <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4" onClick={e => { if (e.target === e.currentTarget) setDocASignerState(null) }}>
          <div className="w-full max-w-lg">
            <SignatureCanvas
              titrDocument={docASignerState.titre}
              nomSignataire={nomComplet}
              onSigne={handleSignatureComplete}
              onAnnule={() => setDocASignerState(null)}
            />
          </div>
        </div>
      )}

      {/* Toast succès */}
      {signatureOk && (
        <div className="fixed bottom-6 right-6 z-50 bg-green-600 text-white text-sm font-medium px-4 py-3 rounded-xl flex items-center gap-2 shadow-lg">
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          Document signé — copie enregistrée dans votre coffre-fort
        </div>
      )}

      {/* Alerte documents à signer */}
      {aSignerCount > 0 && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-5 flex items-center gap-3">
          <svg className="w-5 h-5 text-amber-600 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
          </svg>
          <div className="flex-1">
            <p className="text-sm font-medium text-amber-800">
              {aSignerCount} document{aSignerCount > 1 ? 's' : ''} en attente de votre signature
            </p>
            <p className="text-xs text-amber-600 mt-0.5">Cliquez sur "Signer" pour apposer votre signature électronique avancée</p>
          </div>
        </div>
      )}

      {/* Filtres */}
      <div className="flex gap-2 mb-5 flex-wrap">
        {categories.map(cat => (
          <button key={cat} onClick={() => setFiltre(cat)}
            className={`px-3 py-1.5 rounded-full text-xs font-medium transition border ${
              filtre === cat
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-gray-600 border-gray-200 hover:border-gray-300'
            }`}>
            {categorieLabels[cat] ?? cat}
            {cat !== 'TOUS' && (
              <span className="ml-1.5 opacity-60">
                {documents.filter(d => d.categorie_code === cat).length}
              </span>
            )}
          </button>
        ))}
      </div>

      {/* Upload */}
      <div className="mb-5">
        <label className="flex items-center gap-2 px-4 py-2.5 border border-dashed border-gray-300 rounded-xl text-sm text-gray-500 hover:border-blue-400 hover:text-blue-600 cursor-pointer transition w-full justify-center">
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
          </svg>
          {uploading ? 'Chargement…' : 'Déposer un document (PDF, image…)'}
          <input type="file" className="hidden" accept=".pdf,.jpg,.jpeg,.png,.doc,.docx" onChange={handleUpload} disabled={uploading} />
        </label>
        {uploadError && <p className="text-xs text-red-600 mt-1">{uploadError}</p>}
      </div>

      {/* Liste */}
      {docsFiltres.length === 0 ? (
        <div className="text-center py-14 text-gray-400">
          <svg className="w-10 h-10 mx-auto mb-3 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
          </svg>
          <p className="text-sm font-medium text-gray-500">Aucun document dans cette catégorie</p>
        </div>
      ) : (
        <div className="space-y-2">
          {docsFiltres.map(doc => (
            <DocumentCard
              key={doc.id}
              doc={doc}
              onTelecharger={handleTelecharger}
              onSigner={doc.signature_requise && !doc.signe ? setDocASignerState : undefined}
            />
          ))}
        </div>
      )}
    </div>
  )
}
