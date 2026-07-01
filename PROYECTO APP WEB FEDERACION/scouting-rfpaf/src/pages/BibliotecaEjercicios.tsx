import { useState, useRef, useEffect } from 'react'
import { fetchEjercicios, createEjercicio } from '../lib/supabase'
import type { EjercicioDB } from '../lib/supabase'
import { v4 as uuidv4 } from 'uuid'
import { ChevronDown, Plus, Video, Pencil, FileText, Eye, X } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { EjercicioSesion } from '../types'
import { TIPOS_EJERCICIO, FILTER_TIPOS, FILTER_JUGADORES, FILTER_DURACION, FILTER_MATERIAL, EJ_SESION_EMPTY } from '../lib/entrenamientoConstants'
import { getEmbedUrl } from '../lib/entrenamientoUtils'
import TacticalBoard from '../components/TacticalBoard'

const BibliotecaEjercicios = () => {
  const { ejercicios, setEjercicios, sesion, setSesion } = useStore()

  const [searchText, setSearchText] = useState('')
  const [filtroTipo, setFiltroTipo] = useState('')
  const [filtroJugadores, setFiltroJugadores] = useState('')
  const [filtroDuracion, setFiltroDuracion] = useState('')
  const [filtroMaterial, setFiltroMaterial] = useState('')
  const [crearEjercicioOpen, setCrearEjercicioOpen] = useState(false)
  const [previewEjercicio, setPreviewEjercicio] = useState<EjercicioDB | null>(null)
  const [editEjercicio, setEditEjercicio] = useState<EjercicioDB | null>(null)
  const [formEj, setFormEj] = useState({tipo:'',duracion:'',num_jugadores:'',material:'',titulo:'',descripcion:'',imagen:'',video:''})
  const [formEditEj, setFormEditEj] = useState({tipo:'',duracion:'',num_jugadores:'',material:'',titulo:'',descripcion:'',imagen:'',video:''})
  const captureForEjRef = useRef<(()=>string|null)|null>(null)

  useEffect(() => {
    const loadEjercicios = async () => {
      const data = await fetchEjercicios()
      setEjercicios(data)
    }
    if (ejercicios.length === 0) loadEjercicios()
  }, [])

  const ejerciciosFiltrados = ejercicios.filter(ej => {
    const matchTipo = !filtroTipo || ej.tipo === filtroTipo
    const matchJugadores = !filtroJugadores || ej.num_jugadores === filtroJugadores
    const matchMaterial = !filtroMaterial || (ej.material?.includes(filtroMaterial) ?? false)
    const matchSearch = !searchText || ej.descripcion.toLowerCase().includes(searchText.toLowerCase()) || ej.tipo.toLowerCase().includes(searchText.toLowerCase())

    let matchDuracion = true
    if (filtroDuracion) {
      const dur = ej.duracion
      if (filtroDuracion === '5-10') matchDuracion = dur >= 5 && dur <= 10
      else if (filtroDuracion === '10-20') matchDuracion = dur > 10 && dur <= 20
      else if (filtroDuracion === '20+') matchDuracion = dur > 20
    }

    return matchTipo && matchJugadores && matchMaterial && matchSearch && matchDuracion
  })

  return (
    <div className="space-y-5">
      {/* Título y botón crear */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Biblioteca de Ejercicios</h2>
          <p className="text-sm text-gray-500 mt-1">Gestiona y organiza los ejercicios de entrenamiento</p>
        </div>
        <button type="button" onClick={()=>setCrearEjercicioOpen(true)}
          className="flex items-center gap-2 px-5 py-2.5 bg-rfpaf-blue text-white rounded-lg text-sm font-semibold hover:bg-rfpaf-blue/90 transition-colors whitespace-nowrap shadow-sm">
          <Plus className="w-4 h-4"/> Crear ejercicio
        </button>
      </div>

      {/* Filtros */}
      <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Búsqueda</label>
            <input type="text" value={searchText} onChange={e=>setSearchText(e.target.value)} placeholder="Escribe para buscar…"
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"/>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Tipo</label>
            <select value={filtroTipo} onChange={e=>setFiltroTipo(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30">
              <option value="">Todos</option>
              {FILTER_TIPOS.map(t=><option key={t} value={t}>{t}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Jugadores</label>
            <select value={filtroJugadores} onChange={e=>setFiltroJugadores(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30">
              <option value="">Todos</option>
              {FILTER_JUGADORES.map(j=><option key={j} value={j}>{j}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Duración</label>
            <select value={filtroDuracion} onChange={e=>setFiltroDuracion(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30">
              <option value="">Todos</option>
              {FILTER_DURACION.map(d=><option key={d} value={d}>{d} min</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">Material</label>
            <select value={filtroMaterial} onChange={e=>setFiltroMaterial(e.target.value)}
              className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30">
              <option value="">Todos</option>
              {FILTER_MATERIAL.map(m=><option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="block text-xs font-semibold text-gray-600 mb-1.5 uppercase tracking-wider">&nbsp;</label>
            <button type="button" onClick={()=>{setSearchText('');setFiltroTipo('');setFiltroJugadores('');setFiltroDuracion('');setFiltroMaterial('')}}
              className="w-full px-3 py-2 text-sm border border-gray-300 rounded-lg hover:bg-gray-50 transition-colors font-medium text-gray-600">
              Limpiar
            </button>
          </div>
          </div>
      </div>

      {/* Resultados - Grid de tarjetas */}
      <div>
        <p className="text-xs font-semibold text-gray-500 mb-4 uppercase tracking-wider">{ejerciciosFiltrados.length} ejercicio{ejerciciosFiltrados.length!==1?'s':''}</p>
        {ejerciciosFiltrados.length === 0 ? (
          <div className="text-center py-12 text-gray-400 bg-white rounded-xl border border-gray-200">
            <FileText className="w-8 h-8 mx-auto mb-2 opacity-30"/>
            <p className="text-sm font-medium">Sin ejercicios</p>
            <p className="text-xs mt-1 opacity-70">Ajusta los filtros</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {ejerciciosFiltrados.map(ej => (
              <div key={ej.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer"
                >
                {/* Imagen/Video */}
                <div className="relative">
                  {ej.video ? (
                    <div className="w-full aspect-video bg-gray-900">
                      <iframe src={getEmbedUrl(ej.video)} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title={ej.titulo}/>
                    </div>
                  ) : ej.imagen ? (
                    <div className="w-full aspect-video bg-gray-100 flex items-center justify-center overflow-hidden">
                      <img
                        src={ej.imagen.startsWith('data:') ? ej.imagen : `data:image/png;base64,${ej.imagen}`}
                        alt={ej.tipo}
                        className="w-full h-full object-cover"
                      />
                    </div>
                  ) : (
                    <div className="w-full aspect-video bg-gradient-to-br from-rfpaf-blue/10 to-rfpaf-blue/5 flex items-center justify-center">
                      <Video className="w-8 h-8 text-rfpaf-blue/30"/>
                    </div>
                  )}
                  <span className="absolute top-2 left-2 inline-block bg-rfpaf-blue text-white text-xs font-bold px-2.5 py-1 rounded-full">{ej.tipo}</span>
                </div>

                {/* Contenido */}
                <div className="p-4 space-y-3">
                  {/* Descripción */}
                  <div>
                    <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm">{ej.descripcion}</h3>
                    <span className="text-xs text-gray-500">#{ej.id}</span>
                  </div>

                  {/* Datos clave */}
                  <div className="grid grid-cols-2 gap-2">
                    <div className="bg-blue-50 rounded-lg p-2 border border-blue-100 text-center">
                      <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider">Duración</p>
                      <p className="text-lg font-bold text-rfpaf-blue">{ej.duracion}<span className="text-xs">min</span></p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2 border border-green-100 text-center">
                      <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider">Jugadores</p>
                      <p className="text-base font-bold text-green-700">{ej.num_jugadores}</p>
                    </div>
                  </div>

                  {/* Material */}
                  {ej.material && (
                    <div className="border-t border-gray-200 pt-2">
                      <p className="text-xs font-semibold text-gray-600 uppercase tracking-wider mb-1.5">Material</p>
                      <div className="flex flex-wrap gap-1">
                        {ej.material.split(',').map(m => (
                          <span key={m.trim()} className="bg-orange-100 text-orange-800 text-xs font-semibold px-2 py-0.5 rounded">
                            {m.trim()}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}

                  {/* Botones de vista previa, edición y agregar a sesión */}
                  <div className="flex gap-2">
                    <button type="button"
                      onClick={() => setPreviewEjercicio(ej)}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-gray-100 text-gray-700 rounded-lg text-xs font-medium hover:bg-gray-200 transition-colors">
                      <Eye className="w-3 h-3"/> Vista previa
                    </button>
                    <button type="button"
                      onClick={() => {
                        setEditEjercicio(ej)
                        setFormEditEj({
                          tipo: ej.tipo,
                          duracion: String(ej.duracion),
                          num_jugadores: ej.num_jugadores,
                          material: ej.material || '',
                          titulo: ej.titulo,
                          descripcion: ej.descripcion,
                          imagen: ej.imagen || '',
                          video: ej.video || ''
                        })
                      }}
                      className="flex-1 flex items-center justify-center gap-1 px-2 py-1.5 bg-amber-100 text-amber-700 rounded-lg text-xs font-medium hover:bg-amber-200 transition-colors">
                      <Pencil className="w-3 h-3"/> Editar
                    </button>
                  </div>

                  {/* Botón Agregar a sesión */}
                  <button type="button"
                    onClick={() => {
                      const nuevoEj: EjercicioSesion = {
                        id: uuidv4(),
                        orden: 0,
                        tipo: ej.tipo,
                        duracion: String(ej.duracion),
                        numJugadores: ej.num_jugadores,
                        descripcion: ej.descripcion,
                        material: ej.material || '',
                        imagen: ej.imagen
                      }
                      setSesion(s => ({
                        ...s,
                        ejercicios: [...s.ejercicios, {...nuevoEj, orden: s.ejercicios.length + 1}]
                      }))
                    }}
                    className="w-full mt-2 flex items-center justify-center gap-2 px-3 py-2 bg-rfpaf-blue text-white rounded-lg text-xs font-semibold hover:bg-rfpaf-blue/90 transition-colors">
                    <Plus className="w-3.5 h-3.5"/> Agregar a sesión
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal vista previa */}
      {previewEjercicio && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-gray-900">Vista previa: {previewEjercicio.titulo}</h2>
              <button onClick={() => setPreviewEjercicio(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {previewEjercicio.imagen && (
                <div className="rounded-lg overflow-hidden bg-gray-100 flex items-center justify-center" style={{maxHeight: '300px'}}>
                  <img src={previewEjercicio.imagen} alt="preview" className="max-w-full max-h-full object-contain"/>
                </div>
              )}
              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">{previewEjercicio.titulo}</h3>
                <span className="inline-block bg-rfpaf-blue text-white text-xs font-bold px-2.5 py-0.5 rounded-full mb-3">{previewEjercicio.tipo}</span>
              </div>
              <div className="grid grid-cols-3 gap-2 text-xs">
                <div className="bg-blue-50 rounded-lg p-2 border border-blue-100 text-center">
                  <p className="text-gray-600 font-semibold uppercase">Duración</p>
                  <p className="text-lg font-bold text-rfpaf-blue">{previewEjercicio.duracion} min</p>
                </div>
                <div className="bg-green-50 rounded-lg p-2 border border-green-100 text-center">
                  <p className="text-gray-600 font-semibold uppercase">Jugadores</p>
                  <p className="font-bold text-green-700">{previewEjercicio.num_jugadores}</p>
                </div>
                <div className="bg-purple-50 rounded-lg p-2 border border-purple-100 text-center">
                  <p className="text-gray-600 font-semibold uppercase">Material</p>
                  <p className="font-bold text-purple-700">{previewEjercicio.material || '—'}</p>
                </div>
              </div>
              {previewEjercicio.descripcion && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-1">Descripción</p>
                  <p className="text-sm text-gray-700 leading-relaxed">{previewEjercicio.descripcion}</p>
                </div>
              )}
              {previewEjercicio.video && (
                <div>
                  <p className="text-xs font-semibold text-gray-600 uppercase mb-2">Vídeo</p>
                  <iframe src={getEmbedUrl(previewEjercicio.video)} className="w-full h-64 rounded-lg" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen title="Video"/>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Modal editar ejercicio */}
      {editEjercicio && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-gray-900">Editar ejercicio</h2>
              <button onClick={() => setEditEjercicio(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
            </div>
            <div className="p-5 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Título</label>
                <input type="text" value={formEditEj.titulo} onChange={e => setFormEditEj({...formEditEj, titulo: e.target.value})}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo</label>
                <select value={formEditEj.tipo} onChange={e => setFormEditEj({...formEditEj, tipo: e.target.value})}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30">
                  <option value="">Seleccionar…</option>
                  {FILTER_TIPOS.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Duración (min)</label>
                  <input type="number" value={formEditEj.duracion} onChange={e => setFormEditEj({...formEditEj, duracion: e.target.value})}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"/>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Jugadores</label>
                  <input type="text" value={formEditEj.num_jugadores} onChange={e => setFormEditEj({...formEditEj, num_jugadores: e.target.value})}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"/>
                </div>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Material</label>
                <input type="text" value={formEditEj.material} onChange={e => setFormEditEj({...formEditEj, material: e.target.value})}
                  placeholder="Conos, balones, petos…"
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1">Descripción</label>
                <textarea value={formEditEj.descripcion} onChange={e => setFormEditEj({...formEditEj, descripcion: e.target.value})}
                  rows={3}
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30 resize-none"/>
              </div>
              <div>
                <label className="block text-xs font-semibold text-gray-600 mb-1 flex items-center gap-2">
                  <Video className="w-3.5 h-3.5"/>
                  URL del vídeo (YouTube o Vimeo)
                </label>
                <input type="url" value={formEditEj.video} onChange={e => setFormEditEj({...formEditEj, video: e.target.value})}
                  placeholder="https://www.youtube.com/watch?v=... o https://vimeo.com/..."
                  className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"/>
                {formEditEj.video && (
                  <p className="text-xs text-gray-500 mt-1">✓ URL agregada - se embebería en la vista previa</p>
                )}
              </div>
              <div className="flex gap-3">
                <button type="button"
                  onClick={async () => {
                    if (!editEjercicio) return
                    const updated = {...editEjercicio, ...formEditEj, duracion: parseInt(formEditEj.duracion)}
                    setEjercicios(ejercicios.map(e => e.id === editEjercicio.id ? updated : e))
                    setEditEjercicio(null)
                    alert('✅ Ejercicio actualizado')
                  }}
                  className="flex-1 px-4 py-2 bg-rfpaf-blue text-white rounded-lg text-sm font-semibold hover:bg-rfpaf-blue/90 transition-colors">
                  Guardar cambios
                </button>
                <button type="button" onClick={() => setEditEjercicio(null)}
                  className="flex-1 px-4 py-2 bg-gray-200 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-300 transition-colors">
                  Cancelar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal crear nuevo ejercicio */}
      {crearEjercicioOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-5xl w-full max-h-[95vh] overflow-y-auto">

            {/* Header */}
            <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-gray-900">Crear nuevo ejercicio</h2>
              <button onClick={()=>{setCrearEjercicioOpen(false);setFormEj({tipo:'',duracion:'',num_jugadores:'',material:'',titulo:'',descripcion:'',imagen:'',video:''})}}
                className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
            </div>

            <div className="p-5 space-y-5">

              {/* 1. Pizarra Táctica — ancho completo */}
              <div>
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-2">1. Pizarra Táctica</p>
                <div className="rounded-xl overflow-hidden border border-gray-200">
                  <TacticalBoard onRegisterCapture={fn=>captureForEjRef.current=fn}/>
                </div>
              </div>

              {/* 2. Capturar / Subir imagen */}
              <div className="flex flex-wrap items-center gap-3">
                <button type="button"
                  onClick={()=>{const img=captureForEjRef.current?.();if(img)setFormEj(f=>({...f,imagen:img}))}}
                  className="flex items-center gap-2 px-4 py-2 bg-rfpaf-blue text-white rounded-lg text-sm font-semibold hover:bg-rfpaf-blue/90 transition-colors">
                  <Camera className="w-4 h-4"/> Capturar imagen de la pizarra
                </button>
                <span className="text-gray-400 text-sm">o subir desde archivo:</span>
                <input type="file" accept="image/*"
                  onChange={async (e)=>{const file=e.target.files?.[0];if(file){const reader=new FileReader();reader.onload=(ev)=>{const img=ev.target?.result;if(typeof img==='string')setFormEj(f=>({...f,imagen:img}))};reader.readAsDataURL(file)}}}
                  className="text-sm border border-gray-200 rounded-lg px-3 py-1.5 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30 file:bg-rfpaf-blue file:text-white file:border-0 file:px-3 file:py-1 file:rounded file:text-xs file:font-semibold file:cursor-pointer hover:file:bg-rfpaf-blue/90"/>
              </div>

              {/* Vista previa de imagen */}
              {formEj.imagen && (
                <div className="flex items-start gap-3 bg-gray-50 rounded-xl p-3 border border-gray-200">
                  <img src={formEj.imagen} alt="preview" className="w-40 h-auto rounded-lg object-contain border border-gray-200 flex-shrink-0"/>
                  <div className="flex-1 min-w-0">
                    <p className="text-xs font-semibold text-gray-600 mb-2">Vista previa capturada</p>
                    <button type="button" onClick={()=>setFormEj(f=>({...f,imagen:''}))}
                      className="px-3 py-1.5 text-xs border border-red-300 text-red-600 rounded-lg hover:bg-red-50 transition-colors font-medium">
                      Remover imagen
                    </button>
                  </div>
                </div>
              )}

              {/* 3. Datos del ejercicio */}
              <div className="border-t border-gray-100 pt-4">
                <p className="text-xs font-semibold text-gray-500 uppercase tracking-wider mb-3">2. Datos del ejercicio</p>
                <div className="grid grid-cols-2 gap-3">

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Título del ejercicio <span className="text-rfpaf-red">*</span></label>
                    <input type="text" value={formEj.titulo} onChange={e=>setFormEj(f=>({...f,titulo:e.target.value}))}
                      placeholder="Nombre corto del ejercicio…"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"/>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo <span className="text-rfpaf-red">*</span></label>
                    <select value={formEj.tipo} onChange={e=>setFormEj(f=>({...f,tipo:e.target.value}))}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30">
                      <option value="">Seleccionar…</option>
                      {FILTER_TIPOS.map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Duración (min) <span className="text-rfpaf-red">*</span></label>
                      <input type="number" value={formEj.duracion} onChange={e=>setFormEj(f=>({...f,duracion:e.target.value}))}
                        placeholder="15" min="1"
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"/>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-gray-600 mb-1">Jugadores <span className="text-rfpaf-red">*</span></label>
                      <select value={formEj.num_jugadores} onChange={e=>setFormEj(f=>({...f,num_jugadores:e.target.value}))}
                        className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30">
                        <option value="">—</option>
                        {[...Array(22)].map((_,i)=><option key={i+1} value={String(i+1)}>{i+1}</option>)}
                        <option value="1 comodín">1 comodín</option>
                        <option value="2 comodines">2 comodines</option>
                        <option value="3 comodines">3 comodines</option>
                      </select>
                    </div>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Material</label>
                    <input type="text" value={formEj.material} onChange={e=>setFormEj(f=>({...f,material:e.target.value}))}
                      placeholder="Conos, balones, petos…"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"/>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Descripción detallada</label>
                    <textarea value={formEj.descripcion} onChange={e=>setFormEj(f=>({...f,descripcion:e.target.value}))}
                      placeholder="Descripción y objetivos del ejercicio…" rows={3}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30 resize-none"/>
                  </div>

                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-gray-600 mb-1">URL del vídeo (opcional)</label>
                    <input type="url" value={formEj.video} onChange={e=>setFormEj(f=>({...f,video:e.target.value}))}
                      placeholder="YouTube o Vimeo…"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"/>
                  </div>

                </div>
              </div>

              {/* Botones */}
              <div className="flex gap-3 pt-2 border-t border-gray-100">
                <button type="button" onClick={async ()=>{
                  if(!formEj.tipo||!formEj.duracion||!formEj.num_jugadores||!formEj.titulo){alert('Rellena los campos obligatorios');return}
                  const newEj = await createEjercicio({
                    tipo:formEj.tipo,
                    duracion:parseInt(formEj.duracion),
                    num_jugadores:formEj.num_jugadores,
                    material:formEj.material||null,
                    titulo:formEj.titulo,
                    descripcion:formEj.descripcion,
                    imagen:formEj.imagen||null,
                    video:formEj.video||null
                  });
                  if(newEj){
                    setEjercicios(prev=>[newEj,...prev]);
                    alert('✅ Ejercicio guardado exitosamente');
                    setCrearEjercicioOpen(false);
                    setFormEj({tipo:'',duracion:'',num_jugadores:'',material:'',titulo:'',descripcion:'',imagen:'',video:''});
                    captureForEjRef.current=null
                  } else {
                    alert('❌ Error al guardar el ejercicio');
                  }
                }}
                  className="flex-1 px-4 py-2.5 bg-rfpaf-blue text-white rounded-lg text-sm font-bold hover:bg-rfpaf-blue/90 transition-colors">
                  Guardar ejercicio
                </button>
                <button type="button"
                  onClick={()=>{setCrearEjercicioOpen(false);setFormEj({tipo:'',duracion:'',num_jugadores:'',material:'',titulo:'',descripcion:'',imagen:'',video:''})}}
                  className="flex-1 px-4 py-2.5 bg-gray-100 text-gray-700 rounded-lg text-sm font-semibold hover:bg-gray-200 transition-colors">
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

export default BibliotecaEjercicios
