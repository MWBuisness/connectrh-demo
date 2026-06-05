'use client'
import { useRef, useState, useEffect } from 'react'

interface Props {
  onSigne: (data: { initiales: string; traceSvg: string; timestamp: string }) => void
  onAnnule: () => void
  titrDocument: string
  nomSignataire: string
}

export default function SignatureCanvas({ onSigne, onAnnule, titrDocument, nomSignataire }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const [drawing, setDrawing] = useState(false)
  const [hasTrace, setHasTrace] = useState(false)
  const [initiales, setInitiales] = useState(
    nomSignataire.split(' ').map(n => n[0]).join('').toUpperCase()
  )
  const [etape, setEtape] = useState<'lire' | 'signer' | 'confirmer'>('lire')
  const lastPos = useRef<{ x: number; y: number } | null>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    ctx.strokeStyle = '#1e40af'
    ctx.lineWidth = 2.5
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
  }, [etape])

  function getPos(e: React.MouseEvent | React.TouchEvent) {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    if ('touches' in e) {
      return {
        x: (e.touches[0].clientX - rect.left) * scaleX,
        y: (e.touches[0].clientY - rect.top) * scaleY,
      }
    }
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  function startDraw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    setDrawing(true)
    lastPos.current = getPos(e)
  }

  function draw(e: React.MouseEvent | React.TouchEvent) {
    e.preventDefault()
    if (!drawing) return
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    const pos = getPos(e)
    if (lastPos.current) {
      ctx.beginPath()
      ctx.moveTo(lastPos.current.x, lastPos.current.y)
      ctx.lineTo(pos.x, pos.y)
      ctx.stroke()
      setHasTrace(true)
    }
    lastPos.current = pos
  }

  function stopDraw() {
    setDrawing(false)
    lastPos.current = null
  }

  function effacer() {
    const canvas = canvasRef.current!
    const ctx = canvas.getContext('2d')!
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, canvas.width, canvas.height)
    setHasTrace(false)
  }

  function confirmer() {
    const canvas = canvasRef.current!
    const traceSvg = canvas.toDataURL('image/png')
    onSigne({
      initiales,
      traceSvg,
      timestamp: new Date().toISOString(),
    })
  }

  return (
    <div style={{ position: 'relative', minHeight: '400px', background: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', borderRadius: 'var(--border-radius-lg)', padding: '20px' }}>
      <div className="bg-white rounded-xl shadow-none border border-gray-200 w-full max-w-lg">

        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 bg-blue-100 rounded-lg flex items-center justify-center flex-shrink-0">
              <svg className="w-4 h-4 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
              </svg>
            </div>
            <div>
              <p className="text-sm font-medium text-gray-900">Signature électronique avancée</p>
              <p className="text-xs text-gray-400">Valeur probatoire · Horodatage certifié</p>
            </div>
          </div>
        </div>

        {/* Étapes */}
        <div className="flex border-b border-gray-100">
          {[
            { id: 'lire', label: '1. Lire' },
            { id: 'signer', label: '2. Signer' },
            { id: 'confirmer', label: '3. Confirmer' },
          ].map(step => (
            <div key={step.id}
              className={`flex-1 text-center py-2.5 text-xs font-medium border-b-2 transition-colors ${
                etape === step.id ? 'border-blue-600 text-blue-600' : 'border-transparent text-gray-400'
              }`}>
              {step.label}
            </div>
          ))}
        </div>

        <div className="p-5">
          {/* Étape 1 : Lire et accepter */}
          {etape === 'lire' && (
            <div>
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-4">
                <p className="text-sm font-medium text-blue-900 mb-2">Document à signer</p>
                <p className="text-sm text-blue-800 font-semibold">{titrDocument}</p>
              </div>
              <div className="bg-gray-50 rounded-lg p-4 mb-4 text-xs text-gray-600 space-y-2">
                <p>En signant ce document, vous attestez :</p>
                <ul className="list-disc list-inside space-y-1 ml-2">
                  <li>Avoir lu et compris le contenu du document</li>
                  <li>Donner votre consentement électronique conformément au règlement eIDAS</li>
                  <li>Que la signature sera horodatée et associée à votre identité</li>
                </ul>
                <p className="text-gray-400 mt-3">Signataire : <strong className="text-gray-700">{nomSignataire}</strong></p>
                <p className="text-gray-400">Date : <strong className="text-gray-700">{new Intl.DateTimeFormat('fr-FR', { dateStyle: 'full', timeStyle: 'short' }).format(new Date())}</strong></p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setEtape('signer')}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg text-sm transition">
                  J'ai lu — Passer à la signature
                </button>
                <button onClick={onAnnule}
                  className="px-4 py-2.5 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition">
                  Annuler
                </button>
              </div>
            </div>
          )}

          {/* Étape 2 : Dessiner la signature */}
          {etape === 'signer' && (
            <div>
              <div className="mb-3">
                <label className="block text-xs font-medium text-gray-600 mb-1">Vos initiales</label>
                <input
                  value={initiales}
                  onChange={e => setInitiales(e.target.value.toUpperCase().slice(0, 4))}
                  maxLength={4}
                  className="w-24 px-3 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 text-center font-semibold tracking-widest"
                />
              </div>
              <p className="text-xs text-gray-500 mb-2">Dessinez votre signature dans le cadre ci-dessous</p>
              <div className="border-2 border-dashed border-gray-300 rounded-lg overflow-hidden bg-white mb-3 relative"
                style={{ touchAction: 'none' }}>
                <canvas
                  ref={canvasRef}
                  width={480}
                  height={160}
                  className="w-full cursor-crosshair"
                  onMouseDown={startDraw}
                  onMouseMove={draw}
                  onMouseUp={stopDraw}
                  onMouseLeave={stopDraw}
                  onTouchStart={startDraw}
                  onTouchMove={draw}
                  onTouchEnd={stopDraw}
                />
                {!hasTrace && (
                  <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                    <p className="text-gray-300 text-sm">Signez ici avec votre souris ou votre doigt</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2">
                <button onClick={() => { setEtape('confirmer') }}
                  disabled={!hasTrace}
                  className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-medium py-2.5 rounded-lg text-sm transition">
                  Valider ma signature
                </button>
                <button onClick={effacer}
                  className="px-4 py-2.5 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition">
                  Effacer
                </button>
                <button onClick={() => setEtape('lire')}
                  className="px-4 py-2.5 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition">
                  Retour
                </button>
              </div>
            </div>
          )}

          {/* Étape 3 : Confirmation finale */}
          {etape === 'confirmer' && (
            <div>
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-4">
                <div className="flex items-start gap-2">
                  <svg className="w-4 h-4 text-amber-600 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  <div className="text-xs text-amber-800">
                    <p className="font-semibold mb-1">Cette action est irréversible</p>
                    <p>Une fois confirmée, la signature sera horodatée et associée de façon permanente au document. Vous recevrez une copie signée dans votre coffre-fort.</p>
                  </div>
                </div>
              </div>
              <div className="bg-gray-50 rounded-lg p-3 mb-4 text-xs text-gray-600">
                <div className="flex justify-between mb-1">
                  <span>Document</span>
                  <span className="font-medium text-gray-900">{titrDocument}</span>
                </div>
                <div className="flex justify-between mb-1">
                  <span>Signataire</span>
                  <span className="font-medium text-gray-900">{nomSignataire} ({initiales})</span>
                </div>
                <div className="flex justify-between">
                  <span>Horodatage</span>
                  <span className="font-medium text-gray-900">
                    {new Intl.DateTimeFormat('fr-FR', { dateStyle: 'short', timeStyle: 'medium' }).format(new Date())}
                  </span>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={confirmer}
                  className="flex-1 bg-green-600 hover:bg-green-700 text-white font-medium py-2.5 rounded-lg text-sm transition flex items-center justify-center gap-2">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Confirmer et signer
                </button>
                <button onClick={() => setEtape('signer')}
                  className="px-4 py-2.5 border border-gray-300 text-gray-600 rounded-lg text-sm hover:bg-gray-50 transition">
                  Modifier
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
