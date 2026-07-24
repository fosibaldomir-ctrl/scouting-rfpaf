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
