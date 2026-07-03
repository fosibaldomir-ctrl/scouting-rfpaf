import { useState } from 'react'
import { Layers, Zap, ShieldAlert } from 'lucide-react'
import AbpPizarraCapture from '../../../components/AbpPizarraCapture'
import { uploadInformeArchivo } from '../../../lib/supabase'
import type { PartidoInforme, PlanFase, EquipoTactico } from '../../../types'

interface Props {
  partido: PartidoInforme
  onUpdate: (patch: Partial<PartidoInforme>) => void
}

type Slot = 'imagenUrl' | 'variante1Url' | 'variante2Url'
type Fase = 'planOfensivo' | 'planDefensivo'

function DiagramSlot({ url, label, big, onCapture }: { url: string; label: string; big?: boolean; onCapture: () => void }) {
  return (
    <div>
      <p className="text-[10px] font-semibold text-gray-400 uppercase tracking-wider mb-1">{label}</p>
      <button
        onClick={onCapture}
        title={label}
        aria-label={label}
        className={`w-full rounded-xl border-2 border-dashed border-gray-300 hover:border-rfpaf-blue transition-colors overflow-hidden bg-gray-50 flex items-center justify-center ${big ? '' : ''}`}
        style={{ aspectRatio: '16/9' }}
      >
        {url ? <img src={url} alt={label} className="w-full h-full object-cover" /> : <Layers className={big ? 'w-7 h-7 text-gray-300' : 'w-5 h-5 text-gray-300'} />}
      </button>
    </div>
  )
}

export default function PlanPartidoSection({ partido, onUpdate }: Props) {
  const [captureTarget, setCaptureTarget] = useState<{ fase: Fase; slot: Slot } | null>(null)

  const handleCapture = async (dataUrl: string) => {
    if (!captureTarget) return
    const { fase, slot } = captureTarget
    setCaptureTarget(null)
    const res = await fetch(dataUrl)
    const blob = await res.blob()
    const file = new File([blob], `plan-${fase}-${slot}-${Date.now()}.png`, { type: 'image/png' })
    const url = await uploadInformeArchivo(file, partido.informeId)
    if (url) onUpdate({ [fase]: { ...partido[fase], [slot]: url } })
  }
  const handleCaptureVideo = async (file: File) => {
    if (!captureTarget) return
    const { fase, slot } = captureTarget
    setCaptureTarget(null)
    const url = await uploadInformeArchivo(file, partido.informeId)
    if (url) onUpdate({ [fase]: { ...partido[fase], [slot]: url } })
  }

  const equipoLocal: EquipoTactico = { nombre: 'Nuestro equipo', formacion: '4-3-3', color: '#1a3a6b', jugadoras: partido.alineacionTitulares }
  const equipoVisitante: EquipoTactico = { nombre: partido.rivalNombre || 'Rival', formacion: '4-4-2', color: '#c0392b', jugadoras: [] }

  const faseBlock = (fase: Fase, plan: PlanFase, label: string, icon: React.ReactNode, color: string) => (
    <div className="flex-1 min-w-[280px] border border-gray-200 rounded-xl p-4">
      <div className="flex items-center gap-2 mb-3">
        <div className="w-7 h-7 rounded-lg flex items-center justify-center" style={{ background: color }}>{icon}</div>
        <h3 className="font-bold text-sm uppercase tracking-wide" style={{ color }}>{label}</h3>
      </div>
      <textarea
        rows={3}
        value={plan.explicacion}
        onChange={(e) => onUpdate({ [fase]: { ...plan, explicacion: e.target.value } })}
        placeholder="Explicación general…"
        className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none resize-none mb-3"
      />
      <DiagramSlot url={plan.imagenUrl} label="Diagrama principal" big onCapture={() => setCaptureTarget({ fase, slot: 'imagenUrl' })} />
      <div className="grid grid-cols-2 gap-2 mt-2">
        <DiagramSlot url={plan.variante1Url} label="Variante 1" onCapture={() => setCaptureTarget({ fase, slot: 'variante1Url' })} />
        <DiagramSlot url={plan.variante2Url} label="Variante 2" onCapture={() => setCaptureTarget({ fase, slot: 'variante2Url' })} />
      </div>
    </div>
  )

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
      <h2 className="font-bold text-rfpaf-blue mb-4">Plan de Partido</h2>
      <div className="flex flex-col lg:flex-row gap-4">
        {faseBlock('planOfensivo', partido.planOfensivo, 'Fase Ofensiva', <Zap className="w-4 h-4 text-white" />, '#1a3a6b')}
        {faseBlock('planDefensivo', partido.planDefensivo, 'Fase Defensiva', <ShieldAlert className="w-4 h-4 text-white" />, '#c0392b')}
      </div>

      {captureTarget && (
        <AbpPizarraCapture
          equipoLocal={equipoLocal}
          equipoVisitante={equipoVisitante}
          onCapture={handleCapture}
          onCaptureVideo={handleCaptureVideo}
          onClose={() => setCaptureTarget(null)}
        />
      )}
    </div>
  )
}
