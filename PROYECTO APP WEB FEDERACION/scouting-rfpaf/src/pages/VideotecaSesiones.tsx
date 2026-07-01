import { Video } from 'lucide-react'
import { useStore } from '../store/useStore'
import type { EjercicioDB } from '../lib/supabase'
import { getEmbedUrl } from '../lib/entrenamientoUtils'

const VideotecaSesiones = () => {
  const { ejercicios } = useStore()

  const ejerciciosConVideo = ejercicios.filter(ej => ej.video)

  return (
    <div className="space-y-5">
      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Videoteca Sesiones</h2>
        <p className="text-sm text-gray-500 mt-1">Galería de videos de ejercicios realizados en sesiones de entrenamiento</p>
      </div>

      {/* Video Grid */}
      {ejerciciosConVideo.length === 0 ? (
        <div className="text-center py-16 text-gray-400 bg-white rounded-xl border border-gray-200">
          <Video className="w-12 h-12 mx-auto mb-3 opacity-20"/>
          <p className="text-lg font-medium">Sin videos todavía</p>
          <p className="text-sm mt-2 opacity-70">Los videos de los ejercicios se mostrarán aquí<br/>cuando se agreguen a las sesiones de entrenamiento</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {ejerciciosConVideo.map(ej => {
            const embedUrl = getEmbedUrl(ej.video!)
            return (
              <div key={ej.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-lg transition-shadow">
                {/* Video Player */}
                <div className="w-full bg-gray-900 flex items-center justify-center" style={{aspectRatio: '16/9'}}>
                  <iframe
                    src={embedUrl}
                    className="w-full h-full"
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                    allowFullScreen
                    title={ej.titulo || ej.tipo}
                  />
                </div>

                {/* Exercise Info */}
                <div className="p-4 space-y-3">
                  {/* Type Badge + Title */}
                  <div>
                    <span className="inline-block bg-rfpaf-blue text-white text-xs font-bold px-2.5 py-0.5 rounded-full mb-2">
                      {ej.tipo || 'Sin tipo'}
                    </span>
                    <h3 className="font-semibold text-gray-900 text-sm line-clamp-2">
                      {ej.titulo || ej.descripcion || 'Ejercicio sin título'}
                    </h3>
                  </div>

                  {/* Stats Grid */}
                  <div className="grid grid-cols-3 gap-2 text-xs">
                    <div className="bg-blue-50 rounded-lg p-2 border border-blue-100 text-center">
                      <p className="text-gray-600 font-semibold uppercase tracking-wider">Duración</p>
                      <p className="text-sm font-bold text-rfpaf-blue">{ej.duracion} min</p>
                    </div>
                    <div className="bg-green-50 rounded-lg p-2 border border-green-100 text-center">
                      <p className="text-gray-600 font-semibold uppercase tracking-wider">Jugadores</p>
                      <p className="text-sm font-bold text-green-700">{ej.num_jugadores}</p>
                    </div>
                    <div className="bg-purple-50 rounded-lg p-2 border border-purple-100 text-center">
                      <p className="text-gray-600 font-semibold uppercase tracking-wider">Material</p>
                      <p className="text-sm font-bold text-purple-700 truncate">{ej.material || '—'}</p>
                    </div>
                  </div>

                  {/* Description */}
                  {ej.descripcion && (
                    <div className="border-t border-gray-200 pt-3">
                      <p className="text-xs text-gray-700 leading-relaxed line-clamp-3">
                        {ej.descripcion}
                      </p>
                    </div>
                  )}
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}

export default VideotecaSesiones
