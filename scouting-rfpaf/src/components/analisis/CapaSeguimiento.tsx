import { useEffect, useRef } from 'react'
import {
  pintarSeguimiento, posEnPista,
  type ConectorResuelto, type FondoLupa, type Pista,
} from '../../lib/seguimiento'

/** Conector cuyos extremos pueden estar enganchados a una pista. */
export interface ConectorAnclado {
  id: string
  color: string
  grosor: number
  radio: number
  achatado: number
  giro: number
  nodos: { pistaId: string | null; x: number; y: number }[]
}

interface Props {
  pistas: Pista[]
  conectores: ConectorAnclado[]
  /** Segundo del vídeo en este instante (se consulta en cada fotograma). */
  obtenerTiempo: () => number
  /** Imagen que amplía la lupa: el propio vídeo mientras corre, o el fotograma parado. */
  obtenerFondo: () => FondoLupa | null
}

/**
 * Capa de seguimiento del lienzo. Va sobre un canvas —no sobre el SVG— para
 * pintar con el mismo código que la grabación: así lo que ves es exactamente lo
 * que se graba, y la lupa puede ampliar el vídeo aunque esté en marcha.
 */
export default function CapaSeguimiento({ pistas, conectores, obtenerTiempo, obtenerFondo }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const capaRef = useRef<HTMLCanvasElement | null>(null)

  // Los datos se leen desde el bucle de pintado, que vive fuera del ciclo de React
  const datos = useRef({ pistas, conectores, obtenerTiempo, obtenerFondo })
  datos.current = { pistas, conectores, obtenerTiempo, obtenerFondo }

  // Sin nada que seguir no se pinta: en móvil un bucle en marcha se come la batería
  const hayQuePintar = pistas.length > 0 || conectores.length > 0

  useEffect(() => {
    if (!hayQuePintar) {
      const cv = canvasRef.current
      const ctx = cv?.getContext('2d')
      if (cv && ctx) ctx.clearRect(0, 0, cv.width, cv.height)
      return
    }
    if (!capaRef.current) capaRef.current = document.createElement('canvas')
    let raf = 0

    const pintar = () => {
      raf = requestAnimationFrame(pintar)
      const cv = canvasRef.current
      if (!cv) return
      const W = cv.clientWidth, H = cv.clientHeight
      if (W === 0 || H === 0) return
      if (cv.width !== W || cv.height !== H) { cv.width = W; cv.height = H }
      const ctx = cv.getContext('2d')
      if (!ctx) return
      ctx.clearRect(0, 0, W, H)

      const { pistas, conectores, obtenerTiempo, obtenerFondo } = datos.current
      const t = obtenerTiempo()
      const resueltos: ConectorResuelto[] = conectores.map(c => ({
        color: c.color,
        grosor: c.grosor,
        radio: c.radio,
        achatado: c.achatado,
        giro: c.giro,
        puntos: c.nodos.map(n => {
          if (!n.pistaId) return { x: n.x, y: n.y }
          const p = pistas.find(k => k.id === n.pistaId)
          return (p && posEnPista(p, t)) || { x: n.x, y: n.y }
        }),
      }))

      pintarSeguimiento({
        ctx, W, H, t,
        pistas,
        conectores: resueltos,
        fondo: obtenerFondo(),
        capa: capaRef.current,
      })
    }

    raf = requestAnimationFrame(pintar)
    return () => cancelAnimationFrame(raf)
  }, [hayQuePintar])

  return (
    <canvas
      ref={canvasRef}
      className="absolute inset-0 w-full h-full z-[5] pointer-events-none"
    />
  )
}
