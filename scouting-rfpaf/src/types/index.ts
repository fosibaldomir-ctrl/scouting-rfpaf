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

export interface JugadoraConvocada {
  fichaId: string
  nombre: string
  primerApellido: string
  segundoApellido: string
  fechaNacimiento: string
  clubId: string
  clubNombre: string
  foto?: string | null
}

export interface Convocatoria {
  id: string
  nombre: string
  fecha: string      // YYYY-MM-DD
  hora: string       // HH:MM
  jugadoras: JugadoraConvocada[]
  pdfUrl?: string | null
  creadoEn: string
}

/* ═══════════════════════════════════════
   VIDEOTECA SESIONES TYPES
═══════════════════════════════════════ */

export type SeleccionCategoria = 'SUB 12' | 'SUB 14' | 'SUB 16'

export interface VideoSesion {
  id: string
  fecha: string           // YYYY-MM-DD
  seleccion: SeleccionCategoria
  titulo: string
  descripcion: string
  url_video: string
  creado_en: string
}

/* ═══════════════════════════════════════
   ENTRENAMIENTOS / TRAINING TYPES
═══════════════════════════════════════ */

export interface EjercicioSesion {
  id: string
  orden: number
  tipo: string
  duracion: string
  descripcion: string
  numJugadores: string
  material: string
  imagen: string | null
}

export interface Sesion {
  fecha: string
  hora: string
  campo: string
  numConvocatoria: string
  fase: string
  entrenador: string
  numJugadorasConvocadas: string
  objetivos: string
  observaciones: string
  capturas: string[]
  ejercicios: EjercicioSesion[]
}

export type DrawTool = 'freehand' | 'line' | 'arrow' | 'curve' | 'curvearrow' | 'circle' | 'rect' | 'text'
export type PitchType = 'full' | 'half' | 'blank'
export interface Point {
  x: number
  y: number
}
export interface Shape {
  type: DrawTool
  color: string
  width: number
  dashed?: boolean
  start?: Point
  end?: Point
  points?: Point[]
  text?: string
}

export type TeamId = 1 | 2 | 3
export interface PlacedPlayer {
  uid: string
  team: TeamId
  number: number
  x: number
  y: number
}
export interface SelPlayer {
  team: TeamId
  number: number
}

export type AccessoryType =
  | 'goal_front'
  | 'goal_3d_r'
  | 'goal_3d_l'
  | 'goal_side'
  | 'goal_mini'
  | 'goal_arc'
  | 'cone'
  | 'mushroom_blue'
  | 'mushroom_red'
  | 'mushroom_yellow'
  | 'ladder'
  | 'hurdle'
  | 'mannequin'
  | 'barrier'
  | 'ball_bw'
  | 'ball_blue'
  | 'ball_red'

export interface PlacedAccessory {
  uid: string
  type: AccessoryType
  x: number
  y: number
  rotation: number
  color?: string
  scale: number
}

export interface SelAcc {
  type: AccessoryType
  color?: string
}
