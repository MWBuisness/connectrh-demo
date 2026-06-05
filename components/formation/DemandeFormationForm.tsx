'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import { useRouter } from 'next/navigation'
import type { FormationCatalogue, CpfCompteur } from '@/lib/types-formation'
import { FINANCEMENT_LABELS, CATEGORIE_COLORS, CATEGORIE_LABELS } from '@/lib/types-formation'

interface Props {
  profileId: string
  catalogue: FormationCatalogue[]
  cpf: CpfCompteur | null
  planId?: string
  onClose: () => void
}

export default function DemandeFormationForm({ profileId, catalogue, cpf, planId, onClose }: Props) {
  const [mode, setMode] = useState<'catalogue'|'libre'>('catalogue')
  const [formationId, setFormationId] = useState('')
  const [titreLivre, setTitreLivre] = useState('')
  const [organisme, setOrganisme] = useState('')
  const [description, setDescription] = useState('')
  const [dateSouhaitee, setDateSouhaitee] = useState('')
  const [financement, setFinancement] = useState<string>('entreprise')
  const [coutEstime, setCoutEstime] = useState('')
  const [heuresCpf, setHeuresCpf] = useState('')
  const [loading, setLoading] = useState(false)
  const router = useRouter()
  const supabase = createClient()

  const formationSelectionnee = catalogue.find(f => f.id === formationId)
  const cpfDisponible = (cpf?.heures_droit ?? 500) - (cpf?.heures_utilise ?? 0)

  async function soumettre(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    const titre = mode === 'catalogue' ? formationSelectionnee?.titre : titreLivre
    if (!titre) { setLoading(false); return }

    await supabase.from('demandes_formation').insert({
      profile_id: profileId,
      plan_id: planId ?? null,
      formation_id: mode === 'catalogue' ? formationId : null,
      titre_libre: mode === 'libre' ? titreLivre : null,
      organisme_libre: mode === 'libre' ? organisme : null,
      description_libre: mode === 'libre' ? description : null,
      date_souhaitee: dateSouhaitee || null,
      cout_estime: coutEstime ? parseFloat(coutEstime) : (formationSelectionnee?.cout_moyen ?? null),
      duree_heures: formationSelectionnee?.duree_heures ?? null,
      financement,
      heures_cpf: heuresCpf ? parseFloat(heuresCpf) : null,
      statut: 'demande',
      origine: 'salarie',
    })
    setLoading(false)
    onClose()
    router.refresh()
  }

  const categories = [...new Set(catalogue.map(f => f.categorie))]

  return (
    <div className="fixed inset-0 z-50 bg-black/60 flex items-center justify-center p-4 overflow-y-auto"
      onClick={e => { if (e.target === e.currentTarget) onClose() }}>
      <div className="bg-white rounded-2xl w-full max-w-2xl my-4">
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Nouvelle demande de formation</h2>
            <p className="text-xs text-gray-400 mt-0.5">La demande sera soumise à votre manager puis aux RH</p>
          </div>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition">
            <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <form onSubmit={soumettre} className="p-6 space-y-5">
          {/* Mode */}
          <div className="flex gap-2">
            {[{ id: 'catalogue', label: 'Choisir au catalogue' }, { id: 'libre', label: 'Formation libre' }].map(m => (
              <button key={m.id} type="button" onClick={() => setMode(m.id as any)}
                className={`flex-1 py-2.5 rounded-lg text-sm font-medium border transition ${mode === m.id ? 'bg-blue-600 text-white border-blue-600' : 'border-gray-300 text-gray-600 hover:border-gray-400'}`}>
                {m.label}
              </button>
            ))}
          </div>

          {/* Catalogue */}
          {mode === 'catalogue' && (
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-2">Formation *</label>
              <div className="space-y-2 max-h-56 overflow-y-auto pr-1">
                {categories.map(cat => (
                  <div key={cat}>
                    <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1.5 mt-2">{CATEGORIE_LABELS[cat as keyof typeof CATEGORIE_LABELS]}</p>
                    {catalogue.filter(f => f.categorie === cat).map(f => (
                      <label key={f.id}
                        className={`flex items-start gap-3 p-3 rounded-lg border cursor-pointer transition ${formationId === f.id ? 'border-blue-500 bg-blue-50' : 'border-gray-200 hover:border-gray-300'}`}>
                        <input type="radio" name="formation" value={f.id} checked={formationId === f.id}
                          onChange={() => setFormationId(f.id)} className="mt-0.5 flex-shrink-0" />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-900">{f.titre}</span>
                            {f.certifiante && <span className="text-[10px] font-medium bg-green-50 text-green-700 px-1.5 py-0.5 rounded-full border border-green-200">Certifiante</span>}
                            {f.eligible_cpf && <span className="text-[10px] font-medium bg-blue-50 text-blue-700 px-1.5 py-0.5 rounded-full border border-blue-200">CPF</span>}
                          </div>
                          <div className="flex gap-3 mt-0.5 flex-wrap">
                            {f.organisme && <span className="text-xs text-gray-400">{f.organisme}</span>}
                            {f.duree_heures && <span className="text-xs text-gray-400">{f.duree_heures}h</span>}
                            {f.cout_moyen ? <span className="text-xs text-gray-400">{f.cout_moyen.toLocaleString('fr-FR')} €</span> : <span className="text-xs text-green-600">Gratuit</span>}
                            <span className="text-xs text-gray-400 capitalize">{f.modalite}</span>
                          </div>
                        </div>
                      </label>
                    ))}
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Libre */}
          {mode === 'libre' && (
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Titre de la formation *</label>
                <input required value={titreLivre} onChange={e => setTitreLivre(e.target.value)}
                  placeholder="Ex : Formation React avancé" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Organisme</label>
                  <input value={organisme} onChange={e => setOrganisme(e.target.value)}
                    placeholder="Nom de l'organisme" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Coût estimé (€)</label>
                  <input type="number" value={coutEstime} onChange={e => setCoutEstime(e.target.value)}
                    placeholder="0" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Justification / Objectifs pédagogiques</label>
                <textarea value={description} onChange={e => setDescription(e.target.value)} rows={3}
                  placeholder="Pourquoi cette formation ? Quelles compétences visez-vous ?" className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
              </div>
            </div>
          )}

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date souhaitée</label>
              <input type="date" value={dateSouhaitee} onChange={e => setDateSouhaitee(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Mode de financement</label>
              <select value={financement} onChange={e => setFinancement(e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                {Object.entries(FINANCEMENT_LABELS).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
            </div>
          </div>

          {/* CPF info */}
          {(financement === 'cpf' || financement === 'cpf_abonde') && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
              <p className="text-xs font-medium text-blue-800 mb-2">Solde CPF disponible : {cpfDisponible}h</p>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Heures CPF à utiliser</label>
                <input type="number" value={heuresCpf} onChange={e => setHeuresCpf(e.target.value)}
                  max={cpfDisponible} placeholder="0" className="w-full px-3 py-2 text-sm border border-blue-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
            </div>
          )}

          <div className="flex gap-3 pt-2">
            <button type="submit" disabled={loading || (mode === 'catalogue' && !formationId) || (mode === 'libre' && !titreLivre)}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
              {loading ? 'Envoi…' : 'Soumettre la demande'}
            </button>
            <button type="button" onClick={onClose} className="px-5 py-2.5 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition">Annuler</button>
          </div>
        </form>
      </div>
    </div>
  )
}
