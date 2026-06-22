import { useState, useEffect, useRef, useMemo } from 'react'
import {
  Plus, X, Trash2, ChevronLeft, Image as ImageIcon,
  FileText, Video, Target, Eye, Edit3, Upload, Search, Database, Loader2, Download,
} from 'lucide-react'
import type {
  ObjetivoJugadora, HistorialAccion,
  EstadoObjetivo, TipoObjetivo, AccionObjetivo,
  TipoHistorial, EstadoBadgeHistorial, FichaJugadora,
} from '../types'
import { useStore } from '../store/useStore'
import {
  fetchObjetivos, createObjetivo, updateObjetivo, deleteObjetivo,
  addHistorialAccion, deleteHistorialAccion,
} from '../lib/supabase'

/* ═══ helpers ═══ */
const fmtDate = (d: string) => { const [y,m,day]=d.split('-'); return `${day}/${m}/${y}` }
const today = () => new Date().toISOString().split('T')[0]

const ACCION_STYLE: Record<AccionObjetivo, string> = {
  MEJORAR:    'bg-red-600 text-white',
  MANTENER:   'bg-blue-600 text-white',
  DESARROLLAR:'bg-green-600 text-white',
  CORREGIR:   'bg-orange-500 text-white',
}
const TIPO_STYLE: Record<TipoObjetivo, string> = {
  DEPORTIVO: 'bg-purple-600 text-white',
  FISICO:    'bg-blue-500 text-white',
  MENTAL:    'bg-indigo-500 text-white',
  TECNICO:   'bg-sky-500 text-white',
  TACTICO:   'bg-teal-500 text-white',
}
const BADGE_STYLE: Record<EstadoBadgeHistorial, string> = {
  EN_CURSO:   'bg-yellow-400 text-gray-900',
  CONSEGUIDO: 'bg-green-500 text-white',
  EN_REVISION:'bg-orange-400 text-white',
}
const BADGE_LABEL: Record<EstadoBadgeHistorial, string> = {
  EN_CURSO:   'OBJETIVO EN CURSO',
  CONSEGUIDO: 'OBJETIVO CONSEGUIDO',
  EN_REVISION:'EN REVISIÓN',
}
const TIPO_H_LABEL: Record<TipoHistorial, string> = {
  SESION:    'SESIÓN',
  PARTIDO:   'PARTIDO',
  EVALUACION:'EVALUACIÓN',
}

/* ═══ initial empty forms ═══ */
const emptyObj = (): Omit<ObjetivoJugadora,'id'|'historial'|'creadoEn'> => ({
  fichaId:undefined, playerName:'', playerClub:'', playerPhoto:'', playerNumber:undefined,
  titulo:'', descripcion:'', fechaInicio:today(),
  estado:'EN_CURSO', tipo:'DEPORTIVO', accion:'MEJORAR',
  imagenUrl:'', pdfUrl:'', videoUrl:'',
})
const emptyAcc = (): Omit<HistorialAccion,'id'> => ({
  fecha:today(), tipo:'SESION', titulo:'', comentario:'',
  imagenUrl:'', videoUrl:'', estadoBadge:undefined,
})

/* ═══════════════════════════════════════════════════════
   MAIN PAGE
═══════════════════════════════════════════════════════ */
export default function DesarrolloIndividual() {
  const { fichas } = useStore()

  const [objetivos, setObjetivos] = useState<ObjetivoJugadora[]>([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    fetchObjetivos().then(data => { setObjetivos(data); setLoading(false) })
  }, [])

  const [selected, setSelected] = useState<ObjetivoJugadora | null>(null)
  const [showFormObj, setShowFormObj] = useState(false)
  const [editingObj, setEditingObj] = useState<ObjetivoJugadora | null>(null)
  const [showFormAcc, setShowFormAcc] = useState(false)
  const [viewImg, setViewImg] = useState<string|null>(null)
  const photoInputRef = useRef<HTMLInputElement>(null)

  /* ── player search state (used inside form) ── */
  const [fichaSearch, setFichaSearch] = useState('')
  const [fichaDropdownOpen, setFichaDropdownOpen] = useState(false)

  const fichasFiltradas = useMemo(() => {
    if (!fichaSearch.trim()) return fichas.slice(0, 20)
    const q = fichaSearch.toLowerCase()
    return fichas.filter(f =>
      `${f.nombre} ${f.primerApellido} ${f.segundoApellido}`.toLowerCase().includes(q) ||
      f.equipo.toLowerCase().includes(q)
    ).slice(0, 20)
  }, [fichas, fichaSearch])

  const applyFicha = (f: FichaJugadora) => {
    setFormObj(prev => ({
      ...prev,
      fichaId: f.id,
      playerName: `${f.nombre} ${f.primerApellido} ${f.segundoApellido}`.trim(),
      playerClub: f.equipo,
      playerPhoto: f.foto ?? '',
      playerNumber: f.dorsal ?? undefined,
    }))
    setFichaSearch(`${f.nombre} ${f.primerApellido}`)
    setFichaDropdownOpen(false)
  }

  /* ── form objective ── */
  const [formObj, setFormObj] = useState(emptyObj())

  const openNewObj = () => {
    setFormObj(emptyObj()); setEditingObj(null)
    setFichaSearch(''); setFichaDropdownOpen(false)
    setShowFormObj(true)
  }
  const openEditObj = (o: ObjetivoJugadora) => {
    setFormObj({ fichaId:o.fichaId, playerName:o.playerName, playerClub:o.playerClub,
      playerPhoto:o.playerPhoto??'', playerNumber:o.playerNumber,
      titulo:o.titulo, descripcion:o.descripcion, fechaInicio:o.fechaInicio,
      estado:o.estado, tipo:o.tipo, accion:o.accion,
      imagenUrl:o.imagenUrl??'', pdfUrl:o.pdfUrl??'', videoUrl:o.videoUrl??'' })
    setFichaSearch(o.playerName); setFichaDropdownOpen(false)
    setEditingObj(o); setShowFormObj(true)
  }
  const saveObj = async () => {
    if(!formObj.playerName.trim()||!formObj.titulo.trim()) return
    setSaving(true)
    if(editingObj) {
      const updated = await updateObjetivo(editingObj.id, formObj)
      if(updated) {
        setObjetivos(prev=>prev.map(o=>o.id===editingObj.id?updated:o))
        setSelected(prev=>prev?.id===editingObj.id?updated:prev)
      }
    } else {
      const created = await createObjetivo(formObj)
      if(created) setObjetivos(prev=>[created,...prev])
    }
    setSaving(false)
    setShowFormObj(false)
  }
  const deleteObj = async (id: string) => {
    setSaving(true)
    await deleteObjetivo(id)
    setObjetivos(prev=>prev.filter(o=>o.id!==id))
    if(selected?.id===id) setSelected(null)
    setSaving(false)
  }

  /* ── form acción ── */
  const [formAcc, setFormAcc] = useState(emptyAcc())
  const saveAcc = async () => {
    if(!formAcc.comentario.trim()||!selected) return
    setSaving(true)
    const payload: Omit<HistorialAccion,'id'> = {
      ...formAcc,
      titulo: formAcc.tipo==='EVALUACION' ? undefined : formAcc.titulo||undefined,
    }
    const acc = await addHistorialAccion(selected.id, payload)
    if(acc) {
      const updated = {...selected, historial:[acc,...selected.historial]}
      setObjetivos(prev=>prev.map(o=>o.id===selected.id?updated:o))
      setSelected(updated)
    }
    setSaving(false)
    setFormAcc(emptyAcc()); setShowFormAcc(false)
  }
  const deleteAcc = async (accId: string) => {
    if(!selected) return
    await deleteHistorialAccion(accId)
    const updated = {...selected, historial:selected.historial.filter(a=>a.id!==accId)}
    setObjetivos(prev=>prev.map(o=>o.id===selected.id?updated:o))
    setSelected(updated)
  }

  const handlePhotoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f=e.target.files?.[0]; if(!f) return
    const r=new FileReader(); r.onload=()=>setFormObj(prev=>({...prev,playerPhoto:r.result as string})); r.readAsDataURL(f)
  }

  /* ═══════════════ RENDER ═══════════════ */
  if (loading) return (
    <div className="flex items-center justify-center py-32">
      <Loader2 className="w-8 h-8 text-red-500 animate-spin"/>
    </div>
  )

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto relative">
      {/* Saving overlay */}
      {saving && (
        <div className="fixed inset-0 bg-black/20 z-50 flex items-center justify-center">
          <div className="bg-white rounded-xl px-6 py-4 shadow-xl flex items-center gap-3">
            <Loader2 className="w-5 h-5 text-red-500 animate-spin"/>
            <span className="font-semibold text-gray-700 text-sm">Guardando…</span>
          </div>
        </div>
      )}

      {/* ── detail view ── */}
      {selected ? (
        <DetailView
          objetivo={selected}
          onBack={()=>setSelected(null)}
          onEdit={()=>openEditObj(selected)}
          onDelete={()=>deleteObj(selected.id)}
          onAddAccion={()=>{ setFormAcc(emptyAcc()); setShowFormAcc(true) }}
          onDeleteAccion={deleteAcc}
          onViewImg={setViewImg}
        />
      ) : (
        /* ── list view ── */
        <>
          <div className="flex items-center justify-between gap-3 mb-6">
            <div>
              <h1 className="text-2xl font-extrabold text-gray-900 uppercase tracking-wide">Desarrollo Individual</h1>
              <p className="text-gray-500 text-sm mt-0.5">Objetivos y seguimiento por jugadora</p>
            </div>
            <button onClick={openNewObj}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2.5 rounded-lg text-sm transition-colors shadow">
              <Plus className="w-4 h-4"/> Nuevo Objetivo
            </button>
          </div>

          {objetivos.length===0 ? (
            <div className="flex flex-col items-center justify-center py-24 text-center">
              <Target className="w-16 h-16 text-gray-200 mb-4"/>
              <p className="text-gray-400 text-lg font-semibold">Sin objetivos registrados</p>
              <p className="text-gray-400 text-sm mt-1 mb-6">Crea el primer objetivo individual de una jugadora</p>
              <button onClick={openNewObj}
                className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-5 py-2.5 rounded-lg text-sm">
                <Plus className="w-4 h-4"/> Nuevo Objetivo
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
              {objetivos.map(o=>(
                <ObjectiveCard key={o.id} objetivo={o}
                  onClick={()=>setSelected(o)}
                  onEdit={()=>openEditObj(o)}
                  onDelete={()=>deleteObj(o.id)}/>
              ))}
            </div>
          )}
        </>
      )}

      {/* ── modal new/edit objetivo ── */}
      {showFormObj && (
        <ModalOverlay onClose={()=>setShowFormObj(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-extrabold text-lg uppercase">{editingObj?'Editar Objetivo':'Nuevo Objetivo'}</h2>
              <button onClick={()=>setShowFormObj(false)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-5 space-y-4">

              {/* Player section */}
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400">Jugadora</p>
              </div>

              {/* ── Buscador de fichas ── */}
              {fichas.length > 0 && (
                <div className="relative">
                  <label className="text-[10px] font-semibold text-gray-500 uppercase flex items-center gap-1.5 mb-1">
                    <Database className="w-3 h-3"/> Cargar desde Base de Datos
                  </label>
                  <div className="relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none"/>
                    <input
                      value={fichaSearch}
                      onChange={e=>{ setFichaSearch(e.target.value); setFichaDropdownOpen(true) }}
                      onFocus={()=>setFichaDropdownOpen(true)}
                      className="input-field pl-9"
                      placeholder="Buscar jugadora por nombre o club…"
                    />
                    {fichaDropdownOpen && fichasFiltradas.length > 0 && (
                      <div className="absolute z-50 top-full mt-1 left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-xl max-h-52 overflow-y-auto">
                        {fichasFiltradas.map(f => (
                          <button key={f.id} type="button"
                            onMouseDown={()=>applyFicha(f)}
                            className="w-full flex items-center gap-3 px-3 py-2.5 hover:bg-blue-50 text-left transition-colors border-b border-gray-50 last:border-0">
                            {f.foto
                              ? <img src={f.foto} alt="" className="w-8 h-8 rounded-full object-cover flex-shrink-0"/>
                              : <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center text-xs font-bold text-gray-500 flex-shrink-0">
                                  {f.nombre.charAt(0)}{f.primerApellido.charAt(0)}
                                </div>}
                            <div className="min-w-0">
                              <p className="font-bold text-sm text-gray-900 truncate">
                                {f.nombre} {f.primerApellido} {f.segundoApellido}
                              </p>
                              <p className="text-xs text-gray-500 truncate">{f.equipo} · {f.demarcacion} · Dorsal {f.dorsal}</p>
                            </div>
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  {formObj.fichaId && (
                    <p className="text-[10px] text-green-600 font-semibold mt-1 flex items-center gap-1">
                      ✓ Datos cargados desde Base de Datos
                      <button type="button" onClick={()=>{ setFormObj(p=>({...p,fichaId:undefined})); setFichaSearch('') }}
                        className="ml-1 text-gray-400 hover:text-red-500 underline">desvincular</button>
                    </p>
                  )}
                  <div className="border-b border-dashed border-gray-200 my-3"/>
                </div>
              )}

              {/* Photo + manual fields */}
              <div className="flex gap-3 items-start">
                <div className="flex-shrink-0">
                  <div className="w-20 h-20 bg-gray-100 rounded-lg border-2 border-dashed border-gray-300 flex items-center justify-center overflow-hidden cursor-pointer"
                    onClick={()=>photoInputRef.current?.click()}>
                    {formObj.playerPhoto
                      ? <img src={formObj.playerPhoto} alt="" className="w-full h-full object-cover"/>
                      : <Upload className="w-6 h-6 text-gray-300"/>}
                  </div>
                  <input ref={photoInputRef} type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload}/>
                  <p className="text-[9px] text-gray-400 text-center mt-1">Foto</p>
                </div>
                <div className="flex-1 grid grid-cols-2 gap-3">
                  <div className="col-span-2">
                    <label className="text-[10px] font-semibold text-gray-500 uppercase">Nombre completo *</label>
                    <input value={formObj.playerName} onChange={e=>setFormObj(p=>({...p,playerName:e.target.value,fichaId:undefined}))}
                      className="input-field mt-1" placeholder="Ej: Alejandro Rego"/>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase">Club</label>
                    <input value={formObj.playerClub} onChange={e=>setFormObj(p=>({...p,playerClub:e.target.value}))}
                      className="input-field mt-1" placeholder="Athletic Club"/>
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-gray-500 uppercase">Dorsal</label>
                    <input type="number" value={formObj.playerNumber??''} onChange={e=>setFormObj(p=>({...p,playerNumber:e.target.value?+e.target.value:undefined}))}
                      className="input-field mt-1" placeholder="30"/>
                  </div>
                </div>
              </div>

              {/* Objective section */}
              <p className="text-[10px] font-bold uppercase tracking-widest text-gray-400 pt-2 border-t">Objetivo</p>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase">Título del objetivo *</label>
                <input value={formObj.titulo} onChange={e=>setFormObj(p=>({...p,titulo:e.target.value}))}
                  className="input-field mt-1 uppercase font-bold" placeholder="MEJORAR PASE CORTO"/>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase">Descripción detallada</label>
                <textarea value={formObj.descripcion} onChange={e=>setFormObj(p=>({...p,descripcion:e.target.value}))}
                  className="input-field mt-1 h-24 resize-none" placeholder='"Incrementar la precisión en pases de menos de 10 metros bajo presión..."'/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase">Fecha inicio</label>
                  <input type="date" value={formObj.fechaInicio} onChange={e=>setFormObj(p=>({...p,fechaInicio:e.target.value}))}
                    className="input-field mt-1"/>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase">Estado</label>
                  <select value={formObj.estado} onChange={e=>setFormObj(p=>({...p,estado:e.target.value as EstadoObjetivo}))}
                    className="input-field mt-1">
                    <option value="EN_CURSO">En curso</option>
                    <option value="COMPLETADO">Completado</option>
                    <option value="ABANDONADO">Abandonado</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase">Acción</label>
                  <select value={formObj.accion} onChange={e=>setFormObj(p=>({...p,accion:e.target.value as AccionObjetivo}))}
                    className="input-field mt-1">
                    <option value="MEJORAR">Mejorar</option>
                    <option value="MANTENER">Mantener</option>
                    <option value="DESARROLLAR">Desarrollar</option>
                    <option value="CORREGIR">Corregir</option>
                  </select>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase">Tipo</label>
                  <select value={formObj.tipo} onChange={e=>setFormObj(p=>({...p,tipo:e.target.value as TipoObjetivo}))}
                    className="input-field mt-1">
                    <option value="DEPORTIVO">Deportivo</option>
                    <option value="FISICO">Físico</option>
                    <option value="TECNICO">Técnico</option>
                    <option value="TACTICO">Táctico</option>
                    <option value="MENTAL">Mental</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-3 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase">URL Imagen</label>
                  <input value={formObj.imagenUrl} onChange={e=>setFormObj(p=>({...p,imagenUrl:e.target.value}))}
                    className="input-field mt-1" placeholder="https://..."/>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase">URL PDF</label>
                  <input value={formObj.pdfUrl} onChange={e=>setFormObj(p=>({...p,pdfUrl:e.target.value}))}
                    className="input-field mt-1" placeholder="https://..."/>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase">URL Vídeo</label>
                  <input value={formObj.videoUrl} onChange={e=>setFormObj(p=>({...p,videoUrl:e.target.value}))}
                    className="input-field mt-1" placeholder="https://..."/>
                </div>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t">
              <button onClick={()=>setShowFormObj(false)} className="px-4 py-2 rounded-lg border text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={saveObj} disabled={!formObj.playerName.trim()||!formObj.titulo.trim()}
                className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-sm disabled:opacity-40">
                {editingObj?'Guardar cambios':'Crear objetivo'}
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ── modal add acción ── */}
      {showFormAcc && (
        <ModalOverlay onClose={()=>setShowFormAcc(false)}>
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b">
              <h2 className="font-extrabold text-lg uppercase">Añadir Acción / Evaluación</h2>
              <button onClick={()=>setShowFormAcc(false)} className="text-gray-400 hover:text-gray-700"><X className="w-5 h-5"/></button>
            </div>
            <div className="p-5 space-y-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase">Fecha *</label>
                  <input type="date" value={formAcc.fecha} onChange={e=>setFormAcc(p=>({...p,fecha:e.target.value}))}
                    className="input-field mt-1"/>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase">Tipo *</label>
                  <select value={formAcc.tipo} onChange={e=>setFormAcc(p=>({...p,tipo:e.target.value as TipoHistorial}))}
                    className="input-field mt-1">
                    <option value="SESION">Sesión</option>
                    <option value="PARTIDO">Partido</option>
                    <option value="EVALUACION">Evaluación</option>
                  </select>
                </div>
              </div>
              {formAcc.tipo!=='EVALUACION' && (
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase">Título</label>
                  <input value={formAcc.titulo??''} onChange={e=>setFormAcc(p=>({...p,titulo:e.target.value}))}
                    className="input-field mt-1 uppercase" placeholder={formAcc.tipo==='SESION'?'TAREA 3: 11X11 CAMPO COMPLETO':'ATHLETIC - BARCELONA'}/>
                </div>
              )}
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase">
                  {formAcc.tipo==='EVALUACION'?'Evaluación *':'Comentario *'}
                </label>
                <textarea value={formAcc.comentario} onChange={e=>setFormAcc(p=>({...p,comentario:e.target.value}))}
                  className="input-field mt-1 h-20 resize-none"
                  placeholder={formAcc.tipo==='EVALUACION'?'"Se producen muchos errores no forzados."':'"Introducimos una norma en la que..."'}/>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase">URL Imagen</label>
                  <input value={formAcc.imagenUrl??''} onChange={e=>setFormAcc(p=>({...p,imagenUrl:e.target.value}))}
                    className="input-field mt-1" placeholder="https://..."/>
                </div>
                <div>
                  <label className="text-[10px] font-semibold text-gray-500 uppercase">URL Vídeo</label>
                  <input value={formAcc.videoUrl??''} onChange={e=>setFormAcc(p=>({...p,videoUrl:e.target.value}))}
                    className="input-field mt-1" placeholder="https://..."/>
                </div>
              </div>
              <div>
                <label className="text-[10px] font-semibold text-gray-500 uppercase">Estado (opcional)</label>
                <select value={formAcc.estadoBadge??''} onChange={e=>setFormAcc(p=>({...p,estadoBadge:(e.target.value as EstadoBadgeHistorial)||undefined}))}
                  className="input-field mt-1">
                  <option value="">Sin estado</option>
                  <option value="EN_CURSO">Objetivo en curso</option>
                  <option value="CONSEGUIDO">Objetivo conseguido</option>
                  <option value="EN_REVISION">En revisión</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-3 p-5 border-t">
              <button onClick={()=>setShowFormAcc(false)} className="px-4 py-2 rounded-lg border text-sm font-semibold text-gray-600 hover:bg-gray-50">Cancelar</button>
              <button onClick={saveAcc} disabled={!formAcc.comentario.trim()}
                className="px-5 py-2 rounded-lg bg-red-600 hover:bg-red-700 text-white font-bold text-sm disabled:opacity-40">
                Añadir
              </button>
            </div>
          </div>
        </ModalOverlay>
      )}

      {/* ── lightbox imagen ── */}
      {viewImg && (
        <ModalOverlay onClose={()=>setViewImg(null)}>
          <div className="relative max-w-4xl w-full">
            <button onClick={()=>setViewImg(null)}
              className="absolute -top-10 right-0 text-white hover:text-gray-300 font-bold text-sm flex items-center gap-1">
              <X className="w-5 h-5"/> Cerrar
            </button>
            <img src={viewImg} alt="" className="w-full rounded-lg shadow-2xl"/>
          </div>
        </ModalOverlay>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   OBJECTIVE CARD (list view)
═══════════════════════════════════════════════════════ */
function ObjectiveCard({ objetivo, onClick, onEdit, onDelete }:
  { objetivo: ObjetivoJugadora; onClick: ()=>void; onEdit: ()=>void; onDelete: ()=>void }) {
  const o = objetivo
  const { clubes } = useStore()
  const escudo = clubes.find(c => c.nombre.toLowerCase() === o.playerClub.toLowerCase())?.escudo
  return (
    <div className="bg-white rounded-xl border-2 border-gray-200 hover:border-gray-400 transition-all shadow-sm hover:shadow-md overflow-hidden">
      {/* Player banner */}
      <div className="bg-gray-900 p-3 flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gray-700 overflow-hidden flex-shrink-0 border-2 border-white/20">
          {o.playerPhoto
            ? <img src={o.playerPhoto} alt="" className="w-full h-full object-cover"/>
            : <div className="w-full h-full flex items-center justify-center text-white font-bold text-sm">
                {o.playerName.charAt(0)}
              </div>}
        </div>
        <div className="min-w-0">
          <p className="text-white font-extrabold text-sm uppercase truncate">{o.playerName}</p>
          <p className="text-white/50 text-xs truncate flex items-center gap-1.5">
              {escudo && <img src={escudo} alt="" className="w-4 h-4 object-contain flex-shrink-0"/>}
              {o.playerClub}
            </p>
        </div>
        {o.playerNumber && (
          <span className="ml-auto text-red-400 font-black text-xl flex-shrink-0">{o.playerNumber}</span>
        )}
      </div>

      {/* Content */}
      <div className="p-4 cursor-pointer" onClick={onClick}>
        <div className="flex gap-2 flex-wrap mb-3">
          <span className={`text-[10px] font-black px-2 py-0.5 rounded ${ACCION_STYLE[o.accion]}`}>{o.accion}</span>
          <span className={`text-[10px] font-bold px-2 py-0.5 rounded ${TIPO_STYLE[o.tipo]}`}>{o.tipo}</span>
          {o.estado==='COMPLETADO'&&<span className="text-[10px] font-bold px-2 py-0.5 rounded bg-green-100 text-green-700">COMPLETADO</span>}
          {o.estado==='ABANDONADO'&&<span className="text-[10px] font-bold px-2 py-0.5 rounded bg-gray-200 text-gray-500">ABANDONADO</span>}
        </div>
        <p className="font-extrabold text-gray-900 uppercase text-base leading-tight mb-2">{o.titulo}</p>
        <p className="text-gray-500 text-xs line-clamp-2">{o.descripcion}</p>
        <div className="flex items-center gap-3 mt-3 text-[10px] text-gray-400">
          <span>Inicio: {fmtDate(o.fechaInicio)}</span>
          <span>·</span>
          <span>{o.historial.length} acciones</span>
        </div>
      </div>

      {/* Actions */}
      <div className="flex border-t border-gray-100">
        <button onClick={onClick} className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
          <Eye className="w-3.5 h-3.5"/> Ver
        </button>
        <div className="w-px bg-gray-100"/>
        <button onClick={e=>{e.stopPropagation();onEdit()}} className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-semibold text-gray-600 hover:bg-gray-50 transition-colors">
          <Edit3 className="w-3.5 h-3.5"/> Editar
        </button>
        <div className="w-px bg-gray-100"/>
        <button onClick={e=>{e.stopPropagation();if(confirm('¿Eliminar este objetivo?'))onDelete()}}
          className="flex-1 flex items-center justify-center gap-1 py-2.5 text-xs font-semibold text-red-400 hover:bg-red-50 transition-colors">
          <Trash2 className="w-3.5 h-3.5"/> Borrar
        </button>
      </div>
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   DETAIL VIEW
═══════════════════════════════════════════════════════ */
function DetailView({ objetivo, onBack, onEdit, onDelete, onAddAccion, onDeleteAccion, onViewImg }:
  { objetivo: ObjetivoJugadora; onBack:()=>void; onEdit:()=>void; onDelete:()=>void;
    onAddAccion:()=>void; onDeleteAccion:(id:string)=>void; onViewImg:(u:string)=>void }) {
  const o = objetivo
  const { clubes } = useStore()
  const escudo = clubes.find(c => c.nombre.toLowerCase() === o.playerClub.toLowerCase())?.escudo
  const sortedHistory = [...o.historial].sort((a,b)=>b.fecha.localeCompare(a.fecha))
  const pdfRef = useRef<HTMLDivElement>(null)
  const [pdfLoading, setPdfLoading] = useState(false)

  const handlePDF = async () => {
    if (!pdfRef.current) return
    setPdfLoading(true)
    const el = pdfRef.current
    const prevCss = el.style.cssText
    el.style.cssText = 'position:fixed;top:0;left:0;width:794px;z-index:99999;background:white;padding:32px;box-sizing:border-box;'
    await new Promise<void>(r => requestAnimationFrame(() => requestAnimationFrame(() => r())))
    try {
      const html2canvas = (await import('html2canvas')).default
      const canvas = await html2canvas(el, { scale: 2, useCORS: true, logging: false, backgroundColor: '#ffffff', allowTaint: true })
      const { jsPDF } = await import('jspdf')
      const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
      const pdfW = pdf.internal.pageSize.getWidth()
      const pdfH = pdf.internal.pageSize.getHeight()
      const imgH = (canvas.height / canvas.width) * pdfW
      const imgData = canvas.toDataURL('image/png', 1.0)
      let yOffset = 0, remaining = imgH
      while (remaining > 0) {
        if (yOffset > 0) pdf.addPage()
        pdf.addImage(imgData, 'PNG', 0, -yOffset, pdfW, imgH)
        yOffset += pdfH; remaining -= pdfH
      }
      const safeName = o.playerName.replace(/\s+/g, '-').toLowerCase()
      pdf.save(`desarrollo-individual-${safeName}.pdf`)
    } finally {
      el.style.cssText = prevCss
      setPdfLoading(false)
    }
  }

  return (
    <div className="space-y-6">
      {/* Back + actions */}
      <div className="flex items-center justify-between gap-3">
        <button onClick={onBack} className="flex items-center gap-2 text-sm font-semibold text-gray-500 hover:text-gray-800 transition-colors">
          <ChevronLeft className="w-4 h-4"/> Todos los objetivos
        </button>
        <div className="flex gap-2">
          <button onClick={handlePDF} disabled={pdfLoading}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 text-xs font-semibold text-gray-700 hover:bg-gray-50 disabled:opacity-50 transition-colors">
            {pdfLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin"/> : <Download className="w-3.5 h-3.5"/>}
            {pdfLoading ? 'Generando…' : 'Descargar PDF'}
          </button>
          <button onClick={onEdit}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border text-xs font-semibold text-gray-600 hover:bg-gray-50">
            <Edit3 className="w-3.5 h-3.5"/> Editar
          </button>
          <button onClick={()=>{ if(confirm('¿Eliminar este objetivo?')) onDelete() }}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-red-200 text-xs font-semibold text-red-500 hover:bg-red-50">
            <Trash2 className="w-3.5 h-3.5"/> Eliminar
          </button>
        </div>
      </div>

      {/* ── Printable content ── */}
      <div ref={pdfRef}>

      {/* ── Objective card (matches screenshot 2) ── */}
      <div className="bg-white border-2 border-gray-900 rounded-xl overflow-hidden shadow-lg">
        <div className="flex flex-col md:flex-row">

          {/* Left — player section */}
          <div className="bg-gray-900 md:w-56 flex-shrink-0 relative overflow-hidden">
            {o.playerPhoto && (
              <img src={o.playerPhoto} alt={o.playerName}
                className="w-full h-full object-cover object-top absolute inset-0 opacity-70"/>
            )}
            <div className="relative z-10 p-5 h-full min-h-[200px] flex flex-col justify-between">
              {o.playerNumber && (
                <span className="text-red-500 font-black text-6xl leading-none drop-shadow-lg">{o.playerNumber}</span>
              )}
              <div className="bg-white px-3 py-2 mt-auto">
                <p className="font-extrabold text-gray-900 uppercase text-base leading-tight">{o.playerName}</p>
                {o.playerClub && (
                  <p className="text-gray-500 text-xs uppercase font-semibold flex items-center gap-1.5 mt-0.5">
                    {escudo && <img src={escudo} alt="" className="w-5 h-5 object-contain flex-shrink-0"/>}
                    {o.playerClub}
                  </p>
                )}
              </div>
            </div>
          </div>

          {/* Right — objective details */}
          <div className="flex-1 p-5">
            {/* Badges row */}
            <div className="flex items-center flex-wrap gap-2 mb-4">
              <div className="flex items-center gap-1.5 border border-gray-300 rounded px-2 py-1 text-[10px] font-semibold text-gray-600">
                <Target className="w-3 h-3"/>
              </div>
              <div className="flex items-center gap-1.5 border border-gray-300 rounded px-2 py-1 text-[10px] font-semibold text-gray-600">
                <span>FECHA INICIO: {fmtDate(o.fechaInicio)}</span>
              </div>
              <span className={`text-[10px] font-black px-3 py-1 rounded ${ACCION_STYLE[o.accion]}`}>{o.accion}</span>
              <span className={`text-[10px] font-bold px-3 py-1 rounded ${TIPO_STYLE[o.tipo]}`}>{o.tipo}</span>
            </div>

            {/* Title */}
            <h2 className="font-black text-gray-900 uppercase text-2xl leading-tight mb-4 tracking-tight">{o.titulo}</h2>

            {/* Description */}
            {o.descripcion && (
              <div className="border border-gray-200 rounded-lg overflow-hidden mb-4">
                <div className="bg-gray-100 px-3 py-1 border-b border-gray-200">
                  <span className="text-[9px] font-black uppercase tracking-widest text-gray-500">Descripción Detallada</span>
                </div>
                <div className="bg-red-50 p-4">
                  <p className="text-gray-700 text-sm italic leading-relaxed">"{o.descripcion}"</p>
                </div>
              </div>
            )}

            {/* Media buttons */}
            <div className="flex flex-wrap gap-2">
              {o.imagenUrl && (
                <a href={o.imagenUrl} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 border-2 border-gray-900 px-4 py-2 text-xs font-black uppercase hover:bg-gray-900 hover:text-white transition-colors rounded">
                  <ImageIcon className="w-4 h-4"/> Imagen
                </a>
              )}
              {o.pdfUrl && (
                <a href={o.pdfUrl} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 border-2 border-gray-900 px-4 py-2 text-xs font-black uppercase hover:bg-gray-900 hover:text-white transition-colors rounded">
                  <FileText className="w-4 h-4"/> PDF
                </a>
              )}
              {o.videoUrl && (
                <a href={o.videoUrl} target="_blank" rel="noreferrer"
                  className="flex items-center gap-2 border-2 border-gray-900 px-4 py-2 text-xs font-black uppercase hover:bg-gray-900 hover:text-white transition-colors rounded">
                  <Video className="w-4 h-4"/> Vídeo
                </a>
              )}
            </div>
          </div>
        </div>
      </div>

      {/* ── History section (matches screenshot 1) ── */}
      <div className="space-y-4">
        {/* Section title */}
        <div className="flex items-center gap-3">
          <div className="flex-1 h-0.5 bg-red-600"/>
          <h3 className="font-black uppercase text-sm tracking-widest text-gray-900 px-2 whitespace-nowrap">
            Historial de Acciones y Evaluaciones
          </h3>
          <div className="flex-1 h-0.5 bg-red-600"/>
        </div>

        <div className="flex justify-end">
          <button onClick={onAddAccion}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white font-bold px-4 py-2 rounded-lg text-xs transition-colors">
            <Plus className="w-3.5 h-3.5"/> Añadir acción / evaluación
          </button>
        </div>

        {sortedHistory.length===0 ? (
          <div className="text-center py-12 bg-gray-50 rounded-xl border border-gray-200">
            <p className="text-gray-400 text-sm font-semibold">Sin acciones registradas todavía</p>
            <p className="text-gray-400 text-xs mt-1">Registra sesiones, partidos y evaluaciones de seguimiento</p>
          </div>
        ) : (
          <div className="space-y-3">
            {sortedHistory.map(acc=>(
              <HistorialCard key={acc.id} acc={acc}
                onDelete={()=>{ if(confirm('¿Eliminar esta entrada?')) onDeleteAccion(acc.id) }}
                onViewImg={onViewImg}/>
            ))}
          </div>
        )}
      </div>

      </div>{/* end pdfRef */}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   HISTORIAL CARD
═══════════════════════════════════════════════════════ */
function HistorialCard({ acc, onDelete, onViewImg }:
  { acc: HistorialAccion; onDelete:()=>void; onViewImg:(u:string)=>void }) {
  return (
    <div className="bg-white border-2 border-gray-900 rounded-lg overflow-hidden">
      {/* Header row */}
      <div className="flex items-center gap-2 px-4 py-3 border-b border-gray-200">
        <span className="bg-gray-900 text-white text-[11px] font-black px-3 py-1 rounded flex-shrink-0">
          {fmtDate(acc.fecha)}
        </span>
        <span className="border border-gray-900 text-[11px] font-black px-3 py-1 rounded text-gray-900 flex-shrink-0">
          {TIPO_H_LABEL[acc.tipo]}
        </span>
        {acc.titulo && (
          <span className="border border-gray-300 text-[11px] font-black px-3 py-1 rounded text-gray-700 uppercase truncate">
            {acc.titulo}
          </span>
        )}
        {acc.estadoBadge && (
          <span className={`ml-auto flex-shrink-0 text-[10px] font-black px-3 py-1 rounded ${BADGE_STYLE[acc.estadoBadge]}`}>
            {BADGE_LABEL[acc.estadoBadge]}
          </span>
        )}
        <button onClick={onDelete}
          className={`${acc.estadoBadge ? '' : 'ml-auto'} flex-shrink-0 text-gray-300 hover:text-red-500 transition-colors p-1`}>
          <Trash2 className="w-3.5 h-3.5"/>
        </button>
      </div>

      {/* Comment body */}
      <div className="px-4 py-3">
        <div className="mb-2">
          <span className="text-[9px] font-black uppercase tracking-widest text-gray-400 border border-gray-200 px-2 py-0.5 rounded">
            {acc.tipo==='EVALUACION'?'Evaluación':'Comentario'}
          </span>
        </div>
        <p className="text-gray-700 text-sm italic leading-relaxed">"{acc.comentario}"</p>
      </div>

      {/* Media buttons */}
      {(acc.imagenUrl || acc.videoUrl) && (
        <div className="flex gap-3 px-4 pb-3">
          {acc.imagenUrl && (
            <button onClick={()=>onViewImg(acc.imagenUrl!)}
              className="flex items-center gap-2 border border-gray-300 rounded px-3 py-1.5 text-[11px] font-bold text-gray-600 hover:border-gray-900 hover:text-gray-900 transition-colors">
              <div className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-current"/>
              </div>
              Ver Imagen
            </button>
          )}
          {acc.videoUrl && (
            <a href={acc.videoUrl} target="_blank" rel="noreferrer"
              className="flex items-center gap-2 border border-gray-300 rounded px-3 py-1.5 text-[11px] font-bold text-gray-600 hover:border-gray-900 hover:text-gray-900 transition-colors">
              <div className="w-3.5 h-3.5 rounded-full border border-current flex items-center justify-center">
                <div className="w-1.5 h-1.5 rounded-full bg-current"/>
              </div>
              Ver Vídeo
            </a>
          )}
        </div>
      )}
    </div>
  )
}

/* ═══════════════════════════════════════════════════════
   MODAL OVERLAY
═══════════════════════════════════════════════════════ */
function ModalOverlay({ children, onClose }: { children: React.ReactNode; onClose: ()=>void }) {
  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-center justify-center p-4"
      onClick={e=>{ if(e.target===e.currentTarget) onClose() }}>
      {children}
    </div>
  )
}
