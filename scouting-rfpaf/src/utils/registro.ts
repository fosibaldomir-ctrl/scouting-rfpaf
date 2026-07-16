export function genRegistro(observador: string, fichasCount: number): string {
  const year = new Date().getFullYear()
  const num = String(fichasCount + 1).padStart(4, '0')
  return `${observador.substring(0, 3).toUpperCase()}-${year}-${num}`
}
