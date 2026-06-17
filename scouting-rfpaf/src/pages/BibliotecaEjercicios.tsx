import { useState, useRef, useEffect } from 'react'
import { fetchEjercicios, createEjercicio } from '../lib/supabase'
import type { EjercicioDB } from '../lib/supabase'
import { v4 as uuidv4 } from 'uuid'
import {
  Plus, Video, Eye, FileText,
} from 'lucide-react'
import { useStore } from '../store/useStore'
import type { EjercicioSesion } from '../types'
import { TIPOS_EJERCICIO, FILTER_TIPOS, FILTER_JUGADORES, FILTER_DURACION, FILTER_MATERIAL } from '../lib/entrenamientoConstants'
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
  const [formEj, setFormEj] = useState({tipo:'',duracion:'',num_jugadores:'',material:'',titulo:'',descripcion:'',imagen:'',video:''})
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

  const addEjercicioToSesion = (ej: EjercicioDB) => {
    const orden = sesion.ejercicios.length + 1
    const newEj: EjercicioSesion = {
      id: uuidv4(),
      orden,
      tipo: ej.tipo,
      duracion: String(ej.duracion),
      descripcion: ej.descripcion,
      numJugadores: ej.num_jugadores,
      material: ej.material || '',
      imagen: ej.imagen && !ej.imagen.startsWith('data:') ? `data:image/png;base64,${ej.imagen}` : ej.imagen || null,
    }
    setSesion(s => ({ ...s, ejercicios: [...s.ejercicios, newEj] }))
    alert('✅ Ejercicio añadido a la sesión')
  }

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
              <div key={ej.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow cursor-pointer">
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
                      <p className="text-sm font-bold text-rfpaf-blue">{ej.duracion} min</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2 border border-green-100 text-center">
                      <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider">Jugadores</p>
                      <p className="text-sm font-bold text-green-700">{ej.num_jugadores}</p>
                    </div>
                  </div>

                  {/* Material */}
                  {ej.material && (
                    <div className="bg-purple-50 rounded-lg p-2 border border-purple-100 text-center">
                      <p className="text-xs text-gray-600 font-semibold uppercase tracking-wider">Material</p>
                      <p className="text-xs text-purple-700">{ej.material}</p>
                    </div>
                  )}

                  {/* Botones */}
                  <div className="flex gap-2 pt-2">
                    <button type="button" onClick={() => setPreviewEjercicio(ej)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold text-rfpaf-blue hover:bg-blue-50 rounded-lg transition-colors border border-blue-200">
                      <Eye className="w-3.5 h-3.5"/> Ver
                    </button>
                    <button type="button" onClick={() => addEjercicioToSesion(ej)}
                      className="flex-1 flex items-center justify-center gap-1 px-3 py-2 text-xs font-semibold text-white bg-rfpaf-blue hover:bg-rfpaf-blue/90 rounded-lg transition-colors">
                      <Plus className="w-3.5 h-3.5"/> Añadir sesión
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Modal crear ejercicio */}
      {crearEjercicioOpen && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-4xl w-full max-h-[90vh] overflow-y-auto flex flex-col">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-gray-900">Crear nuevo ejercicio</h2>
              <button onClick={() => setCrearEjercicioOpen(false)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
            </div>
            <div className="flex flex-1 overflow-hidden">
              <div className="flex-1 p-5 space-y-4 overflow-y-auto">
                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Título</label>
                  <input type="text" value={formEj.titulo} onChange={e=>setFormEj({...formEj,titulo:e.target.value})} placeholder="Nombre del ejercicio…"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"/>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Tipo</label>
                    <select value={formEj.tipo} onChange={e=>setFormEj({...formEj,tipo:e.target.value})}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30">
                      <option value="">Seleccionar…</option>
                      {TIPOS_EJERCICIO.map(t=><option key={t} value={t}>{t}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Duración (min)</label>
                    <input type="number" value={formEj.duracion} onChange={e=>setFormEj({...formEj,duracion:e.target.value})} placeholder="15" min={1}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"/>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Nº Jugadores</label>
                    <select value={formEj.num_jugadores} onChange={e=>setFormEj({...formEj,num_jugadores:e.target.value})}
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30">
                      <option value="">Seleccionar…</option>
                      {FILTER_JUGADORES.map(j=><option key={j} value={j}>{j}</option>)}
                    </select>
                  </div>
                  <div>
                    <label className="block text-xs font-semibold text-gray-600 mb-1">Material</label>
                    <input type="text" value={formEj.material} onChange={e=>setFormEj({...formEj,material:e.target.value})} placeholder="Conos, balones…"
                      className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"/>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">Descripción</label>
                  <textarea value={formEj.descripcion} onChange={e=>setFormEj({...formEj,descripcion:e.target.value})} placeholder="Describe el ejercicio…" rows={3}
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30 resize-none"/>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-gray-600 mb-1">URL Video (YouTube/Vimeo)</label>
                  <input type="url" value={formEj.video} onChange={e=>setFormEj({...formEj,video:e.target.value})} placeholder="https://youtube.com/watch?v=…"
                    className="w-full text-sm border border-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-rfpaf-blue/30"/>
                </div>

                <div className="flex gap-3">
                  <button type="button" onClick={async ()=>{
                    if(!formEj.titulo || !formEj.tipo) { alert('⚠️ Completa al menos título y tipo'); return }
                    const newEj = await createEjercicio({
                      tipo: formEj.tipo,
                      duracion: parseInt(formEj.duracion||'0'),
                      num_jugadores: formEj.num_jugadores,
                      material: formEj.material || null,
                      titulo: formEj.titulo,
                      descripcion: formEj.descripcion,
                      imagen: formEj.imagen || null,
                      video: formEj.video || null
                    })
                    if(newEj) {
                      const data = await fetchEjercicios()
                      setEjercicios(data)
                      setFormEj({tipo:'',duracion:'',num_jugadores:'',material:'',titulo:'',descripcion:'',imagen:'',video:''})
                      setCrearEjercicioOpen(false)
                      alert('✅ Ejercicio creado')
                    } else {
                      alert('❌ Error al crear ejercicio')
                    }
                  }}
                    className="flex-1 py-2 bg-rfpaf-blue text-white rounded-lg text-sm font-semibold hover:bg-rfpaf-blue/90 transition-colors">
                    Crear ejercicio
                  </button>
                  <button type="button" onClick={()=>setCrearEjercicioOpen(false)}
                    className="flex-1 py-2 text-sm text-gray-600 bg-gray-100 rounded-lg hover:bg-gray-200 transition-colors">
                    Cancelar
                  </button>
                </div>
              </div>

              {/* Right: TacticalBoard */}
              <div className="hidden lg:block lg:w-1/2 border-l border-gray-200 bg-gray-50">
                <TacticalBoard onCapture={img => setFormEj({...formEj, imagen: img})} onRegisterCapture={fn => {captureForEjRef.current = fn}}/>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modal vista previa */}
      {previewEjercicio && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-xl shadow-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white border-b border-gray-200 px-5 py-3 flex items-center justify-between z-10">
              <h2 className="text-lg font-bold text-gray-900">{previewEjercicio.titulo}</h2>
              <button onClick={() => setPreviewEjercicio(null)} className="text-gray-400 hover:text-gray-700 text-xl leading-none">✕</button>
            </div>
            <div className="p-5 space-y-4">
              {previewEjercicio.video ? (
                <div className="w-full aspect-video bg-gray-900 rounded-lg overflow-hidden">
                  <iframe src={getEmbedUrl(previewEjercicio.video)} className="w-full h-full" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen/>
                </div>
              ) : previewEjercicio.imagen ? (
                <img src={previewEjercicio.imagen.startsWith('data:') ? previewEjercicio.imagen : `data:image/png;base64,${previewEjercicio.imagen}`}
                  alt={previewEjercicio.tipo} className="w-full rounded-lg"/>
              ) : null}

              <div>
                <h3 className="text-sm font-bold text-gray-900 mb-1">{previewEjercicio.tipo}</h3>
                <p className="text-xs text-gray-600">{previewEjercicio.descripcion}</p>
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

              <button type="button" onClick={() => { addEjercicioToSesion(previewEjercicio); setPreviewEjercicio(null) }}
                className="w-full py-2 bg-rfpaf-blue text-white rounded-lg text-sm font-semibold hover:bg-rfpaf-blue/90 transition-colors">
                Añadir a sesión
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default BibliotecaEjercicios
