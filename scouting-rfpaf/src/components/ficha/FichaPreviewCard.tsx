import type { FichaJugadora, Club } from '../../types'

// Miniatura de solo lectura de la ficha, con el mismo lenguaje visual que las
// tarjetas de Base de Datos. Se usa como vista previa al pasar el ratón.

function calcularEdad(fecha: string): number {
  if (!fecha) return 0
  const hoy = new Date()
  const nac = new Date(fecha)
  let e = hoy.getFullYear() - nac.getFullYear()
  if (hoy.getMonth() - nac.getMonth() < 0 || (hoy.getMonth() === nac.getMonth() && hoy.getDate() < nac.getDate())) e--
  return e
}

function valoracionColor(v: number): string {
  if (v >= 4) return '#16a34a'
  if (v >= 3) return '#ca8a04'
  return '#ea580c'
}

const PROPUESTA_CLASS: Record<string, string> = {
  'SELECCIÓN': 'bg-green-100 text-green-800',
  'INCORPORAR': 'bg-blue-100 text-blue-800',
  'SEGUIR': 'bg-yellow-100 text-yellow-800',
  'DESCARTAR': 'bg-red-100 text-red-800',
}

export default function FichaPreviewCard({
  ficha,
  clubes,
  puntuacion,
}: {
  ficha: FichaJugadora
  clubes: Club[]
  puntuacion?: number
}) {
  const edad = calcularEdad(ficha.fechaNacimiento)
  const sinValorar = ficha.valoraciones.length === 0
  const val = ficha.valoracionGeneral ?? 0
  const barColor = valoracionColor(val)
  const club = clubes.find((c) => c.id === ficha.club) ?? clubes.find((c) => c.nombre === ficha.equipo)
  const fullName = [ficha.nombre, ficha.primerApellido, ficha.segundoApellido].filter(Boolean).join(' ')

  return (
    <div className="w-52 bg-white rounded-2xl shadow-2xl border border-gray-200 overflow-hidden">
      {/* Foto */}
      <div className="relative bg-gradient-to-b from-gray-100 to-gray-200 h-36 flex items-end justify-center overflow-hidden">
        {ficha.foto ? (
          <img src={ficha.foto} alt={fullName} className="w-full h-full object-cover object-top" />
        ) : (
          <div className="w-full h-full flex items-center justify-center">
            <span className="text-3xl font-bold text-gray-300">
              {ficha.nombre?.charAt(0)}{ficha.primerApellido?.charAt(0)}
            </span>
          </div>
        )}
        <div className="absolute top-2 right-2">
          {sinValorar ? (
            <span className="text-[10px] font-bold px-2 py-1 rounded-full bg-gray-100 text-gray-500 border border-gray-200">
              Sin valorar
            </span>
          ) : (
            <span className={`text-[10px] font-bold px-2 py-1 rounded-full ${PROPUESTA_CLASS[ficha.propuesta] ?? 'bg-gray-100 text-gray-600'}`}>
              {ficha.propuesta}
            </span>
          )}
        </div>
        {club?.escudo && (
          <div className="absolute top-2 left-2 w-7 h-7 bg-white rounded-full shadow flex items-center justify-center p-0.5">
            <img src={club.escudo} alt="" className="w-full h-full object-contain" />
          </div>
        )}
        {puntuacion !== undefined && (
          <div className="absolute bottom-2 right-2 bg-rfpaf-blue text-white text-[11px] font-bold px-2 py-0.5 rounded-full shadow">
            {puntuacion}/100
          </div>
        )}
      </div>

      {/* Datos */}
      <div className="p-3 flex flex-col gap-2">
        <div>
          <p className="font-bold text-gray-900 text-sm leading-tight truncate">{fullName}</p>
          <p className="text-xs text-gray-400 truncate">{club?.nombre || ficha.equipo || '—'}</p>
        </div>

        {/* La demarcación es la única que puede encogerse: si no, "15 años" se
            partía en dos líneas al ser el nombre del puesto largo. */}
        <div className="flex items-center gap-2 text-xs text-gray-500">
          <span className="font-medium text-gray-700 whitespace-nowrap">{edad > 0 ? `${edad} años` : '—'}</span>
          <span className="text-gray-300">|</span>
          <span className="whitespace-nowrap">Nº {ficha.dorsal || '—'}</span>
          <span className="text-gray-300">|</span>
          <span className="truncate min-w-0">{ficha.demarcacion}</span>
        </div>

        {sinValorar ? (
          <p className="text-[10px] text-gray-400 italic">Sin valorar todavía</p>
        ) : (
          <div>
            <div className="flex justify-between items-center mb-0.5">
              <span className="text-[10px] text-gray-400 font-medium">Valoración</span>
              <span className="text-[10px] font-bold" style={{ color: barColor }}>{val}/5</span>
            </div>
            <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
              <div className="h-full rounded-full" style={{ width: `${(val / 5) * 100}%`, backgroundColor: barColor }} />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
