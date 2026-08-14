import * as XLSX from 'xlsx'
import type { Demarcacion, FichaJugadora } from '../types'
import { normalizeText } from './textNormalize'
import { matchDemarcacion } from './demarcacionSynonyms'
import { splitNombreCompleto } from './nombreSplit'

const HEADER_ALIASES: Record<string, string> = {
  'nombre': 'nombreCompleto',
  'nombre completo': 'nombreCompleto',
  'jugadora': 'nombreCompleto',
  // Variantes que aparecen en los listados de las federaciones y los clubes
  'jugador': 'nombreCompleto',
  'jugador a': 'nombreCompleto',
  'futbolista': 'nombreCompleto',
  'nombre y apellidos': 'nombreCompleto',
  'apellidos y nombre': 'nombreCompleto',
  'apellidos nombre': 'nombreCompleto',
  'nombre jugadora': 'nombreCompleto',
  'nombre jugador': 'nombreCompleto',
  'nombre del jugador': 'nombreCompleto',
  'nombre de la jugadora': 'nombreCompleto',
  'apellidos': 'apellidos',
  'primer apellido': 'primerApellido',
  'segundo apellido': 'segundoApellido',
  'fecha nacimiento': 'fechaNacimiento',
  'fec nacimiento': 'fechaNacimiento',
  'f nac': 'fechaNacimiento',
  'fecha nac': 'fechaNacimiento',
  'fec nac': 'fechaNacimiento',
  'nac': 'fechaNacimiento',
  'nacida': 'fechaNacimiento',
  'ano nacimiento': 'fechaNacimiento',
  'f nacimiento': 'fechaNacimiento',
  'fecha de nacimiento': 'fechaNacimiento',
  'nacimiento': 'fechaNacimiento',
  'posicion': 'posicion',
  'pos': 'posicion',
  'puesto': 'posicion',
  'posición': 'posicion',
  'demarcacion': 'posicion',
  'demarcación': 'posicion',
  'dorsal': 'dorsal',
  'num': 'dorsal',
  'n': 'dorsal',
  'nº': 'dorsal',
  'numero': 'dorsal',
  'minutos': 'minutosJugados',
  'minutos jugados': 'minutosJugados',
  'min': 'minutosJugados',
  'titular': 'partidosTitular',
  'partidos titular': 'partidosTitular',
  'p titular': 'partidosTitular',
  'suplente': 'partidosSuplente',
  'partidos suplente': 'partidosSuplente',
  'p suplente': 'partidosSuplente',
  'goles': 'goles',
  'tarjetas amarillas': 'tarjetasAmarillas',
  't amarillas': 'tarjetasAmarillas',
  'amarillas': 'tarjetasAmarillas',
  'tarjetas rojas': 'tarjetasRojas',
  't rojas': 'tarjetasRojas',
  'rojas': 'tarjetasRojas',
}

/** Con qué carácter están separadas las columnas: el que más aparece en la cabecera. */
function detectaSeparador(texto: string): string {
  const primera = texto.split(/\r?\n/).find((l) => l.trim() !== '') ?? ''
  const candidatos = [';', ',', '\t', '|']
  let mejor = ','
  let mejorCuenta = 0
  for (const c of candidatos) {
    const n = primera.split(c).length - 1
    if (n > mejorCuenta) { mejorCuenta = n; mejor = c }
  }
  return mejor
}

/** Cuántas columnas de una fila se reconocen como cabecera conocida. */
/**
 * Normaliza una cabecera para buscarla entre los alias. Además de acentos y
 * mayúsculas, quita la puntuación y los ordinales: así "F. Nac.", "Nº" o "N.º"
 * caen en la misma forma que "f nac" y "n".
 */
function normalizaCabecera(texto: string): string {
  return normalizeText(
    String(texto ?? '')
      .replace(/([a-z0-9])([A-Z])/g, '$1 $2')   // "FechaNacimiento" → "Fecha Nacimiento"
      .replace(/[ºª°#]/g, ' ')
      .replace(/[._/\\-]+/g, ' ')
  ).replace(/\s+/g, ' ').trim()
}

function cabecerasReconocidas(fila: string[]): number {
  let n = 0
  for (const celda of fila) {
    if (HEADER_ALIASES[normalizaCabecera(celda)]) n++
  }
  return n
}

/** Qué se entendió del último fichero leído, para poder enseñarlo en pantalla. */
export interface DiagnosticoLectura {
  separador: string
  filaCabecera: number
  columnas: { original: string; entendida: string | null }[]
  filas: number
}
let ultimoDiagnostico: DiagnosticoLectura = { separador: '', filaCabecera: 0, columnas: [], filas: 0 }
export function diagnosticoDelUltimoFichero(): DiagnosticoLectura {
  return ultimoDiagnostico
}

/** Cabeceras del fichero tal cual venían, para poder enseñarlas si no se entienden. */
let ultimasCabecerasLeidas: string[] = []

export function cabecerasDelUltimoFichero(): string[] {
  return ultimasCabecerasLeidas
}

/** Cuántas filas de datos se encontraron en la última lectura. */
let ultimasFilasLeidas = 0
export function filasDelUltimoFichero(): number {
  return ultimasFilasLeidas
}

/**
 * Convierte la rejilla en filas con nombre de columna, buscando la fila de
 * títulos entre las primeras: si el fichero trae encabezados o filas vacías
 * encima, la primera fila no son los títulos.
 */
function filasDesdeRejilla(rejilla: string[][]): Record<string, string>[] {
  if (rejilla.length === 0) { ultimasCabecerasLeidas = []; return [] }

  let mejorIdx = 0
  let mejorPuntuacion = -1
  const hasta = Math.min(rejilla.length, 15)
  for (let i = 0; i < hasta; i++) {
    const p = cabecerasReconocidas(rejilla[i])
    if (p > mejorPuntuacion) { mejorPuntuacion = p; mejorIdx = i }
  }

  // Ninguna fila parece una cabecera: es una lista pelada de nombres, como la
  // que sale al copiar la plantilla de la web y pegarla en Excel. Se toma la
  // primera columna como el nombre de la jugadora y no se descarta ninguna fila.
  if (mejorPuntuacion === 0) {
    const filas = rejilla
      .map((f) => String(f[0] ?? '').trim())
      .filter((n) => n !== '')
      .map((n) => ({ jugadora: n }))
    ultimasCabecerasLeidas = []
    ultimasFilasLeidas = filas.length
    ultimoDiagnostico = {
      ...ultimoDiagnostico,
      filaCabecera: 0,
      columnas: [{ original: '(el fichero no trae cabecera)', entendida: 'nombreCompleto' }],
      filas: filas.length,
    }
    return filas
  }

  // Si la fila elegida es la última, no quedan datos debajo: se ha elegido mal
  // y es preferible volver a la primera fila que dejar la importación vacía.
  if (mejorIdx >= rejilla.length - 1) mejorIdx = 0

  const cabeceras = rejilla[mejorIdx].map((c) => String(c ?? '').trim())
  ultimasCabecerasLeidas = cabeceras.filter(Boolean)
  ultimoDiagnostico = {
    ...ultimoDiagnostico,
    filaCabecera: mejorIdx + 1,
    columnas: cabeceras.filter(Boolean).map((c) => ({
      original: c,
      entendida: HEADER_ALIASES[normalizaCabecera(c)] ?? null,
    })),
  }

  const filas: Record<string, string>[] = []
  for (let i = mejorIdx + 1; i < rejilla.length; i++) {
    const fila = rejilla[i]
    if (fila.every((c) => String(c ?? '').trim() === '')) continue
    const obj: Record<string, string> = {}
    cabeceras.forEach((cab, j) => { if (cab) obj[cab] = String(fila[j] ?? '').trim() })
    filas.push(obj)
  }
  ultimasFilasLeidas = filas.length
  ultimoDiagnostico = { ...ultimoDiagnostico, filas: filas.length }
  return filas
}

export function parseFichasFile(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    const esCsv = /\.csv$/i.test(file.name) || file.type === 'text/csv'
    reader.onload = () => {
      try {
        // Los CSV se leen como TEXTO en UTF-8. Leídos como bytes, SheetJS los
        // interpreta en otra codificación y destroza tildes, eñes y símbolos
        // como "Nº" — tanto en las cabeceras como en los nombres.
        const data = esCsv
          ? (reader.result as string)
          : new Uint8Array(reader.result as ArrayBuffer)
        // raw:true keeps date-like text (e.g. "2007-06-15") as the literal string instead
        // of letting SheetJS auto-detect it as a date and reformat it (locale-dependent,
        // e.g. "6/15/07"), which parseFechaFlexible below is not built to parse.
        // Los CSV españoles suelen venir separados por ; (Excel en español) o por
        // tabuladores si vienen de copiar y pegar. Se detecta con la primera línea.
        const separador = esCsv ? detectaSeparador(data as string) : undefined
        ultimoDiagnostico = { ...ultimoDiagnostico, separador: separador ?? '(Excel)' }
        const workbook = XLSX.read(data as never, {
          type: esCsv ? 'string' : 'array', raw: true, codepage: 65001,
          ...(separador ? { FS: separador } : {}),
        })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        // Se lee como una rejilla en bruto para poder localizar la fila de
        // títulos: los listados copiados de una web suelen traer encima el
        // nombre del equipo, la temporada o filas en blanco.
        const rejilla = XLSX.utils.sheet_to_json<string[]>(sheet, { header: 1, defval: '', raw: true, blankrows: false })
        resolve(filasDesdeRejilla(rejilla))
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    if (esCsv) reader.readAsText(file, 'utf-8')
    else reader.readAsArrayBuffer(file)
  })
}

function mapHeaders(row: Record<string, string>): Record<string, string> {
  const mapped: Record<string, string> = {}
  for (const [key, value] of Object.entries(row)) {
    // Split PascalCase/camelCase headers ("FechaNacimiento" -> "Fecha Nacimiento")
    // so they normalize the same way as space-separated ones before alias lookup.
    const canonical = HEADER_ALIASES[normalizaCabecera(key)]
    if (canonical) mapped[canonical] = String(value ?? '').trim()
  }
  return mapped
}

export function parseFechaFlexible(raw: string): string {
  const s = raw.trim()
  if (!s) return ''
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s
  const dmy = s.match(/^(\d{1,2})[/-](\d{1,2})[/-](\d{2,4})$/)
  if (dmy) {
    let [, d, m, y] = dmy
    if (y.length === 2) y = `20${y}`
    return `${y}-${m.padStart(2, '0')}-${d.padStart(2, '0')}`
  }
  return ''
}

export interface ImportRow {
  rowIndex: number
  nombre: string
  primerApellido: string
  segundoApellido: string
  fechaNacimiento: string
  dorsal: number
  demarcacion: Demarcacion | ''
  demarcacionRaw: string
  minutosJugados: number
  partidosTitular: number
  partidosSuplente: number
  goles: number
  tarjetasAmarillas: number
  tarjetasRojas: number
  included: boolean
  matchingFichaIds: string[]
  action: 'create' | 'update'
}

// Mirrored (not shared — Deno Edge Functions can't import from src/) in
// supabase/functions/_shared/matching.ts, used by the weekly acta sync job.
// Keep both in sync by hand if this matching rule ever changes.
function fichaFullName(f: Pick<FichaJugadora, 'nombre' | 'primerApellido' | 'segundoApellido'>): string {
  return normalizeText(`${f.nombre} ${f.primerApellido} ${f.segundoApellido}`.replace(/\s+/g, ' '))
}

// La carga es "por equipo": todas las filas del lote comparten el mismo club (elegido una
// vez en el formulario), así que el matching solo necesita comparar nombre + ese club fijo.
function findMatchingFichas(
  row: Pick<ImportRow, 'nombre' | 'primerApellido' | 'segundoApellido'>,
  batchClubId: string,
  fichas: FichaJugadora[]
): string[] {
  const rowName = fichaFullName(row)
  if (!rowName || !batchClubId) return []
  return fichas
    .filter((f) => fichaFullName(f) === rowName && f.club === batchClubId)
    .map((f) => f.id)
}

function toInt(raw: string | undefined): number {
  const n = Number(String(raw ?? '').replace(',', '.'))
  return Number.isFinite(n) ? Math.round(n) : 0
}

export function buildImportRows(
  rawRows: Record<string, string>[],
  batchClubId: string,
  fichas: FichaJugadora[] = []
): ImportRow[] {
  return rawRows.map((raw, i) => {
    const row = mapHeaders(raw)

    let nombre = row.nombre ?? ''
    let primerApellido = row.primerApellido ?? ''
    let segundoApellido = row.segundoApellido ?? ''
    if (!primerApellido && row.nombreCompleto) {
      const split = splitNombreCompleto(row.nombreCompleto)
      nombre = split.nombre
      primerApellido = split.primerApellido
      segundoApellido = split.segundoApellido
    } else if (!primerApellido && row.apellidos) {
      const split = splitNombreCompleto(`${nombre} ${row.apellidos}`)
      nombre = split.nombre
      primerApellido = split.primerApellido
      segundoApellido = split.segundoApellido
    }

    const demarcacionRaw = row.posicion ?? ''
    const demarcacion = matchDemarcacion(demarcacionRaw) ?? ''

    const matchingFichaIds = findMatchingFichas({ nombre, primerApellido, segundoApellido }, batchClubId, fichas)

    return {
      rowIndex: i,
      nombre,
      primerApellido,
      segundoApellido,
      fechaNacimiento: parseFechaFlexible(row.fechaNacimiento ?? ''),
      dorsal: toInt(row.dorsal),
      demarcacion,
      demarcacionRaw,
      matchingFichaIds,
      action: matchingFichaIds.length > 0 ? 'update' : 'create',
      minutosJugados: toInt(row.minutosJugados),
      partidosTitular: toInt(row.partidosTitular),
      partidosSuplente: toInt(row.partidosSuplente),
      goles: toInt(row.goles),
      tarjetasAmarillas: toInt(row.tarjetasAmarillas),
      tarjetasRojas: toInt(row.tarjetasRojas),
      included: true,
    }
  })
}
