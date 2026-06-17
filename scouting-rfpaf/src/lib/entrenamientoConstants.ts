import type { Sesion, TeamId, PitchType, AccessoryType } from '../types'

/* ═══════════════════════════════════════
   SESSION CONSTANTS
═══════════════════════════════════════ */

export const FASES = ['Entrenamientos 1ª Fase', 'Entrenamientos 2ª Fase', 'Partidos Entrenamiento']

export const SESION_EMPTY: Sesion = {
  fecha: '',
  hora: '',
  campo: '',
  numConvocatoria: '',
  fase: '',
  entrenador: '',
  numJugadorasConvocadas: '',
  objetivos: '',
  observaciones: '',
  capturas: [],
  ejercicios: [],
}

export const EJ_SESION_EMPTY = {
  tipo: '',
  duracion: '',
  descripcion: '',
  numJugadores: '',
  material: '',
  imagen: null as string | null,
}

/* ═══════════════════════════════════════
   EXERCISE LIBRARY CONSTANTS
═══════════════════════════════════════ */

export const TIPOS_EJERCICIO = [
  'Técnico',
  'Táctico',
  'Físico',
  'Rondo',
  'Partido reducido',
  'Calentamiento',
  'Posesión',
  'Pressing',
  'Otro',
]

export const FILTER_TIPOS = ['Calentamiento', 'Técnico', 'Táctico', 'Físico', 'Fuerza', 'Agilidad']
export const FILTER_JUGADORES = ['1', '2-4', '5-8', '9-11']
export const FILTER_DURACION = ['5-10', '10-20', '20+']
export const FILTER_MATERIAL = ['Sin material', 'Conos', 'Balones', 'Petos', 'Vallas', 'Escalera', 'Otro']

/* ═══════════════════════════════════════
   TACTICAL BOARD CONSTANTS
═══════════════════════════════════════ */

export const TEAMS: Record<TeamId, { bg: string; border: string; text: string; label: string }> = {
  1: { bg: '#2563eb', border: '#1d4ed8', text: '#ffffff', label: 'Equipo A' },
  2: { bg: '#dc2626', border: '#b91c1c', text: '#ffffff', label: 'Equipo B' },
  3: { bg: '#ca8a04', border: '#a16207', text: '#000000', label: 'Equipo C' },
}

export const PLAYER_R = 15
export const ACC_LOCAL_HALF = 22
export const HANDLE_R = 7
export const ROT_EXTRA = 22

export const PALETTE = [
  '#ffffff',
  '#facc15',
  '#f87171',
  '#4ade80',
  '#60a5fa',
  '#e879f9',
  '#fb923c',
  '#000000',
  '#a855f7',
  '#06b6d4',
  '#f97316',
  '#84cc16',
  '#ec4899',
  '#14b8a6',
  '#f43f5e',
  '#6366f1',
]

export const PITCH_OPTIONS: { id: PitchType; label: string }[] = [
  { id: 'full', label: 'Campo completo' },
  { id: 'half', label: 'Medio campo' },
  { id: 'blank', label: 'Sin líneas' },
]

export const ACCESSORY_LIST: { type: AccessoryType; label: string }[] = [
  { type: 'cone', label: 'Conos' },
  { type: 'ladder', label: 'Escalera' },
  { type: 'hurdle', label: 'Valla' },
  { type: 'mannequin', label: 'Muñeco' },
  { type: 'barrier', label: 'Barrera' },
]

export const GOAL_LIST: { type: AccessoryType; label: string; initRot: number }[] = [
  { type: 'goal_front', label: 'Frontal', initRot: 0 },
  { type: 'goal_3d_r', label: '3D Derecha', initRot: -28 },
  { type: 'goal_3d_l', label: '3D Izquierda', initRot: 28 },
  { type: 'goal_side', label: 'Lateral', initRot: 90 },
  { type: 'goal_mini', label: 'Mini', initRot: -22 },
  { type: 'goal_arc', label: 'Portátil', initRot: -18 },
]

export const MUSHROOM_LIST: { type: AccessoryType; label: string }[] = [
  { type: 'mushroom_blue', label: 'Seta Azul' },
  { type: 'mushroom_red', label: 'Seta Roja' },
  { type: 'mushroom_yellow', label: 'Seta Amarilla' },
]

export const BALL_LIST: { type: AccessoryType; label: string }[] = [
  { type: 'ball_bw', label: 'Balón B/N' },
  { type: 'ball_blue', label: 'Balón Azul' },
  { type: 'ball_red', label: 'Balón Rojo' },
]
