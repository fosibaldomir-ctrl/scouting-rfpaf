import type { Demarcacion } from '../types'
import { normalizeText } from './textNormalize'

export const DEMARCACION_SYNONYMS: Record<Demarcacion, string[]> = {
  PORTERO: ['portero', 'portera', 'guardameta', 'arquera', 'arquero', 'gk'],
  LATERAL: ['lateral', 'lateral derecho', 'lateral izquierdo', 'defensa lateral', 'carrilero'],
  CENTRAL: ['central', 'defensa central', 'centrala', 'zaguera', 'zaguero'],
  'MEDIO CENTRO DEF.': ['mediocentro defensivo', 'medio centro defensivo', 'pivote', 'mcd', 'ancla'],
  'MEDIO CENTRO OF.': ['mediocentro ofensivo', 'medio centro ofensivo', 'mco'],
  INTERIOR: ['interior', 'interior derecho', 'interior izquierdo', 'mediocentro', 'medio centro', 'centrocampista'],
  'MEDIA PUNTA': ['media punta', 'mediapunta', 'enganche', 'mp'],
  EXTERIOR: ['exterior', 'extremo', 'extremo derecho', 'extremo izquierdo', 'banda', 'ala'],
  DELANTERO: ['delantero', 'delantera', 'punta', 'ariete', 'atacante', 'goleadora', 'goleador', '9'],
}

export function matchDemarcacion(text: string): Demarcacion | null {
  if (!text) return null
  const q = normalizeText(text)

  const literals = Object.keys(DEMARCACION_SYNONYMS) as Demarcacion[]
  for (const lit of literals) {
    if (normalizeText(lit) === q) return lit
  }

  for (const lit of literals) {
    const aliases = DEMARCACION_SYNONYMS[lit]
    if (aliases.some((alias) => normalizeText(alias) === q)) return lit
  }

  return null
}
