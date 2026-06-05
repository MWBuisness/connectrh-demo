import Link from 'next/link'

const MODULES = [
  { icon: '📋', label: 'Congés & absences', desc: 'Demandes, validation, soldes en temps réel, export automatique vers SILAE' },
  { icon: '⏱️', label: 'Gestion du temps', desc: 'Badgeage, heures sup, télétravail, compteurs mensuels avec transmission paie' },
  { icon: '📁', label: 'Coffre-fort RH', desc: 'Bulletins, contrats, signature électronique, archivage légal 50 ans' },
  { icon: '🎓', label: 'Plan de formation', desc: 'Catalogue, demandes, suivi CPF, alertes renouvellements réglementaires' },
  { icon: '💬', label: 'Entretiens', desc: 'Entretiens annuels, professionnels, alertes légales 2 ans et 6 ans' },
  { icon: '🏥', label: 'Suivi médical', desc: 'Visites médicales, aptitudes, DUER, alertes automatiques' },
  { icon: '🔗', label: 'Intégration SILAE', desc: 'Synchronisation bidirectionnelle — plus jamais de ressaisie manuelle' },
  { icon: '📦', label: 'Onboarding / Offboarding', desc: 'Checklists, état des lieux matériel, dossiers digitaux complets' },
]

const FEATURES = [
  { title: '3 tableaux de bord', desc: 'Salarié, Responsable et RH Admin — chacun voit exactement ce dont il a besoin' },
  { title: 'Données sécurisées', desc: 'Vos données hébergées sur votre propre espace Supabase en Europe — RGPD natif' },
  { title: 'Application mobile', desc: 'Installable sur iPhone et Android — photo de documents, badgeage, congés depuis le téléphone' },
  { title: 'Connecté SILAE', desc: 'Transmission automatique des variables de paie — zéro ressaisie, zéro erreur' },
]

export default function DemoPage() {
  return (
    <div className="min-h-screen bg-white">
      {/* Nav */}
      <nav className="border-b border-gray-200 px-6 py-4 flex items-center justify-between sticky top-0 bg-white/90 backdrop-blur-sm z-10">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </div>
          <span className="font-semibold text-gray-900">ConnectRH</span>
        </div>
        <div className="flex items-center gap-3">
          <span className="hidden md:block text-sm text-gray-500">SIRH connecté à SILAE</span>
          <Link href="/auth/login"
            className="bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium px-4 py-2 rounded-lg transition">
            Accéder à la démo →
          </Link>
        </div>
      </nav>

      {/* Hero */}
      <section className="px-6 py-20 text-center max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-full px-4 py-1.5 text-sm text-blue-700 font-medium mb-6">
          <span className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
          Connecté à SILAE · Données hébergées en France · RGPD
        </div>
        <h1 className="text-4xl md:text-5xl font-bold text-gray-900 leading-tight mb-6">
          Le SIRH qui parle<br />
          <span className="text-blue-600">le langage de votre paie</span>
        </h1>
        <p className="text-lg text-gray-600 max-w-2xl mx-auto mb-10">
          ConnectRH automatise la collecte des variables de paie et élimine les erreurs de ressaisie.
          Vos salariés gèrent leurs congés, temps et documents depuis une seule application — 
          tout remonte automatiquement dans SILAE.
        </p>
        <div className="flex flex-col sm:flex-row gap-3 justify-center">
          <Link href="/auth/login"
            className="bg-blue-600 hover:bg-blue-700 text-white font-semibold px-8 py-3.5 rounded-xl text-base transition shadow-lg shadow-blue-200">
            Voir la démo interactive
          </Link>
          <a href="mailto:contact@connectrh.fr"
            className="border border-gray-300 hover:border-gray-400 text-gray-700 font-medium px-8 py-3.5 rounded-xl text-base transition">
            Demander une présentation
          </a>
        </div>
        <p className="mt-4 text-sm text-gray-400">Démo avec données fictives · Aucune installation requise</p>
      </section>

      {/* Douleurs résolues */}
      <section className="bg-gray-50 border-y border-gray-200 px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-sm font-semibold text-blue-600 uppercase tracking-wider text-center mb-2">Pourquoi ConnectRH ?</h2>
          <h3 className="text-2xl font-bold text-gray-900 text-center mb-10">Fini les erreurs de paie liées à la ressaisie</h3>
          <div className="grid md:grid-cols-2 gap-6">
            {[
              { before: 'Congés validés sur papier, ressaisie manuelle dans SILAE', after: 'Transmission automatique à la validation — zéro ressaisie' },
              { before: 'Heures sup collectées par email, comptage manuel', after: 'Compteurs automatiques, export SILAE en un clic' },
              { before: 'Bulletins envoyés par email, perdus dans les boîtes mail', after: 'Coffre-fort sécurisé, accessible 24h/24 depuis le téléphone' },
              { before: 'Entretiens professionnels oubliés → risque juridique', after: 'Alertes automatiques 2 ans / 6 ans, signatures digitales' },
            ].map((item, i) => (
              <div key={i} className="bg-white rounded-xl border border-gray-200 p-5">
                <div className="flex gap-3 mb-3">
                  <span className="text-red-500 text-lg mt-0.5">✕</span>
                  <p className="text-sm text-gray-600">{item.before}</p>
                </div>
                <div className="flex gap-3">
                  <span className="text-green-500 text-lg mt-0.5">✓</span>
                  <p className="text-sm font-medium text-gray-900">{item.after}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Modules */}
      <section className="px-6 py-16 max-w-5xl mx-auto">
        <h2 className="text-sm font-semibold text-blue-600 uppercase tracking-wider text-center mb-2">Modules</h2>
        <h3 className="text-2xl font-bold text-gray-900 text-center mb-10">Tout ce dont votre équipe RH a besoin</h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {MODULES.map(m => (
            <div key={m.label} className="bg-white border border-gray-200 rounded-xl p-4 hover:shadow-md hover:border-blue-200 transition">
              <div className="text-2xl mb-2">{m.icon}</div>
              <p className="text-sm font-semibold text-gray-900 mb-1">{m.label}</p>
              <p className="text-xs text-gray-500 leading-relaxed">{m.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Points forts */}
      <section className="bg-blue-600 px-6 py-16">
        <div className="max-w-4xl mx-auto">
          <h2 className="text-2xl font-bold text-white text-center mb-10">Ce qui nous différencie</h2>
          <div className="grid md:grid-cols-2 gap-6">
            {FEATURES.map(f => (
              <div key={f.title} className="bg-blue-500/40 rounded-xl p-5 border border-blue-400">
                <p className="font-semibold text-white mb-1">{f.title}</p>
                <p className="text-sm text-blue-100">{f.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA final */}
      <section className="px-6 py-20 text-center max-w-2xl mx-auto">
        <h2 className="text-3xl font-bold text-gray-900 mb-4">Prêt à voir ConnectRH en action ?</h2>
        <p className="text-gray-600 mb-8">
          La démo est accessible immédiatement avec 15 salariés fictifs, 
          des congés, pointages, entretiens et documents pré-remplis.
        </p>
        <Link href="/auth/login"
          className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-semibold px-10 py-4 rounded-xl text-base transition shadow-lg shadow-blue-200">
          Accéder à la démo →
        </Link>
        <p className="mt-4 text-sm text-gray-400">
          Identifiants démo fournis sur demande · <a href="mailto:contact@connectrh.fr" className="underline">contact@connectrh.fr</a>
        </p>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-200 px-6 py-8 text-center">
        <p className="text-sm text-gray-400">
          © ConnectRH · Données hébergées en France · RGPD conforme ·{' '}
          <a href="mailto:contact@connectrh.fr" className="hover:text-gray-600 underline">contact@connectrh.fr</a>
        </p>
      </footer>
    </div>
  )
}
