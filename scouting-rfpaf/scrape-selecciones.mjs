import { chromium } from 'playwright-core'

const exe = '/Users/alfonsobaldomirferrer/Library/Caches/ms-playwright/chromium-1228/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
const browser = await chromium.launch({ headless: true, executablePath: exe })
const page = await browser.newPage()

await page.goto('https://www.asturfutbol.es/pnfg/NPcd/NFG_Sel_WebSeleccion?cod_primaria=3001509&cod_seleccion=703203', { waitUntil: 'networkidle', timeout: 30000 }).catch(e => console.log('Error:', e.message))

const body = await page.evaluate(() => document.body.innerText.slice(0, 3000))
console.log('=== SELECCIONES PAGE ===')
console.log(body)

const links = await page.evaluate(() => {
  return [...document.querySelectorAll('a')].map(a => ({
    text: a.textContent.trim().slice(0, 50),
    href: a.href
  })).filter(x => x.href && x.text.toLowerCase().includes('jugador'))
})
console.log('\n=== LINKS CON "JUGADOR" ===')
links.slice(0, 10).forEach(l => console.log(`${l.text} → ${l.href}`))

await browser.close()
