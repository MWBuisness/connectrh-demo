'use client'
import { useState, useEffect } from 'react'
import { createClient } from '@/lib/supabase/client'
import DocumentCard from '@/components/documents/DocumentCard'
import { MOIS_FR, formatTaille, type Document } from '@/lib/types-documents'
import { useRouter } from 'next/navigation'

interface Profile { id: string; prenom: string; nom: string; departement: string }

export default function AdminDocumentsClient() {
  const [profiles, setProfiles] = useState<Profile[]>([])
  const [documents, setDocuments] = useState<Document[]>([])
  const [selectedProfile, setSelectedProfile] = useState<string>('')
  const [onglet, setOnglet] = useState<'envoyer' | 'tous' | 'docusign'>('envoyer')
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [docusignActif, setDocusignActif] = useState(false)

  // Form upload
  const [file, setFile] = useState<File | null>(null)
  const [categorie, setCategorie] = useState('BULLETIN')
  const [titre, setTitre] = useState('')
  const [periMois, setPeriMois] = useState(new Date().getMonth() + 1)
  const [periAnnee, setPeriAnnee] = useState(new Date().getFullYear())
  const [signatureRequise, setSignatureRequise] = useState(false)
  const [signatureMode, setSignatureMode] = useState<'avancee'|'docusign'>('avancee')
  const [message, setMessage] = useState('')

  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    async function load() {
      const { data: p } = await supabase.from('profiles').select('id,prenom,nom,departement').order('nom')
      setProfiles((p ?? []) as Profile[])

      const { data: d } = await supabase
        .from('documents')
        .select('*, categorie:categories_document(*), profile:profile_id(prenom,nom,departement)')
        .order('created_at', { ascending: false })
        .limit(50)
      setDocuments((d ?? []) as Document[])

      const { data: ds } = await supabase.from('parametres_docusign').select('actif').single()
      setDocusignActif(ds?.actif ?? false)
    }
    load()
  }, [])

  async function handleEnvoyer() {
    if (!file || !selectedProfile || !titre) return
    setLoading(true)

    const path = `${selectedProfile}/${Date.now()}-${file.name}`
    const { error: storageErr } = await supabase.storage
      .from('documents-rh')
      .upload(path, file, { contentType: file.type })

    if (storageErr) { setLoading(false); return }

    const me = await supabase.auth.getUser()
    const { data: myProfile } = await supabase.from('profiles').select('id').eq('user_id', me.data.user?.id ?? '').single()

    const { data: doc, error: docErr } = await supabase.from('documents').insert({
      profile_id: selectedProfile,
      categorie_code: categorie,
      titre,
      storage_path: path,
      nom_fichier: file.name,
      taille_octets: file.size,
      mime_type: file.type,
      periode_mois: categorie === 'BULLETIN' ? periMois : null,
      periode_annee: categorie === 'BULLETIN' ? periAnnee : null,
      signature_requise: signatureRequise,
      signature_mode: signatureRequise ? signatureMode : 'avancee',
      emis_par: myProfile?.id,
      visible_salarie: true,
    }).select().single()

    if (!docErr && doc && signatureRequise) {
      await supabase.from('demandes_signature').insert({
        document_id: doc.id,
        profile_id: selectedProfile,
        statut: 'en_attente',
        message: message || null,
        date_limite: new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString().split('T')[0],
      })
    }

    setLoading(false)
    setSuccess('Document envoyé avec succès' + (signatureRequise ? ' — demande de signature créée' : ''))
    setFile(null)
    setTitre('')
    setTimeout(() => { setSuccess(''); router.refresh() }, 3000)
  }

  const categorieLabels: Record<string,string> = {
    BULLETIN:'Bulletin de paie', CONTRAT:'Contrat de travail',
    AVENANT:'Avenant', RUPTURE:'Rupture / STC',
    FORMATION:'Attestation formation', MEDICAL:'Document médical',
    IDENTITE:"Pièce d'identité", AUTRE:'Autre document',
  }

  return (
    <div>
      {success && (
        <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-xl flex items-center gap-2">
          <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          {success}
        </div>
      )}

      {/* Onglets */}
      <div className="flex border-b border-gray-200 mb-6 gap-0">
        {[
          { id: 'envoyer', label: 'Envoyer un document' },
          { id: 'tous', label: `Tous les documents (${documents.length})` },
          { id: 'docusign', label: 'DocuSign' },
        ].map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id as any)}
            className={`px-4 py-2.5 text-sm font-medium border-b-2 transition-colors -mb-px ${
              onglet === o.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}>
            {o.label}
          </button>
        ))}
      </div>

      {/* Onglet : Envoyer */}
      {onglet === 'envoyer' && (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Envoyer un document à un salarié</h3>

            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Salarié destinataire *</label>
                <select value={selectedProfile} onChange={e => setSelectedProfile(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  <option value="">— Sélectionner —</option>
                  {profiles.map(p => (
                    <option key={p.id} value={p.id}>{p.prenom} {p.nom} · {p.departement}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Catégorie *</label>
                <select value={categorie} onChange={e => setCategorie(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                  {Object.entries(categorieLabels).map(([k,v]) => (
                    <option key={k} value={k}>{v}</option>
                  ))}
                </select>
              </div>

              {categorie === 'BULLETIN' && (
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Mois</label>
                    <select value={periMois} onChange={e => setPeriMois(parseInt(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      {MOIS_FR.map((m, i) => <option key={i} value={i+1}>{m}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Année</label>
                    <input type="number" value={periAnnee} onChange={e => setPeriAnnee(parseInt(e.target.value))}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Titre du document *</label>
                <input value={titre} onChange={e => setTitre(e.target.value)}
                  placeholder={categorie === 'BULLETIN' ? `Bulletin ${MOIS_FR[periMois-1]} ${periAnnee}` : ''}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>

              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Fichier PDF *</label>
                <input type="file" accept=".pdf,.doc,.docx"
                  onChange={e => setFile(e.target.files?.[0] ?? null)}
                  className="w-full text-sm text-gray-500 file:mr-3 file:py-1.5 file:px-3 file:rounded-lg file:border-0 file:text-xs file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100" />
                {file && <p className="text-xs text-gray-400 mt-1">{file.name} · {formatTaille(file.size)}</p>}
              </div>

              {/* Signature */}
              <div className="border border-gray-200 rounded-lg p-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input type="checkbox" checked={signatureRequise}
                    onChange={e => setSignatureRequise(e.target.checked)}
                    className="rounded border-gray-300" />
                  <span className="text-sm font-medium text-gray-700">Demander une signature électronique</span>
                </label>

                {signatureRequise && (
                  <div className="mt-3 pl-5 space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Mode de signature</label>
                      <div className="flex gap-2">
                        <button type="button" onClick={() => setSignatureMode('avancee')}
                          className={`flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition ${
                            signatureMode === 'avancee' ? 'border-blue-500 bg-blue-50 text-blue-700' : 'border-gray-200 text-gray-500'
                          }`}>
                          ✍️ Avancée (inclus)
                        </button>
                        <button type="button" onClick={() => setSignatureMode('docusign')}
                          disabled={!docusignActif}
                          title={!docusignActif ? 'Activez DocuSign dans les paramètres' : ''}
                          className={`flex-1 px-3 py-2 rounded-lg border text-xs font-medium transition ${
                            signatureMode === 'docusign' ? 'border-blue-500 bg-blue-50 text-blue-700'
                            : docusignActif ? 'border-gray-200 text-gray-500' : 'border-gray-100 text-gray-300 cursor-not-allowed'
                          }`}>
                          📋 DocuSign {!docusignActif && '(inactif)'}
                        </button>
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Message pour le salarié</label>
                      <textarea value={message} onChange={e => setMessage(e.target.value)} rows={2}
                        placeholder="Ex : Merci de signer votre avenant avant le 30 juin"
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    </div>
                  </div>
                )}
              </div>

              <button onClick={handleEnvoyer}
                disabled={loading || !file || !selectedProfile || !titre}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                </svg>
                {loading ? 'Envoi en cours…' : `Envoyer${signatureRequise ? ' + demande de signature' : ''}`}
              </button>
            </div>
          </div>

          {/* Aperçu rapide */}
          <div>
            <h3 className="text-sm font-medium text-gray-900 mb-3">Derniers envois</h3>
            <div className="space-y-2">
              {documents.slice(0, 6).map(doc => (
                <div key={doc.id} className="bg-white border border-gray-200 rounded-lg px-4 py-3 flex items-center gap-3 text-sm">
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-gray-900 truncate">{doc.titre}</p>
                    <p className="text-xs text-gray-400">
                      {(doc as any).profile?.prenom} {(doc as any).profile?.nom}
                      {doc.periode_mois && ` · ${MOIS_FR[doc.periode_mois-1]} ${doc.periode_annee}`}
                    </p>
                  </div>
                  {doc.signature_requise && (
                    <span className={`text-[10px] font-medium px-1.5 py-0.5 rounded-full border flex-shrink-0 ${
                      doc.signe ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                    }`}>
                      {doc.signe ? '✓ Signé' : 'À signer'}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* Onglet : Tous */}
      {onglet === 'tous' && (
        <div className="space-y-2">
          {documents.map(doc => (
            <div key={doc.id} className="bg-white border border-gray-200 rounded-xl p-4 flex items-center gap-3">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900">{doc.titre}</p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {(doc as any).profile?.prenom} {(doc as any).profile?.nom} · {(doc as any).profile?.departement}
                  {doc.periode_mois && ` · ${MOIS_FR[doc.periode_mois-1]} ${doc.periode_annee}`}
                  · {formatTaille(doc.taille_octets)}
                </p>
              </div>
              {doc.signature_requise && (
                <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border flex-shrink-0 ${
                  doc.signe ? 'bg-green-50 text-green-700 border-green-200' : 'bg-amber-50 text-amber-700 border-amber-200'
                }`}>
                  {doc.signe ? '✓ Signé' : '⏳ En attente'}
                </span>
              )}
              <p className="text-[11px] text-gray-400 flex-shrink-0">
                {new Intl.DateTimeFormat('fr-FR', { day: 'numeric', month: 'short' }).format(new Date(doc.created_at))}
              </p>
            </div>
          ))}
        </div>
      )}

      {/* Onglet : DocuSign */}
      {onglet === 'docusign' && (
        <DocusignConfig actif={docusignActif} onToggle={setDocusignActif} />
      )}
    </div>
  )
}

function DocusignConfig({ actif, onToggle }: { actif: boolean; onToggle: (v: boolean) => void }) {
  const [accountId, setAccountId] = useState('')
  const [integrationKey, setIntegrationKey] = useState('')
  const [saved, setSaved] = useState(false)
  const supabase = createClient()

  async function sauvegarder() {
    await supabase.from('parametres_docusign').update({
      actif, account_id: accountId, integration_key: integrationKey
    }).eq('actif', actif)
    setSaved(true)
    setTimeout(() => setSaved(false), 2000)
  }

  return (
    <div className="max-w-lg">
      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-sm font-medium text-gray-900">Intégration DocuSign</h3>
            <p className="text-xs text-gray-400 mt-0.5">Signature qualifiée eIDAS — ~1 €/document</p>
          </div>
          <button onClick={() => onToggle(!actif)}
            className={`relative w-11 h-6 rounded-full transition-colors ${actif ? 'bg-blue-600' : 'bg-gray-200'}`}>
            <span className={`absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow transition-transform ${actif ? 'translate-x-5' : ''}`} />
          </button>
        </div>

        {actif ? (
          <div className="space-y-3">
            <div className="bg-blue-50 border border-blue-200 rounded-lg px-3 py-2 text-xs text-blue-700 flex items-center gap-2">
              <svg className="w-4 h-4 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              DocuSign activé — les enveloppes seront créées via l'API DocuSign
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Account ID DocuSign</label>
              <input value={accountId} onChange={e => setAccountId(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Integration Key (Client ID)</label>
              <input value={integrationKey} onChange={e => setIntegrationKey(e.target.value)} placeholder="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx"
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 font-mono text-xs" />
            </div>
            <button onClick={sauvegarder}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 rounded-lg text-sm transition">
              {saved ? '✓ Enregistré' : 'Enregistrer la configuration'}
            </button>
            <p className="text-xs text-gray-400 text-center">
              Obtenez vos clés sur <span className="text-blue-600">admindemo.docusign.com</span>
            </p>
          </div>
        ) : (
          <div className="text-center py-6">
            <p className="text-sm text-gray-500 mb-2">DocuSign est désactivé</p>
            <p className="text-xs text-gray-400">La signature avancée intégrée (gratuite) est utilisée par défaut.<br />Activez DocuSign pour une valeur juridique maximale.</p>
          </div>
        )}
      </div>
    </div>
  )
}
