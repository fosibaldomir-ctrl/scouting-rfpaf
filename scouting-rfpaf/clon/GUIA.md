# Montar la instalación oficial de la federación

La app vive hoy en cuentas personales (`fosibaldomir@gmail.com`). Esta guía deja
una instalación equivalente **a nombre de la federación**, con sus cuentas y sus
correos, para que la usen de verdad los miembros del staff.

Las dos instalaciones quedan independientes: la actual sigue sirviendo como banco
de pruebas y la nueva pasa a ser la buena.

**Tiempo estimado:** una tarde, unas 2 horas contando las esperas.

---

## Antes de empezar

**Tres cuentas a nombre de la federación**, no personales. Todas gratuitas:

| Cuenta | Para qué | Dónde |
|---|---|---|
| GitHub | guardar el código | github.com |
| Supabase | base de datos y ficheros | supabase.com |
| Vercel | publicar la web | vercel.com |

Regístralas **antes** de ponerte con los pasos. Vercel y Supabase permiten entrar
con la cuenta de GitHub, lo cual ahorra tiempo.

Usa un correo institucional que no dependa de una persona concreta (algo tipo
`informatica@` o `secretaria@`, no el correo de nadie). Si mañana cambia quien
lleva esto, la federación sigue teniendo el control sin depender de una cuenta
personal. Guardad las contraseñas donde las tenga más de una persona.

**Sobre los datos.** No hay cesión a terceros: la responsable sigue siendo la
misma federación y la finalidad es la misma. Lo que sí cambia es que pasan a uso
real por varias personas, así que conviene tener resuelto lo de siempre —
información a las jugadoras y sus familias, y quién accede a qué. Esto último lo
cubre el control de acceso por perfiles que ya trae la instalación (paso 7).

**Por qué cuentas nuevas y no las tuyas.** Porque los datos de la federación no
deberían colgar de una cuenta de Gmail personal.

**Ojo con el límite de proyectos gratuitos de Supabase.** No es por organización,
sino **por persona**: cada usuario puede ser propietario o administrador de un
máximo de 2 proyectos gratuitos sumando *todas* las organizaciones a las que
pertenezca. Es decir, si te invitan como Owner a la organización de la federación
y tú ya tienes 2 proyectos gratis, no se podrá crear ninguno ahí hasta que
liberes un hueco (pausando o borrando uno de los tuyos) o alguien pase a plan de
pago. Pausar no destruye nada y se deshace cuando quieras.

---

## Paso 1 — El código en un repositorio nuevo

La copia se hace desde la rama `acceso-usuarios`, no desde `main`, porque esa rama
lleva la entrada por correo y contraseña con los cuatro perfiles. Tu app sigue con
el desplegable de observador; la de la federación nace ya con contraseñas.

1. Crea un repositorio vacío en el GitHub de la federación, llamado por ejemplo
   `staff-lab`. **Sin** README ni .gitignore: tiene que quedar completamente vacío.

2. Desde tu ordenador, en la carpeta del proyecto:

   ```bash
   cd "/Users/alfonsobaldomirferrer/Desktop/PROYECTO APP WEB FEDERACION "
   git remote add federacion https://github.com/CUENTA-FEDERACION/staff-lab.git
   git push federacion acceso-usuarios:main
   ```

   Eso publica la rama del control de acceso como la rama principal del
   repositorio nuevo, con todo el historial.

3. Añádete como colaborador con tu cuenta personal para poder seguir trabajando
   en él. El remoto puedes dejarlo puesto: te servirá para pasar mejoras más
   adelante (última sección).

---

## Paso 2 — El proyecto de Supabase

1. En supabase.com › **New project**.
   - Organización: la de la federación
   - Nombre: `staff-lab`
   - **Region: `West EU (Ireland)`** — la misma que la tuya; con los datos en
     Europa el asunto legal es más sencillo
   - Contraseña de base de datos: que la genere y **la guarde**, no se puede recuperar

2. Esperar unos dos minutos a que el proyecto termine de crearse.

3. Ir a **SQL Editor** › New query, pegar entero el fichero
   [`01-esquema.sql`](01-esquema.sql) y ejecutarlo.

   Crea las 20 tablas, las 62 políticas de acceso, los índices y los cuatro
   contenedores de ficheros. Está probado: lo ensayé completo contra una base de
   datos real y se aplica sin un solo error.

4. Comprobar en **Table Editor** que aparecen las tablas, y en **Storage** los
   cuatro buckets.

---

## Paso 3 — Apuntar la app a la base de datos nueva

En el proyecto de Supabase, **Project Settings › Data API**, copiar dos valores:

- **Project URL** → `https://xxxxx.supabase.co`
- **anon public** (en API Keys) → una cadena larga que empieza por `eyJ...`

Esa clave `anon` es pública y puede ir en el navegador sin problema. La otra que
verás, `service_role`, **no**: es la llave maestra y nunca debe entrar en el
código ni subirse a GitHub. Solo se usa desde el ordenador, en los pasos 5 y 7.

---

## Paso 4 — Publicar en Vercel

1. En vercel.com › **Add New** › Project › importar el repositorio `staff-lab`.
2. **Root Directory**: `scouting-rfpaf` ← importante, el código no está en la raíz.
3. En **Environment Variables**, añadir las dos:

   | Nombre | Valor |
   |---|---|
   | `VITE_SUPABASE_URL` | el Project URL del paso 3 |
   | `VITE_SUPABASE_ANON_KEY` | la clave anon del paso 3 |

4. **Deploy**. En dos o tres minutos da una dirección `staff-lab.vercel.app`.

Todavía no se podrá entrar: falta crear la cuenta de administrador (paso 7).

---

## Paso 5 — Copiar los datos y los ficheros

Esto se hace desde tu ordenador porque necesita leer del proyecto actual y
escribir en el nuevo.

1. Consigue las dos claves `service_role`:
   - la tuya: Supabase › tu proyecto › Project Settings › API Keys
   - la nueva: lo mismo en el proyecto de la federación

2. Ejecuta, sustituyendo lo que va entre `<>`:

   ```bash
   cd "/Users/alfonsobaldomirferrer/Desktop/PROYECTO APP WEB FEDERACION /scouting-rfpaf"
   npm install @supabase/supabase-js

   ORIGEN_URL=https://jdgcazppxazlihdronsv.supabase.co \
   ORIGEN_KEY=<tu service_role> \
   DESTINO_URL=<Project URL del proyecto nuevo> \
   DESTINO_KEY=<service_role del proyecto nuevo> \
   node clon/02-copiar-datos.mjs
   ```

   Copia las 19 tablas en el orden correcto para no romper las dependencias, y
   después los ficheros de los cuatro contenedores (unos 22 ficheros, 42 MB).
   Va tabla por tabla informando; si alguna fila falla la reintenta sola y te la
   marca con ✖ al final.

   No toca nada de tu proyecto: solo lee.

3. **Cierra las dos terminales** cuando acabe, para que las claves no queden en el
   historial.

---

## Paso 6 — Arreglar los enlaces a los ficheros

Sin este paso la instalación nueva cargaría las imágenes y los PDF **desde el
Supabase antiguo**, y se rompería el día que allí se borre algo.

En el editor SQL del proyecto **nuevo**, pegar [`03-reapuntar-enlaces.sql`](03-reapuntar-enlaces.sql),
cambiar la línea `nuevo` por el dominio del proyecto de la federación y ejecutarlo. Recorre solo todas las
columnas de texto y JSON: hay siete columnas afectadas en cuatro tablas, dos de
ellas con los enlaces metidos dentro de un JSON.

Si te olvidas de cambiar el dominio, el script se detiene y avisa en vez de dejar
las cosas a medias.

---

## Paso 7 — Dejar la entrada lista

1. **Cerrar el registro público.** Supabase › Authentication › Sign In / Providers
   › Email › desactivar **Allow new users to sign up**. Sin esto, cualquiera con
   la dirección podría crearse una cuenta.

2. **Subir la función de gestión de usuarios.** Supabase › Edge Functions › Deploy
   a new function, nombre `admin-usuarios`, y pegar el contenido de
   [`05-funcion-admin-usuarios/index.ts`](05-funcion-admin-usuarios/index.ts).

   Es lo que permite dar de alta usuarios desde la propia app sin que la llave
   maestra salga nunca del servidor. Comprueba que quien llama es administrador.

3. **Crear la primera cuenta de administrador:**

   ```bash
   DESTINO_URL=<Project URL del proyecto nuevo> \
   DESTINO_KEY=<service_role del proyecto nuevo> \
   ADMIN_EMAIL=<tu correo institucional> \
   ADMIN_PASS='UnaClaveLarga2026' \
   ADMIN_NOMBRE='NOMBRE APELLIDO' \
   node clon/04-crear-admin.mjs
   ```

4. Entra en `staff-lab.vercel.app`, **cambia la contraseña** en Administración ›
   Usuarios, y desde ahí da de alta al resto del staff con su perfil
   correspondiente.

---

## Comprobación final

Recorre esta lista antes de dar la app por buena:

- [ ] Entra con su correo y su contraseña
- [ ] En Base de Datos aparecen las jugadoras copiadas
- [ ] Al abrir una ficha se ve la foto (si no, falló el paso 6)
- [ ] En Convocatorias, "Descargar PDF" funciona
- [ ] En Informes se abren los partidos con sus imágenes
- [ ] En Administración › Usuarios puede crear un usuario de prueba y luego borrarlo
- [ ] Análisis Lab carga un vídeo y deja dibujar

---

## Los cuatro perfiles que trae

| | Admin | Dirección | Scout | Fisio |
|---|---|---|---|---|
| Dashboard | ✅ | ✅ | ✅ | ✅ |
| Scouting | ✅ | solo lectura | ✅ | — |
| Entrenamientos | ✅ | ✅ | ✅ | ✅ |
| Desarrollo Individual · Análisis Lab | ✅ | ✅ | ✅ | ✅ |
| Análisis Global | ✅ | ✅ | ✅ | — |
| Wellness | ✅ | ✅ | — | ✅ |
| Informes | ✅ | ✅ | ✅ | — |
| Administración | ✅ | — | — | — |

El técnico o scout ve todas las jugadoras, pero en cada ficha solo las
valoraciones que ha firmado él.

---

## Después: dos apps que evolucionan por separado

A partir de aquí son dos instalaciones independientes: la tuya como banco de
pruebas y la de la federación como la real. Cuando pruebes algo en la tuya y
quieras pasarlo a la buena:

```bash
git push federacion main:actualizacion
```

y fusiona esa rama en la instalación de la federación cuando esté comprobado.
Así nada llega a producción sin haber pasado antes por tu banco de pruebas.

Ojo con una cosa: si el cambio toca la base de datos (una tabla o una columna
nueva), hay que aplicar también el SQL correspondiente en el Supabase de la
federación. El código solo no basta.

---

## Ficheros de esta carpeta

| Fichero | Cuándo |
|---|---|
| `01-esquema.sql` | Paso 2 — crea toda la estructura |
| `02-copiar-datos.mjs` | Paso 5 — copia datos y ficheros |
| `03-reapuntar-enlaces.sql` | Paso 6 — arregla los enlaces |
| `04-crear-admin.mjs` | Paso 7 — crea la cuenta inicial |
| `05-funcion-admin-usuarios/index.ts` | Paso 7 — gestión de usuarios |
