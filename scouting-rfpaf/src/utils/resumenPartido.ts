import type { FichaJugadora, Observador, PartidoCalendario, Valoracion } from '../types'
import { normalizeText } from './textNormalize'

/* El resumen de un partido se reconstruye a partir de los informes que se
 * hicieron ese día de esos dos equipos. No hay una tabla de partidos observados:
 * la información táctica viaja dentro de cada valoración, así que aquí se juntan
 * las de un mismo encuentro para poder consultarlas desde el Calendario. */

export interface JugadoraObservada {
  fichaId: string
  nombre: string
  demarcacion: string
  valoracion: number
  propuesta: string
  observador: string
}

export interface ResumenPartido {
  sistemaLocal: string
  sistemaVisitante: string
  /** Si dos observadores anotaron dibujos distintos, se avisa en vez de elegir uno. */
  sistemasEnDesacuerdo: boolean
  comentarios: { observador: string; texto: string }[]
  jugadoras: JugadoraObservada[]
  observadores: string[]
  totalInformes: number
}

const igual = (a?: string, b?: string) => normalizeText(a ?? '') === normalizeText(b ?? '')

/** Valoraciones que corresponden a este partido del calendario. */
export function valoracionesDePartido(
  partido: PartidoCalendario,
  fichas: FichaJugadora[],
): { ficha: FichaJugadora; valoracion: Valoracion }[] {
  const salida: { ficha: FichaJugadora; valoracion: Valoracion }[] = []
  for (const ficha of fichas) {
    for (const v of ficha.valoraciones ?? []) {
      if (v.fechaPartido !== partido.fecha) continue
      // Se admite el partido con los equipos en cualquier orden: quien rellena
      // el informe no siempre respeta cuál era el local
      const mismoEnfrentamiento =
        (igual(v.local, partido.local) && igual(v.visitante, partido.visitante)) ||
        (igual(v.local, partido.visitante) && igual(v.visitante, partido.local))
      if (mismoEnfrentamiento) salida.push({ ficha, valoracion: v })
    }
  }
  return salida
}

export function resumenDePartido(
  partido: PartidoCalendario,
  fichas: FichaJugadora[],
  observadores: Observador[],
): ResumenPartido | null {
  const encontradas = valoracionesDePartido(partido, fichas)
  if (encontradas.length === 0) return null

  const nombreObs = (id: string) => observadores.find((o) => o.id === id)?.nombre ?? id

  // Los sistemas se toman del primer informe que los traiga, y se comprueba si
  // alguien anotó algo distinto
  const conSistema = encontradas.filter(
    ({ valoracion: v }) => (v.sistemaLocal ?? '') !== '' || (v.sistemaVisitante ?? '') !== '',
  )
  const primero = conSistema[0]?.valoracion
  const sistemasEnDesacuerdo = conSistema.some(
    ({ valoracion: v }) =>
      (v.sistemaLocal ?? '') !== (primero?.sistemaLocal ?? '') ||
      (v.sistemaVisitante ?? '') !== (primero?.sistemaVisitante ?? ''),
  )

  const comentarios = encontradas
    .filter(({ valoracion: v }) => (v.comentarioSistemas ?? '').trim() !== '')
    .map(({ valoracion: v }) => ({ observador: nombreObs(v.observador), texto: v.comentarioSistemas!.trim() }))

  const jugadoras: JugadoraObservada[] = encontradas.map(({ ficha, valoracion: v }) => ({
    fichaId: ficha.id,
    nombre: [ficha.nombre, ficha.primerApellido, ficha.segundoApellido].filter(Boolean).join(' '),
    demarcacion: ficha.demarcacion,
    valoracion: v.valoracionGeneral ?? 0,
    propuesta: v.propuesta,
    observador: nombreObs(v.observador),
  }))

  return {
    sistemaLocal: primero?.sistemaLocal ?? '',
    sistemaVisitante: primero?.sistemaVisitante ?? '',
    sistemasEnDesacuerdo,
    comentarios,
    jugadoras,
    observadores: [...new Set(encontradas.map(({ valoracion: v }) => nombreObs(v.observador)))],
    totalInformes: encontradas.length,
  }
}
