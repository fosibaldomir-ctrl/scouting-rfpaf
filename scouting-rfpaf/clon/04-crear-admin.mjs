/* Crea la primera cuenta de administrador en el proyecto Supabase NUEVO.
 *
 * Hace falta porque el registro público está cerrado: sin esta cuenta inicial
 * nadie podría entrar ni dar de alta a nadie. A partir de aquí, el resto de
 * usuarios se crean desde la propia app, en Administración › Usuarios.
 *
 * Uso:
 *   npm install @supabase/supabase-js
 *   DESTINO_URL=https://yyyy.supabase.co DESTINO_KEY=<service_role del destino> \
 *   ADMIN_EMAIL=persona@sufederacion.es ADMIN_PASS='UnaClaveLarga2026' \
 *   ADMIN_NOMBRE='NOMBRE APELLIDO' \
 *   node 04-crear-admin.mjs
 *
 * La contraseña es temporal: que la cambie al primer acceso.
 */
import { createClient } from '@supabase/supabase-js'

const { DESTINO_URL, DESTINO_KEY, ADMIN_EMAIL, ADMIN_PASS, ADMIN_NOMBRE } = process.env
if (!DESTINO_URL || !DESTINO_KEY || !ADMIN_EMAIL || !ADMIN_PASS) {
  console.error('Faltan variables. Revisa el ejemplo de uso en la cabecera de este fichero.')
  process.exit(1)
}
if (ADMIN_PASS.length < 8) {
  console.error('La contraseña debe tener al menos 8 caracteres.')
  process.exit(1)
}

const admin = createClient(DESTINO_URL, DESTINO_KEY, {
  auth: { persistSession: false, autoRefreshToken: false },
})

const email = ADMIN_EMAIL.trim().toLowerCase()
const nombre = (ADMIN_NOMBRE || email.split('@')[0]).trim()

// Se vincula con un observador si ya existe uno con ese nombre: así sus
// valoraciones quedan firmadas con él desde el primer día.
const { data: obs } = await admin
  .from('observadores')
  .select('id, nombre')
  .ilike('nombre', nombre)
  .maybeSingle()
const observadorId = obs?.id ?? null

const { data: lista } = await admin.auth.admin.listUsers()
let usuario = lista?.users?.find(u => u.email === email)

if (usuario) {
  const { error } = await admin.auth.admin.updateUserById(usuario.id, {
    password: ADMIN_PASS,
    email_confirm: true,
    app_metadata: { rol: 'admin' },
    user_metadata: { nombre, observador_id: observadorId },
  })
  if (error) { console.error('No se ha podido actualizar:', error.message); process.exit(1) }
  console.log('Cuenta de administrador ACTUALIZADA')
} else {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password: ADMIN_PASS,
    email_confirm: true,
    app_metadata: { rol: 'admin' },
    user_metadata: { nombre, observador_id: observadorId },
  })
  if (error) { console.error('No se ha podido crear:', error.message); process.exit(1) }
  usuario = data.user
  console.log('Cuenta de administrador CREADA')
}

const { error: ePerfil } = await admin.from('profiles').upsert({
  id: usuario.id,
  nombre,
  email,
  rol: 'admin',
  observador_id: observadorId,
  activo: true,
})
if (ePerfil) { console.error('Fallo al guardar el perfil:', ePerfil.message); process.exit(1) }

console.log(`
  Correo:     ${email}
  Contraseña: ${ADMIN_PASS}   (temporal — cámbiala al entrar)
  Perfil:     Administrador
  Observador: ${obs?.nombre ?? 'sin vincular (se puede asignar luego desde la app)'}
`)
console.log('Recuerda cerrar el registro público:')
console.log('  Authentication › Sign In / Providers › Email › desactivar "Allow new users to sign up"')
