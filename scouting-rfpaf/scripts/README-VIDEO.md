# 🎬 Generador de Video — Desarrollo Individual

Herramienta automatizada para crear un video con subtítulos explicando la sección de Desarrollo Individual.

## 📋 Requisitos

### Opción A: Rápida (Fondo estático + Audio + Subtítulos)

```bash
# macOS (con Homebrew)
brew install ffmpeg espeak-ng imagemagick

# Linux (Ubuntu/Debian)
sudo apt-get install ffmpeg espeak-ng imagemagick

# Linux (Fedora)
sudo dnf install ffmpeg espeak-ng ImageMagick
```

### Opción B: Con capturas de pantalla en vivo

```bash
# Además de lo anterior:
npm install --save-dev playwright

# Instalar navegador Chromium
npx playwright install chromium
```

## ⚡ Uso Rápido (Opción A)

```bash
cd /path/to/scouting-rfpaf
bash scripts/generate-video.sh
```

El script generará automáticamente:
- **Audio**: Síntesis de voz en español (espeak-ng)
- **Subtítulos**: Archivo SRT sincronizado
- **Video**: MP4 con fondo visual corporativo + audio + subtítulos

Resultado final: `./videos/desarrollo-individual-final.mp4`

## 🎥 Uso Avanzado (Opción B con capturas reales)

### Paso 1: Iniciar dev server

```bash
npm run dev
# El servidor se abrirá en http://localhost:5173
```

### Paso 2: Capturar pantallas

```bash
npx ts-node scripts/capture-screens.ts
```

Genera capturas PNG en: `./videos/screenshots/`

### Paso 3: Editar manualmente (opcional)

Abre las imágenes en tu editor favorito (Preview, Photoshop, GIMP) y mejóralas.

### Paso 4: Generar video con capturas

Crea un script personalizado o usa un editor de video para:
1. Importar las imágenes como secuencia
2. Sincronizar con el audio `./videos/audio_final.m4a`
3. Añadir subtítulos desde `./videos/desarrollo-individual.srt`

## 📁 Estructura de Archivos Generados

```
videos/
├── audio/
│   ├── segment_0.wav
│   ├── segment_1.wav
│   ├── ...
│   └── list.txt
├── images/
│   ├── background.png          (fondo corporativo)
│   ├── screenshots/            (si usaste capture-screens.ts)
│   │   ├── list-view.png
│   │   ├── detail-view.png
│   │   └── ...
├── audio_final.m4a            (audio concatenado)
├── desarrollo-individual.srt   (subtítulos)
├── desarrollo-individual.mp4   (video sin subtítulos)
└── desarrollo-individual-final.mp4 (VIDEO FINAL ✨)
```

## 🎨 Personalización

### Cambiar la voz

Edita el script `generate-video.sh` y ajusta la línea:

```bash
espeak-ng -v es -s 140 -w "$audio_file" "$text"
```

Opciones:
- `-v es`: idioma (es=español, en=inglés, etc.)
- `-s 140`: velocidad (50-200)

### Cambiar el fondo

En `generate-video.sh`, modifica la sección "GENERAR IMAGEN DE FONDO":

```bash
convert -size 1280x720 \
  gradient:linear\(#1a3a6b-#2e4d8f\)  # ← colores azules RFPAF
  ...
```

### Cambiar resolución

Busca `1280x720` en ambos scripts y reemplázalo por tu resolución deseada (1920x1080, etc.)

### Cambiar estilo de subtítulos

En `generate-video.sh`, modifica:

```bash
-vf "subtitles=$SUBTITLES_FILE:force_style='FontName=Arial,FontSize=16,PrimaryColour=&Hffffff&,BackColour=&H000000&,...'"
```

Colores en hexadecimal BGR (inverso):
- Blanco: `&Hffffff&`
- Negro: `&H000000&`
- Rojo RFPAF: `&H2b39c0&` (invertido)

## 🚀 Flujos Completos

### Flujo 1: Video rápido (1 min)

```bash
bash scripts/generate-video.sh
# ↓ Esperar ~30s
# ✨ Video listo en ./videos/desarrollo-individual-final.mp4
```

### Flujo 2: Video con pantallas reales (10 min)

```bash
# Terminal 1
npm run dev

# Terminal 2 (esperar 3s a que inicie el servidor)
sleep 3
npx ts-node scripts/capture-screens.ts

# Luego editar manualmente con CapCut, DaVinci, etc.
```

### Flujo 3: Video profesional (1h+)

1. Usar `capture-screens.ts` con login/datos reales
2. Editar capturas en Figma/Photoshop
3. Grabar pantalla en vivo mientras narras
4. Sincronizar en CapCut/DaVinci Resolve
5. Exportar con máxima calidad

## ⚠️ Troubleshooting

### Error: "espeak-ng: command not found"

```bash
# macOS
brew install espeak-ng

# Ubuntu
sudo apt-get install espeak-ng

# O usar este fallback en el script (menos calidad):
festival
```

### Error: "ffmpeg: command not found"

```bash
# macOS
brew install ffmpeg

# Ubuntu
sudo apt-get install ffmpeg
```

### El video se ve pixelado

Aumenta la resolución en el script:
- Cambia `1280x720` a `1920x1080`
- Ajusta `-c:v libx264 -crf 23` a `-crf 18` (mejor calidad, archivo más grande)

### Los subtítulos no aparecen

Asegúrate de:
1. FFmpeg compilado con librería `libass`
2. Archivo SRT tiene formato correcto (verifica con: `cat ./videos/desarrollo-individual.srt`)
3. Ruta del SRT es relativa o absoluta correctamente

Verifica: `ffmpeg -codecs | grep subtitle`

### El audio está fuera de sincronización

El script calcula los tiempos automáticamente. Si hay desfase:
1. Regenera el SRT ajustando las duraciones en `SEGMENTS`
2. O re-sincroniza manualmente en tu editor de video

## 📤 Compartir el Video

### YouTube

```bash
# Abrir la carpeta
open ./videos

# Draggear desarrollo-individual-final.mp4 a YouTube
# Permitir que suba (resolución 1280x720 = ~1-2 min para 3-4 min de video)
```

### Google Drive / OneDrive

Arrastra `desarrollo-individual-final.mp4` a tu nube.

### Servidor interno

```bash
# Copiar a servidor
scp ./videos/desarrollo-individual-final.mp4 user@server:/share/videos/
```

## 🎯 Tips Profesionales

- **Narración**: Graba tu voz manualmente en CapCut si quieres entonación más natural
- **Música de fondo**: Añade con `ffmpeg -i audio_final.m4a -i background-music.mp3 -filter_complex "[0][1]amix=inputs=2" mixed.m4a`
- **Transiciones**: Edita en DaVinci Resolve o CapCut para pulir
- **Animaciones**: Usa Keynote/PowerPoint para crear diapositivas animated + grabar con Screenflow
- **Multiidioma**: Genera múltiples idiomas ejecutando el script con diferentes textos

## 📞 Soporte

Si hay errores:

1. Verifica que todas las dependencias están instaladas: `ffmpeg -version && espeak-ng --version`
2. Revisa que el script tiene permisos: `chmod +x scripts/generate-video.sh`
3. Ejecuta con debug: `bash -x scripts/generate-video.sh 2>&1 | head -50`
4. Copia la salida de error y pide ayuda

---

**¿Necesitas ayuda?** Ejecuta el script una vez para ver qué falta instalar.
