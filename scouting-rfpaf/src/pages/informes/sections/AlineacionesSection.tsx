import { useRef, useState } from 'react'
import { Users, UserPlus, X, RefreshCw } from 'lucide-react'
import { useStore } from '../../../store/useStore'
import { FORMATION_PRESETS } from '../../../utils/tactics'
import type { PartidoInforme, JugadoraTactica } from '../../../types'

interface Props {
  partido: PartidoInforme
  onUpdate: (patch: Partial<PartidoInforme>) => void
}

export default function AlineacionesSection({ partido, onUpdate }: Props) {
  const { convocatorias, fichas } = useStore()
  const [selectedConvId, setSelectedConvId] = useState('')
  const dragRef = useRef<string | null>(null)
  const pitchRef = useRef<HTMLDivElement>(null)

  const titulares = partido.alineacionTitulares
  const suplentes = partido.alineacionSuplentes

  const loadConvocatoria = () => {
    const conv = convocatorias.find((c) => c.id === selectedConvId)
    if (!conv) return
    const preset = FORMATION_PRESETS['4-3-3']
    const nuevaTitulares: JugadoraTactica[] = conv.jugadoras.slice(0, 11).map((j, i) => {
      const ficha = fichas.find((f) => f.id === j.fichaId)
      const pos = preset[i] ?? { x: 50, y: 50 }
      return {
        uid: j.fichaId, numero: ficha?.dorsal ?? i + 1,
        nombre: `${j.nombre} ${j.primerApellido}`, foto: j.foto ?? ficha?.foto ?? null,
        fichaId: j.fichaId, posX: pos.x, posY: pos.y,
      }
    })
    const nuevaSuplentes: JugadoraTactica[] = conv.jugadoras.slice(11).map((j) => {
      const ficha = fichas.find((f) => f.id === j.fichaId)
      return {
        uid: j.fichaId, numero: ficha?.dorsal ?? 0,
        nombre: `${j.nombre} ${j.primerApellido}`, foto: j.foto ?? ficha?.foto ?? null,
        fichaId: j.fichaId, posX: 0, posY: 0,
      }
    })
    onUpdate({ alineacionTitulares: nuevaTitulares, alineacionSuplentes: nuevaSuplentes })
  }

  const moveToSuplentes = (uid: string) => {
    const player = titulares.find((t) => t.uid === uid)
    if (!player) return
    onUpdate({
      alineacionTitulares: titulares.filter((t) => t.uid !== uid),
      alineacionSuplentes: [...suplentes, player],
    })
  }

  const moveToTitulares = (uid: string) => {
    if (titulares.length >= 11) return
    const player = suplentes.find((s) => s.uid === uid)
    if (!player) return
    const preset = FORMATION_PRESETS['4-3-3']
    const pos = preset[titulares.length] ?? { x: 50, y: 50 }
    onUpdate({
      alineacionSuplentes: suplentes.filter((s) => s.uid !== uid),
      alineacionTitulares: [...titulares, { ...player, posX: pos.x, posY: pos.y }],
    })
  }

  const handleDrag = (clientX: number, clientY: number) => {
    if (!dragRef.current || !pitchRef.current) return
    const rect = pitchRef.current.getBoundingClientRect()
    const x = Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100))
    const y = Math.max(2, Math.min(98, ((clientY - rect.top) / rect.height) * 100))
    onUpdate({ alineacionTitulares: titulares.map((t) => t.uid === dragRef.current ? { ...t, posX: x, posY: y } : t) })
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
      <h2 className="font-bold text-rfpaf-blue mb-4">Alineaciones</h2>

      <div className="flex flex-wrap items-end gap-3 mb-4">
        <div>
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Sistema</label>
          <input
            value={partido.sistema}
            onChange={(e) => onUpdate({ sistema: e.target.value })}
            placeholder="Ej: 1-3-5-2"
            className="w-32 border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none"
          />
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wider mb-1.5">Cargar convocatoria</label>
          <select
            value={selectedConvId}
            onChange={(e) => setSelectedConvId(e.target.value)}
            className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none"
          >
            <option value="">— Seleccionar —</option>
            {convocatorias.map((c) => <option key={c.id} value={c.id}>{c.nombre} — {c.fecha}</option>)}
          </select>
        </div>
        <button
          onClick={loadConvocatoria}
          disabled={!selectedConvId}
          className="flex items-center gap-1.5 bg-rfpaf-blue hover:bg-blue-700 disabled:opacity-40 text-white text-sm font-bold px-4 py-2 rounded-xl transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" /> Cargar
        </button>
      </div>

      {/* Pitch with titulares */}
      <div className="flex justify-center mb-4">
        <div
          ref={pitchRef}
          className="relative w-full max-w-md rounded-xl select-none"
          style={{ aspectRatio: '68/105', background: '#2d6a27', touchAction: 'none' }}
          onMouseMove={(e) => handleDrag(e.clientX, e.clientY)}
          onMouseUp={() => { dragRef.current = null }}
          onMouseLeave={() => { dragRef.current = null }}
        >
          <div className="absolute inset-2 border border-white/40 rounded" />
          <div className="absolute left-2 right-2 top-1/2 border-t border-white/40" />
          <div className="absolute left-1/2 top-1/2 w-16 h-16 -translate-x-1/2 -translate-y-1/2 border border-white/40 rounded-full" />
          {titulares.map((t) => (
            <div
              key={t.uid}
              onMouseDown={() => { dragRef.current = t.uid }}
              className="absolute flex flex-col items-center gap-0.5 cursor-grab"
              style={{ left: `${t.posX}%`, top: `${t.posY}%`, transform: 'translate(-50%, -50%)' }}
            >
              <div className="relative">
                <div className="w-9 h-9 rounded-full bg-white border-2 border-rfpaf-blue overflow-hidden flex items-center justify-center text-rfpaf-blue text-xs font-bold shadow">
                  {t.foto ? <img src={t.foto} alt={t.nombre} className="w-full h-full object-cover" /> : t.numero}
                </div>
                <button
                  onMouseDown={(e) => e.stopPropagation()}
                  onClick={() => moveToSuplentes(t.uid)}
                  className="absolute -top-1 -right-1 w-3.5 h-3.5 bg-rfpaf-red rounded-full flex items-center justify-center text-white"
                >
                  <X className="w-2.5 h-2.5" />
                </button>
              </div>
              <span className="text-[9px] font-bold text-white bg-black/50 px-1 rounded whitespace-nowrap">{t.numero} {t.nombre}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Suplentes */}
      <div>
        <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">Suplentes — toca para añadir a titulares ({titulares.length}/11)</p>
        {suplentes.length === 0 ? (
          <p className="text-xs text-gray-400 flex items-center gap-1.5"><Users className="w-3.5 h-3.5" /> Sin suplentes</p>
        ) : (
          <div className="flex flex-wrap gap-2">
            {suplentes.map((s) => (
              <button
                key={s.uid}
                onClick={() => moveToTitulares(s.uid)}
                disabled={titulares.length >= 11}
                className="flex items-center gap-1.5 bg-gray-50 hover:bg-rfpaf-blue/5 border border-gray-200 hover:border-rfpaf-blue/40 rounded-lg pl-1 pr-2.5 py-1 transition-colors disabled:opacity-50"
              >
                <div className="w-6 h-6 rounded-full bg-white border border-gray-300 overflow-hidden flex items-center justify-center text-[10px] font-bold text-gray-500 flex-shrink-0">
                  {s.foto ? <img src={s.foto} alt={s.nombre} className="w-full h-full object-cover" /> : s.numero}
                </div>
                <span className="text-xs font-semibold text-gray-700">{s.numero} {s.nombre}</span>
                <UserPlus className="w-3 h-3 text-gray-400" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
