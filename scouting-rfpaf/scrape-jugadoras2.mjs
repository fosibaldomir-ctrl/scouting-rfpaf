import { chromium } from 'playwright-core'

const exe = '/Users/alfonsobaldomirferrer/Library/Caches/ms-playwright/chromium-1228/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
const browser = await chromium.launch({ headless: true, executablePath: exe })
const page = await browser.newPage()

await page.goto('https://www.asturfutbol.es/pnfg/NPcd/NFG_Sel_WebSeleccion?cod_primaria=3001509&cod_seleccion=703203', { waitUntil: 'networkidle', timeout: 30000 }).catch(e => console.log('Error:', e.message))

// Seleccionar tipo de juego (Futbol-11)
const selects = await page.$$('select')
console.log('Número de selects:', selects.length)

if (selects.length > 0) {
  // Primer select = Tipo de juego
  await page.locator('select').first().selectOption('Futbol-11').catch(() => console.log('No Futbol-11'))
  await page.waitForTimeout(1500)
  
  // Tercer select = Selección
  if (selects.length >= 3) {
    const seleccionOptions = await page.locator('select').nth(2).evaluate((s) => 
      [...s.querySelectorAll('option')].map(o => ({ text: o.textContent, value: o.value }))
    )
    console.log('\n=== OPCIONES DE SELECCIÓN ===')
    seleccionOptions.filter(o => o.text.includes('FEMENINA')).slice(0, 5).forEach(o => console.log(`${o.text} = ${o.value}`))
    
    // Buscar y seleccionar Sub 16 Femenina
    const sub16fem = seleccionOptions.find(o => o.text.includes('FEMENINA SUB 16'))
    if (sub16fem?.value) {
      await page.locator('select').nth(2).selectOption(sub16fem.value)
      await page.waitForTimeout(1500)
      
      // Hacer clic en "Consultar"
      const btnConsultar = await page.getByText('Consultar').first()
      await btnConsultar.click().catch(() => console.log('No botón Consultar'))
      await page.waitForTimeout(3000)
      
      // Ver si hay tabla con jugadores
      const tabla = await page.evaluate(() => {
        const rows = [...document.querySelectorAll('table tr')]
        return rows.map(tr => {
          const cells = [...tr.querySelectorAll('td')].map(td => td.textContent.trim())
          return cells.length > 0 ? cells : null
        }).filter(Boolean)
      })
      
      console.log('\n=== TABLA DE JUGADORES ===')
      tabla.slice(0, 15).forEach(row => console.log(row.join(' | ')))
      console.log(`Total de filas: ${tabla.length}`)
    }
  }
}

await browser.close()
