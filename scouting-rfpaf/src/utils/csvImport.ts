import * as XLSX from 'xlsx'
import type { Club, Demarcacion } from '../types'
import { normalizeText } from './textNormalize'
import { findBestClubMatch } from './fuzzyMatch'
import { matchDemarcacion } from './demarcacionSynonyms'
import { splitNombreCompleto } from './nombreSplit'

const CLUB_MATCH_THRESHOLD = 0.6

const HEADER_ALIASES: Record<string, string> = {
  'nombre': 'nombreCompleto',
  'nombre completo': 'nombreCompleto',
  'jugadora': 'nombreCompleto',
  'apellidos': 'apellidos',
  'primer apellido': 'primerApellido',
  'segundo apellido': 'segundoApellido',
  'club': 'club',
  'equipo': 'club',
  'fecha nacimiento': 'fechaNacimiento',
  'f nacimiento': 'fechaNacimiento',
  'fecha de nacimiento': 'fechaNacimiento',
  'nacimiento': 'fechaNacimiento',
  'posicion': 'posicion',
  'posición': 'posicion',
  'demarcacion': 'posicion',
  'demarcación': 'posicion',
  'dorsal': 'dorsal',
  'n': 'dorsal',
  'nº': 'dorsal',
  'numero': 'dorsal',
  'minutos': 'minutosJugados',
  'minutos jugados': 'minutosJugados',
  'min': 'minutosJugados',
  'min.': 'minutosJugados',
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

export function parseFichasFile(file: File): Promise<Record<string, string>[]> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => {
      try {
        const data = new Uint8Array(reader.result as ArrayBuffer)
        // raw:true keeps date-like text (e.g. "2007-06-15") as the literal string instead
        // of letting SheetJS auto-detect it as a date and reformat it (locale-dependent,
        // e.g. "6/15/07"), which parseFechaFlexible below is not built to parse.
        const workbook = XLSX.read(data, { type: 'array', raw: true })
        const sheet = workbook.Sheets[workbook.SheetNames[0]]
        const rows = XLSX.utils.sheet_to_json<Record<string, string>>(sheet, { defval: '', raw: true })
        resolve(rows)
      } catch (err) {
        reject(err)
      }
    }
    reader.onerror = reject
    reader.readAsArrayBuffer(file)
  })
}

function mapHeaders(row: Record<string, string>): Record<string, string> {
  const mapped: Record<string, string> = {}
  for (const [key, value] of Object.entries(row)) {
    // Split PascalCase/camelCase headers ("FechaNacimiento" -> "Fecha Nacimiento")
    // so they normalize the same way as space-separated ones before alias lookup.
    const spaced = key.replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    const canonical = HEADER_ALIASES[normalizeText(spaced)]
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
  clubId: string
  clubRawText: string
  clubScore: number
  demarcacion: Demarcacion | ''
  demarcacionRaw: string
  minutosJugados: number
  partidosTitular: number
  partidosSuplente: number
  goles: number
  tarjetasAmarillas: number
  tarjetasRojas: number
  included: boolean
}

function toInt(raw: string | undefined): number {
  const n = Number(String(raw ?? '').replace(',', '.'))
  return Number.isFinite(n) ? Math.round(n) : 0
}

export function buildImportRows(rawRows: Record<string, string>[], clubes: Club[]): ImportRow[] {
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

    const clubRawText = row.club ?? ''
    const { club, score } = clubRawText ? findBestClubMatch(clubRawText, clubes) : { club: null, score: 0 }
    const clubId = club && score >= CLUB_MATCH_THRESHOLD ? club.id : ''

    const demarcacionRaw = row.posicion ?? ''
    const demarcacion = matchDemarcacion(demarcacionRaw) ?? ''

    return {
      rowIndex: i,
      nombre,
      primerApellido,
      segundoApellido,
      fechaNacimiento: parseFechaFlexible(row.fechaNacimiento ?? ''),
      dorsal: toInt(row.dorsal),
      clubId,
      clubRawText,
      clubScore: score,
      demarcacion,
      demarcacionRaw,
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
