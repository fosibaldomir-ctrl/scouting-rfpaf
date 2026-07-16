import { supabase } from '../lib/supabase'
import type { FichaJugadora, Club, Observador, CategoriaItem, PartidoCalendario, Convocatoria } from '../types'

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
      minutosJugados: f.minutos_jugados ?? 0,
      partidosTitular: f.partidos_titular ?? 0,
      partidosSuplente: f.partidos_suplente ?? 0,
      goles: f.goles ?? 0,
      tarjetasAmarillas: f.tarjetas_amarillas ?? 0,
      tarjetasRojas: f.tarjetas_rojas ?? 0,
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
        minutos_jugados: ficha.minutosJugados || 0,
        partidos_titular: ficha.partidosTitular || 0,
        partidos_suplente: ficha.partidosSuplente || 0,
        goles: ficha.goles || 0,
        tarjetas_amarillas: ficha.tarjetasAmarillas || 0,
        tarjetas_rojas: ficha.tarjetasRojas || 0,
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
    try {
      console.log('📝 Actualizando ficha en Supabase...', id)

      const data: any = {}
      if (ficha.fechaPartido !== undefined) data.fecha_partido = ficha.fechaPartido
      if (ficha.equipo !== undefined) data.equipo = ficha.equipo
      if (ficha.categoria !== undefined) data.categoria = ficha.categoria
      if (ficha.local !== undefined) data.local = ficha.local
      if (ficha.visitante !== undefined) data.visitante = ficha.visitante
      if (ficha.observador !== undefined) data.observador = ficha.observador
      if (ficha.nombre !== undefined) data.nombre = ficha.nombre
      if (ficha.primerApellido !== undefined) data.primer_apellido = ficha.primerApellido
      if (ficha.segundoApellido !== undefined) data.segundo_apellido = ficha.segundoApellido
      if (ficha.fechaNacimiento !== undefined) data.fecha_nacimiento = ficha.fechaNacimiento
      if (ficha.dorsal !== undefined) data.dorsal = ficha.dorsal
      if (ficha.lateralidad !== undefined) data.lateralidad = ficha.lateralidad
      if (ficha.tipologia !== undefined) data.tipologia = ficha.tipologia
      if (ficha.altura !== undefined) data.altura = ficha.altura
      if (ficha.club !== undefined) data.club = ficha.club
      if (ficha.foto !== undefined) data.foto = ficha.foto
      if (ficha.fuerza !== undefined) data.fuerza = ficha.fuerza
      if (ficha.velocidad !== undefined) data.velocidad = ficha.velocidad
      if (ficha.resistencia !== undefined) data.resistencia = ficha.resistencia
      if (ficha.minutosJugados !== undefined) data.minutos_jugados = ficha.minutosJugados
      if (ficha.partidosTitular !== undefined) data.partidos_titular = ficha.partidosTitular
      if (ficha.partidosSuplente !== undefined) data.partidos_suplente = ficha.partidosSuplente
      if (ficha.goles !== undefined) data.goles = ficha.goles
      if (ficha.tarjetasAmarillas !== undefined) data.tarjetas_amarillas = ficha.tarjetasAmarillas
      if (ficha.tarjetasRojas !== undefined) data.tarjetas_rojas = ficha.tarjetasRojas
      if (ficha.demarcacion !== undefined) data.demarcacion = ficha.demarcacion
      if (ficha.otraDemarcacion !== undefined) data.otra_demarcacion = ficha.otraDemarcacion
      if (ficha.evaluacionTecnica !== undefined) data.evaluacion_tecnica = ficha.evaluacionTecnica
      if (ficha.valoracionGeneral !== undefined) data.valoracion_general = ficha.valoracionGeneral
      if (ficha.propuesta !== undefined) data.propuesta = ficha.propuesta
      if (ficha.descripcionJugadora !== undefined) data.descripcion_jugadora = ficha.descripcionJugadora
      if (ficha.observaciones !== undefined) data.observaciones = ficha.observaciones
      if (ficha.cierre !== undefined) data.cierre = ficha.cierre
      data.actualizado_en = new Date().toISOString()

      console.log('📤 Datos a actualizar:', data)

      const { error } = await supabase
        .from('fichas')
        .update(data)
        .eq('id', id)

      if (error) {
        console.error('❌ Error al actualizar ficha:', error.message)
        console.error('Detalles:', error)
        return false
      }

      console.log('✅ Ficha actualizada exitosamente')
      return true
    } catch (err) {
      console.error('❌ Exception al actualizar ficha:', err)
      return false
    }
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
      foto: o.foto,
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

  async updateObservador(id: string, obs: Partial<Observador>): Promise<boolean> {
    const { error } = await supabase.from('observadores').update(obs).eq('id', id)
    if (error) {
      console.error('Error al actualizar observador:', error)
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

  async getPartidos(): Promise<PartidoCalendario[]> {
    try {
      const { data, error } = await supabase
        .from('calendario_partidos')
        .select('*')
        .order('fecha', { ascending: true })

      if (error) {
        console.error('❌ Error al cargar partidos:', error.message, error.code)
        return []
      }

      console.log('✅ Partidos cargados:', data?.length ?? 0)
      return (data || []).map((p: any) => ({
        id: p.id,
        fecha: p.fecha,
        hora: p.hora,
        local: p.local,
        visitante: p.visitante,
        observador: p.observador,
        categoria: p.categoria,
      }))
    } catch (err) {
      console.error('⚠️ Excepción al cargar partidos:', err)
      return []
    }
  },

  async addPartido(partido: PartidoCalendario): Promise<boolean> {
    const { error } = await supabase.from('calendario_partidos').insert([{
      id: partido.id,
      fecha: partido.fecha,
      hora: partido.hora,
      local: partido.local,
      visitante: partido.visitante,
      observador: partido.observador,
      categoria: partido.categoria,
    }])

    if (error) {
      console.error('Error al guardar partido:', error)
      return false
    }
    return true
  },

  async deletePartido(id: string): Promise<boolean> {
    const { error } = await supabase.from('calendario_partidos').delete().eq('id', id)
    if (error) {
      console.error('Error al eliminar partido:', error)
      return false
    }
    return true
  },

  async getConvocatorias(): Promise<Convocatoria[]> {
    const { data, error } = await supabase
      .from('convocatorias')
      .select('*')
      .order('creado_en', { ascending: false })
    if (error) {
      console.error('Error al cargar convocatorias:', error)
      return []
    }
    return (data || []).map((c: any) => ({
      id: c.id,
      nombre: c.nombre,
      fecha: c.fecha,
      hora: c.hora,
      jugadoras: c.jugadoras ?? [],
      pdfUrl: c.pdf_url ?? null,
      creadoEn: c.creado_en,
    }))
  },

  async addConvocatoria(c: Convocatoria): Promise<boolean> {
    const { error } = await supabase.from('convocatorias').insert([{
      id: c.id,
      nombre: c.nombre,
      fecha: c.fecha,
      hora: c.hora,
      jugadoras: c.jugadoras,
      pdf_url: c.pdfUrl ?? null,
      creado_en: c.creadoEn,
    }])
    if (error) {
      console.error('Error al guardar convocatoria:', error)
      return false
    }
    return true
  },

  async updateConvocatoria(id: string, data: Partial<Convocatoria>): Promise<boolean> {
    const payload: Record<string, unknown> = {}
    if (data.nombre !== undefined) payload.nombre = data.nombre
    if (data.fecha !== undefined) payload.fecha = data.fecha
    if (data.hora !== undefined) payload.hora = data.hora
    if (data.jugadoras !== undefined) payload.jugadoras = data.jugadoras
    if (data.pdfUrl !== undefined) payload.pdf_url = data.pdfUrl
    const { error } = await supabase.from('convocatorias').update(payload).eq('id', id)
    if (error) {
      console.error('Error al actualizar convocatoria:', error)
      return false
    }
    return true
  },

  async deleteConvocatoria(id: string): Promise<boolean> {
    const { error } = await supabase.from('convocatorias').delete().eq('id', id)
    if (error) {
      console.error('Error al eliminar convocatoria:', error)
      return false
    }
    return true
  },

  async uploadConvocatoriaPDF(convocatoriaId: string, blob: Blob): Promise<string | null> {
    const filename = `convocatoria-${convocatoriaId}-${Date.now()}.pdf`
    const { error } = await supabase.storage
      .from('convocatorias-pdfs')
      .upload(filename, blob, { contentType: 'application/pdf', upsert: true })
    if (error) {
      console.error('Error al subir PDF a Storage:', error)
      return null
    }
    const { data } = supabase.storage.from('convocatorias-pdfs').getPublicUrl(filename)
    return data.publicUrl
  },
}
