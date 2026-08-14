const PARTICLES = new Set(['DE', 'DEL', 'LA', 'LAS', 'LOS', 'VAN', 'VON', 'Y'])

export interface NombreSplit {
  nombre: string
  primerApellido: string
  segundoApellido: string
}

/** Agrupa las partículas ("DE LA", "DEL") con el apellido al que acompañan. */
function tomarApellido(words: string[], hasta: number): { apellido: string; desde: number } {
  let ini = hasta - 1
  while (ini > 0 && PARTICLES.has(words[ini - 1].toUpperCase())) ini--
  return { apellido: words.slice(ini, hasta).join(' '), desde: ini }
}

/** Parte una cadena que son SOLO apellidos: "DE LA TORRE GARCIA" → "DE LA TORRE" + "GARCIA". */
function partirApellidos(texto: string): { primerApellido: string; segundoApellido: string } {
  const words = texto.trim().split(/\s+/).filter(Boolean)
  if (words.length === 0) return { primerApellido: '', segundoApellido: '' }
  if (words.length === 1) return { primerApellido: words[0], segundoApellido: '' }

  const { apellido: segundoApellido, desde } = tomarApellido(words, words.length)
  if (desde === 0) return { primerApellido: segundoApellido, segundoApellido: '' }
  return { primerApellido: words.slice(0, desde).join(' '), segundoApellido }
}

export function splitNombreCompleto(fullName: string): NombreSplit {
  const texto = (fullName ?? '').trim().replace(/\s+/g, ' ')
  if (!texto) return { nombre: '', primerApellido: '', segundoApellido: '' }

  // Las listas de las federaciones vienen como "APELLIDOS, NOMBRE"
  // (p. ej. "ACEBES DIEZ, CARLA"). La coma es la pista de que va al revés.
  if (texto.includes(',')) {
    const [apellidosRaw, ...resto] = texto.split(',')
    const nombre = resto.join(' ').trim()
    const { primerApellido, segundoApellido } = partirApellidos(apellidosRaw)
    // Si detrás de la coma no había nada, se trata como si no la llevara
    if (nombre) return { nombre, primerApellido, segundoApellido }
  }

  // Formato habitual: "NOMBRE APELLIDO1 APELLIDO2"
  const words = texto.split(/\s+/).filter(Boolean)
  if (words.length === 1) return { nombre: words[0], primerApellido: '', segundoApellido: '' }
  if (words.length === 2) return { nombre: words[0], primerApellido: words[1], segundoApellido: '' }

  const { apellido: segundoApellido, desde: trasSegundo } = tomarApellido(words, words.length)
  if (trasSegundo === 0) {
    return { nombre: '', primerApellido: segundoApellido, segundoApellido: '' }
  }
  const { apellido: primerApellido, desde: trasPrimero } = tomarApellido(words, trasSegundo)
  const nombre = words.slice(0, trasPrimero).join(' ') || words[0]

  return { nombre, primerApellido, segundoApellido }
}
