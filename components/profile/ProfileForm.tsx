'use client'
import { useState } from 'react'
import { createClient } from '@/lib/supabase/client'
import type { UserProfile } from '@/lib/types'
import { masquerIBAN } from '@/lib/utils'

interface Props { profile: UserProfile; isAdmin?: boolean }

export default function ProfileForm({ profile, isAdmin = false }: Props) {
  const [data, setData] = useState<Partial<UserProfile>>(profile)
  const [saving, setSaving] = useState(false)
  const [saved, setSaved] = useState(false)
  const [error, setError] = useState('')
  const [showIban, setShowIban] = useState(false)
  const supabase = createClient()

  function set(field: keyof UserProfile, value: string | number) {
    setData(d => ({ ...d, [field]: value }))
  }

  async function save() {
    setSaving(true)
    setError('')
    const { error } = await supabase
      .from('profiles')
      .update({
        prenom: data.prenom,
        nom: data.nom,
        telephone: data.telephone,
        date_naissance: data.date_naissance,
        lieu_naissance: data.lieu_naissance,
        nationalite: data.nationalite,
        statut_marital: data.statut_marital,
        nombre_enfants: data.nombre_enfants,
        adresse: data.adresse,
        code_postal: data.code_postal,
        ville: data.ville,
        pays: data.pays,
        iban: data.iban,
        bic: data.bic,
        ...(isAdmin ? {
          poste: data.poste,
          departement: data.departement,
          type_contrat: data.type_contrat,
          date_entree: data.date_entree,
          date_fin_contrat: data.date_fin_contrat,
          temps_travail: data.temps_travail,
          salaire_brut: data.salaire_brut,
          role: data.role,
        } : {}),
      })
      .eq('id', profile.id)

    setSaving(false)
    if (error) { setError(error.message) } else { setSaved(true); setTimeout(() => setSaved(false), 3000) }
  }

  const Input = ({ label, field, type = 'text', readOnly = false, half = false }: {
    label: string; field: keyof UserProfile; type?: string; readOnly?: boolean; half?: boolean
  }) => (
    <div className={half ? '' : ''}>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <input
        type={type}
        value={(data[field] as string) ?? ''}
        onChange={e => set(field, e.target.value)}
        readOnly={readOnly}
        className={`w-full px-3 py-2 text-sm border rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${readOnly ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white border-gray-300'}`}
      />
    </div>
  )

  const Select = ({ label, field, options, readOnly = false }: {
    label: string; field: keyof UserProfile; options: string[]; readOnly?: boolean
  }) => (
    <div>
      <label className="block text-xs font-medium text-gray-600 mb-1">{label}</label>
      <select
        value={(data[field] as string) ?? ''}
        onChange={e => set(field, e.target.value)}
        disabled={readOnly}
        className={`w-full px-3 py-2 text-sm border rounded-lg transition focus:outline-none focus:ring-2 focus:ring-blue-500 ${readOnly ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'bg-white border-gray-300'}`}
      >
        <option value="">— Sélectionner —</option>
        {options.map(o => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  )

  return (
    <div className="p-6 max-w-3xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Mon dossier RH</h1>
          <p className="text-sm text-gray-500 mt-0.5">Informations transmises à SILAE pour votre paie</p>
        </div>
        <button
          onClick={save}
          disabled={saving}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white text-sm font-medium px-4 py-2 rounded-lg transition"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
          </svg>
          {saving ? 'Enregistrement…' : saved ? 'Enregistré ✓' : 'Enregistrer'}
        </button>
      </div>

      {error && <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-sm px-4 py-3 rounded-lg">{error}</div>}

      {/* Infos personnelles */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
          </svg>
          Informations personnelles
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Prénom" field="prenom" />
          <Input label="Nom" field="nom" />
          <Input label="Date de naissance" field="date_naissance" type="date" />
          <Input label="Lieu de naissance" field="lieu_naissance" />
          <Input label="Nationalité" field="nationalite" />
          <Select label="Situation familiale" field="statut_marital"
            options={['Célibataire','Marié(e)','Pacsé(e)','Divorcé(e)','Veuf/Veuve']} />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Nombre d'enfants à charge</label>
            <input type="number" min={0} max={20}
              value={data.nombre_enfants ?? 0}
              onChange={e => set('nombre_enfants', parseInt(e.target.value))}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
          </div>
          <Input label="Téléphone" field="telephone" type="tel" />
        </div>
      </section>

      {/* Adresse */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
          </svg>
          Adresse
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2"><Input label="Adresse" field="adresse" /></div>
          <Input label="Code postal" field="code_postal" />
          <Input label="Ville" field="ville" />
          <Input label="Pays" field="pays" />
        </div>
      </section>

      {/* Contrat */}
      <section className="bg-white border border-gray-200 rounded-xl p-5 mb-4">
        <h2 className="text-sm font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
          </svg>
          Contrat &amp; poste
          {!isAdmin && <span className="ml-auto text-xs text-gray-400 font-normal">Lecture seule — modifiable par RH</span>}
        </h2>
        <div className="grid grid-cols-2 gap-3">
          <Input label="Poste" field="poste" readOnly={!isAdmin} />
          <Input label="Service" field="departement" readOnly={!isAdmin} />
          <Select label="Type de contrat" field="type_contrat"
            options={['CDI','CDD','Stage','Alternance','Freelance']}
            readOnly={!isAdmin} />
          <div>
            <label className="block text-xs font-medium text-gray-600 mb-1">Temps de travail (%)</label>
            <input type="number" min={1} max={100}
              value={data.temps_travail ?? 100}
              onChange={e => set('temps_travail', parseInt(e.target.value))}
              readOnly={!isAdmin}
              className={`w-full px-3 py-2 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 ${!isAdmin ? 'bg-gray-50 text-gray-500 cursor-not-allowed' : 'border-gray-300'}`} />
          </div>
          <Input label="Date d'entrée" field="date_entree" type="date" readOnly={!isAdmin} />
          <Input label="Date fin de contrat" field="date_fin_contrat" type="date" readOnly={!isAdmin} />
          <div className="col-span-2"><Input label="Convention collective" field="convention_collective" readOnly={!isAdmin} /></div>
          {isAdmin && (
            <>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Salaire brut mensuel (€)</label>
                <input type="number"
                  value={data.salaire_brut ?? ''}
                  onChange={e => set('salaire_brut', parseFloat(e.target.value))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              </div>
              <Select label="Rôle dans l'application" field="role"
                options={['salarie','responsable','rh_admin']} />
            </>
          )}
        </div>
      </section>

      {/* Bancaire */}
      <section className="bg-white border border-gray-200 rounded-xl p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-1 flex items-center gap-2">
          <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 10h18M7 15h1m4 0h1m-7 4h12a3 3 0 003-3V8a3 3 0 00-3-3H6a3 3 0 00-3 3v8a3 3 0 003 3z" />
          </svg>
          Coordonnées bancaires
          <span className="ml-auto flex items-center gap-1 text-xs font-normal text-green-700 bg-green-100 px-2 py-0.5 rounded-full">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
            Chiffré
          </span>
        </h2>
        <p className="text-xs text-gray-400 mb-4">Transmis de façon sécurisée à SILAE pour le virement de votre salaire</p>
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2">
            <label className="block text-xs font-medium text-gray-600 mb-1">IBAN</label>
            <div className="relative">
              <input
                type={showIban ? 'text' : 'password'}
                value={data.iban ?? ''}
                onChange={e => set('iban', e.target.value)}
                placeholder="FR76 XXXX XXXX XXXX XXXX XXXX XXX"
                className="w-full px-3 py-2 pr-10 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
              <button type="button" onClick={() => setShowIban(v => !v)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d={showIban ? "M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" : "M15 12a3 3 0 11-6 0 3 3 0 016 0z M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z"} />
                </svg>
              </button>
            </div>
          </div>
          <Input label="BIC" field="bic" />
        </div>
      </section>
    </div>
  )
}
