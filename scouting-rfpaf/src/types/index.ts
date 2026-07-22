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

export interface Valoracion {
  id: string
  fechaPartido: string
  local: string
  visitante: string
  categoria: Categoria
  observador: string
  fuerza: number
  velocidad: number
  resistencia: number
  evaluacionTecnica: EvaluacionDemarcacion
  valoracionGeneral: number
  propuesta: Propuesta
  descripcionJugadora: string
  observaciones: string
  cierre: string
  creadoEn: string
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
  // Estadísticas de temporada (acumuladas, no del partido de esta ficha)
  minutosJugados: number
  partidosTitular: number
  partidosSuplente: number
  goles: number
  tarjetasAmarillas: number
  tarjetasRojas: number
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
  // Historial de valoraciones (una por partido observado). Los campos de
  // valoración de arriba (fechaPartido, local, visitante, categoria,
  // observador, evaluacionTecnica, valoracionGeneral, propuesta,
  // descripcionJugadora, observaciones, cierre) reflejan siempre la entrada
  // más reciente de este array — se mantienen sincronizados automáticamente.
  valoraciones: Valoracion[]
  // Meta
  creadoEn: string
  actualizadoEn: string
}

export interface Observador {
  id: string
  nombre: string
  foto?: string | null
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
   AGENDA / EVENTOS TYPES
═══════════════════════════════════════ */

export type TipoEvento = 'reunion' | 'convocatoria' | 'entrenamiento' | 'partido' | 'otro'

export interface Evento {
  id: string
  titulo: string
  fecha: string        // YYYY-MM-DD
  hora_inicio: string  // HH:MM
  hora_fin: string | null
  tipo: TipoEvento
  descripcion: string
  link: string | null  // URL a convocatoria, sesión, etc.
  creado_en: string
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

/* ═══════════════════════════════════════
   DESARROLLO INDIVIDUAL TYPES
═══════════════════════════════════════ */

export type EstadoObjetivo = 'EN_CURSO' | 'COMPLETADO' | 'ABANDONADO'
export type TipoObjetivo = 'DEPORTIVO' | 'FISICO' | 'MENTAL' | 'TECNICO' | 'TACTICO'
export type AccionObjetivo = 'MEJORAR' | 'MANTENER' | 'DESARROLLAR' | 'CORREGIR'
export type TipoHistorial = 'SESION' | 'PARTIDO' | 'EVALUACION'
export type EstadoBadgeHistorial = 'EN_CURSO' | 'CONSEGUIDO' | 'EN_REVISION'

export interface HistorialAccion {
  id: string
  fecha: string
  tipo: TipoHistorial
  titulo?: string
  comentario: string
  imagenUrl?: string
  videoUrl?: string
  estadoBadge?: EstadoBadgeHistorial
}

export interface ObjetivoJugadora {
  id: string
  fichaId?: string          // reference to FichaJugadora.id if loaded from BD
  playerName: string
  playerClub: string
  playerPhoto?: string
  playerNumber?: number
  titulo: string
  descripcion: string
  fechaInicio: string
  estado: EstadoObjetivo
  tipo: TipoObjetivo
  accion: AccionObjetivo
  imagenUrl?: string
  pdfUrl?: string
  videoUrl?: string
  historial: HistorialAccion[]
  creadoEn: string
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

/* ═══════════════════════════════════════
   ANÁLISIS GLOBAL TYPES
═══════════════════════════════════════ */

export type FormacionFutbol =
  | '4-4-2' | '4-3-3' | '4-2-3-1' | '4-3-2-1'
  | '3-5-2' | '3-4-3' | '5-3-2' | '5-4-1'
  | '4-1-4-1' | '4-5-1' | '4-4-1-1'

export interface JugadoraTactica {
  uid: string
  numero: number
  nombre: string
  posX: number
  posY: number
  foto?: string | null
  fichaId?: string
}

export interface EquipoTactico {
  nombre: string
  formacion: FormacionFutbol
  color: string
  jugadoras: JugadoraTactica[]
  escudo?: string | null
}

export interface BloquePlan {
  notas: string
  videoUrl: string
  imagenUrl: string
}

export interface CaracteristicasRival {
  salidaBalon: string[]
  presion: string[]
  bloque: string[]
  lineaDefensiva: string[]
  transicionOfensiva: string[]
  transicionDefensiva: string[]
}

export interface AccionBalonParado {
  id: string
  analisisId: string
  tipo: 'ofensivo' | 'defensivo'
  orden: number
  titulo: string
  notas: string
  imagenUrl: string
  videoUrl: string
  notas2: string
  imagen2Url: string
  video2Url: string
  creadoEn: string
}

export type TipoEventoAnalisis =
  | 'GOL' | 'OCASION' | 'DUELO' | 'NOTA'
  | 'TRANSICION_DEF' | 'TRANSICION_OF'
  | 'SALIDA_BALON' | 'ABP' | 'PRESION'

export interface EventoAnalisis {
  id: string
  tipo: TipoEventoAnalisis
  minutoPartido: number
  descripcion: string
  videoSeconds: number
  jugadora?: string
  posicion?: { x: number; y: number }
}

export interface AnalisisPartido {
  id: string
  nombre: string
  rival: string
  fecha: string
  categoria?: string
  equipoLocal: EquipoTactico
  equipoVisitante: EquipoTactico
  analisisIA: string
  caracteristicasRival: CaracteristicasRival
  videoRivalUrl: string
  presentacionUrl: string
  bloqueAtaque: BloquePlan
  bloqueDefensa: BloquePlan
  bloqueTransicion: BloquePlan
  videoPartidoUrl: string
  tiempos: { inicio1: string; fin1: string; inicio2: string; fin2: string }
  eventosPartido: EventoAnalisis[]
  creadoEn: string
}

/* ═══════════════════════════════════════
   WELLNESS TYPES
═══════════════════════════════════════ */

export type ZonaCuerpo =
  | 'cabeza' | 'cuello'
  | 'hombro_izq' | 'hombro_der'
  | 'pecho' | 'abdomen'
  | 'espalda_alta' | 'espalda_baja'
  | 'brazo_izq' | 'brazo_der'
  | 'antebrazo_izq' | 'antebrazo_der'
  | 'mano_izq' | 'mano_der'
  | 'cadera_izq' | 'cadera_der'
  | 'gluteo_izq' | 'gluteo_der'
  | 'muslo_izq' | 'muslo_der'
  | 'rodilla_izq' | 'rodilla_der'
  | 'gemelo_izq' | 'gemelo_der'
  | 'tobillo_izq' | 'tobillo_der'
  | 'pie_izq' | 'pie_der'
  | 'talon_izq' | 'talon_der'

export type GravedadLesion = 'leve' | 'moderada' | 'grave'
export type EstadoLesion = 'activa' | 'recuperandose' | 'alta'

export interface RegistroLesion {
  id: string
  jugadoraNombre: string
  fechaInicio: string
  fechaAlta?: string
  zonas: ZonaCuerpo[]
  tipo: string
  gravedad: GravedadLesion
  estado: EstadoLesion
  descripcion: string
  diasBaja: number
  partidosPerdidos?: number
  creadoEn: string
}

export interface RegistroRPE {
  id: string
  jugadoraNombre: string
  fecha: string
  rpe: number
  minutos: number
  cargaTotal: number
  notas: string
  creadoEn: string
}

/* ═══════════════════════════════════════
   INFORMES TYPES
═══════════════════════════════════════ */

export type CondicionAtmosferica = 'soleado' | 'nublado' | 'lluvia' | 'tormenta'

export interface PlanFase {
  explicacion: string
  imagenUrl: string
  variante1Url: string
  variante2Url: string
}

export interface PartidoInforme {
  id: string
  informeId: string
  jornada: number
  rivalNombre: string
  rivalEscudoUrl: string
  resultadoLocal: number
  resultadoVisitante: number
  fechaPartido: string
  horaPartido: string
  campoNombre: string
  campoFotoUrl: string
  condiciones: CondicionAtmosferica
  equipacionLocalUrl: string
  equipacionVisitanteUrl: string
  sistema: string
  sistemaRival: string
  alineacionTitulares: JugadoraTactica[]
  alineacionSuplentes: JugadoraTactica[]
  planOfensivo: PlanFase
  planDefensivo: PlanFase
  creadoEn: string
}

export interface EvaluacionJugadora {
  id: string
  partidoInformeId: string
  orden: number
  fichaId?: string
  nombre: string
  apellidos: string
  fotoUrl: string
  dorsal: number | null
  lateralidad: string
  fechaNacimiento: string
  clubNombre: string
  clubEscudoUrl: string
  posicionX: number | null
  posicionY: number | null
  minutos: number
  goles: number
  asistencias: number
  tarjetasAmarillas: number
  tarjetasRojas: number
  valoracion: number | null
  comentario: string
  creadoEn: string
}

export interface Informe {
  id: string
  titulo: string
  autor: string
  fecha: string
  conclusiones: string
  creadoEn: string
}

export interface CompeticionMapeo {
  id: string
  temporadaValor: string
  temporadaLabel: string
  tipoJuego: string
  competicionId: string
  competicionLabel: string
  grupoId: string
  grupoLabel: string
  categoria: Categoria
  activo: boolean
  ultimaJornadaProcesada: number
  creadoEn: string
  actualizadoEn: string
}

export interface SyncRun {
  id: string
  iniciadoEn: string
  finalizadoEn: string | null
  estado: 'en_curso' | 'completado' | 'error'
  disparadoPor: 'cron' | 'manual'
  competicionesProcesadas: number
  actasNuevas: number
  fichasActualizadas: number
  jugadorasSinMatch: number
  errores: { mapeo?: string; codActa?: string; message: string }[]
  resumen: string
}
