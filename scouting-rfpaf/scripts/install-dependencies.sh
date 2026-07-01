#!/bin/bash

# ═════════════════════════════════════════════════════════════════════════════
# INSTALADOR DE DEPENDENCIAS - VIDEO GENERATOR
# Instala ffmpeg, espeak-ng e imagemagick
# ═════════════════════════════════════════════════════════════════════════════

echo "🔧 Instalador de dependencias para generador de video"
echo ""

# Detectar OS
if [[ "$OSTYPE" == "darwin"* ]]; then
  echo "✓ Detectado: macOS"
  echo ""

  # Verificar si Homebrew está instalado
  if ! command -v brew &> /dev/null; then
    echo "📦 Instalando Homebrew (necesario para las herramientas)..."
    /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"
  else
    echo "✓ Homebrew ya instalado"
  fi

  echo ""
  echo "📥 Instalando dependencias..."

  # FFmpeg
  if ! command -v ffmpeg &> /dev/null; then
    echo "  • Instalando ffmpeg..."
    brew install ffmpeg
  else
    echo "  ✓ ffmpeg ya instalado"
  fi

  # espeak-ng
  if ! command -v espeak-ng &> /dev/null; then
    echo "  • Instalando espeak-ng..."
    brew install espeak-ng
  else
    echo "  ✓ espeak-ng ya instalado"
  fi

  # ImageMagick
  if ! command -v convert &> /dev/null; then
    echo "  • Instalando imagemagick..."
    brew install imagemagick
  else
    echo "  ✓ imagemagick ya instalado"
  fi

elif [[ "$OSTYPE" == "linux-gnu"* ]]; then
  echo "✓ Detectado: Linux"
  echo ""

  # Detectar distribución
  if command -v apt-get &> /dev/null; then
    echo "  Sistema: Debian/Ubuntu"
    echo "📥 Instalando dependencias con apt..."
    sudo apt-get update
    sudo apt-get install -y ffmpeg espeak-ng imagemagick
  elif command -v dnf &> /dev/null; then
    echo "  Sistema: Fedora/RHEL"
    echo "📥 Instalando dependencias con dnf..."
    sudo dnf install -y ffmpeg espeak-ng ImageMagick
  elif command -v pacman &> /dev/null; then
    echo "  Sistema: Arch Linux"
    echo "📥 Instalando dependencias con pacman..."
    sudo pacman -S ffmpeg espeak-ng imagemagick
  else
    echo "❌ No se detectó gestor de paquetes"
    exit 1
  fi

else
  echo "❌ Sistema operativo no soportado"
  echo "Por favor instala manualmente:"
  echo "  • ffmpeg"
  echo "  • espeak-ng"
  echo "  • imagemagick"
  exit 1
fi

echo ""
echo "✨ Instalación completada"
echo ""
echo "═════════════════════════════════════════════════════════"
echo "Ahora puedes ejecutar:"
echo "  bash scripts/generate-video.sh"
echo "═════════════════════════════════════════════════════════"
