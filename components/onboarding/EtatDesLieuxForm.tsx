'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { AttributionMateriel, ChampsEdl } from '@/lib/types-onboarding'

interface Props {
  attribution: AttributionMateriel
  mode: 'remise' | 'restitution'
  champsEdl: ChampsEdl[]
  nomSalarie: string
  onClose: () => void
}

export default function EtatDesLieuxForm({ attribution, mode, champsEdl, nomSalarie, onClose }: Props) {
  const [valeurs, setValeurs] = useState<Record<string,string>>(
    mode === 'restitution' ? (attribution.edl_restitution ?? {}) : attribution.edl_remise
  )
  const [observations, setObservations] = useState(attribution.observations_restitution ?? '')
  const [photosPreviews, setPhotosPreviews] = useState<string[]>([])
  const [etape, setEtape] = useState<'formulaire'|'photos'|'signature'>('formulaire')
  const [sigNom, setSigNom] = useState(nomSalarie)
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  function set(id: string, val: string) { setValeurs(v => ({ ...v, [id]: val })) }

  function handlePhotos(e: React.ChangeEvent<HTMLInputElement>) {
    Array.from(e.target.files ?? []).slice(0, 6).forEach(f => {
      const reader = new FileReader()
      reader.onload = ev => setPhotosPreviews(p => [...p, ev.target?.result as string].slice(0, 6))
      reader.readAsDataURL(f)
    })
  }

  const tousRemplis = champsEdl.filter(c => c.requis).every(c => valeurs[c.id]?.trim())

  async function sauvegarder() {
    setLoading(true)
    const now = new Date().toISOString()
    const updateData = mode === 'remise'
      ? { edl_remise: valeurs, signature_remise: sigNom, signe_remise_le: now }
      : { edl_restitution: valeurs, observations_restitution: observations, signature_restitution: sigNom, signe_restitution_le: now, date_restitution: now.split('T')[0], statut: 'restitue' }
    await supabase.from('attributions_materiel').update(updateData).eq('id', attribution.id)
    if (mode === 'restitution') {
      await supabase.from('materiels').update({ statut: 'disponible' }).eq('id', attribution.materiel_id)
    }
    setLoading(false)
    onClose()
    router.refresh()
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto" onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-full max-w-2xl my-4">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">État des lieux — {mode === 'remise' ? 'Remise' : 'Restitution'}</h2>
            <p className="text-xs text-gray-400 mt-0.5">{attribution.materiel?.libelle} · {nomSalarie}</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" /></svg>
          </button>
        </div>
        <div className="flex border-b border-gray-100">
          {[{id:'formulaire',label:'1. État'},{id:'photos',label:'2. Photos'},{id:'signature',label:'3. Signature'}].map(s => (
            <div key={s.id} className={`flex-1 text-center py-2.5 text-xs font-medium border-b-2 -mb-px ${etape === s.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'}`}>{s.label}</div>
          ))}
        </div>
        <div className="p-6">
          {etape === 'formulaire' && (
            <div className="space-y-4">
              {mode === 'restitution' && Object.keys(attribution.edl_remise).length > 0 && (
                <details className="mb-2">
                  <summary className="text-xs font-medium text-gray-500 cursor-pointer">Rappel état lors de la remise</summary>
                  <div className="mt-2 bg-gray-50 rounded-lg p-3 grid grid-cols-2 gap-2">
                    {champsEdl.map(c => attribution.edl_remise[c.id] ? (
                      <div key={c.id}><p className="text-[10px] text-gray-400">{c.label}</p><p className="text-xs font-medium text-gray-700">{attribution.edl_remise[c.id]}</p></div>
                    ) : null)}
                  </div>
                </details>
              )}
              <div className="grid grid-cols-2 gap-4">
                {champsEdl.map(champ => (
                  <label key={champ.id} className="block">
                    <span className="text-xs font-medium text-gray-600 mb-1 block">{champ.label} {champ.requis && <span className="text-red-500">*</span>}</span>
                    {champ.type === 'select' ? (
                      <select value={valeurs[champ.id] ?? ''} onChange={e => set(champ.id, e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                        <option value="">— Choisir —</option>
                        {champ.options?.map(o => <option key={o} value={o}>{o}</option>)}
                      </select>
                    ) : champ.type === 'textarea' ? (
                      <textarea value={valeurs[champ.id] ?? ''} onChange={e => set(champ.id, e.target.value)} rows={2} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                    ) : (
                      <input type={champ.type} value={valeurs[champ.id] ?? ''} onChange={e => set(champ.id, e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    )}
                  </label>
                ))}
              </div>
              {mode === 'restitution' && (
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Observations / Dommages</label>
                  <textarea value={observations} onChange={e => setObservations(e.target.value)} rows={3} placeholder="Décrire tout dommage ou différence avec l'état d'origine…" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
                </div>
              )}
              <div className="flex justify-end gap-2 pt-2">
                <button onClick={onClose} className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm">Annuler</button>
                <button onClick={() => setEtape('photos')} disabled={!tousRemplis} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-lg text-sm transition">Continuer →</button>
              </div>
            </div>
          )}
          {etape === 'photos' && (
            <div>
              <p className="text-sm text-gray-600 mb-4">Photos de l'état du matériel <span className="text-gray-400">(optionnel, max 6)</span></p>
              <label className="flex flex-col items-center justify-center border-2 border-dashed border-gray-300 rounded-xl py-8 mb-4 cursor-pointer hover:border-blue-400 transition">
                <svg className="w-8 h-8 text-gray-300 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" /><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" /></svg>
                <p className="text-sm text-gray-400">Ajouter des photos</p>
                <input type="file" multiple accept="image/*" capture="environment" className="hidden" onChange={handlePhotos} />
              </label>
              {photosPreviews.length > 0 && (
                <div className="grid grid-cols-3 gap-2 mb-4">
                  {photosPreviews.map((p, i) => (
                    <div key={i} className="relative aspect-square">
                      <img src={p} alt="" className="w-full h-full object-cover rounded-lg" />
                      <button onClick={() => setPhotosPreviews(pp => pp.filter((_,j) => j !== i))} className="absolute top-1 right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs flex items-center justify-center">×</button>
                    </div>
                  ))}
                </div>
              )}
              <div className="flex justify-between gap-2">
                <button onClick={() => setEtape('formulaire')} className="px-4 py-2 border border-gray-300 text-gray-600 rounded-lg text-sm">← Retour</button>
                <button onClick={() => setEtape('signature')} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-sm transition">Continuer →</button>
              </div>
            </div>
          )}
          {etape === 'signature' && (
            <div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-blue-900 mb-2">Récapitulatif</p>
                <div className="grid grid-cols-2 gap-1">
                  {champsEdl.filter(c => valeurs[c.id]).map(c => (
                    <div key={c.id} className="text-xs"><span className="text-blue-600">{c.label} : </span><span className="font-medium text-blue-900">{valeurs[c.id]}</span></div>
                  ))}
                </div>
                {observations && <p className="text-xs mt-2"><span className="text-blue-600">Observations : </span><span className="text-blue-900">{observations}</span></p>}
                <p className="text-xs mt-1 text-blue-500">{photosPreviews.length} photo{photosPreviews.length > 1 ? 's' : ''}</p>
              </div>
              <div className="mb-4">
                <label className="block text-xs font-medium text-gray-600 mb-1">Nom du signataire</label>
                <input value={sigNom} onChange={e => setSigNom(e.target.value)} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 mb-4 text-xs text-amber-700">
                En validant, les parties reconnaissent l'état du matériel tel que décrit. Cet état des lieux est horodaté et a valeur contractuelle.
              </div>
              <div className="flex gap-2">
                <button onClick={sauvegarder} disabled={loading || !sigNom} className="flex-1 bg-green-600 hover:bg-green-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                  {loading ? 'Enregistrement…' : "Valider et signer l'état des lieux"}
                </button>
                <button onClick={() => setEtape('photos')} className="px-4 py-2.5 border border-gray-300 text-gray-600 rounded-lg text-sm">← Retour</button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
