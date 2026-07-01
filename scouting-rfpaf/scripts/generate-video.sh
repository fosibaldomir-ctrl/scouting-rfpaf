#!/bin/bash

# ═════════════════════════════════════════════════════════════════════════════
# GENERADOR DE VIDEO CON SUBTÍTULOS - DESARROLLO INDIVIDUAL
# Crea un video MP4 con audio TTS, subtítulos sincronizados y fondo visual
#
# Requisitos:
#   - espeak-ng (síntesis de voz)
#   - ffmpeg (procesamiento de video/audio)
#   - imagemagick (generación de imágenes)
#
# Uso: bash scripts/generate-video.sh
# ═════════════════════════════════════════════════════════════════════════════

set -e

OUTPUT_DIR="./videos"
AUDIO_DIR="$OUTPUT_DIR/audio"
IMAGES_DIR="$OUTPUT_DIR/images"
SUBTITLES_FILE="$OUTPUT_DIR/desarrollo-individual.srt"
VIDEO_FILE="$OUTPUT_DIR/desarrollo-individual.mp4"

# Crear directorios
mkdir -p "$AUDIO_DIR" "$IMAGES_DIR"

echo "🎬 Generando video: Desarrollo Individual"
echo ""

# ═════════════════════════════════════════════════════════════════════════════
# SEGMENTOS DE LOCUCIÓN CON TIMESTAMPS
# ═════════════════════════════════════════════════════════════════════════════

declare -a SEGMENTS=(
  # [Índice]="Duración en segundos|Texto de locución"
  "0=8|Bienvenido a la sección de Desarrollo Individual del Staff Lab de la Real Federación de Fútbol del Principado de Asturias. Esta herramienta está diseñada para que el cuerpo técnico pueda definir, seguir y evaluar objetivos personalizados para cada jugadora a lo largo de toda la temporada."
  "1=6|Al acceder a Desarrollo Individual, encontrarás un panel con todas las jugadoras que tienen objetivos activos. Cada tarjeta muestra el nombre de la jugadora, su club con el escudo correspondiente, el número de dorsal, el tipo de objetivo y la acción asociada."
  "2=5|Para crear un nuevo objetivo, pulsa el botón Nuevo Objetivo en la esquina superior derecha."
  "3=12|Se abrirá un formulario. Lo primero es identificar a la jugadora. Si ya está registrada en la Base de Datos, simplemente escribe su nombre en el buscador. La aplicación mostrará coincidencias al instante. Al seleccionarla, sus datos se cargan automáticamente. También puedes introducir los datos de forma manual."
  "4=8|A continuación defines el objetivo: escribe un título claro, por ejemplo Mejorar Pase Corto, y una descripción detallada que explique el contexto. Selecciona la fecha de inicio, el estado, el tipo de objetivo y la acción asociada."
  "5=6|Puedes adjuntar enlaces a una imagen de referencia, un documento PDF o un vídeo complementario. Pulsa Crear Objetivo y quedará guardado automáticamente."
  "6=8|Al entrar en cualquier tarjeta accedes a la vista de detalle. La foto de la jugadora ocupa el lateral izquierdo junto a su dorsal y nombre, mientras en la parte derecha se muestra el título del objetivo, su descripción y las fechas."
  "7=10|Justo debajo encontrarás el bloque de progreso: una barra que refleja el estado actual en porcentaje, contadores de sesiones, partidos y evaluaciones, y un gráfico de evolución que dibuja la trayectoria del seguimiento a lo largo del tiempo."
  "8=8|Esta es la parte central: el historial de acciones y evaluaciones. Para cada objetivo puedes registrar entradas. Pulsa Añadir Acción y elige el tipo: Sesión, Partido o Evaluación."
  "9=6|En cualquiera de los tres tipos puedes adjuntar una imagen o un enlace a vídeo. También puedes etiquetar cada entrada con un estado: en curso, conseguido o en revisión. Las entradas aparecen ordenadas de más reciente a más antigua."
  "10=5|Cuando quieras obtener un documento formal, pulsa Descargar PDF. La aplicación generará un informe completo con el logotipo de la federación, el escudo del club y todas las entradas, sin que ninguna quede cortada entre páginas."
  "11=6|Con la sección de Desarrollo Individual tienes una herramienta completa para acompañar a cada jugadora en su crecimiento, desde la definición del objetivo hasta la evidencia acumulada. Todo sincronizado en la nube y exportable en cualquier momento."
)

# ═════════════════════════════════════════════════════════════════════════════
# GENERAR AUDIO Y SUBTÍTULOS
# ═════════════════════════════════════════════════════════════════════════════

echo "🎙️  Generando audio con síntesis de voz..."

# Crear archivo SRT vacío
> "$SUBTITLES_FILE"

CURRENT_TIME=0
AUDIO_SEGMENTS=()

for segment in "${SEGMENTS[@]}"; do
  IFS='=' read -r idx pair <<< "$segment"
  IFS='|' read -r duration text <<< "$pair"

  # Archivo de audio para este segmento
  audio_file="$AUDIO_DIR/segment_$idx.wav"

  # Generar audio con espeak-ng
  echo "  Segmento $idx: $duration segundos..."
  espeak-ng -v es -s 140 -w "$audio_file" "$text" 2>/dev/null || {
    echo "  ⚠️  espeak-ng no disponible, usando síntesis alternativa..."
    # Fallback: usar sox si está disponible
    echo "$text" | festival --tts 2>/dev/null > "$audio_file" || {
      echo "  ❌ No hay motor TTS disponible. Instala: brew install espeak-ng"
      exit 1
    }
  }

  AUDIO_SEGMENTS+=("$audio_file")

  # Calcular timestamps para SRT
  start_h=$((CURRENT_TIME / 3600))
  start_m=$(((CURRENT_TIME % 3600) / 60))
  start_s=$((CURRENT_TIME % 60))

  end_time=$((CURRENT_TIME + duration))
  end_h=$((end_time / 3600))
  end_m=$(((end_time % 3600) / 60))
  end_s=$((end_time % 60))

  # Agregar entrada al SRT
  cat >> "$SUBTITLES_FILE" << EOF
$((idx + 1))
$(printf '%02d:%02d:%02d,000' $start_h $start_m $start_s) --> $(printf '%02d:%02d:%02d,000' $end_h $end_m $end_s)
$text

EOF

  CURRENT_TIME=$end_time
done

echo "✓ Audio generado en $AUDIO_DIR"
echo "✓ Subtítulos creados en $SUBTITLES_FILE"

# ═════════════════════════════════════════════════════════════════════════════
# CONCATENAR AUDIO
# ═════════════════════════════════════════════════════════════════════════════

echo ""
echo "🔊 Concatenando segmentos de audio..."

# Crear lista de archivos para ffmpeg
audio_list="$AUDIO_DIR/list.txt"
> "$audio_list"
for audio in "${AUDIO_SEGMENTS[@]}"; do
  echo "file '$audio'" >> "$audio_list"
done

# Concatenar con ffmpeg
ffmpeg -f concat -safe 0 -i "$audio_list" -c:a aac -y "$OUTPUT_DIR/audio_final.m4a" 2>/dev/null || {
  echo "❌ Error concatenando audio. Verifica que FFmpeg está instalado."
  exit 1
}

TOTAL_DURATION=$(ffprobe -v error -show_entries format=duration -of default=noprint_wrappers=1:nokey=1 "$OUTPUT_DIR/audio_final.m4a" | cut -d. -f1)
echo "✓ Audio final generado: ${TOTAL_DURATION}s"

# ═════════════════════════════════════════════════════════════════════════════
# GENERAR IMAGEN DE FONDO
# ═════════════════════════════════════════════════════════════════════════════

echo ""
echo "🎨 Generando fondo visual..."

# Crear imagen base con colores corporativos RFPAF
bg_image="$IMAGES_DIR/background.png"

convert -size 1280x720 \
  gradient:linear\(#1a3a6b-#2e4d8f\) \
  -background none \
  -fill white -font Helvetica -pointsize 48 \
  -gravity Center \
  -annotate +0-100 "DESARROLLO INDIVIDUAL" \
  -pointsize 24 \
  -fill "#cccccc" \
  -annotate +0+80 "Real Federación de Fútbol del Principado de Asturias" \
  "$bg_image" 2>/dev/null || {
  echo "  ℹ️  ImageMagick no disponible, usando fondo simple..."
  ffmpeg -f lavfi -i color=c=#1a3a6b:s=1280x720:d=$TOTAL_DURATION \
    -vf "drawtext=text='DESARROLLO INDIVIDUAL':fontsize=60:fontcolor=white:x=(w-text_w)/2:y=(h-text_h)/2-100, \
         drawtext=text='Real Federación de Fútbol del Principado de Asturias':fontsize=28:fontcolor=cccccc:x=(w-text_w)/2:y=(h-text_h)/2+80" \
    -pix_fmt yuv420p -y "$bg_image" 2>/dev/null
}

echo "✓ Fondo generado: $bg_image"

# ═════════════════════════════════════════════════════════════════════════════
# CREAR VIDEO FINAL
# ═════════════════════════════════════════════════════════════════════════════

echo ""
echo "🎬 Compilando video final..."

ffmpeg -loop 1 -i "$bg_image" \
  -i "$OUTPUT_DIR/audio_final.m4a" \
  -c:v libx264 \
  -c:a aac \
  -pix_fmt yuv420p \
  -shortest \
  -y \
  "$VIDEO_FILE" 2>&1 | grep -E "^(frame=|Duration:|bitrate:)" || true

# ═════════════════════════════════════════════════════════════════════════════
# AGREGAR SUBTÍTULOS
# ═════════════════════════════════════════════════════════════════════════════

echo ""
echo "📝 Incorporando subtítulos..."

VIDEO_WITH_SUBS="$OUTPUT_DIR/desarrollo-individual-final.mp4"

ffmpeg -i "$VIDEO_FILE" \
  -vf "subtitles=$SUBTITLES_FILE:force_style='FontName=Arial,FontSize=16,PrimaryColour=&Hffffff&,BackColour=&H000000&,BorderStyle=1,Outline=1,Shadow=1'" \
  -c:a copy \
  -y \
  "$VIDEO_WITH_SUBS" 2>&1 | grep -E "^(frame=|Duration:|bitrate:)" || true

# ═════════════════════════════════════════════════════════════════════════════
# LIMPIAR Y RESUMEN
# ═════════════════════════════════════════════════════════════════════════════

echo ""
echo "✨ ¡Video generado con éxito!"
echo ""
echo "📹 Archivo final: $VIDEO_WITH_SUBS"
ls -lh "$VIDEO_WITH_SUBS" | awk '{print "   Tamaño: " $5}'

echo ""
echo "📋 Archivos generados:"
echo "   - Audio: $OUTPUT_DIR/audio_final.m4a"
echo "   - Subtítulos: $SUBTITLES_FILE"
echo "   - Video sin subtítulos: $VIDEO_FILE"
echo "   - Video final (con subtítulos): $VIDEO_WITH_SUBS"
echo ""
echo "🎯 Próximos pasos:"
echo "   1. Prueba el video: open $VIDEO_WITH_SUBS"
echo "   2. Si quieres compartirlo, sube a YouTube o Drive"
echo "   3. Para editar, abre en tu editor de video favorito"
echo ""

# Abrir (opcional, solo en macOS)
if command -v open &> /dev/null; then
  read -p "¿Abrir el video ahora? (s/n) " -n 1 -r
  echo
  if [[ $REPLY =~ ^[Ss]$ ]]; then
    open "$VIDEO_WITH_SUBS"
  fi
fi
