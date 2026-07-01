import { chromium } from 'playwright-core'

const exe = '/Users/alfonsobaldomirferrer/Library/Caches/ms-playwright/chromium-1228/chrome-mac-x64/Google Chrome for Testing.app/Contents/MacOS/Google Chrome for Testing'
const browser = await chromium.launch({ headless: true, executablePath: exe })
const page = await browser.newPage()

try {
  await page.goto('https://www.asturfutbol.es', { waitUntil: 'networkidle', timeout: 30000 })
  const body = await page.evaluate(() => document.body.innerText.slice(0, 2000))
  console.log('=== HOMEPAGE ===')
  console.log(body)
} catch (e) {
  console.log('Error:', e.message)
}

const links = await page.evaluate(() => {
  return [...document.querySelectorAll('a')].map(a => ({
    text: a.textContent.trim().slice(0, 50),
    href: a.href
  })).filter(x => x.href && (x.text.toLowerCase().includes('femenino') || x.text.toLowerCase().includes('selec') || x.text.toLowerCase().includes('equipo')))
})
console.log('\n=== LINKS CON "FEMENINO" / "SELEC" / "EQUIPO" ===')
links.slice(0, 15).forEach(l => console.log(`${l.text}\n  → ${l.href}`))

await browser.close()
