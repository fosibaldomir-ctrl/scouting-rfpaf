import sharp from 'sharp'
import https from 'https'
import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const ICONS_DIR = path.join(__dirname, '..', 'public', 'icons')

fs.mkdirSync(ICONS_DIR, { recursive: true })

// Download RFPAF logo
function downloadImage(url) {
  return new Promise((resolve, reject) => {
    https.get(url, (res) => {
      const chunks = []
      res.on('data', (chunk) => chunks.push(chunk))
      res.on('end', () => resolve(Buffer.concat(chunks)))
      res.on('error', reject)
    }).on('error', reject)
  })
}

async function buildIcon(size, maskable = false) {
  const padding = maskable ? Math.round(size * 0.18) : Math.round(size * 0.1)
  const logoSize = size - padding * 2
  const logoAreaHeight = Math.round(logoSize * 0.6)
  const logoTop = Math.round(size * 0.1)

  // Download and resize RFPAF logo
  const logoBuffer = await downloadImage(
    'https://files.asturfutbol.es/pnfg/img/web_responsive_2/ESP/logo(rffpa).png'
  )

  const logoResized = await sharp(logoBuffer)
    .resize(Math.round(logoSize * 0.65), logoAreaHeight, { fit: 'inside', background: { r: 0, g: 0, b: 0, alpha: 0 } })
    .png()
    .toBuffer()

  const logoMeta = await sharp(logoResized).metadata()
  const logoW = logoMeta.width
  const logoH = logoMeta.height
  const logoLeft = Math.round((size - logoW) / 2)
  const logoTopActual = maskable ? Math.round(size * 0.15) : Math.round(size * 0.08)

  // "Staff Lab" text as SVG overlay
  const textFontSize = Math.round(size * 0.095)
  const subtitleFontSize = Math.round(size * 0.058)
  const textY = logoTopActual + logoH + Math.round(size * 0.07)
  const subtitleY = textY + Math.round(size * 0.115)

  const svgOverlay = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <text
        x="${size / 2}" y="${textY}"
        text-anchor="middle"
        font-family="Arial Black, Arial, sans-serif"
        font-size="${textFontSize}"
        font-weight="900"
        fill="white"
        letter-spacing="1">Staff Lab</text>
      <text
        x="${size / 2}" y="${subtitleY}"
        text-anchor="middle"
        font-family="Arial, sans-serif"
        font-size="${subtitleFontSize}"
        font-weight="500"
        fill="rgba(255,255,255,0.65)"
        letter-spacing="${Math.round(subtitleFontSize * 0.35)}">RFPAF</text>
    </svg>
  `

  const radius = maskable ? Math.round(size * 0.12) : Math.round(size * 0.18)

  // Background rounded square SVG
  const bgSvg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">
      <defs>
        <linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stop-color="#004fa3"/>
          <stop offset="100%" stop-color="#002a5c"/>
        </linearGradient>
      </defs>
      <rect width="${size}" height="${size}" rx="${radius}" fill="url(#bg)"/>
      <!-- Top red accent -->
      <rect x="${Math.round(size*0.08)}" y="${Math.round(size*0.05)}" width="${Math.round(size*0.84)}" height="${Math.round(size*0.022)}" rx="${Math.round(size*0.011)}" fill="#c0392b" opacity="0.85"/>
      <!-- Bottom red accent -->
      <rect x="${Math.round(size*0.08)}" y="${Math.round(size*0.93)}" width="${Math.round(size*0.84)}" height="${Math.round(size*0.022)}" rx="${Math.round(size*0.011)}" fill="#c0392b" opacity="0.85"/>
    </svg>
  `

  return sharp(Buffer.from(bgSvg))
    .composite([
      { input: logoResized, top: logoTopActual, left: logoLeft },
      { input: Buffer.from(svgOverlay), top: 0, left: 0 },
    ])
    .png()
    .toBuffer()
}

async function main() {
  console.log('⚙️  Generando iconos RFPAF Staff Lab...')

  const icon192 = await buildIcon(192, false)
  fs.writeFileSync(path.join(ICONS_DIR, 'icon-192.png'), icon192)
  console.log('✅ icon-192.png')

  const icon192m = await buildIcon(192, true)
  fs.writeFileSync(path.join(ICONS_DIR, 'icon-192-maskable.png'), icon192m)
  console.log('✅ icon-192-maskable.png')

  const icon512 = await buildIcon(512, false)
  fs.writeFileSync(path.join(ICONS_DIR, 'icon-512.png'), icon512)
  console.log('✅ icon-512.png')

  const icon512m = await buildIcon(512, true)
  fs.writeFileSync(path.join(ICONS_DIR, 'icon-512-maskable.png'), icon512m)
  console.log('✅ icon-512-maskable.png')

  // Also copy 192 as apple-touch-icon
  fs.copyFileSync(path.join(ICONS_DIR, 'icon-192.png'), path.join(ICONS_DIR, 'apple-touch-icon.png'))
  console.log('✅ apple-touch-icon.png')

  console.log('\n🎉 Todos los iconos generados en public/icons/')
}

main().catch((err) => {
  console.error('❌ Error:', err)
  process.exit(1)
})
