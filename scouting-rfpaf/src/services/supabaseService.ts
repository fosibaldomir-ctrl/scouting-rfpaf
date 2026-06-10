import { supabase } from '../lib/supabase'
import type { FichaJugadora, Club, Observador, CategoriaItem } from '../types'

export const supabaseService = {
  async getFichas(): Promise<FichaJugadora[]> {
    const { data, error } = await supabase
      .from('fichas')
      .select('*')
      .order('creado_en', { ascending: false })

    if (error) {
      console.error('Error al cargar fichas:', error)
      return []
    }

    return (data || []).map((f: any) => ({
      id: f.id,
      registro: f.registro,
      fechaPartido: f.fecha_partido,
      equipo: f.equipo,
      categoria: f.categoria,
      local: f.local,
      visitante: f.visitante,
      observador: f.observador,
      nombre: f.nombre,
      primerApellido: f.primer_apellido,
      segundoApellido: f.segundo_apellido,
      fechaNacimiento: f.fecha_nacimiento,
      dorsal: f.dorsal,
      lateralidad: f.lateralidad,
      tipologia: f.tipologia,
      altura: f.altura,
      club: f.club,
      foto: f.foto,
      fuerza: f.fuerza,
      velocidad: f.velocidad,
      resistencia: f.resistencia,
      demarcacion: f.demarcacion,
      otraDemarcacion: f.otra_demarcacion,
      evaluacionTecnica: f.evaluacion_tecnica,
      valoracionGeneral: f.valoracion_general,
      propuesta: f.propuesta,
      descripcionJugadora: f.descripcion_jugadora,
      observaciones: f.observaciones,
      cierre: f.cierre,
      creadoEn: f.creado_en,
      actualizadoEn: f.actualizado_en,
    }))
  },

  async addFicha(ficha: FichaJugadora): Promise<boolean> {
    try {
      console.log('📝 Guardando ficha en Supabase...', ficha.id)

      const data = {
        id: ficha.id,
        registro: ficha.registro,
        fecha_partido: ficha.fechaPartido,
        equipo: ficha.equipo,
        categoria: ficha.categoria,
        local: ficha.local,
        visitante: ficha.visitante,
        observador: ficha.observador,
        nombre: ficha.nombre,
        primer_apellido: ficha.primerApellido,
        segundo_apellido: ficha.segundoApellido || null,
        fecha_nacimiento: ficha.fechaNacimiento,
        dorsal: ficha.dorsal || null,
        lateralidad: ficha.lateralidad,
        tipologia: ficha.tipologia,
        altura: ficha.altura,
        club: ficha.club,
        foto: ficha.foto || null,
        fuerza: ficha.fuerza || 0,
        velocidad: ficha.velocidad || 0,
        resistencia: ficha.resistencia || 0,
        demarcacion: ficha.demarcacion,
        otra_demarcacion: ficha.otraDemarcacion || null,
        evaluacion_tecnica: ficha.evaluacionTecnica,
        valoracion_general: ficha.valoracionGeneral || 0,
        propuesta: ficha.propuesta,
        descripcion_jugadora: ficha.descripcionJugadora || null,
        observaciones: ficha.observaciones || null,
        cierre: ficha.cierre || null,
        creado_en: ficha.creadoEn,
        actualizado_en: ficha.actualizadoEn,
      }

      console.log('📤 Datos a enviar:', data)

      const { error } = await supabase.from('fichas').insert([data])

      if (error) {
        console.error('❌ Error al guardar ficha:', error.message)
        console.error('Detalles:', error)
        return false
      }

      console.log('✅ Ficha guardada exitosamente')
      return true
    } catch (error) {
      console.error('❌ Exception al guardar ficha:', error)
      return false
    }
  },

  async updateFicha(id: string, ficha: Partial<FichaJugadora>): Promise<boolean> {
    const data: any = {}
    if (ficha.fechaPartido) data.fecha_partido = ficha.fechaPartido
    if (ficha.equipo) data.equipo = ficha.equipo
    if (ficha.categoria) data.categoria = ficha.categoria
    if (ficha.local) data.local = ficha.local
    if (ficha.visitante) data.visitante = ficha.visitante
    if (ficha.nombre) data.nombre = ficha.nombre
    if (ficha.primerApellido) data.primer_apellido = ficha.primerApellido
    if (ficha.segundoApellido) data.segundo_apellido = ficha.segundoApellido
    if (ficha.foto !== undefined) data.foto = ficha.foto
    if (ficha.fuerza !== undefined) data.fuerza = ficha.fuerza
    if (ficha.velocidad !== undefined) data.velocidad = ficha.velocidad
    if (ficha.resistencia !== undefined) data.resistencia = ficha.resistencia
    if (ficha.evaluacionTecnica) data.evaluacion_tecnica = ficha.evaluacionTecnica
    if (ficha.valoracionGeneral !== undefined) data.valoracion_general = ficha.valoracionGeneral
    if (ficha.propuesta) data.propuesta = ficha.propuesta
    if (ficha.descripcionJugadora) data.descripcion_jugadora = ficha.descripcionJugadora
    if (ficha.observaciones) data.observaciones = ficha.observaciones
    if (ficha.cierre) data.cierre = ficha.cierre
    data.actualizado_en = new Date().toISOString()

    const { error } = await supabase
      .from('fichas')
      .update(data)
      .eq('id', id)

    if (error) {
      console.error('Error al actualizar ficha:', error)
      return false
    }
    return true
  },

  async deleteFicha(id: string): Promise<boolean> {
    const { error } = await supabase.from('fichas').delete().eq('id', id)
    if (error) {
      console.error('Error al eliminar ficha:', error)
      return false
    }
    return true
  },

  async getClubes(): Promise<Club[]> {
    const { data, error } = await supabase.from('clubes').select('*').order('nombre')
    if (error) {
      console.error('Error al cargar clubes:', error)
      return []
    }
    return (data || []).map((c: any) => ({
      id: c.id,
      nombre: c.nombre,
      escudo: c.escudo,
    }))
  },

  async addClub(club: Club): Promise<boolean> {
    const { error } = await supabase.from('clubes').insert([club])
    if (error) {
      console.error('Error al agregar club:', error)
      return false
    }
    return true
  },

  async updateClub(id: string, club: Partial<Club>): Promise<boolean> {
    const { error } = await supabase.from('clubes').update(club).eq('id', id)
    if (error) {
      console.error('Error al actualizar club:', error)
      return false
    }
    return true
  },

  async deleteClub(id: string): Promise<boolean> {
    const { error } = await supabase.from('clubes').delete().eq('id', id)
    if (error) {
      console.error('Error al eliminar club:', error)
      return false
    }
    return true
  },

  async getObservadores(): Promise<Observador[]> {
    const { data, error } = await supabase.from('observadores').select('*').order('nombre')
    if (error) {
      console.error('Error al cargar observadores:', error)
      return []
    }
    return (data || []).map((o: any) => ({
      id: o.id,
      nombre: o.nombre,
    }))
  },

  async addObservador(obs: Observador): Promise<boolean> {
    const { error } = await supabase.from('observadores').insert([obs])
    if (error) {
      console.error('Error al agregar observador:', error)
      return false
    }
    return true
  },

  async deleteObservador(id: string): Promise<boolean> {
    const { error } = await supabase.from('observadores').delete().eq('id', id)
    if (error) {
      console.error('Error al eliminar observador:', error)
      return false
    }
    return true
  },

  async getCategorias(): Promise<CategoriaItem[]> {
    const { data, error } = await supabase.from('categorias').select('*').order('nombre')
    if (error) {
      console.error('Error al cargar categorías:', error)
      return []
    }
    return (data || []).map((c: any) => ({
      id: c.id,
      nombre: c.nombre,
    }))
  },

  async addCategoria(cat: CategoriaItem): Promise<boolean> {
    const { error } = await supabase.from('categorias').insert([cat])
    if (error) {
      console.error('Error al agregar categoría:', error)
      return false
    }
    return true
  },

  async deleteCategoria(id: string): Promise<boolean> {
    const { error } = await supabase.from('categorias').delete().eq('id', id)
    if (error) {
      console.error('Error al eliminar categoría:', error)
      return false
    }
    return true
  },
}
