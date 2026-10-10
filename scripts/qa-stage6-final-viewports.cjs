/**
 * STAGE 6 — FINAL COMPREHENSIVE BROWSER QA & MULTI-VIEWPORT SUITE
 * Tests 11 (Mobile), 12 (Desktop), 13 (Core Modules), and Console Errors
 * 
 * Viewports:
 * - Desktop: 1024x768, 1280x800, 1440x900
 * - Mobile: 320x658, 360x740, 375x667, 390x844, 414x896
 * 
 * Routes:
 * - / (Dashboard)
 * - /programs
 * - /programs/create
 * - /agendas
 * - /finance
 * - /performance
 * - /reports
 * - /tasks
 * - /structures
 * - /accounts
 * - /menu
 */

const puppeteer = require('puppeteer-core')
const fs = require('fs')

const BROWSER_PATHS = [
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files (x86)\\Google\\Chrome\\Application\\chrome.exe',
  'C:\\Program Files\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
]

const findBrowser = () => {
  for (const p of BROWSER_PATHS) {
    if (fs.existsSync(p)) return p
  }
  throw new Error('No compatible Chromium browser found')
}

const BASE = process.env.AUDIT_BASE || 'http://localhost:5173'

const VIEWPORTS = [
  // Desktop
  { name: 'desktop-1024', width: 1024, height: 768, isMobile: false },
  { name: 'desktop-1280', width: 1280, height: 800, isMobile: false },
  { name: 'desktop-1440', width: 1440, height: 900, isMobile: false },
  // Mobile
  { name: 'mobile-320', width: 320, height: 658, isMobile: true },
  { name: 'mobile-360', width: 360, height: 740, isMobile: true },
  { name: 'mobile-375', width: 375, height: 667, isMobile: true },
  { name: 'mobile-390', width: 390, height: 844, isMobile: true },
  { name: 'mobile-414', width: 414, height: 896, isMobile: true },
]

const ROUTES = [
  '/',
  '/programs',
  '/programs/create',
  '/agendas',
  '/finance',
  '/performance',
  '/reports',
  '/tasks',
  '/structures',
  '/accounts',
  '/menu'
]

async function runStage6BrowserQA() {
  console.log('====================================================================')
  console.log('STAGE 6: FINAL MULTI-VIEWPORT BROWSER QA & CORE MODULE SMOKE TEST')
  console.log('====================================================================\n')

  const browser = await puppeteer.launch({
    executablePath: findBrowser(),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  let allPassed = true
  const results = []

  for (const vp of VIEWPORTS) {
    console.log(`\n--- TESTING VIEWPORT: ${vp.name} (${vp.width}x${vp.height}, mobile=${vp.isMobile}) ---`)
    const page = await browser.newPage()
    await page.setViewport({
      width: vp.width,
      height: vp.height,
      isMobile: vp.isMobile,
      hasTouch: vp.isMobile
    })

    const consoleErrors = []
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text()
        if (!text.includes('favicon.ico') && !text.includes('status of 404')) {
          consoleErrors.push(text)
        }
      }
    })
    page.on('pageerror', err => {
      consoleErrors.push(err.message)
    })

    try {
      // 1. Visit base and seed fixture session & data
      await page.goto(`${BASE}/`, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {})
      await page.evaluate(() => {
        const superadminUser = {
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Pengurus 1 (Pimpinan Harian)',
          email: 'pengurus1@bakid.ponpes.id',
          role: 'superadmin',
          is_superadmin: true,
          status: 'active'
        }
        sessionStorage.setItem('filament_bakid_auth_user', JSON.stringify(superadminUser))
        localStorage.setItem('filament_bakid_auth_user', JSON.stringify(superadminUser))

        const orgId = '44444444-4444-4444-4444-444444444441'
        const testOrg = { id: orgId, name: 'Organisasi Bahasa Arab', unit_type: 'organisasi', status: 'active' }
        const testPerson = { id: 'p-1', name: 'Ust. Ahmad Al-Farisi', identifier: '3501010101010001', status: 'active' }
        const testAccount = {
          id: 'u-1',
          name: 'Admin Organisasi Bahasa',
          username: 'admin_orga',
          email: 'admin.orga@pesantren.id',
          role: 'admin',
          status: 'active',
          organization_id: orgId,
          holder_person_id: 'p-1',
          holder_name: 'Ust. Ahmad Al-Farisi',
          active_membership: {
            id: 'mem-1',
            user_id: 'u-1',
            organization_id: orgId,
            role_id: 'role-admin',
            status: 'active',
            role: { id: 'role-admin', name: 'Admin', status: 'active', permissions: ['Admin.viewAny', 'Admin.update'] }
          }
        }
        const testHistory = {
          id: 'h-1',
          account_id: 'u-1',
          organization_id: orgId,
          person_id: 'p-1',
          person_name: 'Ust. Ahmad Al-Farisi',
          period_start: '2026-01-01',
          created_at: '2026-01-01T00:00:00Z'
        }

        localStorage.setItem('filament_demo_v3_shared_organizations', JSON.stringify([testOrg]))
        localStorage.setItem('filament_demo_v3_shared_persons', JSON.stringify([testPerson]))
        localStorage.setItem('filament_demo_v3_shared_users', JSON.stringify([superadminUser, testAccount]))
        localStorage.setItem('filament_demo_v3_shared_memberships', JSON.stringify([testAccount.active_membership]))
        localStorage.setItem('filament_demo_v3_shared_account_holder_histories', JSON.stringify([testHistory]))
      })

      // 2. Test all routes for horizontal overflow and clean rendering
      let routeOverflowCount = 0
      for (const route of ROUTES) {
        await page.goto(`${BASE}${route}`, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {})
        await new Promise(r => setTimeout(r, 200))
        const overflow = await page.evaluate(() => {
          return document.documentElement.scrollWidth > document.documentElement.clientWidth
        })
        if (overflow) {
          console.log(`  [OVERFLOW] Route ${route} has horizontal overflow on ${vp.name}`)
          routeOverflowCount++
        }
      }

      // 3. Test Handover Modal interaction on /accounts
      await page.goto(`${BASE}/accounts`, { waitUntil: 'networkidle0', timeout: 15000 })
      await new Promise(r => setTimeout(r, 400))

      let modalOpened = false
      let holderVisible = false
      let historyVisible = false

      // Click menu
      const actionClicked = await page.evaluate(() => {
        const btn = document.querySelector('button[title="Opsi Akun"]')
        if (btn) {
          btn.click()
          return true
        }
        return false
      })

      if (actionClicked) {
        await new Promise(r => setTimeout(r, 300))
        modalOpened = await page.evaluate(() => {
          const btns = Array.from(document.querySelectorAll('button'))
          const target = btns.find(b => b.innerText.includes('Serah Terima') || b.innerText.includes('Handover'))
          if (target) {
            target.click()
            return true
          }
          return false
        })

        if (modalOpened) {
          await new Promise(r => setTimeout(r, 500))
          const modalInfo = await page.evaluate(() => {
            const body = document.body.innerText.toLowerCase()
            return {
              hasHolder: body.includes('ust. ahmad al-farisi'),
              hasHistory: body.includes('riwayat pemegang akun')
            }
          })
          holderVisible = modalInfo.hasHolder
          historyVisible = modalInfo.hasHistory
        }
      }

      // Check overflow with modal open
      const overflowWithModal = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
      })

      const passed = routeOverflowCount === 0 && !overflowWithModal && modalOpened && holderVisible && historyVisible && consoleErrors.length === 0
      results.push({
        viewport: vp.name,
        routeOverflowCount,
        overflowWithModal,
        modalOpened,
        holderVisible,
        historyVisible,
        errorsCount: consoleErrors.length,
        pass: passed
      })

      if (!passed) allPassed = false
      console.log(`[${passed ? 'PASS' : 'FAIL'}] ${vp.name} - routeOverflows: ${routeOverflowCount}, modalOverflow: ${overflowWithModal}, modalOpened: ${modalOpened}, holder: ${holderVisible}, history: ${historyVisible}, consoleErrors: ${consoleErrors.length}`)

    } catch (err) {
      console.error(`[FAIL] ${vp.name} encountered error:`, err.message)
      allPassed = false
    } finally {
      await page.close()
    }
  }

  await browser.close()

  console.log('\n====================================================================')
  console.log(`FINAL BROWSER QA SUMMARY: ${allPassed ? 'ALL VIEWPORTS PASSED (8/8)' : 'SOME VIEWPORTS FAILED'}`)
  console.log('====================================================================')

  if (!allPassed) {
    process.exit(1)
  }
}

runStage6BrowserQA().catch(err => {
  console.error('Browser QA script failed:', err)
  process.exit(1)
})
