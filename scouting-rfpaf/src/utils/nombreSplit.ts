const PARTICLES = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'VAN', 'VON', 'Y'])

export interface NombreSplit {
  nombre: string
  primerApellido: string
  segundoApellido: string
}

export function splitNombreCompleto(fullName: string): NombreSplit {
  const words = fullName.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return { nombre: '', primerApellido: '', segundoApellido: '' }
  if (words.length === 1) return { nombre: words[0], primerApellido: '', segundoApellido: '' }
  if (words.length === 2) return { nombre: words[0], primerApellido: words[1], segundoApellido: '' }

  // Walk backwards, grouping trailing particle words ("DE LA", "DEL") onto the
  // surname that follows them, so "MARIA JOSE DE LA TORRE" splits sensibly.
  const takeSurname = (upToExclusive: number): { surname: string; nextIdx: number } => {
    let end = upToExclusive - 1
    while (end > 0 && PARTICLES.has(words[end - 1].toUpperCase())) end--
    return { surname: words.slice(end, upToExclusive).join(' '), nextIdx: end }
  }

  const { surname: segundoApellido, nextIdx: afterSegundo } = takeSurname(words.length)
  if (afterSegundo === 0) {
    return { nombre: '', primerApellido: segundoApellido, segundoApellido: '' }
  }
  const { surname: primerApellido, nextIdx: afterPrimero } = takeSurname(afterSegundo)
  const nombre = words.slice(0, afterPrimero).join(' ') || words[0]

  return { nombre, primerApellido, segundoApellido }
}
