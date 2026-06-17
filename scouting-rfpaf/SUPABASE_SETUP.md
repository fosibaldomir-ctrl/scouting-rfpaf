# Configuración de Supabase

## Agregar campo de video a la tabla ejercicios

El campo `video` es necesario para almacenar URLs de YouTube o Vimeo asociadas a los ejercicios.

### Opción 1: Usando la consola SQL de Supabase (Recomendado)

1. Accede a tu proyecto en [Supabase Dashboard](https://app.supabase.com)
2. Ve a **SQL Editor** en el menú izquierdo
3. Haz clic en **+ New Query**
4. Copia y ejecuta el siguiente SQL:

```sql
ALTER TABLE ejercicios
ADD COLUMN IF NOT EXISTS video TEXT DEFAULT NULL;

COMMENT ON COLUMN ejercicios.video IS 'YouTube or Vimeo URL for exercise demonstration video';
```

5. Haz clic en **Run** (o Ctrl+Enter)

### Opción 2: Usando el archivo de migración

Si tienes Supabase CLI configurado:

```bash
supabase migration up
```

### Opción 3: Usando pgAdmin (si tienes acceso)

1. Conéctate a tu base de datos Postgres
2. Navega a la tabla `ejercicios`
3. Agrega una nueva columna:
   - Nombre: `video`
   - Tipo: `TEXT`
   - Default: `NULL`
   - NOT NULL: No

## Verificar que el campo existe

Para verificar que el campo fue agregado correctamente, ejecuta:

```sql
SELECT column_name, data_type, is_nullable
FROM information_schema.columns
WHERE table_name = 'ejercicios' AND column_name = 'video';
```

Deberías ver:
- column_name: `video`
- data_type: `text`
- is_nullable: `YES`

## Estructura actual de la tabla ejercicios

```sql
CREATE TABLE ejercicios (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo TEXT NOT NULL,
  duracion INTEGER NOT NULL,
  num_jugadores TEXT NOT NULL,
  material TEXT,
  titulo TEXT NOT NULL,
  descripcion TEXT NOT NULL,
  imagen TEXT,
  video TEXT,                          -- ← Campo agregado
  creado_en TIMESTAMP DEFAULT now()
);
```

## Notas

- El campo `video` es opcional (puede ser NULL)
- Aceptaré URLs completas de YouTube o Vimeo
- La app embebería automáticamente estos videos en la Videoteca
- No se almacena el video en sí, solo la URL pública
