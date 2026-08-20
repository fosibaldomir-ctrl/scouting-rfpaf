import { createJSONStorage } from 'zustand/middleware'

/* El navegador reserva unos pocos megas por sitio web. Cuando se llenan,
 * localStorage.setItem lanza una excepción de forma síncrona, dentro del set()
 * de zustand: la llamada que estaba en curso se corta a la mitad y con ella
 * todo lo que viniera detrás, sin que nadie se entere. Ya nos pasó una vez con
 * las fotos de las fichas y dejó la aplicación en blanco.
 *
 * Aquí el guardado nunca interrumpe a nadie: si no cabe, se avisa por consola y
 * la aplicación sigue con los datos en memoria, que es de donde tira la pantalla. */

let yaAvisado = false

export const almacenamientoSeguro = createJSONStorage(() => ({
  getItem: (nombre: string) => localStorage.getItem(nombre),
  removeItem: (nombre: string) => localStorage.removeItem(nombre),
  setItem: (nombre: string, valor: string) => {
    try {
      localStorage.setItem(nombre, valor)
    } catch (err) {
      if (!yaAvisado) {
        yaAvisado = true
        console.warn(
          `No cabe «${nombre}» en el almacenamiento del navegador (${Math.round(valor.length / 1024)} kB). ` +
          'La aplicación sigue funcionando: los datos se piden al servidor en cada arranque.',
          err,
        )
      }
    }
  },
}))
