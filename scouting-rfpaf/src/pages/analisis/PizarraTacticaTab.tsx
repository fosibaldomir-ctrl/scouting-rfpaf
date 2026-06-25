import { useState, useRef, useCallback } from 'react'
import { RefreshCw, Sparkles, ChevronDown } from 'lucide-react'
import { useStore } from '../../store/useStore'
import type { AnalisisPartido, FormacionFutbol, JugadoraTactica, EquipoTactico } from '../../types'
import { buildTeamJugadoras } from '../AnalisisGlobal'

const FORMATIONS: FormacionFutbol[] = [
  '4-4-2', '4-3-3', '4-2-3-1', '4-3-2-1', '3-5-2',
  '3-4-3', '5-3-2', '5-4-1', '4-1-4-1', '4-5-1', '4-4-1-1',
]

interface Props { analisis: AnalisisPartido }

type DragState = { uid: string; team: 'local' | 'visit' } | null

function generateAnalysis(local: EquipoTactico, visit: EquipoTactico): string {
  const lf = local.formacion
  const vf = visit.formacion
  const lParts = lf.split('-').map(Number)
  const vParts = vf.split('-').map(Number)
  const lDef = lParts[0]; const lMid = lParts.slice(1, -1).reduce((a, b) => a + b, 0); const lFwd = lParts[lParts.length - 1]
  const vDef = vParts[0]; const vMid = vParts.slice(1, -1).reduce((a, b) => a + b, 0); const vFwd = vParts[vParts.length - 1]

  const lines: string[] = [
    `ANÁLISIS TÁCTICO: ${local.nombre} (${lf}) vs ${visit.nombre} (${vf})`,
    '',
    '── EQUILIBRIO NUMÉRICO ──',
    `Defensa: ${lDef} vs ${vDef} → ${lDef > vDef ? `Superioridad defensiva local (+${lDef - vDef})` : lDef < vDef ? `Superioridad defensiva visitante (+${vDef - lDef})` : 'Igualdad numérica'}`,
    `Mediocampo: ${lMid} vs ${vMid} → ${lMid > vMid ? `Dominio local en el centro (+${lMid - vMid}), ventaja en posesión y recuperación` : lMid < vMid ? `Superioridad rival en el mediocampo (+${vMid - lMid}), atención a la presión` : 'Equilibrio en el centro del campo'}`,
    `Ataque: ${lFwd} vs ${vFwd} → ${lFwd > vFwd ? `Mayor poder ofensivo local (+${lFwd - vFwd})` : lFwd < vFwd ? `Rival más ofensivo (+${vFwd - lFwd}), vigilar las transiciones` : 'Igualdad en línea ofensiva'}`,
    '',
    '── PUNTOS CLAVE ──',
  ]

  const insights: string[] = []
  if (lf.startsWith('3') && !vf.startsWith('3')) insights.push(`Con tres centrales, los carrileros del sistema ${lf} serán clave; el rival puede intentar explotar el ancho.`)
  if (vf.startsWith('3') && !lf.startsWith('3')) insights.push(`El sistema ${vf} rival con tres defensores puede dejar espacios en las bandas aprovechables por los extremos locales.`)
  if (lMid < vMid) insights.push(`Inferioridad numérica local en el mediocampo: necesaria una presión organizada y salidas rápidas para evitar la circulación rival.`)
  if (lMid > vMid) insights.push(`Dominio en el centro: aprovechar la superioridad para controlar ritmo y temporizar con el balón.`)
  if (lFwd === 1 && vFwd >= 2) insights.push(`Con una sola punta, la eficacia en el área será determinante; el equipo rival tiene más presencia arriba.`)
  if (lFwd >= 2 && vFwd === 1) insights.push(`Superioridad ofensiva: crear combinaciones en el último tercio y explotar la movilidad de las delanteras.`)
  if (['4-3-3', '4-2-3-1', '3-4-3'].includes(lf)) insights.push(`El sistema ${lf} favorece la presión alta tras pérdida. Fundamental mantener la línea compacta y presionar en campo rival.`)
  if (['5-4-1', '5-3-2'].includes(lf)) insights.push(`Sistema de cinco defensoras: gran solidez defensiva, pero requiere salidas rápidas y bien organizadas en transición ofensiva.`)
  if (insights.length === 0) insights.push(`El choque ${lf} vs ${vf} presenta equilibrio táctico; los detalles individuales y las acciones a balón parado serán determinantes.`)

  insights.forEach((i) => lines.push(`• ${i}`))

  lines.push('', '── RECOMENDACIONES ──')
  const recs: string[] = []
  if (lMid < vMid) { recs.push('Presionar en bloque para compensar la inferioridad en mediocampo.'); recs.push('Utilizar la verticalidad para evitar la presión rival en zona propia.') }
  if (lMid > vMid) { recs.push('Aprovechar la superioridad en el centro para dominar la posesión y dictar el ritmo.') }
  if (lDef < vDef) recs.push('Vigilar los espacios a la espalda de la línea defensiva en transiciones rápidas.')
  if (lFwd > vFwd) recs.push('Explotar la superioridad atacante con desdoblamiento en bandas y centros al área.')
  recs.push('Preparar bien las ABP tanto ofensivas como defensivas: pueden ser decisivas en un partido equilibrado.')
  recs.push(`Analizar los automatismos defensivos del ${vf} rival para buscar desajustes en la presión.`)
  recs.forEach((r) => lines.push(`→ ${r}`))

  return lines.join('\n')
}

export default function PizarraTacticaTab({ analisis }: Props) {
  const { updateAnalisis } = useStore()

  const [localJugadoras, setLocalJugadoras] = useState<JugadoraTactica[]>(analisis.equipoLocal.jugadoras)
  const [visitJugadoras, setVisitJugadoras] = useState<JugadoraTactica[]>(analisis.equipoVisitante.jugadoras)
  const [generating, setGenerating] = useState(false)
  const [showAnalysis, setShowAnalysis] = useState(!!analisis.analisisIA)
  const [editingLocal, setEditingLocal] = useState(false)
  const [editingVisit, setEditingVisit] = useState(false)

  const dragging = useRef<DragState>(null)
  const pitchRef = useRef<HTMLDivElement>(null)

  const save = useCallback((
    newLocal?: JugadoraTactica[],
    newVisit?: JugadoraTactica[],
    extraFields?: Partial<AnalisisPartido>
  ) => {
    updateAnalisis(analisis.id, {
      equipoLocal: { ...analisis.equipoLocal, jugadoras: newLocal ?? localJugadoras },
      equipoVisitante: { ...analisis.equipoVisitante, jugadoras: newVisit ?? visitJugadoras },
      ...extraFields,
    })
  }, [analisis, localJugadoras, visitJugadoras, updateAnalisis])

  const getRelPos = (clientX: number, clientY: number) => {
    const rect = pitchRef.current!.getBoundingClientRect()
    return {
      x: Math.max(2, Math.min(98, ((clientX - rect.left) / rect.width) * 100)),
      y: Math.max(2, Math.min(98, ((clientY - rect.top) / rect.height) * 100)),
    }
  }

  const movePlayer = (clientX: number, clientY: number) => {
    if (!dragging.current) return
    const { x, y } = getRelPos(clientX, clientY)
    const { uid, team } = dragging.current
    if (team === 'local') {
      setLocalJugadoras((prev) => prev.map((j) => j.uid === uid ? { ...j, posX: x, posY: y } : j))
    } else {
      setVisitJugadoras((prev) => prev.map((j) => j.uid === uid ? { ...j, posX: x, posY: y } : j))
    }
  }

  const handleMouseMove = (e: React.MouseEvent) => movePlayer(e.clientX, e.clientY)
  const handleTouchMove = (e: React.TouchEvent) => {
    if (e.touches[0]) { e.preventDefault(); movePlayer(e.touches[0].clientX, e.touches[0].clientY) }
  }
  const handleEnd = () => {
    if (dragging.current) {
      save(localJugadoras, visitJugadoras)
      dragging.current = null
    }
  }

  const handleFormationChange = (team: 'local' | 'visit', formation: FormacionFutbol) => {
    const newJugadoras = buildTeamJugadoras(formation, team)
    if (team === 'local') {
      setLocalJugadoras(newJugadoras)
      updateAnalisis(analisis.id, {
        equipoLocal: { ...analisis.equipoLocal, formacion: formation, jugadoras: newJugadoras },
      })
    } else {
      setVisitJugadoras(newJugadoras)
      updateAnalisis(analisis.id, {
        equipoVisitante: { ...analisis.equipoVisitante, formacion: formation, jugadoras: newJugadoras },
      })
    }
  }

  const handleResetPositions = (team: 'local' | 'visit') => {
    const formation = team === 'local' ? analisis.equipoLocal.formacion : analisis.equipoVisitante.formacion
    const newJ = buildTeamJugadoras(formation, team)
    if (team === 'local') { setLocalJugadoras(newJ); updateAnalisis(analisis.id, { equipoLocal: { ...analisis.equipoLocal, jugadoras: newJ } }) }
    else { setVisitJugadoras(newJ); updateAnalisis(analisis.id, { equipoVisitante: { ...analisis.equipoVisitante, jugadoras: newJ } }) }
  }

  const handleGenerateAnalysis = () => {
    setGenerating(true)
    setTimeout(() => {
      const text = generateAnalysis(
        { ...analisis.equipoLocal, jugadoras: localJugadoras },
        { ...analisis.equipoVisitante, jugadoras: visitJugadoras },
      )
      updateAnalisis(analisis.id, { analisisIA: text })
      setShowAnalysis(true)
      setGenerating(false)
    }, 800)
  }

  const handleNameEdit = (team: 'local' | 'visit', name: string) => {
    if (team === 'local') {
      updateAnalisis(analisis.id, { equipoLocal: { ...analisis.equipoLocal, nombre: name, jugadoras: localJugadoras } })
    } else {
      updateAnalisis(analisis.id, { equipoVisitante: { ...analisis.equipoVisitante, nombre: name, jugadoras: visitJugadoras } })
    }
  }

  return (
    <div className="p-3 md:p-5">
      <div className="flex flex-col xl:flex-row gap-4">

        {/* Pitch column */}
        <div className="flex-1 min-w-0">
          {/* Formation controls */}
          <div className="flex gap-3 mb-3 flex-wrap">
            <FormationSelector
              label={analisis.equipoLocal.nombre}
              color="#1a3a6b"
              value={analisis.equipoLocal.formacion}
              onChange={(f) => handleFormationChange('local', f)}
              onReset={() => handleResetPositions('local')}
              onNameEdit={(n) => handleNameEdit('local', n)}
              editing={editingLocal}
              setEditing={setEditingLocal}
            />
            <div className="flex items-center text-gray-400 font-bold text-lg">vs</div>
            <FormationSelector
              label={analisis.equipoVisitante.nombre}
              color="#c0392b"
              value={analisis.equipoVisitante.formacion}
              onChange={(f) => handleFormationChange('visit', f)}
              onReset={() => handleResetPositions('visit')}
              onNameEdit={(n) => handleNameEdit('visit', n)}
              editing={editingVisit}
              setEditing={setEditingVisit}
            />
          </div>

          {/* Pitch */}
          <div
            ref={pitchRef}
            className="relative w-full rounded-xl overflow-hidden select-none"
            style={{ aspectRatio: '68/105', background: '#2d6a27', touchAction: 'none' }}
            onMouseMove={handleMouseMove}
            onMouseUp={handleEnd}
            onMouseLeave={handleEnd}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleEnd}
          >
            <PitchMarkings />

            {/* Visitor team label */}
            <div className="absolute top-1 left-1/2 -translate-x-1/2 text-white/70 text-[10px] font-semibold tracking-wider z-10">
              {analisis.equipoVisitante.nombre.toUpperCase()}
            </div>

            {/* Local team label */}
            <div className="absolute bottom-1 left-1/2 -translate-x-1/2 text-white/70 text-[10px] font-semibold tracking-wider z-10">
              {analisis.equipoLocal.nombre.toUpperCase()}
            </div>

            {/* Visitor players */}
            {visitJugadoras.map((j) => (
              <PlayerToken
                key={j.uid}
                player={j}
                color={analisis.equipoVisitante.color}
                onDragStart={() => { dragging.current = { uid: j.uid, team: 'visit' } }}
              />
            ))}

            {/* Local players */}
            {localJugadoras.map((j) => (
              <PlayerToken
                key={j.uid}
                player={j}
                color={analisis.equipoLocal.color}
                onDragStart={() => { dragging.current = { uid: j.uid, team: 'local' } }}
              />
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-1">Arrastra las jugadoras para reposicionar</p>
        </div>

        {/* Analysis panel */}
        <div className="xl:w-80 flex-shrink-0">
          <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
            <div className="bg-rfpaf-blue px-4 py-3 flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-semibold text-sm">
                <Sparkles className="w-4 h-4" />
                Análisis IA
              </div>
              <button
                onClick={handleGenerateAnalysis}
                disabled={generating}
                className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors disabled:opacity-60"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${generating ? 'animate-spin' : ''}`} />
                {generating ? 'Analizando...' : 'Generar'}
              </button>
            </div>

            {showAnalysis && analisis.analisisIA ? (
              <div className="p-4">
                <pre className="text-xs text-gray-700 whitespace-pre-wrap font-mono leading-relaxed">{analisis.analisisIA}</pre>
                <button
                  onClick={() => { updateAnalisis(analisis.id, { analisisIA: '' }); setShowAnalysis(false) }}
                  className="mt-3 text-xs text-gray-400 hover:text-rfpaf-red transition-colors"
                >
                  Borrar análisis
                </button>
              </div>
            ) : (
              <div className="p-6 text-center text-gray-400 text-sm">
                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-30" />
                <p>Pulsa <strong>Generar</strong> para obtener un análisis táctico del enfrentamiento de formaciones</p>
              </div>
            )}
          </div>

          {/* Player name editor */}
          <div className="mt-4 bg-white rounded-2xl border border-gray-200 shadow-sm p-4">
            <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">Jugadoras</p>
            <div className="space-y-1 max-h-64 overflow-y-auto">
              <p className="text-xs font-bold text-rfpaf-blue mb-1">{analisis.equipoLocal.nombre}</p>
              {localJugadoras.map((j) => (
                <PlayerNameRow
                  key={j.uid}
                  player={j}
                  color={analisis.equipoLocal.color}
                  onChange={(name) => {
                    const updated = localJugadoras.map((p) => p.uid === j.uid ? { ...p, nombre: name } : p)
                    setLocalJugadoras(updated)
                    updateAnalisis(analisis.id, { equipoLocal: { ...analisis.equipoLocal, jugadoras: updated } })
                  }}
                />
              ))}
              <p className="text-xs font-bold text-rfpaf-red mt-3 mb-1">{analisis.equipoVisitante.nombre}</p>
              {visitJugadoras.map((j) => (
                <PlayerNameRow
                  key={j.uid}
                  player={j}
                  color={analisis.equipoVisitante.color}
                  onChange={(name) => {
                    const updated = visitJugadoras.map((p) => p.uid === j.uid ? { ...p, nombre: name } : p)
                    setVisitJugadoras(updated)
                    updateAnalisis(analisis.id, { equipoVisitante: { ...analisis.equipoVisitante, jugadoras: updated } })
                  }}
                />
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

function PlayerToken({ player, color, onDragStart }: {
  player: JugadoraTactica
  color: string
  onDragStart: () => void
}) {
  const size = 28
  return (
    <div
      style={{
        position: 'absolute',
        left: `${player.posX}%`,
        top: `${player.posY}%`,
        transform: 'translate(-50%, -50%)',
        cursor: 'grab',
        touchAction: 'none',
        zIndex: 20,
        userSelect: 'none',
      }}
      onMouseDown={(e) => { e.preventDefault(); onDragStart() }}
      onTouchStart={(e) => { e.preventDefault(); onDragStart() }}
    >
      <div style={{
        width: size, height: size, borderRadius: '50%',
        background: color,
        border: '2px solid rgba(255,255,255,0.9)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontSize: 9, fontWeight: '800',
        boxShadow: '0 2px 6px rgba(0,0,0,0.5)',
      }}>
        {player.numero}
      </div>
      <div style={{
        textAlign: 'center', fontSize: 8, color: 'white', fontWeight: '700',
        textShadow: '0 1px 3px rgba(0,0,0,0.9)', marginTop: 1,
        maxWidth: 40, overflow: 'hidden', whiteSpace: 'nowrap', textOverflow: 'ellipsis',
        lineHeight: 1.1,
      }}>
        {player.nombre !== String(player.numero) ? player.nombre : ''}
      </div>
    </div>
  )
}

function PitchMarkings() {
  return (
    <>
      {/* Outer boundary */}
      <div style={{ position: 'absolute', inset: '2% 3%', border: '2px solid rgba(255,255,255,0.7)', borderRadius: 2, pointerEvents: 'none' }} />

      {/* Center line */}
      <div style={{ position: 'absolute', left: '3%', right: '3%', top: '50%', height: 2, background: 'rgba(255,255,255,0.7)', pointerEvents: 'none' }} />

      {/* Center circle */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        width: '26%', height: '17%',
        transform: 'translate(-50%, -50%)',
        border: '2px solid rgba(255,255,255,0.7)', borderRadius: '50%',
        pointerEvents: 'none',
      }} />

      {/* Center spot */}
      <div style={{
        position: 'absolute', left: '50%', top: '50%',
        width: 6, height: 6, borderRadius: '50%',
        background: 'rgba(255,255,255,0.7)',
        transform: 'translate(-50%, -50%)',
        pointerEvents: 'none',
      }} />

      {/* Top penalty area */}
      <div style={{ position: 'absolute', left: '20%', right: '20%', top: '2%', height: '16%', border: '2px solid rgba(255,255,255,0.7)', borderTop: 'none', pointerEvents: 'none' }} />

      {/* Top goal area */}
      <div style={{ position: 'absolute', left: '33%', right: '33%', top: '2%', height: '6%', border: '2px solid rgba(255,255,255,0.7)', borderTop: 'none', pointerEvents: 'none' }} />

      {/* Top goal */}
      <div style={{ position: 'absolute', left: '39%', right: '39%', top: '0%', height: '2.5%', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.7)', borderBottom: 'none', pointerEvents: 'none' }} />

      {/* Top penalty spot */}
      <div style={{ position: 'absolute', left: '50%', top: '12.5%', width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.7)', transform: 'translateX(-50%)', pointerEvents: 'none' }} />

      {/* Bottom penalty area */}
      <div style={{ position: 'absolute', left: '20%', right: '20%', bottom: '2%', height: '16%', border: '2px solid rgba(255,255,255,0.7)', borderBottom: 'none', pointerEvents: 'none' }} />

      {/* Bottom goal area */}
      <div style={{ position: 'absolute', left: '33%', right: '33%', bottom: '2%', height: '6%', border: '2px solid rgba(255,255,255,0.7)', borderBottom: 'none', pointerEvents: 'none' }} />

      {/* Bottom goal */}
      <div style={{ position: 'absolute', left: '39%', right: '39%', bottom: '0%', height: '2.5%', background: 'rgba(255,255,255,0.15)', border: '2px solid rgba(255,255,255,0.7)', borderTop: 'none', pointerEvents: 'none' }} />

      {/* Bottom penalty spot */}
      <div style={{ position: 'absolute', left: '50%', bottom: '12.5%', width: 5, height: 5, borderRadius: '50%', background: 'rgba(255,255,255,0.7)', transform: 'translateX(-50%)', pointerEvents: 'none' }} />
    </>
  )
}

function FormationSelector({ label, color, value, onChange, onReset, onNameEdit, editing, setEditing }: {
  label: string; color: string; value: FormacionFutbol
  onChange: (f: FormacionFutbol) => void
  onReset: () => void
  onNameEdit: (n: string) => void
  editing: boolean
  setEditing: (v: boolean) => void
}) {
  return (
    <div className="flex-1 min-w-0">
      {editing ? (
        <input
          autoFocus
          defaultValue={label}
          className="w-full text-sm font-bold border-b-2 outline-none mb-1"
          style={{ color, borderColor: color }}
          onBlur={(e) => { onNameEdit(e.target.value); setEditing(false) }}
          onKeyDown={(e) => { if (e.key === 'Enter') { onNameEdit(e.currentTarget.value); setEditing(false) } }}
        />
      ) : (
        <button onClick={() => setEditing(true)} className="text-sm font-bold truncate block w-full text-left mb-1" style={{ color }}>
          {label} ✏️
        </button>
      )}
      <div className="flex gap-1.5">
        <div className="relative flex-1">
          <select
            value={value}
            onChange={(e) => onChange(e.target.value as FormacionFutbol)}
            className="w-full appearance-none border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs font-semibold focus:outline-none focus:ring-2 pr-6"
            style={{ color }}
          >
            {FORMATIONS.map((f) => <option key={f} value={f}>{f}</option>)}
          </select>
          <ChevronDown className="absolute right-1.5 top-1/2 -translate-y-1/2 w-3 h-3 text-gray-400 pointer-events-none" />
        </div>
        <button
          onClick={onReset}
          title="Restablecer posiciones"
          className="text-gray-400 hover:text-gray-600 p-1.5 rounded-lg border border-gray-200 hover:bg-gray-50 transition-colors"
        >
          <RefreshCw className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

function PlayerNameRow({ player, color, onChange }: { player: JugadoraTactica; color: string; onChange: (n: string) => void }) {
  return (
    <div className="flex items-center gap-2">
      <div style={{
        width: 20, height: 20, borderRadius: '50%', background: color,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        color: 'white', fontSize: 9, fontWeight: '800', flexShrink: 0,
      }}>
        {player.numero}
      </div>
      <input
        value={player.nombre}
        onChange={(e) => onChange(e.target.value)}
        className="flex-1 text-xs border-b border-gray-200 focus:border-rfpaf-blue outline-none py-0.5 bg-transparent"
        placeholder={`Jugadora ${player.numero}`}
      />
    </div>
  )
}
