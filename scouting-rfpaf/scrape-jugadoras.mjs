import { chromium } from 'playwright-core'

const exe = '/Users/alfonsobaldomirferrer/Library/Caches/ms-playwright/chromium-1228/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
const browser = await chromium.launch({ headless: true, executablePath: exe })
const page = await browser.newPage()

// Ir a selecciones
await page.goto('https://www.asturfutbol.es/pnfg/NPcd/NFG_Sel_WebSeleccion?cod_primaria=3001509&cod_seleccion=703203', { waitUntil: 'networkidle', timeout: 30000 }).catch(e => console.log('Error 1:', e.message))

// Esperar y seleccionar tipo de juego (Futbol-11)
await page.selectOption('select', { label: 'Futbol-11' }).catch(() => console.log('No select para tipo juego'))
await page.waitForTimeout(1000)

// Buscar y clicar en una selección femenina (Sub 16)
const fem16Link = await page.getByText('Selección FEMENINA SUB 16').first().click().catch(() => console.log('No link Sub 16'))
await page.waitForTimeout(2000)

// Ir a pestaña "Jugadores/as"
const jugLink = await page.getByText('Jugadores/as').first().click().catch(() => console.log('No link Jugadores'))
await page.waitForTimeout(2000)

const body = await page.evaluate(() => document.body.innerText)
console.log('=== JUGADORES PAGE ===')
console.log(body.slice(0, 2000))

// Buscar tabla o lista de jugadores
const rows = await page.evaluate(() => {
  const data = []
  // Buscar en tablas
  document.querySelectorAll('table tr').forEach(tr => {
    const cells = [...tr.querySelectorAll('td, th')].map(td => td.textContent.trim())
    if (cells.length > 0) data.push(cells)
  })
  return data
})
console.log('\n=== TABLA DE JUGADORES ===')
rows.slice(0, 20).forEach(r => console.log(r.join(' | ')))

await browser.close()
