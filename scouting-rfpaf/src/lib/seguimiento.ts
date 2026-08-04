/* Seguimiento de jugadores en Análisis Lab.
 *
 * Una PISTA es un jugador al que se le sigue la pista: se marca dónde está en
 * unos pocos instantes y la app rellena el movimiento intermedio. A esa pista se
 * le puede colgar un aro, un foco o una lupa, y los conectores pueden engancharse
 * a ella para que la línea entre jugadores se mueva con ellos.
 *
 * Aquí vive lo que necesitan por igual el lienzo (SVG) y la grabación (canvas):
 * el modelo, la interpolación y el pintado sobre canvas.
 */

export interface MarcaPista {
  t: number   // segundo del vídeo
  x: number   // posición en el lienzo
  y: number
}

export type ModoPista = 'aro' | 'foco' | 'lupa'

export interface Pista {
  id: string
  nombre: string
  color: string
  modo: ModoPista
  radio: number    // radio del aro/foco/lupa en píxeles del lienzo
  zoom: number     // aumento (solo en modo lupa)
  marcas: MarcaPista[]   // siempre ordenadas por t
}

export interface Pt { x: number; y: number }

/** Inserta una marca manteniendo el orden; si ya hay una casi en ese instante, la sustituye. */
export function ponerMarca(marcas: MarcaPista[], m: MarcaPista, tolerancia = 0.12): MarcaPista[] {
  const resto = marcas.filter(k => Math.abs(k.t - m.t) > tolerancia)
  return [...resto, m].sort((a, b) => a.t - b.t)
}

/** ¿La pista tiene recorrido en este instante? Fuera de sus marcas no se dibuja. */
export function pistaVivaEn(p: Pista, t: number, margen = 0.15): boolean {
  if (p.marcas.length === 0) return false
  if (p.marcas.length === 1) return Math.abs(t - p.marcas[0].t) <= 1.5
  return t >= p.marcas[0].t - margen && t <= p.marcas[p.marcas.length - 1].t + margen
}

/** Dónde está el jugador en el instante t, interpolando entre las marcas vecinas. */
export function posEnPista(p: Pista, t: number): Pt | null {
  const m = p.marcas
  if (m.length === 0) return null
  if (m.length === 1) return { x: m[0].x, y: m[0].y }
  if (t <= m[0].t) return { x: m[0].x, y: m[0].y }
  const ult = m[m.length - 1]
  if (t >= ult.t) return { x: ult.x, y: ult.y }

  for (let i = 0; i < m.length - 1; i++) {
    const a = m[i], b = m[i + 1]
    if (t >= a.t && t <= b.t) {
      const span = b.t - a.t
      const k = span > 0 ? (t - a.t) / span : 0
      return { x: a.x + (b.x - a.x) * k, y: a.y + (b.y - a.y) * k }
    }
  }
  return { x: ult.x, y: ult.y }
}

/** Pista cuyo punto en el instante t cae más cerca de pt (para enganchar conectores). */
export function pistaCercana(pistas: Pista[], pt: Pt, t: number, radio = 34): Pista | null {
  let mejor: Pista | null = null
  let mejorDist = radio
  for (const p of pistas) {
    if (!pistaVivaEn(p, t)) continue
    const q = posEnPista(p, t)
    if (!q) continue
    const d = Math.hypot(q.x - pt.x, q.y - pt.y)
    if (d < mejorDist) { mejorDist = d; mejor = p }
  }
  return mejor
}

/* ─── Pintado sobre canvas (para el vídeo grabado) ─────────────────────────── */

export interface ConectorResuelto {
  puntos: Pt[]
  color: string
  grosor: number
  radio: number      // radio de la elipse de cada extremo
  achatado: number   // 0..1, perspectiva de la elipse
  giro: number       // grados
}

export interface FondoLupa {
  fuente: CanvasImageSource
  anchoNatural: number
  altoNatural: number
}

/** Rectángulo donde cae el vídeo dentro del lienzo (equivale a object-contain). */
function encaje(W: number, H: number, vw: number, vh: number) {
  const sc = Math.min(W / vw, H / vh)
  const dw = vw * sc, dh = vh * sc
  return { dx: (W - dw) / 2, dy: (H - dh) / 2, dw, dh }
}

/**
 * Pinta las pistas y los conectores enganchados sobre el canvas de grabación.
 * `capa` es un canvas auxiliar reutilizable para el oscurecido del foco: sin él
 * habría que crear uno en cada fotograma.
 */
export function pintarSeguimiento(opts: {
  ctx: CanvasRenderingContext2D
  W: number
  H: number
  t: number
  pistas: Pista[]
  conectores?: ConectorResuelto[]
  fondo?: FondoLupa | null
  capa?: HTMLCanvasElement | null
}) {
  const { ctx, W, H, t, pistas, conectores = [], fondo, capa } = opts
  const vivas = pistas.filter(p => pistaVivaEn(p, t))

  // 1) Conectores por debajo, para que los aros queden encima de la línea
  for (const c of conectores) {
    if (c.puntos.length < 2) continue
    ctx.save()
    ctx.strokeStyle = c.color
    ctx.lineWidth = c.grosor
    ctx.lineJoin = 'round'
    ctx.lineCap = 'round'
    ctx.beginPath()
    ctx.moveTo(c.puntos[0].x, c.puntos[0].y)
    for (let i = 1; i < c.puntos.length; i++) ctx.lineTo(c.puntos[i].x, c.puntos[i].y)
    ctx.stroke()
    for (const p of c.puntos) {
      ctx.beginPath()
      ctx.ellipse(p.x, p.y, c.radio, Math.max(c.radio * c.achatado, 1), (c.giro * Math.PI) / 180, 0, Math.PI * 2)
      ctx.fillStyle = c.color
      ctx.fill()
      ctx.strokeStyle = '#ffffff'
      ctx.lineWidth = Math.max(c.grosor * 0.4, 1)
      ctx.stroke()
    }
    ctx.restore()
  }

  // 2) Focos: una sola capa oscura con un agujero de luz por cada foco
  const focos = vivas.filter(p => p.modo === 'foco')
  if (focos.length && capa) {
    capa.width = W; capa.height = H
    const cctx = capa.getContext('2d')
    if (cctx) {
      cctx.clearRect(0, 0, W, H)
      cctx.fillStyle = 'rgba(0,0,0,0.68)'
      cctx.fillRect(0, 0, W, H)
      cctx.globalCompositeOperation = 'destination-out'
      for (const p of focos) {
        const q = posEnPista(p, t)
        if (!q) continue
        const r = p.radio * 1.1
        const g = cctx.createRadialGradient(q.x, q.y, r * 0.6, q.x, q.y, r)
        g.addColorStop(0, 'rgba(0,0,0,1)')
        g.addColorStop(1, 'rgba(0,0,0,0)')
        cctx.fillStyle = g
        cctx.beginPath()
        cctx.arc(q.x, q.y, r, 0, Math.PI * 2)
        cctx.fill()
      }
      cctx.globalCompositeOperation = 'source-over'
      ctx.drawImage(capa, 0, 0)
    }
  }

  // 3) Lupas: recortan un círculo y repintan dentro el fondo ampliado
  if (fondo) {
    const { dx, dy, dw, dh } = encaje(W, H, fondo.anchoNatural, fondo.altoNatural)
    for (const p of vivas.filter(k => k.modo === 'lupa')) {
      const q = posEnPista(p, t)
      if (!q) continue
      ctx.save()
      ctx.beginPath()
      ctx.arc(q.x, q.y, p.radio, 0, Math.PI * 2)
      ctx.clip()
      ctx.translate(q.x, q.y)
      ctx.scale(p.zoom, p.zoom)
      ctx.translate(-q.x, -q.y)
      ctx.drawImage(fondo.fuente, dx, dy, dw, dh)
      ctx.restore()
    }
  }

  // 4) Aros, y el contorno de focos y lupas
  for (const p of vivas) {
    const q = posEnPista(p, t)
    if (!q) continue
    ctx.save()
    if (p.modo === 'foco') {
      ctx.strokeStyle = p.color
      ctx.globalAlpha = 0.16
      ctx.lineWidth = 10
      ctx.beginPath(); ctx.arc(q.x, q.y, p.radio * 1.12, 0, Math.PI * 2); ctx.stroke()
      ctx.globalAlpha = 0.9
      ctx.lineWidth = 3
      ctx.beginPath(); ctx.arc(q.x, q.y, p.radio, 0, Math.PI * 2); ctx.stroke()
    } else if (p.modo === 'lupa') {
      ctx.strokeStyle = p.color
      ctx.lineWidth = 3.5
      ctx.beginPath(); ctx.arc(q.x, q.y, p.radio, 0, Math.PI * 2); ctx.stroke()
      ctx.strokeStyle = 'rgba(0,0,0,0.25)'
      ctx.lineWidth = 2
      ctx.beginPath(); ctx.arc(q.x, q.y, p.radio * 1.06, 0, Math.PI * 2); ctx.stroke()
    } else {
      // Aro: elipse achatada a ras de suelo, como el conector
      const ry = Math.max(p.radio * 0.42, 3)
      ctx.strokeStyle = p.color
      ctx.lineWidth = 3.5
      ctx.beginPath()
      ctx.ellipse(q.x, q.y, p.radio, ry, 0, 0, Math.PI * 2)
      ctx.stroke()
      ctx.globalAlpha = 0.2
      ctx.fillStyle = p.color
      ctx.fill()
    }
    ctx.restore()
  }
}
