export type Lateralidad = 'DIESTRA' | 'ZURDA' | 'AMBIDIESTRA'
export type Tipologia = 'FUERTE' | 'ATLÉTICA' | 'DELGADA'
export type Propuesta = 'SELECCIÓN' | 'INCORPORAR' | 'SEGUIR' | 'DESCARTAR'
export type Demarcacion =
  | 'PORTERO'
  | 'LATERAL'
  | 'CENTRAL'
  | 'MEDIO CENTRO DEF.'
  | 'MEDIO CENTRO OF.'
  | 'INTERIOR'
  | 'MEDIA PUNTA'
  | 'EXTERIOR'
  | 'DELANTERO'

export type Categoria =
  | '1ª REF'
  | '2ª REF'
  | '3ª REF'
  | '1ª ASTURFUTBOL'
  | '2ª ASTURFUTBOL'
  | 'INFANTIL'
  | 'ALEVIN'
  | 'BENJAMIN'
  | '3ª CADETE'

export interface EvaluacionDemarcacion {
  item1: number
  item2: number
  item3: number
  item4: number
  item5: number
  item6: number
}

export interface FichaJugadora {
  id: string
  registro: string
  // Partido
  fechaPartido: string
  equipo: string
  categoria: Categoria
  local: string
  visitante: string
  observador: string
  // Jugadora
  nombre: string
  primerApellido: string
  segundoApellido: string
  fechaNacimiento: string
  dorsal: number
  lateralidad: Lateralidad
  tipologia: Tipologia
  altura: string
  club: string
  foto?: string | null
  // Físico
  fuerza: number
  velocidad: number
  resistencia: number
  // Demarcación
  demarcacion: Demarcacion
  otraDemarcacion: string
  // Evaluación técnica (6 ítems por posición)
  evaluacionTecnica: EvaluacionDemarcacion
  // Cierre
  valoracionGeneral: number
  propuesta: Propuesta
  descripcionJugadora: string
  observaciones: string
  cierre: string
  // Meta
  creadoEn: string
  actualizadoEn: string
}

export interface Observador {
  id: string
  nombre: string
}

export interface Club {
  id: string
  nombre: string
  escudo?: string | null
}

export interface CategoriaItem {
  id: string
  nombre: Categoria
}

export interface ItemDemarcacion {
  posicion: Demarcacion
  items: [string, string, string, string, string, string]
}

export type WizardStep = 1 | 2 | 3 | 4 | 5

export interface PartidoCalendario {
  id: string
  fecha: string      // YYYY-MM-DD
  hora: string       // HH:MM
  local: string
  visitante: string
  observador: string
  categoria: string
}
