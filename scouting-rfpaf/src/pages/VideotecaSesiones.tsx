import { Video } from 'lucide-react'
import { useStore } from '../store/useStore'
import { getEmbedUrl } from '../lib/entrenamientoUtils'

const VideotecaSesiones = () => {
  const { ejercicios } = useStore()
  const ejerciciosConVideo = ejercicios.filter((ej): ej is typeof ej & { video: string } => Boolean(ej.video))

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
          <Video className="w-12 h-12 mx-auto mb-4 opacity-30"/>
          <p className="text-sm font-medium">Sin videos disponibles</p>
          <p className="text-xs mt-2 opacity-70">Añade videos a los ejercicios en la biblioteca para que aparezcan aquí</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {ejerciciosConVideo.map(ej => (
            <div key={ej.id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:shadow-md transition-shadow">
              {/* Video iframe */}
              <div className="relative w-full aspect-video bg-gray-900">
                <iframe
                  src={getEmbedUrl(ej.video)}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                  title={ej.titulo}
                />
              </div>

              {/* Content */}
              <div className="p-4 space-y-3">
                <div>
                  <span className="inline-block bg-rfpaf-blue text-white text-xs font-bold px-2.5 py-1 rounded-full mb-2">{ej.tipo}</span>
                  <h3 className="font-semibold text-gray-900 line-clamp-2 text-sm">{ej.titulo || ej.descripcion}</h3>
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-blue-50 rounded-lg p-2 border border-blue-100 text-center">
                    <p className="text-gray-600 font-semibold uppercase tracking-wider">Duración</p>
                    <p className="text-sm font-bold text-rfpaf-blue">{ej.duracion} min</p>
                  </div>
                  <div className="bg-green-50 rounded-lg p-2 border border-green-100 text-center">
                    <p className="text-gray-600 font-semibold uppercase tracking-wider">Jugadores</p>
                    <p className="text-sm font-bold text-green-700">{ej.num_jugadores}</p>
                  </div>
                </div>

                {/* Description */}
                {ej.descripcion && (
                  <p className="text-xs text-gray-600 line-clamp-2">{ej.descripcion}</p>
                )}

                {/* Material */}
                {ej.material && (
                  <div className="text-xs text-gray-600">
                    <span className="font-semibold">Material:</span> {ej.material}
                  </div>
                )}

                {/* Video link */}
                {ej.video && (
                  <a href={ej.video} target="_blank" rel="noopener noreferrer"
                    className="block text-center py-2 text-xs font-semibold text-rfpaf-blue hover:text-rfpaf-blue/70 border border-rfpaf-blue/30 rounded-lg hover:bg-rfpaf-blue/5 transition-colors">
                    Ver en YouTube/Vimeo
                  </a>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default VideotecaSesiones
