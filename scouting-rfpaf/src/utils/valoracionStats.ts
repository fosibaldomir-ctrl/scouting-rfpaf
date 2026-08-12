import type { EvaluacionDemarcacion, Valoracion } from '../types'

// El perfil físico/técnico que se muestra en la ficha es la MEDIA de todos los
// partidos observados, no el último: una sola actuación no representa bien a la
// jugadora. Cada valoración individual conserva sus propios valores y se puede
// consultar en el historial.

export interface MediaFisica {
  fuerza: number
  velocidad: number
  resistencia: number
}

export function mediaFisicaDe(valoraciones: Valoracion[]): MediaFisica | null {
  if (valoraciones.length === 0) return null
  const n = valoraciones.length
  const total = valoraciones.reduce(
    (acc, v) => ({
      fuerza: acc.fuerza + (v.fuerza ?? 0),
      velocidad: acc.velocidad + (v.velocidad ?? 0),
      resistencia: acc.resistencia + (v.resistencia ?? 0),
    }),
    { fuerza: 0, velocidad: 0, resistencia: 0 }
  )
  return { fuerza: total.fuerza / n, velocidad: total.velocidad / n, resistencia: total.resistencia / n }
}

const ITEMS: (keyof EvaluacionDemarcacion)[] = ['item1', 'item2', 'item3', 'item4', 'item5', 'item6']

export function mediaTecnicaDe(valoraciones: Valoracion[]): EvaluacionDemarcacion | null {
  if (valoraciones.length === 0) return null
  const n = valoraciones.length
  const out = {} as EvaluacionDemarcacion
  for (const k of ITEMS) {
    out[k] = valoraciones.reduce((acc, v) => acc + (v.evaluacionTecnica?.[k] ?? 0), 0) / n
  }
  return out
}

export function mediaValoracionGeneralDe(valoraciones: Valoracion[]): number | null {
  if (valoraciones.length === 0) return null
  return valoraciones.reduce((acc, v) => acc + (v.valoracionGeneral ?? 0), 0) / valoraciones.length
}

// Las medias salen decimales; se muestran con un decimal solo cuando hace falta
// para no ensuciar los casos en que hay una única valoración.
export function fmtMedia(n: number): string {
  return Number.isInteger(n) ? String(n) : n.toFixed(1)
}

/* ─── Panel de la ficha ────────────────────────────────────────────────────
 * El observador puntúa lo técnico de 1 a 5 y lo físico de 1 a 10. Para el panel
 * se lleva todo a una escala común de 0 a 100, que se lee de un vistazo y deja
 * comparar unas cosas con otras.                                            */

export function aCien(valor: number, max: number): number {
  if (!valor || max <= 0) return 0
  return Math.round((valor / max) * 100)
}

const promedio = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0)

/** Media con balón y sin balón de un conjunto de informes, en escala 0-100. */
export function mediaConSinBalon(
  valoraciones: Valoracion[],
  conBalon: boolean[],
): { con: number; sin: number } | null {
  const media = mediaTecnicaDe(valoraciones)
  if (!media) return null
  const con: number[] = [], sin: number[] = []
  ITEMS.forEach((k, i) => (conBalon[i] ? con : sin).push(media[k]))
  return { con: aCien(promedio(con), 5), sin: aCien(promedio(sin), 5) }
}

/** Lo mismo para un único informe: es lo que sitúa cada punto del cuadrante. */
export function conSinBalonDe(v: Valoracion, conBalon: boolean[]): { con: number; sin: number } {
  const con: number[] = [], sin: number[] = []
  ITEMS.forEach((k, i) => (conBalon[i] ? con : sin).push(v.evaluacionTecnica?.[k] ?? 0))
  return { con: aCien(promedio(con), 5), sin: aCien(promedio(sin), 5) }
}

/** Cuántos informes hay de cada valor y qué porcentaje suponen. */
export function repartoPor<T extends string>(
  valoraciones: Valoracion[],
  claves: readonly T[],
  de: (v: Valoracion) => T | undefined,
): { clave: T; n: number; pct: number }[] {
  const total = valoraciones.length
  return claves.map(clave => {
    const n = valoraciones.filter(v => de(v) === clave).length
    return { clave, n, pct: total ? Math.round((n / total) * 100) : 0 }
  })
}

/** Desde cuándo hasta cuándo se ha observado, y cuánto tiempo abarca. */
export function periodoObservacion(
  valoraciones: Valoracion[],
): { desde: string; hasta: string; texto: string } | null {
  const fechas = valoraciones.map(v => v.fechaPartido).filter(Boolean).sort()
  if (fechas.length === 0) return null
  const desde = fechas[0], hasta = fechas[fechas.length - 1]
  const dias = Math.round((new Date(hasta).getTime() - new Date(desde).getTime()) / 86400000)
  const texto = dias < 31 ? `${dias} día${dias === 1 ? '' : 's'}`
    : dias < 365 ? `${Math.max(1, Math.round(dias / 30))} meses`
    : `${(dias / 365).toFixed(1)} años`
  return { desde, hasta, texto }
}
