import type { EquipoTactico, FichaJugadora, JugadoraTactica } from '../types'
import { DEMARCACIONES_ITEMS } from '../data/masterData'
import { mediaConSinBalon, mediaFisicaDe, mediaValoracionGeneralDe } from './valoracionStats'

/* Análisis del enfrentamiento a partir de lo que hay de verdad en el tablero.
 *
 * Lo importante es que aquí no se mira la etiqueta del sistema («4-3-3») sino
 * dónde está cada jugadora: si arrastras a una interior a la banda, el análisis
 * cambia. El campo se reparte en nueve zonas —tres carriles por tres alturas—
 * siempre vistas desde el equipo local, que ataca hacia arriba. */

export const CARRILES = ['Izquierda', 'Centro', 'Derecha'] as const
/** De arriba abajo en el campo, tal y como se dibuja: el local ataca hacia arriba. */
export const ALTURAS = ['Ataque', 'Medio', 'Defensa'] as const

export interface CeldaZona {
  carril: number
  altura: number
  local: number
  visitante: number
}

export interface Duelo {
  jugadora: JugadoraTactica
  rival: JugadoraTactica | null
  distancia: number
}

export interface PerfilOnce {
  conInforme: number
  sinInforme: number
  valoracionMedia: number | null
  mejorConBalon: { nombre: string; valor: number } | null
  mejorSinBalon: { nombre: string; valor: number } | null
  fisico: { fuerza: number; velocidad: number; resistencia: number } | null
}

export interface FormaEquipo {
  /** 0 = replegado en su área, 100 = volcado en campo contrario. */
  alturaBloque: number
  /** Cuánto ocupan a lo ancho, de 0 a 100. */
  amplitud: number
  /** Distancia entre su línea más adelantada y la más retrasada. */
  distanciaLineas: number
  /** Jugadoras de campo por altura, contadas por su posición real. */
  porAltura: number[]
}

export interface AnalisisTactico {
  zonas: CeldaZona[]
  superioridades: CeldaZona[]
  riesgos: CeldaZona[]
  zonasVacias: CeldaZona[]
  duelos: Duelo[]
  sinMarca: Duelo[]
  local: FormaEquipo
  visitante: FormaEquipo
  perfil: PerfilOnce | null
  claves: string[]
}

const tercio = (v: number) => (v < 100 / 3 ? 0 : v < 200 / 3 ? 1 : 2)

/** Los nombres importados arrastran espacios de más; aquí se leen en frases. */
export function nombreDe(j: JugadoraTactica): string {
  const limpio = (j.nombre ?? '').replace(/\s+/g, ' ').trim()
  return limpio || `Nº ${j.numero}`
}
const media = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

/** La portera es la más pegada a su propia portería; vale aunque la hayan movido. */
function sinPortera(jugadoras: JugadoraTactica[], lado: 'local' | 'visit'): JugadoraTactica[] {
  if (jugadoras.length === 0) return []
  const portera = jugadoras.reduce((a, b) =>
    lado === 'local' ? (b.posY > a.posY ? b : a) : (b.posY < a.posY ? b : a))
  return jugadoras.filter((j) => j.uid !== portera.uid)
}

function formaDe(jugadoras: JugadoraTactica[], lado: 'local' | 'visit'): FormaEquipo {
  const campo = sinPortera(jugadoras, lado)
  if (campo.length === 0) {
    return { alturaBloque: 0, amplitud: 0, distanciaLineas: 0, porAltura: [0, 0, 0] }
  }
  const xs = campo.map((j) => j.posX)
  const ys = campo.map((j) => j.posY)
  const mediaY = media(ys)
  const porAltura = [0, 0, 0]
  for (const j of campo) porAltura[tercio(j.posY)]++
  return {
    // El local ataca hacia arriba (y pequeña), así que su bloque sube cuando la
    // media de y baja. El visitante es al revés.
    alturaBloque: Math.round(lado === 'local' ? 100 - mediaY : mediaY),
    amplitud: Math.round(Math.max(...xs) - Math.min(...xs)),
    distanciaLineas: Math.round(Math.max(...ys) - Math.min(...ys)),
    porAltura,
  }
}

function zonasDe(local: JugadoraTactica[], visit: JugadoraTactica[]): CeldaZona[] {
  const celdas: CeldaZona[] = []
  for (let altura = 0; altura < 3; altura++) {
    for (let carril = 0; carril < 3; carril++) {
      celdas.push({
        carril,
        altura,
        local: local.filter((j) => tercio(j.posY) === altura && tercio(j.posX) === carril).length,
        visitante: visit.filter((j) => tercio(j.posY) === altura && tercio(j.posX) === carril).length,
      })
    }
  }
  return celdas
}

function duelosDe(local: JugadoraTactica[], visit: JugadoraTactica[]): Duelo[] {
  return local.map((j) => {
    let rival: JugadoraTactica | null = null
    let distancia = Infinity
    for (const v of visit) {
      const d = Math.hypot(j.posX - v.posX, j.posY - v.posY)
      if (d < distancia) { distancia = d; rival = v }
    }
    return { jugadora: j, rival, distancia: Number.isFinite(distancia) ? Math.round(distancia) : 0 }
  }).sort((a, b) => b.distancia - a.distancia)
}

/** Lo que la app ya sabe del once local a partir de los informes de cada ficha. */
function perfilDelOnce(jugadoras: JugadoraTactica[], fichas: FichaJugadora[]): PerfilOnce | null {
  const conFicha = jugadoras
    .map((j) => ({ j, ficha: j.fichaId ? fichas.find((f) => f.id === j.fichaId) : undefined }))
    .filter((x): x is { j: JugadoraTactica; ficha: FichaJugadora } => Boolean(x.ficha))
  if (conFicha.length === 0) return null

  const conInforme = conFicha.filter(({ ficha }) => (ficha.valoraciones?.length ?? 0) > 0)
  if (conInforme.length === 0) {
    return {
      conInforme: 0,
      sinInforme: conFicha.length,
      valoracionMedia: null,
      mejorConBalon: null,
      mejorSinBalon: null,
      fisico: null,
    }
  }

  const valoraciones = conInforme.flatMap(({ ficha }) => ficha.valoraciones)
  const fisico = mediaFisicaDe(valoraciones)

  let mejorConBalon: PerfilOnce['mejorConBalon'] = null
  let mejorSinBalon: PerfilOnce['mejorSinBalon'] = null
  for (const { j, ficha } of conInforme) {
    const flags = DEMARCACIONES_ITEMS.find((d) => d.posicion === ficha.demarcacion)?.conBalon
    if (!flags) continue
    const cs = mediaConSinBalon(ficha.valoraciones, flags)
    if (!cs) continue
    const nombre = nombreDe(j) || `${ficha.nombre} ${ficha.primerApellido}`.replace(/\s+/g, ' ').trim()
    if (!mejorConBalon || cs.con > mejorConBalon.valor) mejorConBalon = { nombre, valor: cs.con }
    if (!mejorSinBalon || cs.sin > mejorSinBalon.valor) mejorSinBalon = { nombre, valor: cs.sin }
  }

  return {
    conInforme: conInforme.length,
    sinInforme: conFicha.length - conInforme.length,
    valoracionMedia: mediaValoracionGeneralDe(valoraciones),
    mejorConBalon,
    mejorSinBalon,
    fisico: fisico
      ? { fuerza: fisico.fuerza, velocidad: fisico.velocidad, resistencia: fisico.resistencia }
      : null,
  }
}

const nombreZona = (c: CeldaZona) => `${ALTURAS[c.altura].toLowerCase()} por ${CARRILES[c.carril].toLowerCase()}`

export function analizarEnfrentamiento(
  equipoLocal: EquipoTactico,
  equipoVisitante: EquipoTactico,
  fichas: FichaJugadora[],
): AnalisisTactico {
  const localCampo = sinPortera(equipoLocal.jugadoras, 'local')
  const visitCampo = sinPortera(equipoVisitante.jugadoras, 'visit')

  const zonas = zonasDe(localCampo, visitCampo)
  const superioridades = zonas.filter((c) => c.local > c.visitante && c.local > 0)
  const riesgos = zonas.filter((c) => c.visitante > c.local && c.visitante > 0)
  const zonasVacias = zonas.filter((c) => c.local === 0 && c.visitante === 0)

  const local = formaDe(equipoLocal.jugadoras, 'local')
  const visitante = formaDe(equipoVisitante.jugadoras, 'visit')

  const duelos = duelosDe(localCampo, visitCampo)
  // Con el campo repartido en nueve zonas, 22 de distancia es más o menos un
  // tercio de campo: a partir de ahí no hay nadie encima.
  const sinMarca = duelos.filter((d) => d.distancia >= 22)

  const perfil = perfilDelOnce(equipoLocal.jugadoras, fichas)

  const claves: string[] = []

  /* Mandar en tu propia defensa no es una ventaja que explotar, es tener salida
   * limpia; lo que interesa de verdad es la superioridad de medio campo hacia
   * arriba. Por eso se separan las dos cosas. */
  const porVentaja = (a: CeldaZona, b: CeldaZona) => (b.local - b.visitante) - (a.local - a.visitante)
  const mejorArriba = superioridades.filter((c) => c.altura <= 1).sort(porVentaja)[0]
  if (mejorArriba && mejorArriba.local - mejorArriba.visitante >= 2) {
    claves.push(`Superioridad para atacar en ${nombreZona(mejorArriba)}: ${mejorArriba.local} contra ${mejorArriba.visitante}.`)
  }
  const mejorAtras = superioridades.filter((c) => c.altura === 2).sort(porVentaja)[0]
  if (!mejorArriba && mejorAtras && mejorAtras.visitante === 0) {
    claves.push(`Nadie te presiona en ${nombreZona(mejorAtras)}: se puede empezar a jugar desde ahí sin agobios.`)
  }

  const mayorRiesgo = [...riesgos].sort((a, b) => (b.visitante - b.local) - (a.visitante - a.local))[0]
  if (mayorRiesgo && mayorRiesgo.visitante - mayorRiesgo.local >= 2) {
    claves.push(`El rival manda en ${nombreZona(mayorRiesgo)} por ${mayorRiesgo.visitante} a ${mayorRiesgo.local}: hay que tapar esa zona.`)
  }

  const huecosRival = zonas.filter((c) => c.visitante === 0 && c.altura <= 1)
  if (huecosRival.length > 0) {
    claves.push(`El rival deja sin ocupar ${huecosRival.map(nombreZona).join(' y ')}: por ahí se puede progresar.`)
  }

  const difAltura = local.alturaBloque - visitante.alturaBloque
  if (Math.abs(difAltura) >= 12) {
    claves.push(difAltura > 0
      ? `Tu bloque está ${difAltura} puntos más adelantado que el suyo: presión alta y ojo a la espalda de la defensa.`
      : `Su bloque está ${-difAltura} puntos más adelantado: tocará salir jugando bajo presión o buscar el juego directo.`)
  }

  const difAmplitud = local.amplitud - visitante.amplitud
  if (Math.abs(difAmplitud) >= 15) {
    claves.push(difAmplitud > 0
      ? `Abres más el campo que el rival (${local.amplitud} frente a ${visitante.amplitud}): los cambios de orientación deberían encontrar espacio.`
      : `El rival abre más el campo (${visitante.amplitud} frente a ${local.amplitud}): cuidado con los desplazamientos largos a la banda contraria.`)
  }

  if (sinMarca.length > 0) {
    const nombres = sinMarca.slice(0, 3).map((d) => nombreDe(d.jugadora))
    claves.push(`Sin nadie cerca: ${nombres.join(', ')}. Son las salidas naturales del balón.`)
  }

  if (local.distanciaLineas >= 55) {
    claves.push(`Tu equipo está muy estirado (${local.distanciaLineas} de la primera a la última línea): riesgo de quedar partido en la transición.`)
  }

  if (perfil?.mejorConBalon && perfil.mejorSinBalon && perfil.mejorConBalon.nombre !== perfil.mejorSinBalon.nombre) {
    claves.push(`Según los informes, ${perfil.mejorConBalon.nombre} es la mejor con balón y ${perfil.mejorSinBalon.nombre} la mejor sin él.`)
  }

  if (perfil && perfil.sinInforme > 0) {
    claves.push(`${perfil.sinInforme} de las jugadoras del once no tienen ningún informe todavía: el perfil del equipo es incompleto.`)
  }

  if (claves.length === 0) {
    claves.push('Planteamiento muy equilibrado: sin superioridades ni huecos claros, los detalles y las ABP marcarán el partido.')
  }

  return { zonas, superioridades, riesgos, zonasVacias, duelos, sinMarca, local, visitante, perfil, claves }
}

/** Versión en texto, para copiar al portapapeles o pegar en el informe. */
export function analisisComoTexto(
  a: AnalisisTactico,
  nombreLocal: string,
  nombreVisitante: string,
): string {
  const l: string[] = [`ANÁLISIS TÁCTICO: ${nombreLocal} vs ${nombreVisitante}`, '']
  l.push('── FORMA DE LOS EQUIPOS ──')
  l.push(`Altura del bloque:  ${nombreLocal} ${a.local.alturaBloque} · ${nombreVisitante} ${a.visitante.alturaBloque}`)
  l.push(`Amplitud:           ${nombreLocal} ${a.local.amplitud} · ${nombreVisitante} ${a.visitante.amplitud}`)
  l.push(`Distancia líneas:   ${nombreLocal} ${a.local.distanciaLineas} · ${nombreVisitante} ${a.visitante.distanciaLineas}`)
  l.push('')
  l.push('── ZONAS ──')
  for (let altura = 0; altura < 3; altura++) {
    const fila = a.zonas.filter((c) => c.altura === altura)
      .map((c) => `${CARRILES[c.carril]} ${c.local}-${c.visitante}`).join('   ')
    l.push(`${ALTURAS[altura].padEnd(8)} ${fila}`)
  }
  if (a.perfil) {
    l.push('', '── TU ONCE, SEGÚN LOS INFORMES ──')
    l.push(`Con informe: ${a.perfil.conInforme} · sin informe: ${a.perfil.sinInforme}`)
    if (a.perfil.valoracionMedia !== null) l.push(`Valoración media: ${a.perfil.valoracionMedia.toFixed(1)}/5`)
    if (a.perfil.mejorConBalon) l.push(`Mejor con balón: ${a.perfil.mejorConBalon.nombre} (${a.perfil.mejorConBalon.valor})`)
    if (a.perfil.mejorSinBalon) l.push(`Mejor sin balón: ${a.perfil.mejorSinBalon.nombre} (${a.perfil.mejorSinBalon.valor})`)
  }
  l.push('', '── CLAVES ──')
  a.claves.forEach((c) => l.push(`• ${c}`))
  return l.join('\n')
}
