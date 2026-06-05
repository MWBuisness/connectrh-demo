'use client'
import { useState, useMemo } from 'react'
import { calculerCout, formatEuros, formatPct } from '@/lib/calculs-paie'
import type { ParametresCalcul } from '@/lib/calculs-paie'

const SMIG_MENSUEL = 1801.80

export default function SimulateurClient() {
  const [onglet, setOnglet] = useState<'recrutement'|'augmentation'|'rupture'|'temps-partiel'>('recrutement')

  // Paramètres principaux
  const [brut, setBrut] = useState(3000)
  const [typeContrat, setTypeContrat] = useState<ParametresCalcul['typeContrat']>('CDI')
  const [statut, setStatut] = useState<ParametresCalcul['statut']>('employe')
  const [tempsTravail, setTempsTravail] = useState(100)
  const [anciennete, setAnciennete] = useState(0)
  const [convention, setConvention] = useState('')

  // Scénario augmentation
  const [brutApres, setBrutApres] = useState(3300)

  // Scénario rupture
  const [typeRupture, setTypeRupture] = useState<'licenciement'|'rupture_conv'|'demission'>('licenciement')
  const [salaireBrutMoyen, setSalaireBrutMoyen] = useState(3000)
  const [ancienneteRupture, setAncienneteRupture] = useState(3)

  const [detailOpen, setDetailOpen] = useState(false)

  const params: ParametresCalcul = {
    salaireBrut: brut, typeContrat, statut, tempsTravail,
    anciennete, convention, avantagesNature: 0, fraisPro: 0,
  }

  const resultat = useMemo(() => calculerCout(params), [brut, typeContrat, statut, tempsTravail, anciennete])

  const resultatApres = useMemo(() => calculerCout({ ...params, salaireBrut: brutApres }), [brutApres, typeContrat, statut, tempsTravail])

  const resultatTP = useMemo(() => calculerCout({ ...params, tempsTravail: 80 }), [brut, typeContrat, statut])

  // Calcul indemnités rupture
  function calcIndemnites() {
    const baseIndemnite = salaireBrutMoyen / 4 * ancienneteRupture
    if (typeRupture === 'demission') return { legale: 0, label: 'Aucune indemnité légale', charges: 0 }
    const legale = ancienneteRupture >= 1 ? baseIndemnite : 0
    const exonereeCharges = Math.min(legale, 87984)
    return { legale, label: 'Indemnité légale minimum', charges: Math.max(0, legale - exonereeCharges) * 0.45 }
  }
  const indemnites = calcIndemnites()

  return (
    <div className="space-y-5">
      {/* Sélecteur d'onglet */}
      <div className="bg-white border border-gray-200 rounded-xl p-1 flex gap-1">
        {[
          { id: 'recrutement', label: '🧮 Coût d\'un recrutement' },
          { id: 'augmentation', label: '📈 Impact d\'une augmentation' },
          { id: 'rupture', label: '🤝 Rupture de contrat' },
          { id: 'temps-partiel', label: '⏱️ Passage temps partiel' },
        ].map(o => (
          <button key={o.id} onClick={() => setOnglet(o.id as any)}
            className={`flex-1 py-2 px-2 rounded-lg text-xs font-medium transition text-center ${onglet === o.id ? 'bg-blue-600 text-white shadow-sm' : 'text-gray-500 hover:text-gray-700 hover:bg-gray-50'}`}>
            {o.label}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-5 gap-5">
        {/* Panneau gauche : paramètres */}
        <div className="lg:col-span-2 space-y-4">
          <div className="bg-white border border-gray-200 rounded-xl p-5">
            <h3 className="text-sm font-medium text-gray-900 mb-4">Paramètres</h3>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-gray-600">Salaire brut mensuel</label>
                  <span className="text-sm font-semibold text-blue-600">{formatEuros(brut)}</span>
                </div>
                <input type="range" min={1802} max={20000} step={50} value={brut}
                  onChange={e => setBrut(parseInt(e.target.value))}
                  className="w-full accent-blue-600" />
                <div className="flex justify-between text-[10px] text-gray-400 mt-0.5">
                  <span>SMIC {formatEuros(SMIG_MENSUEL)}</span>
                  <span>20 000 €</span>
                </div>
                <div className="mt-1.5 flex gap-2">
                  <input type="number" value={brut} onChange={e => setBrut(parseInt(e.target.value) || 0)}
                    className="w-32 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                  <span className="text-xs text-gray-400 self-center">€ brut / mois</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Contrat</label>
                  <select value={typeContrat} onChange={e => setTypeContrat(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="CDI">CDI</option>
                    <option value="CDD">CDD</option>
                    <option value="Stage">Stage</option>
                    <option value="Alternance">Alternance</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Statut</label>
                  <select value={statut} onChange={e => setStatut(e.target.value as any)}
                    className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="employe">Employé</option>
                    <option value="cadre">Cadre</option>
                  </select>
                </div>
              </div>

              <div>
                <div className="flex justify-between items-center mb-1">
                  <label className="text-xs font-medium text-gray-600">Temps de travail</label>
                  <span className="text-sm font-semibold text-gray-700">{tempsTravail} %</span>
                </div>
                <input type="range" min={10} max={100} step={5} value={tempsTravail}
                  onChange={e => setTempsTravail(parseInt(e.target.value))}
                  className="w-full accent-blue-600" />
              </div>

              {onglet === 'augmentation' && (
                <div>
                  <div className="flex justify-between items-center mb-1">
                    <label className="text-xs font-medium text-gray-600">Salaire brut <em>après</em> augmentation</label>
                    <span className="text-sm font-semibold text-green-600">{formatEuros(brutApres)}</span>
                  </div>
                  <input type="range" min={brut} max={brut * 2} step={50} value={brutApres}
                    onChange={e => setBrutApres(parseInt(e.target.value))}
                    className="w-full accent-green-600" />
                  <div className="mt-1.5 flex gap-2">
                    <input type="number" value={brutApres} onChange={e => setBrutApres(parseInt(e.target.value) || 0)}
                      className="w-32 px-2 py-1 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    <span className="text-xs text-gray-400 self-center">€ brut / mois</span>
                  </div>
                </div>
              )}

              {onglet === 'rupture' && (
                <div className="space-y-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-600 mb-1">Type de rupture</label>
                    <select value={typeRupture} onChange={e => setTypeRupture(e.target.value as any)}
                      className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                      <option value="licenciement">Licenciement</option>
                      <option value="rupture_conv">Rupture conventionnelle</option>
                      <option value="demission">Démission</option>
                    </select>
                  </div>
                  <div className="grid grid-cols-2 gap-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Salaire brut moyen</label>
                      <input type="number" value={salaireBrutMoyen} onChange={e => setSalaireBrutMoyen(parseInt(e.target.value))}
                        className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-600 mb-1">Ancienneté (années)</label>
                      <input type="number" value={ancienneteRupture} onChange={e => setAncienneteRupture(parseInt(e.target.value))}
                        min={0} max={50} className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* SMIC comparaison */}
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4">
            <p className="text-xs font-medium text-blue-800 mb-2">Référence SMIC 2025</p>
            <div className="grid grid-cols-2 gap-2 text-xs">
              {[
                ['SMIC mensuel brut', '1 801,80 €'],
                ['SMIC net mensuel', '~1 426 €'],
                ['SMIC horaire brut', '11,88 €'],
                ['SMIC annuel brut', '21 621 €'],
              ].map(([l, v]) => (
                <div key={l}><span className="text-blue-600">{l}</span><br /><span className="font-semibold text-blue-900">{v}</span></div>
              ))}
            </div>
          </div>
        </div>

        {/* Panneau droit : résultats */}
        <div className="lg:col-span-3 space-y-4">

          {/* === RECRUTEMENT === */}
          {onglet === 'recrutement' && (
            <>
              {/* Récap principal */}
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-sm font-medium text-gray-900 mb-4">Résultat mensuel</h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  {[
                    { label: 'Coût total employeur', value: formatEuros(resultat.coutTotalEmployeur), color: 'text-red-600', big: true },
                    { label: 'Salaire net versé', value: formatEuros(resultat.salaireNet), color: 'text-green-600', big: true },
                    { label: 'Charges patronales nettes', value: formatEuros(resultat.cotisationsPatronales), color: 'text-gray-700', big: false },
                    { label: 'Charges salariales', value: formatEuros(resultat.cotisationsSalarie), color: 'text-gray-700', big: false },
                  ].map(s => (
                    <div key={s.label} className="bg-gray-50 rounded-xl p-4">
                      <p className="text-xs text-gray-500 mb-1">{s.label}</p>
                      <p className={`${s.big ? 'text-2xl' : 'text-lg'} font-semibold ${s.color}`}>{s.value}</p>
                    </div>
                  ))}
                </div>

                {/* Visualisation décomposition */}
                <div className="space-y-2 mb-4">
                  {[
                    { label: 'Salaire net', pct: resultat.salaireNet / resultat.coutTotalEmployeur * 100, color: '#1D9E75', value: resultat.salaireNet },
                    { label: 'Charges salariales', pct: resultat.cotisationsSalarie / resultat.coutTotalEmployeur * 100, color: '#378ADD', value: resultat.cotisationsSalarie },
                    { label: 'Charges patronales', pct: resultat.cotisationsPatronales / resultat.coutTotalEmployeur * 100, color: '#BA7517', value: resultat.cotisationsPatronales },
                  ].map(item => (
                    <div key={item.label} className="flex items-center gap-3 text-xs">
                      <span className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ background: item.color }} />
                      <span className="w-36 text-gray-600">{item.label}</span>
                      <div className="flex-1 h-3 bg-gray-100 rounded-full overflow-hidden">
                        <div className="h-full rounded-full" style={{ width: `${item.pct}%`, background: item.color }} />
                      </div>
                      <span className="w-16 text-right font-medium text-gray-900">{formatEuros(item.value)}</span>
                      <span className="w-12 text-right text-gray-400">{item.pct.toFixed(0)}%</span>
                    </div>
                  ))}
                </div>

                {/* Réduction Fillon */}
                {resultat.reductionFillon > 0 && (
                  <div className="bg-green-50 border border-green-200 rounded-lg px-3 py-2 text-xs flex justify-between">
                    <span className="text-green-700">✓ Réduction Fillon appliquée</span>
                    <span className="font-semibold text-green-800">- {formatEuros(resultat.reductionFillon)}</span>
                  </div>
                )}
              </div>

              {/* Annuel + taux */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-2">Vision annuelle (12 mois)</p>
                  <p className="text-xl font-semibold text-red-600">{formatEuros(resultat.coutAnnuel)}</p>
                  <p className="text-xs text-gray-400 mt-0.5">coût total employeur</p>
                  <div className="mt-3 space-y-1">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Brut annuel</span>
                      <span className="font-medium">{formatEuros(brut * 12)}</span>
                    </div>
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-500">Net annuel</span>
                      <span className="font-medium text-green-600">{formatEuros(resultat.salaireNet * 12)}</span>
                    </div>
                  </div>
                </div>
                <div className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500 mb-3">Taux de charges effectifs</p>
                  {[
                    { label: 'Charges salariales', value: resultat.tauxChargesSalarie, color: '#378ADD' },
                    { label: 'Charges patronales', value: resultat.tauxChargesPatronales, color: '#BA7517' },
                    { label: 'Taux global', value: resultat.tauxChargesGlobal, color: '#534AB7' },
                  ].map(t => (
                    <div key={t.label} className="flex justify-between items-center mb-2">
                      <div className="flex items-center gap-1.5">
                        <span className="w-2 h-2 rounded-full" style={{ background: t.color }} />
                        <span className="text-xs text-gray-600">{t.label}</span>
                      </div>
                      <span className="text-sm font-semibold" style={{ color: t.color }}>{formatPct(t.value)}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Détail ligne à ligne */}
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <button onClick={() => setDetailOpen(o => !o)}
                  className="w-full flex items-center justify-between px-5 py-3 hover:bg-gray-50 transition text-sm font-medium text-gray-700">
                  Détail des cotisations
                  <svg className={`w-4 h-4 transition-transform ${detailOpen ? 'rotate-180' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </button>
                {detailOpen && (
                  <table className="w-full text-xs">
                    <thead>
                      <tr className="border-t border-b border-gray-100 bg-gray-50">
                        <th className="text-left px-4 py-2 font-medium text-gray-500">Cotisation</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-500">Base</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-500">Taux sal.</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-500">Taux pat.</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-500">Salarié</th>
                        <th className="text-right px-4 py-2 font-medium text-gray-500">Patronal</th>
                      </tr>
                    </thead>
                    <tbody>
                      {['sante','retraite','chomage','prevoyance','autres'].map(cat => {
                        const lignes = resultat.detail.filter(l => l.categorie === cat)
                        if (!lignes.length) return null
                        const labels: Record<string,string> = { sante:'Santé', retraite:'Retraite', chomage:'Chômage', prevoyance:'Prévoyance', autres:'Autres' }
                        return [
                          <tr key={`head-${cat}`} className="bg-gray-50">
                            <td colSpan={6} className="px-4 py-1.5 font-semibold text-gray-600 text-[10px] uppercase tracking-wider">{labels[cat]}</td>
                          </tr>,
                          ...lignes.map(l => (
                            <tr key={l.libelle} className="border-b border-gray-50 hover:bg-gray-50">
                              <td className="px-4 py-2 text-gray-700">{l.libelle}</td>
                              <td className="px-4 py-2 text-right text-gray-500">{formatEuros(l.base)}</td>
                              <td className="px-4 py-2 text-right text-gray-500">{l.tauxSalarie ? `${l.tauxSalarie}%` : '—'}</td>
                              <td className="px-4 py-2 text-right text-gray-500">{l.tauxPatronal ? `${l.tauxPatronal}%` : '—'}</td>
                              <td className="px-4 py-2 text-right font-medium text-blue-700">{l.montantSalarie ? formatEuros(l.montantSalarie) : '—'}</td>
                              <td className="px-4 py-2 text-right font-medium text-amber-700">{l.montantPatronal ? formatEuros(l.montantPatronal) : '—'}</td>
                            </tr>
                          ))
                        ]
                      })}
                      <tr className="bg-gray-100 font-semibold border-t border-gray-200">
                        <td colSpan={4} className="px-4 py-3 text-gray-900">TOTAL</td>
                        <td className="px-4 py-3 text-right text-blue-700">{formatEuros(resultat.cotisationsSalarie)}</td>
                        <td className="px-4 py-3 text-right text-amber-700">{formatEuros(resultat.cotisationsPatronales)}</td>
                      </tr>
                    </tbody>
                  </table>
                )}
              </div>
            </>
          )}

          {/* === AUGMENTATION === */}
          {onglet === 'augmentation' && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-medium text-gray-900 mb-5">Impact d'une augmentation</h3>
              <div className="grid grid-cols-3 gap-4 mb-6">
                {[
                  { label: 'Avant', brut: brut, net: resultat.salaireNet, cout: resultat.coutTotalEmployeur, color: 'border-gray-200' },
                  { label: 'Après', brut: brutApres, net: resultatApres.salaireNet, cout: resultatApres.coutTotalEmployeur, color: 'border-green-300' },
                  { label: 'Delta mensuel', brut: brutApres - brut, net: resultatApres.salaireNet - resultat.salaireNet, cout: resultatApres.coutTotalEmployeur - resultat.coutTotalEmployeur, color: 'border-blue-300', delta: true },
                ].map(col => (
                  <div key={col.label} className={`border-2 rounded-xl p-4 ${col.color}`}>
                    <p className="text-xs font-semibold text-gray-500 mb-3">{col.label}</p>
                    <div className="space-y-2">
                      <div><p className="text-[10px] text-gray-400">Brut mensuel</p><p className={`text-base font-semibold ${col.delta && col.brut > 0 ? 'text-green-600' : 'text-gray-900'}`}>{col.delta && col.brut > 0 ? '+' : ''}{formatEuros(col.brut)}</p></div>
                      <div><p className="text-[10px] text-gray-400">Net salarié</p><p className={`text-base font-semibold ${col.delta ? 'text-green-600' : 'text-green-600'}`}>{col.delta ? '+' : ''}{formatEuros(col.net)}</p></div>
                      <div><p className="text-[10px] text-gray-400">Coût employeur</p><p className={`text-base font-semibold ${col.delta ? 'text-red-600' : 'text-red-600'}`}>{col.delta ? '+' : ''}{formatEuros(col.cout)}</p></div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Analyse */}
              <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 space-y-2">
                <p className="text-sm font-medium text-blue-900">Analyse de l'augmentation</p>
                {[
                  { label: 'Hausse brute', value: formatEuros(brutApres - brut), sub: `+ ${(((brutApres - brut) / brut) * 100).toFixed(1)}%` },
                  { label: 'Gain net salarié / mois', value: formatEuros(resultatApres.salaireNet - resultat.salaireNet), sub: `${(((resultatApres.salaireNet - resultat.salaireNet) / resultat.salaireNet) * 100).toFixed(1)}% de hausse nette` },
                  { label: 'Surcoût employeur / mois', value: formatEuros(resultatApres.coutTotalEmployeur - resultat.coutTotalEmployeur), sub: '' },
                  { label: 'Surcoût employeur / an', value: formatEuros((resultatApres.coutTotalEmployeur - resultat.coutTotalEmployeur) * 12), sub: '' },
                  { label: 'Ratio net/brut augmentation', value: `${((resultatApres.salaireNet - resultat.salaireNet) / (brutApres - brut) * 100).toFixed(0)}%`, sub: 'du brut augmenté perçu en net' },
                ].map(r => (
                  <div key={r.label} className="flex justify-between items-baseline">
                    <span className="text-xs text-blue-700">{r.label}</span>
                    <div className="text-right"><span className="text-sm font-semibold text-blue-900">{r.value}</span>{r.sub && <span className="text-[10px] text-blue-500 ml-1">{r.sub}</span>}</div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* === RUPTURE === */}
          {onglet === 'rupture' && (
            <div className="space-y-4">
              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-sm font-medium text-gray-900 mb-4">
                  {typeRupture === 'licenciement' ? 'Licenciement' : typeRupture === 'rupture_conv' ? 'Rupture conventionnelle' : 'Démission'}
                </h3>
                <div className="grid grid-cols-2 gap-4 mb-4">
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Indemnité légale brute</p>
                    <p className="text-2xl font-semibold text-gray-900">{formatEuros(indemnites.legale)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">{indemnites.label}</p>
                  </div>
                  <div className="bg-gray-50 rounded-xl p-4">
                    <p className="text-xs text-gray-500 mb-1">Charges sur excédent</p>
                    <p className="text-2xl font-semibold text-amber-600">{formatEuros(indemnites.charges)}</p>
                    <p className="text-xs text-gray-400 mt-0.5">si indemnité &gt; plafond exo.</p>
                  </div>
                </div>
                {typeRupture !== 'demission' && (
                  <div className="bg-amber-50 border border-amber-200 rounded-lg p-3 text-xs text-amber-800 space-y-1">
                    <p className="font-medium">Calcul légal (branche non-cadre)</p>
                    <p>¼ de mois de salaire brut moyen × nombre d'années (au-delà de 10 ans : ⅓)</p>
                    <p>Exonération de charges sociales jusqu'à 87 984 € (2× le plafond annuel SS 2025)</p>
                    {typeRupture === 'rupture_conv' && <p className="font-medium text-amber-900">Rupture conventionnelle : indemnité ≥ indemnité légale de licenciement · forfait social 20% si &gt; plafond exo.</p>}
                  </div>
                )}
              </div>

              <div className="bg-white border border-gray-200 rounded-xl p-5">
                <h3 className="text-sm font-medium text-gray-900 mb-3">Coûts annexes à prévoir</h3>
                <div className="space-y-2 text-sm">
                  {[
                    { label: 'Solde de tout compte', value: 'Variable', sub: 'CP non pris, RTT, heures sup' },
                    { label: 'Préavis (si non effectué)', value: salaireBrutMoyen > 0 ? formatEuros(salaireBrutMoyen * (ancienneteRupture < 2 ? 1 : ancienneteRupture < 10 ? 2 : 3)) : '—', sub: '1 à 3 mois selon ancienneté' },
                    { label: 'Portabilité mutuelle', value: `${Math.min(ancienneteRupture, 12)} mois`, sub: '1 mois par mois travaillé, max 12' },
                    { label: 'Attestation Pôle emploi', value: 'Obligatoire', sub: 'J+1 de la rupture' },
                  ].map(r => (
                    <div key={r.label} className="flex justify-between py-2 border-b border-gray-100 last:border-0">
                      <div><p className="text-gray-800">{r.label}</p><p className="text-xs text-gray-400">{r.sub}</p></div>
                      <span className="font-medium text-gray-900">{r.value}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* === TEMPS PARTIEL === */}
          {onglet === 'temps-partiel' && (
            <div className="bg-white border border-gray-200 rounded-xl p-5">
              <h3 className="text-sm font-medium text-gray-900 mb-5">Comparaison temps plein vs temps partiel</h3>
              <div className="grid grid-cols-3 gap-4 mb-5">
                {[
                  { label: 'Temps plein (100%)', r: resultat, pct: 100 },
                  { label: '80% (4/5)', r: calculerCout({ ...params, salaireBrut: brut * 0.8, tempsTravail: 80 }), pct: 80 },
                  { label: '50% (mi-temps)', r: calculerCout({ ...params, salaireBrut: brut * 0.5, tempsTravail: 50 }), pct: 50 },
                ].map(col => (
                  <div key={col.label} className="border border-gray-200 rounded-xl p-4">
                    <p className="text-xs font-medium text-gray-600 mb-3">{col.label}</p>
                    <div className="space-y-2">
                      <div><p className="text-[10px] text-gray-400">Brut mensuel</p><p className="text-sm font-semibold text-gray-900">{formatEuros(col.r.salaireBrut)}</p></div>
                      <div><p className="text-[10px] text-gray-400">Net salarié</p><p className="text-sm font-semibold text-green-600">{formatEuros(col.r.salaireNet)}</p></div>
                      <div><p className="text-[10px] text-gray-400">Coût employeur</p><p className="text-sm font-semibold text-red-600">{formatEuros(col.r.coutTotalEmployeur)}</p></div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 text-xs text-amber-800">
                <p className="font-semibold mb-2">Points d'attention temps partiel</p>
                <ul className="space-y-1 list-disc list-inside">
                  <li>Réduction Fillon recalculée sur la base proratisée du SMIC</li>
                  <li>Majoration heures complémentaires à partir de 1/10ème du temps contractuel</li>
                  <li>Droit à la complémentaire santé maintenu à 100%</li>
                  <li>Cotisation retraite possible à taux plein sur option (accord salarié + employeur)</li>
                </ul>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Disclaimer */}
      <div className="bg-gray-50 border border-gray-200 rounded-xl px-4 py-3 text-xs text-gray-500 flex items-start gap-2">
        <svg className="w-4 h-4 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
        <span>Simulation indicative basée sur les taux URSSAF 2025 pour la convention générale. Les taux réels peuvent varier selon votre convention collective, le secteur d'activité, et les accords d'entreprise. Ne se substitue pas à un conseil d'un expert-comptable ou d'un juriste social.</span>
      </div>
    </div>
  )
}
