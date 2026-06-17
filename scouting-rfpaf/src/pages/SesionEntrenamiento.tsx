import { useState, useRef } from 'react'
import { createEjercicio } from '../lib/supabase'
import { v4 as uuidv4 } from 'uuid'
import {
  Plus, Trash2, Download, Camera,
  Users, Clock, Wrench, ChevronDown,
  X, ListOrdered, Eye, Pencil, Eraser,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import type { EjercicioSesion, Sesion } from '../types'
import { FASES, TIPOS_EJERCICIO, SESION_EMPTY, EJ_SESION_EMPTY } from '../lib/entrenamientoConstants'
import { exportSesionPDF } from '../lib/entrenamientoUtils'
import TacticalBoard from '../components/TacticalBoard'

const SesionEntrenamiento = () => {
  const { sesion, setSesion } = useStore()

  const [formOpen, setFormOpen] = useState(true)
  const [ejFormOpen, setEjFormOpen] = useState(false)
  const [ejForm, setEjForm] = useState(EJ_SESION_EMPTY)
  const [previewEjSesion, setPreviewEjSesion] = useState<EjercicioSesion | null>(null)
  const [editEjSesion, setEditEjSesion] = useState<EjercicioSesion | null>(null)
  const [formEditEjSesion, setFormEditEjSesion] = useState(EJ_SESION_EMPTY)
  const tacticalCaptureRef = useRef<(() => string | null) | null>(null)

  const addCaptura = (png: string) => setSesion((s: Sesion): Sesion => ({ ...s, capturas: [...s.capturas, png] }))
  const removeCaptura = (idx: number) => setSesion((s: Sesion): Sesion => ({ ...s, capturas: s.capturas.filter((_,i)=>i!==idx) }))

  const captureForEjercicio = () => {
    const png = tacticalCaptureRef.current?.()
    if (png) setEjForm(f => ({ ...f, imagen: png }))
  }

  const addEjercicio = (e: React.SyntheticEvent) => {
    e.preventDefault()
    const orden = sesion.ejercicios.length + 1
    setSesion((s: Sesion): Sesion => ({ ...s, ejercicios: [...s.ejercicios, { id: uuidv4(), orden, ...ejForm }] }))
    setEjForm(EJ_SESION_EMPTY)
    setEjFormOpen(false)
  }

  const removeEjercicio = (id: string) =>
    setSesion((s: Sesion): Sesion => ({ ...s, ejercicios: s.ejercicios.filter(e => e.id !== id).map((e, i) => ({ ...e, orden: i + 1 })) }))

  return (
    <div className="flex flex-col gap-5 max-w-full">

      {/* ── Top: session form + captures ── */}
      <div className="space-y-4">

        {/* Session info form */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <button type="button" onClick={() => setFormOpen(o=>!o)}
            className="w-full flex items-center justify-between p-4 hover:bg-gray-50 transition-colors">
            <span className="flex items-center gap-2 font-semibold text-gray-800 text-sm">
              <ListOrdered className="w-4 h-4 text-rfpaf-blue"/> Datos de la Sesión
            </span>
            <ChevronDown className={`w-4 h-4 text-gray-400 transition-transform duration-200 ${formOpen?'rotate-180':''}`}/>
          </button>

          {formOpen && (
            <div className="px-4 pb-4 pt-3 border-t border-gray-100 space-y-3">

              {/* Row 1: fecha + hora */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fecha</label>
                  <input type="date" value={sesion.fecha} onChange={e=>setSesion((s: Sesion): Sesion=>({...s,fecha:e.target.value}))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Hora</label>
                  <input type="time" value={sesion.hora} onChange={e=>setSesion((s: Sesion): Sesion=>({...s,hora:e.target.value}))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"/>
                </div>
              </div>

              {/* Row 2: campo + convocatoria */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Campo</label>
                  <input type="text" value={sesion.campo} onChange={e=>setSesion((s: Sesion): Sesion=>({...s,campo:e.target.value}))}
                    placeholder="Nombre del campo…"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nº Convocatoria</label>
                  <input type="number" value={sesion.numConvocatoria} onChange={e=>setSesion((s: Sesion): Sesion=>({...s,numConvocatoria:e.target.value}))}
                    placeholder="1"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"/>
                </div>
              </div>

              {/* Row 3: fase + entrenador */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Fase</label>
                  <select value={sesion.fase} onChange={e=>setSesion((s: Sesion): Sesion=>({...s,fase:e.target.value}))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30">
                    <option value="">Seleccionar…</option>
                    {FASES.map(f=><option key={f} value={f}>{f}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Entrenador/a</label>
                  <input type="text" value={sesion.entrenador} onChange={e=>setSesion((s: Sesion): Sesion=>({...s,entrenador:e.target.value}))}
                    placeholder="Nombre…"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"/>
                </div>
              </div>

              {/* Nº jugadoras convocadas */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Nº Jugadoras Convocadas</label>
                <select value={sesion.numJugadorasConvocadas} onChange={e=>setSesion((s: Sesion): Sesion=>({...s,numJugadorasConvocadas:e.target.value}))}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30">
                  <option value="">Seleccionar…</option>
                  {Array.from({length:15},(_,i)=>i+11).map(n=>(
                    <option key={n} value={n}>{n} jugadoras</option>
                  ))}
                </select>
              </div>

              {/* Objetivos */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Objetivos generales de la sesión</label>
                <textarea value={sesion.objetivos} onChange={e=>setSesion((s: Sesion): Sesion=>({...s,objetivos:e.target.value}))}
                  placeholder="Describe los objetivos principales de la sesión…" rows={3}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30 resize-none"/>
              </div>

              {/* Observaciones */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Observaciones</label>
                <textarea value={sesion.observaciones} onChange={e=>setSesion((s: Sesion): Sesion=>({...s,observaciones:e.target.value}))}
                  placeholder="Notas adicionales, incidencias…" rows={2}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30 resize-none"/>
              </div>
            </div>
          )}
        </div>

        {/* ── Exercises section ── */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="flex items-center justify-between p-4">
            <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
              <ListOrdered className="w-4 h-4 text-rfpaf-blue"/>
              Ejercicios de la sesión
              {sesion.ejercicios.length > 0 && (
                <span className="bg-rfpaf-blue text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{sesion.ejercicios.length}</span>
              )}
            </h3>
            <button type="button" onClick={() => setEjFormOpen(o => !o)}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-rfpaf-blue text-white text-xs font-semibold rounded-lg hover:bg-rfpaf-blue/90 transition-colors">
              <Plus className="w-3.5 h-3.5"/> Añadir ejercicio
            </button>
          </div>

          {ejFormOpen && (
            <form onSubmit={addEjercicio} className="px-4 pb-4 border-t border-gray-100 pt-3 space-y-3 bg-blue-50/40">
              <p className="text-xs font-semibold text-rfpaf-blue">Nuevo ejercicio · #{sesion.ejercicios.length + 1}</p>

              {/* Capture row */}
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1.5">Imagen de la pizarra táctica</label>
                <div className="flex gap-2 items-start">
                  <div className={`flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${ejForm.imagen ? 'border-green-400 w-40 h-24' : 'border-dashed border-gray-300 w-40 h-24 flex items-center justify-center bg-white'}`}>
                    {ejForm.imagen
                      ? <img src={ejForm.imagen} alt="Captura" className="w-full h-full object-cover"/>
                      : <div className="text-center text-gray-400 p-2"><Camera className="w-6 h-6 mx-auto mb-1 opacity-40"/><p className="text-[10px]">Sin captura</p></div>}
                  </div>
                  <div className="flex flex-col gap-2">
                    <button type="button" onClick={captureForEjercicio}
                      className="flex items-center gap-1.5 px-3 py-2 bg-green-600 text-white text-xs font-semibold rounded-lg hover:bg-green-700 transition-colors">
                      <Camera className="w-3.5 h-3.5"/> Capturar pizarra ahora
                    </button>
                    {ejForm.imagen && (
                      <button type="button" onClick={() => setEjForm(f => ({ ...f, imagen: null }))}
                        className="flex items-center gap-1 px-3 py-1.5 text-xs text-red-500 border border-red-200 rounded-lg hover:bg-red-50 transition-colors">
                        <X className="w-3 h-3"/> Quitar imagen
                      </button>
                    )}
                    <p className="text-[10px] text-gray-400 leading-tight">Dibuja en la pizarra de la derecha y pulsa el botón para capturarla.</p>
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Tipo</label>
                  <select value={ejForm.tipo} onChange={e => setEjForm(f => ({ ...f, tipo: e.target.value }))}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30 bg-white">
                    <option value="">Seleccionar…</option>
                    {TIPOS_EJERCICIO.map(t => <option key={t} value={t}>{t}</option>)}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Duración (min)</label>
                  <input type="number" value={ejForm.duracion} onChange={e => setEjForm(f => ({ ...f, duracion: e.target.value }))}
                    placeholder="15" min={1}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30 bg-white"/>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Nº Jugadoras</label>
                  <input type="number" value={ejForm.numJugadores} onChange={e => setEjForm(f => ({ ...f, numJugadores: e.target.value }))}
                    placeholder="11" min={1}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30 bg-white"/>
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-600 mb-1">Material</label>
                  <input type="text" value={ejForm.material} onChange={e => setEjForm(f => ({ ...f, material: e.target.value }))}
                    placeholder="Conos, petos…"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30 bg-white"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-600 mb-1">Descripción</label>
                <textarea value={ejForm.descripcion} onChange={e => setEjForm(f => ({ ...f, descripcion: e.target.value }))}
                  placeholder="Describe el ejercicio, objetivos, variantes…" rows={2}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30 resize-none bg-white"/>
              </div>
              <div className="flex gap-2">
                <button type="submit"
                  className="flex-1 py-2 bg-rfpaf-blue text-white text-sm font-semibold rounded-lg hover:bg-rfpaf-blue/90 transition-colors">
                  Guardar ejercicio
                </button>
                <button type="button" onClick={() => { setEjFormOpen(false); setEjForm(EJ_SESION_EMPTY) }}
                  className="px-4 py-2 text-sm text-gray-500 bg-white border border-gray-200 rounded-lg hover:bg-gray-50 transition-colors">
                  Cancelar
                </button>
              </div>
            </form>
          )}

          {sesion.ejercicios.length === 0 && !ejFormOpen ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400 border-t border-gray-100">
              <ListOrdered className="w-8 h-8 mb-2 opacity-25"/>
              <p className="text-xs">Añade los ejercicios que componen la sesión</p>
            </div>
          ) : (
            <div className="divide-y divide-gray-100 border-t border-gray-100">
              {sesion.ejercicios.map(ej => (
                <div key={ej.id} className="p-4">
                  {/* Header: número + tipo + meta + delete */}
                  <div className="flex items-center gap-2 mb-3">
                    <span className="flex-shrink-0 w-7 h-7 rounded-full bg-rfpaf-blue text-white text-xs font-bold flex items-center justify-center">
                      {ej.orden}
                    </span>
                    <span className="font-semibold text-sm text-gray-800">{ej.tipo || 'Ejercicio'}</span>
                    <div className="flex items-center gap-3 ml-2">
                      {ej.duracion && <span className="flex items-center gap-0.5 text-[11px] text-gray-500"><Clock className="w-3 h-3"/>{ej.duracion} min</span>}
                      {ej.numJugadores && <span className="flex items-center gap-0.5 text-[11px] text-gray-500"><Users className="w-3 h-3"/>{ej.numJugadores}</span>}
                    </div>
                    <div className="ml-auto flex-shrink-0 flex gap-1">
                      <button type="button" onClick={() => setPreviewEjSesion(ej)}
                        className="p-1 text-gray-300 hover:text-blue-500 transition-colors rounded" title="Vista previa">
                        <Eye className="w-3.5 h-3.5"/>
                      </button>
                      <button type="button" onClick={() => {
                        setEditEjSesion(ej)
                        setFormEditEjSesion(ej)
                      }}
                        className="p-1 text-gray-300 hover:text-amber-500 transition-colors rounded" title="Editar">
                        <Pencil className="w-3.5 h-3.5"/>
                      </button>
                      <button type="button" onClick={() => removeEjercicio(ej.id)}
                        className="p-1 text-gray-300 hover:text-red-500 transition-colors rounded" title="Eliminar">
                        <Trash2 className="w-3.5 h-3.5"/>
                      </button>
                    </div>
                  </div>

                  {/* Body: image + details side by side */}
                  <div className="flex gap-3">
                    {ej.imagen ? (
                      <img src={ej.imagen} alt={`Pizarra ejercicio ${ej.orden}`}
                        className="w-36 h-24 object-cover rounded-lg border border-gray-200 flex-shrink-0"/>
                    ) : (
                      <div className="w-36 h-24 flex-shrink-0 rounded-lg border-2 border-dashed border-gray-200 flex items-center justify-center text-gray-300">
                        <Camera className="w-5 h-5"/>
                      </div>
                    )}
                    <div className="flex-1 min-w-0 space-y-1">
                      {ej.material && (
                        <p className="flex items-center gap-1 text-[11px] text-gray-500">
                          <Wrench className="w-3 h-3 flex-shrink-0"/>{ej.material}
                        </p>
                      )}
                      {ej.descripcion && (
                        <p className="text-xs text-gray-700 leading-relaxed">{ej.descripcion}</p>
                      )}
                      <button type="button"
                        onClick={async () => {
                          const newEj = await createEjercicio({
                            tipo: ej.tipo,
                            duracion: parseInt(ej.duracion || '0'),
                            num_jugadores: ej.numJugadores,
                            material: ej.material || null,
                            titulo: ej.tipo || 'Ejercicio sin título',
                            descripcion: ej.descripcion,
                            imagen: ej.imagen || null,
                            video: null
                          })
                          if (newEj) {
                            alert('✅ Ejercicio guardado en biblioteca')
                          } else {
                            alert('❌ Error al guardar en biblioteca')
                          }
                        }}
                        className="mt-2 text-[11px] text-rfpaf-blue hover:text-rfpaf-blue/70 font-semibold">
                        💾 Guardar en biblioteca
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Captures gallery */}
        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-gray-800 text-sm flex items-center gap-2">
              <Camera className="w-4 h-4 text-rfpaf-blue"/>
              Capturas de pizarra
              {sesion.capturas.length > 0 && (
                <span className="bg-rfpaf-blue text-white text-[10px] font-bold px-1.5 py-0.5 rounded-full">{sesion.capturas.length}</span>
              )}
            </h3>
          </div>

          {sesion.capturas.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-gray-400 border-2 border-dashed border-gray-200 rounded-xl">
              <Camera className="w-8 h-8 mb-2 opacity-30"/>
              <p className="text-xs">Usa el botón verde de la pizarra para añadir capturas</p>
            </div>
          ) : (
            <div className="grid grid-cols-2 gap-2">
              {sesion.capturas.map((src, idx) => (
                <div key={idx} className="relative group rounded-lg overflow-hidden border border-gray-200">
                  <img src={src} alt={`Captura ${idx+1}`} className="w-full h-auto"/>
                  <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                    <button type="button" onClick={() => removeCaptura(idx)}
                      className="bg-red-500 text-white rounded-full p-1.5 hover:bg-red-600 transition-colors">
                      <X className="w-3.5 h-3.5"/>
                    </button>
                  </div>
                  <div className="absolute bottom-1 left-1 bg-black/60 text-white text-[9px] px-1.5 py-0.5 rounded">
                    Captura {idx+1}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Export PDF */}
        <button type="button" onClick={() => exportSesionPDF(sesion)}
          className="w-full flex items-center justify-center gap-2 py-3 bg-rfpaf-blue text-white text-sm font-bold rounded-xl hover:bg-rfpaf-blue/90 transition-colors shadow-sm">
          <Download className="w-4 h-4"/> Exportar documento de sesión (PDF)
        </button>

        <button type="button" onClick={() => setSesion(SESION_EMPTY)}
          className="w-full flex items-center justify-center gap-2 py-2 text-xs text-gray-400 hover:text-red-500 transition-colors">
          <Eraser className="w-3.5 h-3.5"/> Limpiar sesión
        </button>
      </div>

      {/* ── Right: tactical board ── */}
      <TacticalBoard onCapture={addCaptura} onRegisterCapture={fn => { tacticalCaptureRef.current = fn }}/>

      {/* Modal vista previa ejercicio sesión */}
      {previewEjSesion && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-gray-900">Ejercicio #{previewEjSesion.orden}</h2>
              <button onClick={() => setPreviewEjSesion(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {previewEjSesion.imagen && (
                <div className="rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center" style={{maxHeight: '300px'}}>
                  <img src={previewEjSesion.imagen} alt="preview" className="max-w-full max-h-full object-contain"/>
                </div>
              )}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">{previewEjSesion.tipo}</h3>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-blue-50 rounded-lg p-2 border border-blue-100 text-center">
                  <p className="text-gray-600 font-semibold uppercase">Duración</p>
                  <p className="text-lg font-bold text-rfpaf-blue">{previewEjSesion.duracion} min</p>
                </div>
                <div className="bg-green-50 rounded-lg p-2 border border-green-100 text-center">
                  <p className="text-gray-600 font-semibold uppercase">Jugadores</p>
                  <p className="font-bold text-green-700">{previewEjSesion.numJugadores}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-2 border border-purple-100 text-center">
                  <p className="text-gray-600 font-semibold uppercase">Material</p>
                  <p className="font-bold text-purple-700">{previewEjSesion.material || '—'}</p>
                </div>
              </div>
              {previewEjSesion.descripcion && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Descripción</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{previewEjSesion.descripcion}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal editar ejercicio sesión */}
      {editEjSesion && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-gray-900">Editar ejercicio</h2>
              <button onClick={() => setEditEjSesion(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo</label>
                <input type="text" value={formEditEjSesion.tipo} onChange={e => setFormEditEjSesion({...formEditEjSesion, tipo: e.target.value})}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"/>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Duración (min)</label>
                  <input type="text" value={formEditEjSesion.duracion} onChange={e => setFormEditEjSesion({...formEditEjSesion, duracion: e.target.value})}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Jugadores</label>
                  <input type="text" value={formEditEjSesion.numJugadores} onChange={e => setFormEditEjSesion({...formEditEjSesion, numJugadores: e.target.value})}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Material</label>
                <input type="text" value={formEditEjSesion.material} onChange={e => setFormEditEjSesion({...formEditEjSesion, material: e.target.value})}
                  placeholder="Conos, balones, petos…"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Descripción</label>
                <textarea value={formEditEjSesion.descripcion} onChange={e => setFormEditEjSesion({...formEditEjSesion, descripcion: e.target.value})}
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30 resize-none"/>
              </div>
              <div className="flex gap-3">
                <button type="button"
                  onClick={() => {
                    if (!editEjSesion) return
                    setSesion(s => ({
                      ...s,
                      ejercicios: s.ejercicios.map(e => e.id === editEjSesion.id ? { ...e, ...formEditEjSesion } : e)
                    }))
                    setEditEjSesion(null)
                    alert('✅ Ejercicio actualizado')
                  }}
                  className="flex-1 px-4 py-2 bg-rfpaf-blue text-white rounded-lg text-sm font-semibold hover:bg-rfpaf-blue/90 transition-colors">
                  Guardar cambios
                </button>
                <button type="button" onClick={() => setEditEjSesion(null)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default SesionEntrenamiento
