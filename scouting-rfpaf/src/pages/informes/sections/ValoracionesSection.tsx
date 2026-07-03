import { useEffect, useState } from 'react'
import { UserCircle2, Plus, Trash2, ChevronDown, ChevronUp } from 'lucide-react'
import { useStore } from '../../../store/useStore'
import type { PartidoInforme, EvaluacionJugadora, JugadoraTactica } from '../../../types'

interface Props { partido: PartidoInforme }

function MiniPitch({ x, y }: { x: number | null; y: number | null }) {
  return (
    <div className="relative w-full rounded-lg overflow-hidden flex-shrink-0" style={{ aspectRatio: '68/105', background: '#2d6a27' }}>
      <div className="absolute inset-1 border border-white/40 rounded-sm" />
      <div className="absolute left-1 right-1 top-1/2 border-t border-white/40" />
      {x !== null && y !== null && (
        <div className="absolute w-3 h-3 rounded-full bg-white border-2 border-rfpaf-red shadow" style={{ left: `${x}%`, top: `${y}%`, transform: 'translate(-50%, -50%)' }} />
      )}
    </div>
  )
}

function StatField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <div className="text-center">
      <p className="text-[9px] font-bold text-gray-400 uppercase">{label}</p>
      <input
        type="number"
        value={value}
        onChange={(e) => onChange(Number(e.target.value))}
        className="w-full text-center border border-gray-200 rounded-lg py-1 text-sm font-semibold text-gray-700 focus:ring-2 focus:ring-rfpaf-blue outline-none"
      />
    </div>
  )
}

function EvaluacionCard({ ev, onUpdate, onDelete }: {
  ev: EvaluacionJugadora
  onUpdate: (patch: Partial<EvaluacionJugadora>) => void
  onDelete: () => void
}) {
  const [expanded, setExpanded] = useState(true)
  const sinCalificar = ev.valoracion === null

  return (
    <div className="border border-gray-200 rounded-2xl overflow-hidden">
      <div className="flex items-center justify-between px-4 py-2.5 bg-gray-50 cursor-pointer" onClick={() => setExpanded((v) => !v)}>
        <div className="flex items-center gap-2 min-w-0">
          <span className="w-6 h-6 rounded-full bg-rfpaf-blue text-white text-xs font-bold flex items-center justify-center flex-shrink-0">{ev.dorsal ?? '–'}</span>
          <span className="font-bold text-sm text-gray-800 truncate">{ev.nombre} {ev.apellidos}</span>
        </div>
        <div className="flex items-center gap-1 flex-shrink-0">
          <button onClick={(e) => { e.stopPropagation(); onDelete() }} className="text-gray-300 hover:text-rfpaf-red p-1 rounded-lg hover:bg-red-50 transition-colors">
            <Trash2 className="w-3.5 h-3.5" />
          </button>
          {expanded ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </div>
      </div>

      {expanded && (
        <div className="p-4 grid grid-cols-1 sm:grid-cols-[auto_1fr] gap-4">
          <div className="flex sm:flex-col gap-3 items-center sm:items-stretch">
            <div className="w-20 h-20 rounded-xl bg-gray-100 border border-gray-200 overflow-hidden flex items-center justify-center flex-shrink-0">
              {ev.fotoUrl ? <img src={ev.fotoUrl} alt={ev.nombre} className="w-full h-full object-cover object-top" /> : <UserCircle2 className="w-10 h-10 text-gray-300" />}
            </div>
            <div className="w-20 sm:w-24">
              <MiniPitch x={ev.posicionX} y={ev.posicionY} />
            </div>
          </div>

          <div className="space-y-3 min-w-0">
            <div className="grid grid-cols-2 gap-2">
              <input value={ev.nombre} onChange={(e) => onUpdate({ nombre: e.target.value })} placeholder="Nombre"
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-rfpaf-blue outline-none" />
              <input value={ev.apellidos} onChange={(e) => onUpdate({ apellidos: e.target.value })} placeholder="Apellidos"
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-rfpaf-blue outline-none" />
              <input value={ev.lateralidad} onChange={(e) => onUpdate({ lateralidad: e.target.value })} placeholder="Diestra/Zurda"
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-rfpaf-blue outline-none" />
              <input type="date" value={ev.fechaNacimiento} onChange={(e) => onUpdate({ fechaNacimiento: e.target.value })}
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-rfpaf-blue outline-none" />
              <input type="number" value={ev.dorsal ?? ''} onChange={(e) => onUpdate({ dorsal: e.target.value === '' ? null : Number(e.target.value) })} placeholder="Dorsal"
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-rfpaf-blue outline-none" />
              <input value={ev.clubNombre} onChange={(e) => onUpdate({ clubNombre: e.target.value })} placeholder="Club"
                className="border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs focus:ring-2 focus:ring-rfpaf-blue outline-none" />
            </div>

            <div className="grid grid-cols-6 gap-1.5 items-end">
              <StatField label="MIN" value={ev.minutos} onChange={(v) => onUpdate({ minutos: v })} />
              <StatField label="G" value={ev.goles} onChange={(v) => onUpdate({ goles: v })} />
              <StatField label="A" value={ev.asistencias} onChange={(v) => onUpdate({ asistencias: v })} />
              <StatField label="TA" value={ev.tarjetasAmarillas} onChange={(v) => onUpdate({ tarjetasAmarillas: v })} />
              <StatField label="TR" value={ev.tarjetasRojas} onChange={(v) => onUpdate({ tarjetasRojas: v })} />
              <div className="text-center">
                <p className="text-[9px] font-bold text-gray-400 uppercase">VAL</p>
                {sinCalificar ? (
                  <button onClick={() => onUpdate({ valoracion: 5 })} className="w-full border border-gray-200 rounded-lg py-1 text-xs font-semibold text-gray-400 hover:bg-gray-50">SC</button>
                ) : (
                  <input type="number" min={0} max={10} value={ev.valoracion ?? 0}
                    onChange={(e) => onUpdate({ valoracion: Number(e.target.value) })}
                    onDoubleClick={() => onUpdate({ valoracion: null })}
                    className="w-full text-center border border-gray-200 rounded-lg py-1 text-sm font-bold text-rfpaf-blue focus:ring-2 focus:ring-rfpaf-blue outline-none" />
                )}
              </div>
            </div>

            <textarea
              rows={3}
              value={ev.comentario}
              onChange={(e) => onUpdate({ comentario: e.target.value })}
              placeholder="Comentario / valoración cualitativa…"
              className="w-full border border-gray-200 rounded-xl px-3 py-2 text-sm focus:ring-2 focus:ring-rfpaf-blue outline-none resize-none"
            />
          </div>
        </div>
      )}
    </div>
  )
}

export default function ValoracionesSection({ partido }: Props) {
  const { evaluaciones, loadEvaluaciones, addEvaluacion, updateEvaluacionAction, deleteEvaluacionAction, fichas, clubes } = useStore()
  const [showPicker, setShowPicker] = useState(false)

  useEffect(() => { loadEvaluaciones(partido.id) }, [partido.id])

  const list = evaluaciones.filter((e) => e.partidoInformeId === partido.id).sort((a, b) => a.orden - b.orden)
  const disponibles = [...partido.alineacionTitulares, ...partido.alineacionSuplentes]
  const posicionesTitulares = new Map(partido.alineacionTitulares.map((t) => [t.uid, t]))

  const addFromJugadora = (j: JugadoraTactica) => {
    const ficha = fichas.find((f) => f.id === j.fichaId)
    const club = ficha ? clubes.find((c) => c.id === ficha.club) : undefined
    const pos = posicionesTitulares.get(j.uid)
    addEvaluacion({
      partidoInformeId: partido.id,
      orden: list.length,
      fichaId: j.fichaId,
      nombre: ficha?.nombre ?? j.nombre,
      apellidos: ficha ? `${ficha.primerApellido} ${ficha.segundoApellido ?? ''}`.trim() : '',
      fotoUrl: j.foto ?? '',
      dorsal: j.numero,
      lateralidad: ficha?.lateralidad ?? '',
      fechaNacimiento: ficha?.fechaNacimiento ?? '',
      clubNombre: club?.nombre ?? '',
      clubEscudoUrl: club?.escudo ?? '',
      posicionX: pos?.posX ?? null,
      posicionY: pos?.posY ?? null,
      minutos: 0, goles: 0, asistencias: 0, tarjetasAmarillas: 0, tarjetasRojas: 0,
      valoracion: null, comentario: '',
    })
    setShowPicker(false)
  }

  const addBlank = () => {
    addEvaluacion({
      partidoInformeId: partido.id, orden: list.length, nombre: '', apellidos: '', fotoUrl: '',
      dorsal: null, lateralidad: '', fechaNacimiento: '', clubNombre: '', clubEscudoUrl: '',
      posicionX: null, posicionY: null, minutos: 0, goles: 0, asistencias: 0,
      tarjetasAmarillas: 0, tarjetasRojas: 0, valoracion: null, comentario: '',
    })
    setShowPicker(false)
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-5">
      <div className="flex items-center justify-between mb-4 relative">
        <h2 className="font-bold text-rfpaf-blue">Valoración Individual</h2>
        <div className="relative">
          <button
            onClick={() => setShowPicker((v) => !v)}
            className="flex items-center gap-1.5 bg-rfpaf-blue hover:bg-blue-700 text-white text-xs font-bold px-3 py-2 rounded-xl transition-colors"
          >
            <Plus className="w-3.5 h-3.5" /> Añadir jugadora
          </button>
          {showPicker && (
            <div className="absolute right-0 top-full mt-2 w-64 bg-white border border-gray-200 rounded-xl shadow-lg z-10 max-h-72 overflow-y-auto">
              {disponibles.length === 0 ? (
                <p className="text-xs text-gray-400 p-3">No hay jugadoras en la alineación</p>
              ) : (
                disponibles.map((j) => (
                  <button key={j.uid} onClick={() => addFromJugadora(j)}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-semibold text-gray-700 hover:bg-gray-50 border-b border-gray-100 last:border-0">
                    <span className="w-5 h-5 rounded-full bg-rfpaf-blue/10 text-rfpaf-blue flex items-center justify-center text-[10px] font-bold flex-shrink-0">{j.numero}</span>
                    {j.nombre}
                  </button>
                ))
              )}
              <button onClick={addBlank} className="w-full px-3 py-2 text-left text-xs font-semibold text-gray-500 hover:bg-gray-50 border-t border-gray-200">
                + Entrada manual
              </button>
            </div>
          )}
        </div>
      </div>

      {list.length === 0 ? (
        <p className="text-sm text-gray-400 text-center py-8">Sin jugadoras evaluadas todavía</p>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {list.map((ev) => (
            <EvaluacionCard
              key={ev.id}
              ev={ev}
              onUpdate={(patch) => updateEvaluacionAction(ev.id, patch)}
              onDelete={() => { if (confirm('¿Eliminar esta valoración?')) deleteEvaluacionAction(ev.id) }}
            />
          ))}
        </div>
      )}
    </div>
  )
}
