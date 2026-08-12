// Gestión de usuarios: alta, edición, contraseña y baja.
// Usa la service_role key (solo existe aquí, en el servidor) y exige que
// quien llama sea un administrador activo.
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.45.4'

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
}

const ROLES = ['admin', 'scout', 'direccion', 'fisio']

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...CORS, 'Content-Type': 'application/json' },
  })
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS })

  const admin = createClient(
    Deno.env.get('SUPABASE_URL')!,
    Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    { auth: { persistSession: false, autoRefreshToken: false } },
  )

  // 1. ¿Quién llama?
  const jwt = (req.headers.get('Authorization') ?? '').replace(/^Bearer\s+/i, '')
  if (!jwt) return json({ error: 'No autenticado' }, 401)

  const { data: authData, error: authError } = await admin.auth.getUser(jwt)
  if (authError || !authData.user) return json({ error: 'No autenticado' }, 401)

  const { data: perfil } = await admin
    .from('profiles')
    .select('rol, activo')
    .eq('id', authData.user.id)
    .maybeSingle()

  if (!perfil || perfil.rol !== 'admin' || perfil.activo === false) {
    return json({ error: 'No autorizado' }, 403)
  }

  // 2. ¿Qué pide?
  let body: Record<string, any>
  try {
    body = await req.json()
  } catch {
    return json({ error: 'Petición inválida' }, 400)
  }
  const accion = String(body.accion ?? '')

  try {
    switch (accion) {
      case 'listar': {
        const { data, error } = await admin
          .from('profiles')
          .select('*')
          .order('nombre', { ascending: true })
        if (error) throw error
        return json({ usuarios: data })
      }

      case 'crear': {
        const email = String(body.email ?? '').trim().toLowerCase()
        const password = String(body.password ?? '')
        const nombre = String(body.nombre ?? '').trim()
        const rol = String(body.rol ?? '')
        const observadorId = body.observadorId ? String(body.observadorId) : null

        if (!email.includes('@')) return json({ error: 'Correo no válido' }, 400)
        if (password.length < 8) return json({ error: 'La contraseña debe tener al menos 8 caracteres' }, 400)
        if (!nombre) return json({ error: 'El nombre es obligatorio' }, 400)
        if (!ROLES.includes(rol)) return json({ error: 'Perfil no válido' }, 400)

        const { data: creado, error: eCrear } = await admin.auth.admin.createUser({
          email,
          password,
          email_confirm: true,
          app_metadata: { rol },
          user_metadata: { nombre, observador_id: observadorId },
        })
        if (eCrear) return json({ error: eCrear.message }, 400)

        const { error: ePerfil } = await admin.from('profiles').insert({
          id: creado.user.id,
          nombre,
          email,
          rol,
          observador_id: observadorId,
          activo: true,
        })
        if (ePerfil) {
          // No dejamos usuarios de auth huérfanos sin perfil
          await admin.auth.admin.deleteUser(creado.user.id)
          return json({ error: ePerfil.message }, 400)
        }
        return json({ ok: true, id: creado.user.id })
      }

      case 'actualizar': {
        const id = String(body.id ?? '')
        if (!id) return json({ error: 'Falta el usuario' }, 400)

        const patch: Record<string, unknown> = {}
        if (body.nombre !== undefined) patch.nombre = String(body.nombre).trim()
        if (body.observadorId !== undefined) patch.observador_id = body.observadorId || null
        if (body.activo !== undefined) patch.activo = !!body.activo
        if (body.rol !== undefined) {
          if (!ROLES.includes(String(body.rol))) return json({ error: 'Perfil no válido' }, 400)
          patch.rol = String(body.rol)
        }

        // Un administrador no puede quitarse a sí mismo el acceso
        if (id === authData.user.id && (patch.activo === false || (patch.rol && patch.rol !== 'admin'))) {
          return json({ error: 'No puedes retirarte a ti mismo el acceso de administrador' }, 400)
        }

        if (Object.keys(patch).length > 0) {
          const { error } = await admin.from('profiles').update(patch).eq('id', id)
          if (error) throw error
        }

        // El rol vive también en app_metadata: es el que leen las políticas RLS
        const authPatch: Record<string, unknown> = {}
        if (patch.rol) authPatch.app_metadata = { rol: patch.rol }
        if (body.activo !== undefined) authPatch.ban_duration = body.activo ? 'none' : '876000h'
        if (Object.keys(authPatch).length > 0) {
          const { error } = await admin.auth.admin.updateUserById(id, authPatch as any)
          if (error) return json({ error: error.message }, 400)
        }
        return json({ ok: true })
      }

      case 'password': {
        const id = String(body.id ?? '')
        const password = String(body.password ?? '')
        if (!id) return json({ error: 'Falta el usuario' }, 400)
        if (password.length < 8) return json({ error: 'La contraseña debe tener al menos 8 caracteres' }, 400)
        const { error } = await admin.auth.admin.updateUserById(id, { password })
        if (error) return json({ error: error.message }, 400)
        return json({ ok: true })
      }

      case 'eliminar': {
        const id = String(body.id ?? '')
        if (!id) return json({ error: 'Falta el usuario' }, 400)
        if (id === authData.user.id) return json({ error: 'No puedes eliminar tu propia cuenta' }, 400)
        const { error } = await admin.auth.admin.deleteUser(id)
        if (error) return json({ error: error.message }, 400)
        await admin.from('profiles').delete().eq('id', id)
        return json({ ok: true })
      }

      default:
        return json({ error: 'Acción desconocida' }, 400)
    }
  } catch (err) {
    return json({ error: err instanceof Error ? err.message : 'Error inesperado' }, 500)
  }
})
