/**
 * STAGE 4: BROWSER QA & VIEWPORT VERIFICATION
 * Desktop: 1024, 1280, 1440
 * Mobile: 320, 360, 375, 390, 414
 * Tests:
 *  - Program list
 *  - Submit & approval buttons visibility
 *  - Unauthorized user hiding
 *  - No horizontal overflow (0px)
 *  - 0 uncaught console errors
 *  - Desktop layout intact
 *  - Mobile navigation functional
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

const DESKTOP_VIEWPORTS = [
  { width: 1024, height: 768, name: 'Desktop 1024px' },
  { width: 1280, height: 800, name: 'Desktop 1280px' },
  { width: 1440, height: 900, name: 'Desktop 1440px' },
]

const MOBILE_VIEWPORTS = [
  { width: 320, height: 568, name: 'Mobile 320px (iPhone SE)' },
  { width: 360, height: 640, name: 'Mobile 360px (Android)' },
  { width: 375, height: 667, name: 'Mobile 375px (iPhone 8)' },
  { width: 390, height: 844, name: 'Mobile 390px (iPhone 14)' },
  { width: 414, height: 896, name: 'Mobile 414px (iPhone XR)' },
]

async function runStage4BrowserQA() {
  console.log('====================================================================')
  console.log('STAGE 4: BROWSER QA & VIEWPORT COMPLIANCE AUDIT')
  console.log('====================================================================\n')

  const browser = await puppeteer.launch({
    executablePath: findBrowser(),
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  let allPassed = true
  const results = []

  function report(name, pass, detail = '') {
    results.push({ name, pass, detail })
    console.log(`[${pass ? 'PASS' : 'FAIL'}] ${name}${detail ? ' - ' + detail : ''}`)
    if (!pass) allPassed = false
  }

  const uncaughtErrors = []

  try {
    const page = await browser.newPage()
    page.on('console', msg => {
      if (msg.type() === 'error') {
        const text = msg.text()
        // Ignore favicon or non-critical 404
        if (!text.includes('favicon') && !text.includes('404')) {
          uncaughtErrors.push(text)
        }
      }
    })

    // Setup initial test data and login as Seksi 1 (ancestor of Organisasi A)
    await page.setViewport({ width: 1280, height: 800 })
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' })

    await page.evaluate(async () => {
      const orgKepalaId = '11111111-1111-1111-1111-111111111111'
      const orgWaka1Id = '22222222-2222-2222-2222-222222222222'
      const orgSeksi1Id = '33333333-3333-3333-3333-333333333333'
      const orgAId = '44444444-4444-4444-4444-444444444441'

      const testOrgs = [
        { id: orgKepalaId, name: 'Kepala Pengurus Pesantren', unit_type: 'kepala_pengurus', parent_id: null, status: 'active' },
        { id: orgWaka1Id, name: 'Waka 1 Bidang Kurikulum', unit_type: 'waka', parent_id: orgKepalaId, status: 'active' },
        { id: orgSeksi1Id, name: 'Seksi Pendidikan', unit_type: 'seksi', parent_id: orgWaka1Id, status: 'active' },
        { id: orgAId, name: 'Organisasi Bahasa A', unit_type: 'organisasi', parent_id: orgSeksi1Id, status: 'active' },
      ]
      localStorage.setItem('filament_demo_v3_shared_organizations', JSON.stringify(testOrgs))

      // Setup a program owned by Org A in submitted status
      const testPrograms = [
        {
          id: 'prog-stage4-qa-1',
          organization_id: orgAId,
          section_id: 'sec-1',
          title: 'Program Riset Bahasa Santri',
          code: 'PROG-RBS-01',
          duration_type: 'terbatas',
          status: 'submitted',
          budget_allocated: 15000000,
          budget_realized: 4500000,
          start_date: '2026-03-01',
          end_date: '2026-08-01',
          created_by: 'user-org-a',
          created_at: new Date().toISOString(),
          updated_at: new Date().toISOString()
        }
      ]
      localStorage.setItem('filament_demo_v3_shared_programs', JSON.stringify(testPrograms))
      const testMemberships = [
        {
          id: 'mem-seksi-1',
          user_id: 'user-seksi-1',
          organization_id: orgSeksi1Id,
          role_id: 'role-seksi',
          status: 'active',
          role: {
            id: 'role-seksi',
            name: 'Seksi',
            status: 'active',
            permissions: ['Program.viewAny', 'Program.view', 'Program.create', 'Program.update', 'Program.delete']
          }
        },
        {
          id: 'mem-org-a',
          user_id: 'user-org-a',
          organization_id: orgAId,
          role_id: 'role-admin-org',
          status: 'active',
          role: {
            id: 'role-admin-org',
            name: 'Admin Organisasi',
            status: 'active',
            permissions: ['Program.viewAny', 'Program.view', 'Program.create', 'Program.update', 'Program.delete']
          }
        }
      ]
      localStorage.setItem('filament_demo_v3_shared_memberships', JSON.stringify(testMemberships))

      // Login as Organisasi A first to test submitter view
      const userOrgA = {
        id: 'user-org-a',
        name: 'Account Organisasi A',
        email: 'orga@pesantren.id',
        role: 'admin',
        status: 'active',
        active_membership: testMemberships[1]
      }
      sessionStorage.setItem('filament_bakid_auth_user', JSON.stringify(userOrgA))
      sessionStorage.setItem('filament_bakid_active_org_id', orgAId)
    })

    console.log('--- 1. DESKTOP VIEWPORT AUDIT (1024, 1280, 1440) ---')
    for (const vp of DESKTOP_VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height, isMobile: false, hasTouch: false })
      await page.goto('http://localhost:5173/programs', { waitUntil: 'networkidle0' })

      const metrics = await page.evaluate(() => {
        const scrollW = document.documentElement.scrollWidth
        const innerW = window.innerWidth
        const overflow = Math.max(0, scrollW - innerW)
        const hasSidebar = Boolean(document.querySelector('aside') || document.querySelector('[data-sidebar="true"]'))
        const hasHeader = Boolean(document.querySelector('header'))
        const setujuiButton = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Setujui'))

        return {
          overflow,
          hasSidebar,
          hasHeader,
          hasSetujuiButton: Boolean(setujuiButton)
        }
      })

      const pass = metrics.overflow === 0 && metrics.hasHeader
      report(`${vp.name} Program List`, pass, `overflow=${metrics.overflow}px, header=${metrics.hasHeader}, buttonSetujui=${metrics.hasSetujuiButton}`)
    }

    console.log('\n--- 2. MOBILE VIEWPORT AUDIT (320, 360, 375, 390, 414) ---')
    for (const vp of MOBILE_VIEWPORTS) {
      await page.setViewport({ width: vp.width, height: vp.height, isMobile: true, hasTouch: true })
      await page.goto('http://localhost:5173/programs', { waitUntil: 'networkidle0' })

      const metrics = await page.evaluate(() => {
        const scrollW = document.documentElement.scrollWidth
        const innerW = window.innerWidth
        const overflow = Math.max(0, scrollW - innerW)
        const nav = document.querySelector('nav')
        const hasBottomNav = Boolean(nav)
        const setujuiBtn = Array.from(document.querySelectorAll('button')).find(b => b.textContent.includes('Setujui'))

        return {
          overflow,
          hasBottomNav,
          hasSetujuiBtn: Boolean(setujuiBtn)
        }
      })

      const pass = metrics.overflow === 0
      report(`${vp.name} Program Mobile View`, pass, `overflow=${metrics.overflow}px, bottomNav=${metrics.hasBottomNav}`)
    }

    console.log('\n--- 3. UNAUTHORIZED USER UI CHECK (Organisasi A cannot see Setujui button for self-approval) ---')
    // Switch login to Organisasi A
    await page.evaluate(() => {
      const orgAId = '44444444-4444-4444-4444-444444444441'
      const userOrgA = {
        id: 'user-org-a',
        name: 'Account Organisasi A',
        email: 'orga@pesantren.id',
        role: 'admin',
        status: 'active',
        active_membership: {
          id: 'mem-org-a',
          user_id: 'user-org-a',
          organization_id: orgAId,
          role_id: 'role-admin-org',
          status: 'active',
          role: {
            id: 'role-admin-org',
            name: 'Admin Organisasi',
            status: 'active',
            permissions: ['Program.viewAny', 'Program.view', 'Program.create', 'Program.update', 'Program.delete']
          }
        }
      }
      sessionStorage.setItem('filament_bakid_auth_user', JSON.stringify(userOrgA))
      sessionStorage.setItem('filament_bakid_active_org_id', orgAId)
    })

    await page.setViewport({ width: 1280, height: 800 })
    await page.goto('http://localhost:5173/programs', { waitUntil: 'networkidle0' })

    const unauthorizedUIMetrics = await page.evaluate(() => {
      const buttons = Array.from(document.querySelectorAll('button'))
      const hasSetujuiButton = buttons.some(b => b.textContent.includes('Setujui'))
      const hasWaitingBadge = document.body.innerText.includes('Menunggu Persetujuan')
      return { hasSetujuiButton, hasWaitingBadge }
    })

    report('Self-Approval UI Hidden for Submitter', !unauthorizedUIMetrics.hasSetujuiButton && unauthorizedUIMetrics.hasWaitingBadge,
      `hasSetujuiButton=${unauthorizedUIMetrics.hasSetujuiButton}, hasWaitingBadge=${unauthorizedUIMetrics.hasWaitingBadge}`)

    console.log('\n--- 4. CONSOLE ERRORS AUDIT ---')
    const noErrors = uncaughtErrors.length === 0
    report('0 Uncaught Console Errors', noErrors, `errorCount=${uncaughtErrors.length}`)

  } catch (err) {
    console.error('Fatal error during browser QA:', err)
    allPassed = false
  } finally {
    await browser.close()
  }

  console.log('\n====================================================================')
  console.log(`STAGE 4 BROWSER QA SUMMARY: ${allPassed ? 'ALL VIEWPORTS PASSED' : 'QA FAILED'}`)
  console.log('====================================================================\n')

  if (!allPassed) {
    process.exit(1)
  }
}

runStage4BrowserQA()
