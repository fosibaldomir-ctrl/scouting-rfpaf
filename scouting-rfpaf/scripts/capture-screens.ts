#!/usr/bin/env npx ts-node
/**
 * CAPTURADOR DE PANTALLAS - DESARROLLO INDIVIDUAL
 *
 * Navega por la app y captura pantallas específicas para el video
 * Requisito: npm install -D playwright
 *
 * Uso: npx ts-node scripts/capture-screens.ts
 */

import { chromium } from 'playwright'
import { join } from 'path'
import { mkdir } from 'fs/promises'

const BASE_URL = 'http://localhost:5173' // Ajusta si tu dev server usa otro puerto
const IMAGES_DIR = './videos/screenshots'

const SCREENS = [
  {
    name: 'list-view',
    label: 'Lista de objetivos',
    navigate: async (page: any) => {
      await page.goto(`${BASE_URL}/desarrollo-individual`)
      await page.waitForTimeout(2000) // Esperar a que carguen los datos
    },
  },
  {
    name: 'card-hover',
    label: 'Tarjeta en vista previa',
    navigate: async (page: any) => {
      await page.goto(`${BASE_URL}/desarrollo-individual`)
      await page.waitForTimeout(2000)
      // Hacer hover sobre la primera tarjeta si existe
      const card = await page.$('[role="button"]')
      if (card) await card.hover()
      await page.waitForTimeout(500)
    },
  },
  {
    name: 'detail-view',
    label: 'Vista de detalle del objetivo',
    navigate: async (page: any) => {
      await page.goto(`${BASE_URL}/desarrollo-individual`)
      await page.waitForTimeout(2000)
      // Hacer click en la primera tarjeta
      const card = await page.$('[role="button"]')
      if (card) await card.click()
      await page.waitForTimeout(2000) // Esperar a que cargue el detalle
    },
  },
  {
    name: 'progress-block',
    label: 'Bloque de progreso',
    navigate: async (page: any) => {
      await page.goto(`${BASE_URL}/desarrollo-individual`)
      await page.waitForTimeout(2000)
      const card = await page.$('[role="button"]')
      if (card) await card.click()
      await page.waitForTimeout(2000)
      // Scroll al bloque de progreso
      const progressBlock = await page.$('[data-pdf-block="progress"]')
      if (progressBlock) await progressBlock.scrollIntoViewIfNeeded()
      await page.waitForTimeout(500)
    },
  },
  {
    name: 'history-section',
    label: 'Sección de historial',
    navigate: async (page: any) => {
      await page.goto(`${BASE_URL}/desarrollo-individual`)
      await page.waitForTimeout(2000)
      const card = await page.$('[role="button"]')
      if (card) await card.click()
      await page.waitForTimeout(2000)
      // Scroll al historial
      await page.evaluate(() => {
        const historyTitle = Array.from(document.querySelectorAll('h3')).find(
          (el) => el.textContent?.includes('Historial')
        )
        if (historyTitle) historyTitle.scrollIntoView()
      })
      await page.waitForTimeout(500)
    },
  },
]

async function main() {
  console.log('📸 Capturador de pantallas - Desarrollo Individual\n')

  // Crear directorio
  await mkdir(IMAGES_DIR, { recursive: true })

  // Lanzar navegador
  const browser = await chromium.launch()
  const context = await browser.createBrowserContext()
  const page = await context.newPage()

  // Configurar viewport
  page.setViewportSize({ width: 1280, height: 720 })

  for (const screen of SCREENS) {
    try {
      console.log(`📷 Capturando: ${screen.label}...`)

      // Login si es necesario (ajusta según tu flujo de autenticación)
      await page.goto(`${BASE_URL}/login`, { waitUntil: 'load' })
      await page.waitForTimeout(1000)
      // Si hay formulario de login, rellénalo aquí
      // await page.fill('input[type="email"]', 'test@example.com')
      // await page.fill('input[type="password"]', 'password123')
      // await page.click('button[type="submit"]')
      // await page.waitForNavigation()

      // Navegar a la pantalla específica
      await screen.navigate(page)

      // Capturar pantalla
      const filepath = join(IMAGES_DIR, `${screen.name}.png`)
      await page.screenshot({ path: filepath, fullPage: false })

      console.log(`  ✓ Guardado: ${filepath}\n`)
    } catch (error) {
      console.error(`  ❌ Error: ${error}\n`)
    }
  }

  await browser.close()
  console.log(`✨ Capturas completadas en: ${IMAGES_DIR}`)
  console.log('💡 Tip: Ahora puedes editar las imágenes o usarlas con generate-video.sh')
}

main().catch(console.error)
