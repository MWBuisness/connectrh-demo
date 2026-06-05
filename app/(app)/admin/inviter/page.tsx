'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'

export default function InviterPage() {
  const [form, setForm] = useState({
    email: '', prenom: '', nom: '', poste: '', departement: '',
    type_contrat: 'CDI', date_entree: new Date().toISOString().split('T')[0],
    role: 'salarie', temps_travail: 100,
  })
  const [loading, setLoading] = useState(false)
  const [success, setSuccess] = useState('')
  const [error, setError] = useState('')
  const supabase = createClient()

  function set(field: string, value: string | number) {
    setForm(f => ({ ...f, [field]: value }))
  }

  async function invite(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setSuccess('')

    // Inviter via Supabase Auth (envoie un email magique)
    const { error: inviteError } = await supabase.auth.admin ? 
      { error: null } : { error: null }

    // En production, utiliser une Server Action ou API Route pour appeler supabase.auth.admin.inviteUserByEmail
    // Ici on simule le succès pour la démo
    await new Promise(r => setTimeout(r, 1000))
    
    setLoading(false)
    setSuccess(`Invitation envoyée à ${form.email}. Le salarié recevra un email pour créer son mot de passe.`)
    setForm(f => ({ ...f, email: '', prenom: '', nom: '' }))
  }

  const departments = ['Direction','Ressources Humaines','Comptabilité','Commercial','Marketing','Technique','Juridique','Finance']

  return (
    <div className="p-6 max-w-2xl mx-auto">
      <div className="mb-6">
        <h1 className="text-xl font-semibold text-gray-900">Inviter un salarié</h1>
        <p className="text-sm text-gray-500 mt-0.5">Un email d'invitation sera envoyé pour créer le compte</p>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-6">
        <form onSubmit={invite} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Prénom *</label>
              <input required value={form.prenom} onChange={e => set('prenom', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Nom *</label>
              <input required value={form.nom} onChange={e => set('nom', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Email professionnel *</label>
            <input required type="email" value={form.email} onChange={e => set('email', e.target.value)}
              placeholder="prenom.nom@entreprise.fr"
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Poste *</label>
              <input required value={form.poste} onChange={e => set('poste', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Service *</label>
              <select required value={form.departement} onChange={e => set('departement', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="">— Choisir —</option>
                {departments.map(d => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Type de contrat</label>
              <select value={form.type_contrat} onChange={e => set('type_contrat', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                {['CDI','CDD','Stage','Alternance','Freelance'].map(c => <option key={c} value={c}>{c}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Date d'entrée</label>
              <input type="date" value={form.date_entree} onChange={e => set('date_entree', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Rôle dans l'application</label>
              <select value={form.role} onChange={e => set('role', e.target.value)}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                <option value="salarie">Salarié</option>
                <option value="responsable">Responsable</option>
                <option value="rh_admin">Administrateur RH</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1">Temps de travail (%)</label>
              <input type="number" min={1} max={100} value={form.temps_travail}
                onChange={e => set('temps_travail', parseInt(e.target.value))}
                className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
            </div>
          </div>

          {error && <div className="bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}
          {success && <div className="bg-green-50 border border-green-200 text-green-700 text-sm px-4 py-3 rounded-lg">{success}</div>}

          <div className="pt-2">
            <button type="submit" disabled={loading}
              className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white font-medium py-2.5 rounded-lg text-sm transition">
              {loading ? 'Envoi en cours…' : 'Envoyer l\'invitation'}
            </button>
            <p className="text-xs text-gray-400 text-center mt-2">
              Le salarié recevra un email pour définir son mot de passe et accéder à son espace ConnectRH
            </p>
          </div>
        </form>
      </div>
    </div>
  )
}
