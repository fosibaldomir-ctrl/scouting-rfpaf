import { useState } from 'react'
import { Sparkles, Maximize2, X, Copy, Check } from 'lucide-react'
import MapaZonas from './MapaZonas'
import { analisisComoTexto, nombreDe, CARRILES, ALTURAS, type AnalisisTactico } from '../../utils/analisisTactico'
import type { EquipoTactico } from '../../types'

/* El análisis se calcula solo, a partir de dónde están las fichas en el tablero:
 * no hay botón de generar porque no hay nada que esperar. En el lateral va lo
 * justo para echar un vistazo, y el detalle se abre en grande. */

interface Props {
  analisis: AnalisisTactico
  local: EquipoTactico
  visitante: EquipoTactico
}

function BarraComparada({ etiqueta, izq, der, colorIzq, colorDer, max = 100 }: {
  etiqueta: string; izq: number; der: number; colorIzq: string; colorDer: string; max?: number
}) {
  const total = Math.max(izq + der, 1)
  return (
    <div>
      <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
        <span className="font-semibold" style={{ color: colorIzq }}>{izq}</span>
        <span className="uppercase tracking-wide">{etiqueta}</span>
        <span className="font-semibold" style={{ color: colorDer }}>{der}</span>
      </div>
      <div className="flex h-1.5 rounded-full overflow-hidden bg-gray-100">
        <div style={{ width: `${(izq / total) * 100}%`, backgroundColor: colorIzq }} />
        <div style={{ width: `${(der / total) * 100}%`, backgroundColor: colorDer }} />
      </div>
      <div className="sr-only">{`${etiqueta}: ${izq} frente a ${der} sobre ${max}`}</div>
    </div>
  )
}

function Chip({ texto, color }: { texto: string; color: 'verde' | 'rojo' | 'gris' }) {
  const clases = {
    verde: 'bg-green-50 text-green-700 border-green-200',
    rojo: 'bg-red-50 text-red-700 border-red-200',
    gris: 'bg-gray-50 text-gray-500 border-gray-200',
  }[color]
  return <span className={`text-[10px] font-medium px-2 py-0.5 rounded-full border ${clases}`}>{texto}</span>
}

const nombreZona = (altura: number, carril: number) =>
  `${ALTURAS[altura]} · ${CARRILES[carril]}`

export default function PanelAnalisisTactico({ analisis, local, visitante }: Props) {
  const [abierto, setAbierto] = useState(false)
  const [copiado, setCopiado] = useState(false)

  const copiar = async () => {
    await navigator.clipboard.writeText(analisisComoTexto(analisis, local.nombre, visitante.nombre))
    setCopiado(true)
    setTimeout(() => setCopiado(false), 1800)
  }

  const { perfil } = analisis

  return (
    <>
      <div className="bg-white rounded-2xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="bg-rfpaf-blue px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2 text-white font-semibold text-sm">
            <Sparkles className="w-4 h-4" /> Análisis del enfrentamiento
          </div>
          <button onClick={() => setAbierto(true)}
            className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors"
            title="Ver el análisis completo">
            <Maximize2 className="w-3.5 h-3.5" /> Ampliar
          </button>
        </div>

        <div className="p-4 space-y-3">
          <MapaZonas zonas={analisis.zonas} colorLocal={local.color} colorVisitante={visitante.color} alto={210} />

          <div className="space-y-2 pt-1">
            <BarraComparada etiqueta="Altura del bloque" izq={analisis.local.alturaBloque}
              der={analisis.visitante.alturaBloque} colorIzq={local.color} colorDer={visitante.color} />
            <BarraComparada etiqueta="Amplitud" izq={analisis.local.amplitud}
              der={analisis.visitante.amplitud} colorIzq={local.color} colorDer={visitante.color} />
          </div>

          <div className="flex flex-wrap gap-1 pt-1">
            {analisis.superioridades.length > 0 && <Chip texto={`${analisis.superioridades.length} zonas a favor`} color="verde" />}
            {analisis.riesgos.length > 0 && <Chip texto={`${analisis.riesgos.length} en contra`} color="rojo" />}
            {analisis.sinMarca.length > 0 && <Chip texto={`${analisis.sinMarca.length} sin marca`} color="gris" />}
          </div>

          <ul className="space-y-1.5 pt-1">
            {analisis.claves.slice(0, 2).map((c, i) => (
              <li key={i} className="text-xs text-gray-600 leading-snug flex gap-1.5">
                <span className="text-rfpaf-blue font-bold flex-shrink-0">·</span>{c}
              </li>
            ))}
          </ul>
          {analisis.claves.length > 2 && (
            <button onClick={() => setAbierto(true)} className="text-xs font-semibold text-rfpaf-blue hover:underline">
              {analisis.claves.length - 2} clave{analisis.claves.length - 2 === 1 ? '' : 's'} más
            </button>
          )}
        </div>
      </div>

      {abierto && (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
          onClick={() => setAbierto(false)}>
          <div className="bg-white rounded-2xl shadow-2xl w-full max-w-4xl max-h-[90vh] overflow-y-auto"
            onClick={(e) => e.stopPropagation()}>
            <div className="sticky top-0 bg-rfpaf-blue px-5 py-4 flex items-center justify-between z-10">
              <div className="min-w-0">
                <h3 className="text-white font-bold truncate">
                  {local.nombre} <span className="text-white/60 font-normal">contra</span> {visitante.nombre}
                </h3>
                <p className="text-white/70 text-xs">
                  {local.formacion} frente a {visitante.formacion} · calculado sobre la posición real de cada jugadora
                </p>
              </div>
              <div className="flex items-center gap-2 flex-shrink-0">
                <button onClick={copiar}
                  className="flex items-center gap-1.5 bg-white/20 hover:bg-white/30 text-white text-xs font-medium px-3 py-1.5 rounded-lg transition-colors">
                  {copiado ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                  {copiado ? 'Copiado' : 'Copiar'}
                </button>
                <button onClick={() => setAbierto(false)} className="text-white/80 hover:text-white p-1">
                  <X className="w-5 h-5" />
                </button>
              </div>
            </div>

            <div className="p-5 grid grid-cols-1 lg:grid-cols-2 gap-6">
              <div className="space-y-4">
                <div>
                  <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Reparto del campo</h4>
                  <MapaZonas zonas={analisis.zonas} colorLocal={local.color} colorVisitante={visitante.color} alto={330} />
                  <p className="text-[11px] text-gray-400 mt-2 leading-snug">
                    Cada casilla dice cuántas jugadoras de campo hay de cada equipo, tuyas primero. El color
                    es de quien manda, y cuanto más fuerte, mayor es la diferencia.
                  </p>
                </div>

                <div className="space-y-2">
                  <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider">Forma de los equipos</h4>
                  <BarraComparada etiqueta="Altura del bloque" izq={analisis.local.alturaBloque}
                    der={analisis.visitante.alturaBloque} colorIzq={local.color} colorDer={visitante.color} />
                  <BarraComparada etiqueta="Amplitud" izq={analisis.local.amplitud}
                    der={analisis.visitante.amplitud} colorIzq={local.color} colorDer={visitante.color} />
                  <BarraComparada etiqueta="Distancia entre líneas" izq={analisis.local.distanciaLineas}
                    der={analisis.visitante.distanciaLineas} colorIzq={local.color} colorDer={visitante.color} />
                </div>

                <div>
                  <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Jugadoras por altura</h4>
                  <div className="grid grid-cols-3 gap-2">
                    {ALTURAS.map((a, i) => (
                      <div key={a} className="bg-gray-50 rounded-lg px-2 py-2 text-center">
                        <p className="text-[10px] text-gray-400 uppercase tracking-wide">{a}</p>
                        <p className="text-sm font-bold">
                          <span style={{ color: local.color }}>{analisis.local.porAltura[i]}</span>
                          <span className="text-gray-300 mx-1">–</span>
                          <span style={{ color: visitante.color }}>{analisis.visitante.porAltura[i]}</span>
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Claves</h4>
                  <ul className="space-y-2">
                    {analisis.claves.map((c, i) => (
                      <li key={i} className="text-sm text-gray-700 leading-snug flex gap-2">
                        <span className="text-rfpaf-blue font-bold flex-shrink-0">·</span>{c}
                      </li>
                    ))}
                  </ul>
                </div>

                <div>
                  <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">Zonas</h4>
                  <div className="flex flex-wrap gap-1.5">
                    {analisis.superioridades.map((c) => (
                      <Chip key={`s${c.altura}${c.carril}`} texto={`${nombreZona(c.altura, c.carril)} ${c.local}v${c.visitante}`} color="verde" />
                    ))}
                    {analisis.riesgos.map((c) => (
                      <Chip key={`r${c.altura}${c.carril}`} texto={`${nombreZona(c.altura, c.carril)} ${c.local}v${c.visitante}`} color="rojo" />
                    ))}
                    {analisis.zonasVacias.map((c) => (
                      <Chip key={`v${c.altura}${c.carril}`} texto={`${nombreZona(c.altura, c.carril)} vacía`} color="gris" />
                    ))}
                  </div>
                </div>

                <div>
                  <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                    Quién tiene a quién encima
                  </h4>
                  <div className="space-y-1 max-h-56 overflow-y-auto pr-1">
                    {analisis.duelos.map((d) => (
                      <div key={d.jugadora.uid}
                        className={`flex items-center justify-between gap-2 text-xs px-2 py-1.5 rounded-lg ${
                          d.distancia >= 22 ? 'bg-amber-50' : 'bg-gray-50'
                        }`}>
                        <span className="truncate font-medium text-gray-700">
                          {nombreDe(d.jugadora)}
                        </span>
                        <span className="text-gray-400 flex-shrink-0">
                          {d.distancia >= 22
                            ? 'sin marca'
                            : `Nº ${d.rival?.numero ?? '—'} a ${d.distancia}`}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {perfil && (
                  <div>
                    <h4 className="text-[11px] font-bold text-gray-500 uppercase tracking-wider mb-2">
                      Tu once, según los informes
                    </h4>
                    {perfil.conInforme === 0 ? (
                      <p className="text-xs text-gray-400">
                        Ninguna de las jugadoras del once tiene informes todavía.
                      </p>
                    ) : (
                      <div className="space-y-2 text-xs">
                        <div className="grid grid-cols-2 gap-2">
                          <div className="bg-gray-50 rounded-lg px-3 py-2">
                            <p className="text-[10px] text-gray-400 uppercase">Valoración media</p>
                            <p className="text-base font-bold text-gray-800">
                              {perfil.valoracionMedia?.toFixed(1) ?? '—'}<span className="text-gray-400 text-xs">/5</span>
                            </p>
                          </div>
                          <div className="bg-gray-50 rounded-lg px-3 py-2">
                            <p className="text-[10px] text-gray-400 uppercase">Con informe</p>
                            <p className="text-base font-bold text-gray-800">
                              {perfil.conInforme}<span className="text-gray-400 text-xs"> de {perfil.conInforme + perfil.sinInforme}</span>
                            </p>
                          </div>
                        </div>
                        {perfil.mejorConBalon && (
                          <p className="text-gray-600">
                            <span className="text-gray-400">Mejor con balón:</span>{' '}
                            <strong>{perfil.mejorConBalon.nombre}</strong> ({perfil.mejorConBalon.valor})
                          </p>
                        )}
                        {perfil.mejorSinBalon && (
                          <p className="text-gray-600">
                            <span className="text-gray-400">Mejor sin balón:</span>{' '}
                            <strong>{perfil.mejorSinBalon.nombre}</strong> ({perfil.mejorSinBalon.valor})
                          </p>
                        )}
                        {perfil.fisico && (
                          <p className="text-gray-600">
                            <span className="text-gray-400">Físico medio:</span>{' '}
                            fuerza {perfil.fisico.fuerza.toFixed(1)} · velocidad {perfil.fisico.velocidad.toFixed(1)} ·
                            resistencia {perfil.fisico.resistencia.toFixed(1)}
                          </p>
                        )}
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
