import type { FichaJugadora, Valoracion } from '../types'

type ValoracionSnapshot = Pick<
  FichaJugadora,
  | 'fechaPartido'
  | 'local'
  | 'visitante'
  | 'categoria'
  | 'observador'
  | 'fuerza'
  | 'velocidad'
  | 'resistencia'
  | 'evaluacionTecnica'
  | 'valoracionGeneral'
  | 'propuesta'
  | 'descripcionJugadora'
  | 'observaciones'
  | 'cierre'
>

// Determina qué valoración es "la vigente" (más reciente por fecha de
// partido, desempatando por fecha de creación) para reflejarla en los
// campos top-level de la ficha, que otras pantallas (Base de Datos, PDF,
// filtros) siguen leyendo directamente sin conocer el array.
export function pickSnapshot(valoraciones: Valoracion[]): ValoracionSnapshot | null {
  if (valoraciones.length === 0) return null
  const [latest] = [...valoraciones].sort((a, b) => {
    const byFecha = new Date(b.fechaPartido).getTime() - new Date(a.fechaPartido).getTime()
    if (byFecha !== 0) return byFecha
    return new Date(b.creadoEn).getTime() - new Date(a.creadoEn).getTime()
  })
  return {
    fechaPartido: latest.fechaPartido,
    local: latest.local,
    visitante: latest.visitante,
    categoria: latest.categoria,
    observador: latest.observador,
    fuerza: latest.fuerza,
    velocidad: latest.velocidad,
    resistencia: latest.resistencia,
    evaluacionTecnica: latest.evaluacionTecnica,
    valoracionGeneral: latest.valoracionGeneral,
    propuesta: latest.propuesta,
    descripcionJugadora: latest.descripcionJugadora,
    observaciones: latest.observaciones,
    cierre: latest.cierre,
  }
}
