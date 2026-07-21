#!/usr/bin/env node
// Sincronización de estadísticas desde actas de asturfutbol.es — pensado para correr en
// local (tu ordenador), no en la nube: asturfutbol.es bloquea silenciosamente (devuelve 200
// con cuerpo vacío) el tráfico que viene de rangos de IP de centros de datos, así que una
// Supabase Edge Function nunca puede llegar al sitio, aunque tu propio ordenador sí puede.
//
// Uso:
//   npm run sync-actas            (o: node scripts/sync-actas.mjs)
//
// Necesita VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY en .env.local (ya existen para la app).
// Las políticas RLS de las tablas nuevas son abiertas, así que la clave anon basta — no hace
// falta la service-role key para este script.

import { createClient } from '@supabase/supabase-js'
import { readFileSync, mkdtempSync, rmSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import path from 'node:path'
import os from 'node:os'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const execFileAsync = promisify(execFile)

const __dirname = path.dirname(fileURLToPath(import.meta.url))

function loadEnvLocal() {
  const envPath = path.join(__dirname, '..', '.env.local')
  const env = {}
  try {
    const content = readFileSync(envPath, 'utf8')
    for (const line of content.split('\n')) {
      const m = line.match(/^([A-Z_]+)=(.*)$/)
      if (m) env[m[1]] = m[2].trim()
    }
  } catch {
    // no .env.local — fall back to real env vars below
  }
  return env
}

const fileEnv = loadEnvLocal()
const SUPABASE_URL = process.env.VITE_SUPABASE_URL || fileEnv.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = process.env.VITE_SUPABASE_ANON_KEY || fileEnv.VITE_SUPABASE_ANON_KEY
if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error('Faltan VITE_SUPABASE_URL / VITE_SUPABASE_ANON_KEY (revisa .env.local)')
  process.exit(1)
}

const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

/* ───────────────────────── texto / matching ───────────────────────── */

function normalizeText(s) {
  return s.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/\s+/g, ' ').trim()
}

function levenshtein(a, b) {
  const m = a.length, n = b.length
  if (m === 0) return n
  if (n === 0) return m
  const prev = new Array(n + 1), curr = new Array(n + 1)
  for (let j = 0; j <= n; j++) prev[j] = j
  for (let i = 1; i <= m; i++) {
    curr[0] = i
    for (let j = 1; j <= n; j++) {
      const cost = a[i - 1] === b[j - 1] ? 0 : 1
      curr[j] = Math.min(prev[j] + 1, curr[j - 1] + 1, prev[j - 1] + cost)
    }
    for (let j = 0; j <= n; j++) prev[j] = curr[j]
  }
  return prev[n]
}

function similarity(a, b) {
  const na = normalizeText(a), nb = normalizeText(b)
  const maxLen = Math.max(na.length, nb.length)
  if (maxLen === 0) return 1
  return 1 - levenshtein(na, nb) / maxLen
}

function findBestClubMatch(query, clubes) {
  let best = null, bestScore = 0
  for (const c of clubes) {
    const score = similarity(query, c.nombre)
    if (score > bestScore) { best = c; bestScore = score }
  }
  return { club: best, score: bestScore }
}

function wordSignature(s) {
  return normalizeText(s).split(' ').filter(Boolean).sort().join(' ')
}

function actaNameSignature(nombreActa) {
  const [apellidos, nombre] = nombreActa.split(',').map((s) => (s || '').trim())
  return wordSignature(`${apellidos} ${nombre ?? ''}`)
}

function fichaNameSignature(f) {
  return wordSignature(`${f.nombre} ${f.primer_apellido} ${f.segundo_apellido}`)
}

function clubDisplayName(clubId, clubRawText, clubes) {
  return normalizeText(clubes.find((c) => c.id === clubId)?.nombre || clubRawText)
}

function findMatchingFichasByActa(nombreActa, clubId, fichas, clubes) {
  const actaSig = actaNameSignature(nombreActa)
  const actaClub = clubDisplayName(clubId, '', clubes)
  if (!actaSig || !actaClub) return []
  return fichas
    .filter((f) => fichaNameSignature(f) === actaSig && clubDisplayName(f.club, f.club, clubes) === actaClub)
    .map((f) => f.id)
}

/* ───────────────────────── http (asturfutbol.es) ───────────────────────── */

const USER_AGENT =
  'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0 Safari/537.36'

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// Node's native fetch() silently drops the Set-Cookie response header from JS visibility
// in this environment (Headers.getSetCookie() returns [] even when curl's own cookie jar
// proves the header is really there) — curl handles session cookies natively and has been
// reliable throughout testing, so shell out to it instead of fighting fetch().
//
// asturfutbol.es also rate-limits: hammering it with many requests in a short window makes
// it return HTTP 200 with an empty body (no error, just silently nothing) for a while. This
// jar paces requests with a delay and retries once on an empty response before giving up —
// be respectful of the site, this is someone else's server, not ours.
class CookieJar {
  constructor(delayMs = 6000) {
    this.dir = mkdtempSync(path.join(os.tmpdir(), 'sync-actas-'))
    this.cookieFile = path.join(this.dir, 'cookies.txt')
    this.delayMs = delayMs
  }

  async fetchOnce(url) {
    const { stdout } = await execFileAsync('curl', [
      '-s', '-L',
      '-c', this.cookieFile, '-b', this.cookieFile,
      '-A', USER_AGENT,
      '-H', 'Accept: text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      '-H', 'Accept-Language: es-ES,es;q=0.9,en;q=0.8',
      url,
    ], { maxBuffer: 20 * 1024 * 1024, encoding: 'latin1' })
    return stdout
  }

  async getText(url) {
    await sleep(this.delayMs)
    let text = await this.fetchOnce(url)
    for (let attempt = 0; !text && attempt < 3; attempt++) {
      const backoff = 30000 * (attempt + 1)
      console.log(`    (respuesta vacía, probablemente límite de peticiones — esperando ${backoff / 1000}s…)`)
      await sleep(backoff)
      text = await this.fetchOnce(url)
    }
    return text
  }

  // Confirmed: a request with no prior session cookie gets a "cookie no aceptada"
  // placeholder instead of real content — visiting the homepage first (like a real
  // browser would) establishes a JSESSIONID that subsequent requests must reuse.
  async warmUp() {
    await this.getText('https://www.asturfutbol.es/')
  }

  cleanup() {
    rmSync(this.dir, { recursive: true, force: true })
  }
}

/* ───────────────────────── discovery (encontrar CodActa) ───────────────────────── */

const BASE = 'https://www.asturfutbol.es/pnfg/NPcd/NFG_CmpJornada'
const ACTA_URL = 'https://www.asturfutbol.es/pnfg/NPcd/NFG_CmpPartido'

function jornadaUrl(mapeo, jornada) {
  const params = new URLSearchParams({
    cod_primaria: '1000120',
    CodCompeticion: mapeo.competicion_id,
    CodGrupo: mapeo.grupo_id,
    CodTemporada: mapeo.temporada_valor,
    cod_agrupacion: '',
    CodJornada: String(jornada),
    Sch_Tipo_Juego: mapeo.tipo_juego,
  })
  return `${BASE}?${params.toString()}`
}

function extractCodActas(html) {
  const ids = new Set()
  for (const m of html.matchAll(/CodActa=(\d+)/g)) ids.add(m[1])
  return [...ids]
}

async function discoverNewCodActas(jar, mapeo, fromJornada, maxJornadas = 3) {
  const results = []
  for (let j = fromJornada + 1; j <= fromJornada + maxJornadas; j++) {
    const html = await jar.getText(jornadaUrl(mapeo, j))
    const codActas = extractCodActas(html)
    if (codActas.length === 0) break
    results.push({ jornada: j, codActas })
  }
  return results
}

/* ───────────────────────── acta parser (verificado contra un acta real) ───────────────────────── */

function emptyDelta(nombreActa, teamName) {
  return { nombreActa, teamName, minutos: 0, titular: 0, suplente: 0, goles: 0, amarillas: 0, rojas: 0 }
}

function extractTeamBlocks(html) {
  const headerRe = /<div class=number style="font-size: 20px;line-height: 30px;">([^<]+)<\/div>/g
  const matches = [...html.matchAll(headerRe)]
  const blocks = []
  for (let i = 0; i < matches.length; i++) {
    const start = matches[i].index
    const end = i + 1 < matches.length ? matches[i + 1].index : html.length
    blocks.push({ teamName: matches[i][1].trim(), html: html.slice(start, end) })
  }
  return blocks.filter((b) => b.html.includes('<strong>Titulares</strong>'))
}

function extractPlayerTable(blockHtml, sectionLabel) {
  const headerIdx = blockHtml.indexOf(`<strong>${sectionLabel}</strong>`)
  if (headerIdx === -1) return []
  const tableStart = blockHtml.indexOf('<table', headerIdx)
  if (tableStart === -1) return []
  const tableEnd = blockHtml.indexOf('</table>', tableStart) + '</table>'.length
  const tableHtml = blockHtml.slice(tableStart, tableEnd)
  const rowRe = /<tr[^>]*>\s*<td[^>]*>(\d+)<\/td>\s*<td[^>]*>.*?<\/td>\s*<td[^>]*>([^<]+)<\/td>\s*<\/tr>/g
  const players = []
  let m
  while ((m = rowRe.exec(tableHtml))) players.push({ dorsal: Number(m[1]), nombreActa: m[2].trim() })
  return players
}

// Row order: [entering player (bench, no minute on their own row), leaving player (minute
// shown on their row)] — confirmed against a real acta.
function extractSustituciones(blockHtml) {
  const headerIdx = blockHtml.indexOf('Sustituciones')
  if (headerIdx === -1) return []
  const cardsIdx = blockHtml.indexOf('Tarjetas', headerIdx)
  const section = cardsIdx !== -1 ? blockHtml.slice(headerIdx, cardsIdx) : blockHtml.slice(headerIdx, headerIdx + 6000)
  const tableRe = /<table[^>]*>([\s\S]*?)<\/table>/g
  const subs = []
  let tm
  while ((tm = tableRe.exec(section))) {
    const rowRe = /<tr>\s*<td[^>]*>(\d+)<\/td>\s*<td[^>]*>(?:<p[^>]*>)?(?:<span[^>]*>\((\d+)'\)<\/span>)?\s*([^<]+?)\s*(?:<\/p>)?<\/td>/g
    const rows = []
    let rm
    while ((rm = rowRe.exec(tm[1]))) rows.push({ dorsal: Number(rm[1]), minuto: rm[2] ? Number(rm[2]) : null, nombreActa: rm[3].trim() })
    if (rows.length === 2 && rows[1].minuto !== null) subs.push({ entra: rows[0], sale: rows[1] })
  }
  return subs
}

function extractTarjetas(blockHtml) {
  const idx = blockHtml.indexOf('Tarjetas</h4>')
  if (idx === -1) return []
  const tableStart = blockHtml.indexOf('<table', idx)
  if (tableStart === -1) return []
  const tableEnd = blockHtml.indexOf('</table>', tableStart) + '</table>'.length
  const tableHtml = blockHtml.slice(tableStart, tableEnd)
  const rowRe = /<img src="([^"]*tarj_[^"]*)"[^>]*>[\s\S]*?<\/td>\s*<td[^>]*><span[^>]*>\((\d+)'\)<\/span>\s*([^<]+?)\s*<\/td>/g
  const cards = []
  let m
  while ((m = rowRe.exec(tableHtml))) {
    cards.push({ color: m[1].includes('amar') ? 'amarilla' : 'roja', minuto: Number(m[2]), nombreActa: m[3].trim() })
  }
  return cards
}

function extractGoles(html) {
  const idx = html.indexOf('Goles</div>')
  if (idx === -1) return []
  const tableStart = html.indexOf('<table', idx)
  if (tableStart === -1) return []
  const tableEnd = html.indexOf('</table>', tableStart) + '</table>'.length
  const tableHtml = html.slice(tableStart, tableEnd)
  const rowRe = /title="([^"]+)"[\s\S]*?<td[^>]*><span[^>]*>\((\d+)'\)<\/span>\s*([^<]+?)\s*<\/td>/g
  const goles = []
  let m
  while ((m = rowRe.exec(tableHtml))) goles.push({ esPropia: /propia/i.test(m[1]), minuto: Number(m[2]), nombreActa: m[3].trim() })
  return goles
}

function parseActa(html) {
  const fechaMatch = html.match(/\d{2}-\d{2}-\d{4}/)
  const fecha = fechaMatch ? fechaMatch[0] : ''
  const blocks = extractTeamBlocks(html)
  const deltas = new Map()

  for (const block of blocks) {
    const titulares = extractPlayerTable(block.html, 'Titulares')
    const sustituciones = extractSustituciones(block.html)
    const tarjetas = extractTarjetas(block.html)

    for (const t of titulares) deltas.set(t.nombreActa, { ...emptyDelta(t.nombreActa, block.teamName), titular: 1, minutos: 90 })

    for (const sub of sustituciones) {
      const saleDelta = deltas.get(sub.sale.nombreActa)
      if (saleDelta) saleDelta.minutos = sub.sale.minuto
      deltas.set(sub.entra.nombreActa, { ...emptyDelta(sub.entra.nombreActa, block.teamName), suplente: 1, minutos: 90 - sub.sale.minuto })
    }

    for (const card of tarjetas) {
      const d = deltas.get(card.nombreActa) ?? emptyDelta(card.nombreActa, block.teamName)
      if (card.color === 'amarilla') d.amarillas += 1; else d.rojas += 1
      deltas.set(card.nombreActa, d)
    }
  }

  for (const gol of extractGoles(html)) {
    if (gol.esPropia) continue
    const d = deltas.get(gol.nombreActa)
    if (d) d.goles += 1
  }

  return {
    fecha,
    equipoLocal: blocks[0]?.teamName ?? '',
    equipoVisitante: blocks[1]?.teamName ?? '',
    deltas: [...deltas.values()],
  }
}

/* ───────────────────────── orquestación ───────────────────────── */

async function main() {
  const disparadoPor = process.argv.includes('--cron') ? 'cron' : 'manual'
  console.log(`\n🔄 Sincronización de actas (${disparadoPor}) — ${new Date().toLocaleString('es-ES')}\n`)

  const { data: runRow, error: runInsertError } = await supabase
    .from('sync_runs')
    .insert({ disparado_por: disparadoPor })
    .select()
    .single()
  if (runInsertError || !runRow) {
    console.error('No se pudo crear sync_runs:', runInsertError?.message)
    process.exit(1)
  }

  const totals = { competiciones_procesadas: 0, actas_nuevas: 0, fichas_actualizadas: 0, jugadoras_sin_match: 0, errores: [] }

  try {
    const [{ data: mapeos }, { data: fichas }, { data: clubes }] = await Promise.all([
      supabase.from('competicion_mapeos').select('*').eq('activo', true),
      supabase.from('fichas').select('id, nombre, primer_apellido, segundo_apellido, club'),
      supabase.from('clubes').select('id, nombre'),
    ])

    console.log(`Competiciones activas: ${mapeos?.length ?? 0}`)
    const jar = new CookieJar()
    await jar.warmUp()

    for (const mapeo of mapeos ?? []) {
      totals.competiciones_procesadas++
      console.log(`\n▶ ${mapeo.categoria} — ${mapeo.competicion_label || mapeo.competicion_id} / ${mapeo.grupo_label || mapeo.grupo_id} (última jornada: ${mapeo.ultima_jornada_procesada})`)

      try {
        const jornadas = await discoverNewCodActas(jar, mapeo, mapeo.ultima_jornada_procesada ?? 0)
        let ultimaJornada = mapeo.ultima_jornada_procesada ?? 0

        for (const { jornada, codActas } of jornadas) {
          console.log(`  Jornada ${jornada}: ${codActas.length} partido(s)`)
          let jornadaOk = true

          for (const codActa of codActas) {
            const { data: already } = await supabase.from('actas_procesadas').select('id').eq('cod_acta', codActa).maybeSingle()
            if (already) { console.log(`    · ${codActa} ya procesada, se salta`); continue }

            const url = `${ACTA_URL}?cod_primaria=1000120&CodActa=${codActa}&cod_acta=${codActa}`
            const html = await jar.getText(url)
            const parsed = parseActa(html)
            if (!parsed.equipoLocal || !parsed.equipoVisitante) {
              totals.errores.push({ codActa, message: 'no se pudo interpretar el acta' })
              console.log(`    · ${codActa}: ⚠️  no se pudo interpretar`)
              jornadaOk = false // no avanzar ultima_jornada_procesada más allá de esta jornada
              continue
            }

            const updates = []
            let sinMatch = 0
            for (const delta of parsed.deltas) {
              const clubId = (clubes ?? []).find((c) => c.nombre === delta.teamName)?.id ?? ''
              const fichaIds = findMatchingFichasByActa(delta.nombreActa, clubId, fichas ?? [], clubes ?? [])
              if (fichaIds.length === 0) { sinMatch++; continue }
              for (const fichaId of fichaIds) {
                updates.push({ ficha_id: fichaId, minutos: delta.minutos, titular: delta.titular, suplente: delta.suplente, goles: delta.goles, amarillas: delta.amarillas, rojas: delta.rojas })
              }
            }

            const { data: rpcResult, error: rpcError } = await supabase.rpc('apply_acta_stats', {
              p_cod_acta: codActa,
              p_competicion_mapeo_id: mapeo.id,
              p_jornada: jornada,
              p_fecha_partido: parsed.fecha,
              p_equipo_local: parsed.equipoLocal,
              p_equipo_visitante: parsed.equipoVisitante,
              p_updates: updates,
            })
            if (rpcError) {
              totals.errores.push({ codActa, message: rpcError.message })
              console.log(`    · ${codActa}: ❌ ${rpcError.message}`)
              jornadaOk = false
              continue
            }
            if (!rpcResult?.already_processed) {
              totals.actas_nuevas++
              totals.fichas_actualizadas += rpcResult?.updated ?? 0
              totals.jugadoras_sin_match += sinMatch
              console.log(`    · ${codActa}: ✅ ${parsed.equipoLocal} vs ${parsed.equipoVisitante} — ${rpcResult?.updated ?? 0} fichas actualizadas, ${sinMatch} sin match`)
            }
          }

          // Solo avanzamos ultima_jornada_procesada si TODAS las actas de esta jornada se
          // procesaron bien — si alguna falló (p.ej. por el límite de peticiones del sitio),
          // paramos aquí para no saltárnosla para siempre en la próxima ejecución.
          if (jornadaOk) {
            ultimaJornada = jornada
          } else {
            console.log(`  ⏸ Jornada ${jornada} incompleta, se reintentará en la próxima ejecución`)
            break
          }
        }

        if (ultimaJornada !== mapeo.ultima_jornada_procesada) {
          await supabase.from('competicion_mapeos').update({ ultima_jornada_procesada: ultimaJornada, actualizado_en: new Date().toISOString() }).eq('id', mapeo.id)
        }
      } catch (err) {
        totals.errores.push({ mapeo: mapeo.id, message: String(err) })
        console.error(`  ❌ Error en competición ${mapeo.id}:`, err)
      }
    }

    jar.cleanup()

    await supabase.from('sync_runs').update({
      finalizado_en: new Date().toISOString(),
      estado: totals.errores.length > 0 && totals.actas_nuevas === 0 ? 'error' : 'completado',
      competiciones_procesadas: totals.competiciones_procesadas,
      actas_nuevas: totals.actas_nuevas,
      fichas_actualizadas: totals.fichas_actualizadas,
      jugadoras_sin_match: totals.jugadoras_sin_match,
      errores: totals.errores,
      resumen: `${totals.actas_nuevas} actas nuevas, ${totals.fichas_actualizadas} fichas actualizadas, ${totals.jugadoras_sin_match} jugadoras sin match`,
    }).eq('id', runRow.id)

    console.log(`\n✅ Listo: ${totals.actas_nuevas} actas nuevas, ${totals.fichas_actualizadas} fichas actualizadas, ${totals.jugadoras_sin_match} jugadoras sin match, ${totals.errores.length} errores\n`)
  } catch (err) {
    await supabase.from('sync_runs').update({
      finalizado_en: new Date().toISOString(),
      estado: 'error',
      errores: [...totals.errores, { message: String(err) }],
    }).eq('id', runRow.id)
    console.error('❌ Error fatal:', err)
    process.exit(1)
  }
}

main()
