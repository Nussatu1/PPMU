const puppeteer = require('puppeteer-core')
const fs = require('fs')

const BROWSER_PATHS = [
  'C:\\Program Files (x86)\\Microsoft\\Edge\\Application\\msedge.exe',
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe',
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

async function runBrowserQA() {
  console.log('====================================================================')
  console.log('STAGE 5: INTERACTIVE BROWSER QA & MULTI-VIEWPORT VERIFICATION')
  console.log('====================================================================\n')

  const browser = await puppeteer.launch({
    executablePath: findBrowser(),
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  })

  let allPass = true
  const results = []

  for (const vp of VIEWPORTS) {
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
      // 1. Visit base to set auth session and seed data
      await page.goto(`${BASE}/`, { waitUntil: 'networkidle0', timeout: 15000 }).catch(() => {})
      await page.evaluate(() => {
        const orgId = '44444444-4444-4444-4444-444444444441'
        const superadminUser = {
          id: '00000000-0000-0000-0000-000000000001',
          name: 'Pengurus 1 (Pimpinan Harian)',
          email: 'pengurus1@bakid.ponpes.id',
          role: 'superadmin',
          is_superadmin: true,
          status: 'active'
        }
        const testOrg = {
          id: orgId,
          name: 'Organisasi Bahasa Arab',
          unit_type: 'organisasi',
          status: 'active'
        }
        const testPerson = {
          id: 'person-test-1',
          name: 'Ust. Ahmad Al-Farisi',
          identifier: '3501010101010001',
          phone: '081234567890',
          status: 'active'
        }
        const testAccount = {
          id: 'user-org-a',
          name: 'Admin Organisasi Bahasa',
          username: 'admin_orga',
          email: 'admin.orga@pesantren.id',
          role: 'admin',
          status: 'active',
          organization_id: orgId,
          holder_person_id: 'person-test-1',
          holder_name: 'Ust. Ahmad Al-Farisi',
          active_membership: {
            id: 'mem-org-a',
            user_id: 'user-org-a',
            organization_id: orgId,
            role_id: 'role-admin-org',
            status: 'active',
            role: {
              id: 'role-admin-org',
              name: 'Admin Organisasi',
              status: 'active',
              permissions: ['Admin.viewAny', 'Admin.view', 'Admin.update']
            }
          }
        }
        const testHistory = {
          id: 'hist-1',
          account_id: 'user-org-a',
          organization_id: orgId,
          person_id: 'person-test-1',
          person_name: 'Ust. Ahmad Al-Farisi',
          period_start: '2026-01-01',
          created_by: '00000000-0000-0000-0000-000000000001',
          created_at: '2026-01-01T00:00:00Z'
        }

        sessionStorage.setItem('filament_bakid_auth_user', JSON.stringify(superadminUser))
        localStorage.setItem('filament_bakid_auth_user', JSON.stringify(superadminUser))
        localStorage.setItem('filament_demo_v3_shared_organizations', JSON.stringify([testOrg]))
        localStorage.setItem('filament_demo_v3_shared_persons', JSON.stringify([testPerson]))
        localStorage.setItem('filament_demo_v3_shared_users', JSON.stringify([superadminUser, testAccount]))
        localStorage.setItem('filament_demo_v3_shared_memberships', JSON.stringify([testAccount.active_membership]))
        localStorage.setItem('filament_demo_v3_shared_account_holder_histories', JSON.stringify([testHistory]))
      })

      // 2. Navigate to accounts page
      await page.goto(`${BASE}/accounts`, { waitUntil: 'networkidle0', timeout: 15000 })
      await new Promise(r => setTimeout(r, 600))

      // 3. Check horizontal overflow on initial load
      const hasHorizontalOverflow = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
      })

      // 4. Verify Account list elements
      const listCheck = await page.evaluate(() => {
        const text = document.body.innerText
        const hasAccountHeading = text.includes('Akun Pengguna') || text.includes('Daftar Akun')
        const hasPemegang = text.includes('Ust. Ahmad Al-Farisi')
        return { hasAccountHeading, hasPemegang }
      })

      // 5. Trigger Handover modal
      let modalOpened = false
      let currentHolderVisible = false
      let historyTableVisible = false
      let actionFound = false

      // Click action menu button
      actionFound = await page.evaluate(() => {
        const btn = document.querySelector('button[title="Opsi Akun"]')
        if (btn) {
          btn.click()
          return true
        }
        return false
      })

      if (actionFound) {
        await new Promise(r => setTimeout(r, 400))
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
          await new Promise(r => setTimeout(r, 600))
          const modalInfo = await page.evaluate(() => {
            const body = document.body.innerText.toLowerCase()
            return {
              hasHeader: body.includes('serah terima pemegang akun') || body.includes('handover'),
              hasCurrentHolder: body.includes('ust. ahmad al-farisi'),
              hasHistory: body.includes('riwayat pemegang akun'),
              hasGantiButton: body.includes('lanjutkan serah terima') || body.includes('serah terima')
            }
          })
          currentHolderVisible = modalInfo.hasCurrentHolder
          historyTableVisible = modalInfo.hasHistory
        }
      }

      // Check overflow with modal open
      const overflowWithModal = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth
      })

      const passed = !hasHorizontalOverflow && 
                     !overflowWithModal && 
                     actionFound &&
                     modalOpened && 
                     currentHolderVisible && 
                     historyTableVisible && 
                     consoleErrors.length === 0

      results.push({
        viewport: vp.name,
        width: vp.width,
        height: vp.height,
        hasHorizontalOverflow,
        overflowWithModal,
        actionFound,
        modalOpened,
        currentHolderVisible,
        historyTableVisible,
        consoleErrorsCount: consoleErrors.length,
        errors: consoleErrors,
        pass: passed
      })

      if (!passed) allPass = false
      console.log(`[${passed ? 'PASS' : 'FAIL'}] ${vp.name} (${vp.width}x${vp.height}) - overflow: ${hasHorizontalOverflow}, modal: ${modalOpened}, currentHolder: ${currentHolderVisible}, history: ${historyTableVisible}, errors: ${consoleErrors.length}`)

    } catch (err) {
      console.error(`[FAIL] ${vp.name} error:`, err.message)
      results.push({
        viewport: vp.name,
        pass: false,
        error: err.message
      })
      allPass = false
    } finally {
      await page.close()
    }
  }

  await browser.close()

  console.log('\n====================================================================')
  console.log(`BROWSER QA SUMMARY: ${allPass ? 'ALL VIEWPORTS PASSED (8/8)' : 'SOME VIEWPORTS FAILED'}`)
  console.log('====================================================================')

  if (!allPass) {
    process.exit(1)
  }
}

runBrowserQA().catch(err => {
  console.error('Browser QA script failed:', err)
  process.exit(1)
})
