/**
 * STAGE 3 — CORE DATA SERVICE & STORAGE NORMALIZATION VERIFICATION
 * Tests centralized shared operational store, hierarchy scope, descendant monitoring,
 * sibling isolation, person model, non-destructive migration, quarantine, and empty state.
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

async function runStage3Verification() {
  console.log('====================================================================')
  console.log('STAGE 3: CORE DATA SERVICE & STORAGE NORMALIZATION VERIFICATION')
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

  try {
    const page = await browser.newPage()
    await page.setViewport({ width: 1280, height: 800 })
    await page.goto('http://localhost:5173/login', { waitUntil: 'networkidle0' })

    // Execute verification suite directly within the browser context
    const testSuiteResult = await page.evaluate(async () => {
      // Access the Vite module system or globals
      const { dataService } = await import('/src/lib/dataService.ts')
      const { getPesantrenEchelonLevel } = await import('/src/lib/hierarchyService.ts')

      const stepResults = []

      // SETUP TEST HIERARCHY
      const kepalaPengurusId = '11111111-1111-1111-1111-111111111111'
      const waka1Id = '22222222-2222-2222-2222-222222222222'
      const seksi1Id = '33333333-3333-3333-3333-333333333333'
      const orgAId = '44444444-4444-4444-4444-444444444444'
      const orgBId = '55555555-5555-5555-5555-555555555555'

      const testOrgs = [
        {
          id: kepalaPengurusId,
          parent_id: null,
          unit_type: 'kepala_pengurus',
          level: 0,
          name: 'Kepala Pengurus Pesantren',
          code: 'KP-01',
          status: 'active',
          created_at: new Date().toISOString(),
        },
        {
          id: waka1Id,
          parent_id: kepalaPengurusId,
          unit_type: 'waka',
          level: 1,
          name: 'Waka 1 Bidang Ubudiyah',
          code: 'WAKA-01',
          status: 'active',
          created_at: new Date().toISOString(),
        },
        {
          id: seksi1Id,
          parent_id: waka1Id,
          unit_type: 'seksi',
          level: 2,
          name: 'Seksi Pengawal Ubudiyah',
          code: 'SEKSI-01',
          status: 'active',
          created_at: new Date().toISOString(),
        },
        {
          id: orgAId,
          parent_id: seksi1Id,
          unit_type: 'organisasi',
          level: 3,
          name: 'Organisasi Binaan A (Jamiyyah Qurro)',
          code: 'ORG-A',
          status: 'active',
          created_at: new Date().toISOString(),
        },
        {
          id: orgBId,
          parent_id: seksi1Id,
          unit_type: 'organisasi',
          level: 3,
          name: 'Organisasi Binaan B (Seksi Sholat Berjamaah)',
          code: 'ORG-B',
          status: 'active',
          created_at: new Date().toISOString(),
        },
      ]

      // Setup mock users for each unit
      const userSuperadmin = { id: '00000000-0000-0000-0000-000000000001', name: 'Superadmin', role: 'superadmin', is_superadmin: true, status: 'active', email: 'superadmin@pesantren.id', created_at: '' }

      // Save test organizations to shared store
      const currentOrgs = await dataService.getOrganizations()
      for (const org of testOrgs) {
        const found = currentOrgs.find((o) => o.id === org.id)
        if (!found) {
          await dataService.createOrganization(org, userSuperadmin)
        }
      }
      const userSeksi1 = {
        id: 'u-seksi-1',
        name: 'Akun Seksi 1',
        role: 'admin',
        is_superadmin: false,
        status: 'active',
        email: 'seksi1@pesantren.id',
        created_at: '',
        active_membership: {
          id: 'mem-seksi1',
          user_id: 'u-seksi-1',
          organization_id: seksi1Id,
          role_id: 'role-admin-org',
          status: 'active',
          role: { id: 'role-admin-org', name: 'Admin', status: 'active', permissions: ['Program.viewAny', 'Program.view', 'Program.create', 'Program.update', 'all'] }
        }
      }
      const userOrgA = {
        id: 'u-org-a-ahmad',
        name: 'Akun Org A (Ust Ahmad)',
        role: 'admin',
        is_superadmin: false,
        status: 'active',
        email: 'orga@pesantren.id',
        created_at: '',
        active_membership: {
          id: 'mem-orga',
          user_id: 'u-org-a-ahmad',
          organization_id: orgAId,
          role_id: 'role-admin-org',
          status: 'active',
          role: { id: 'role-admin-org', name: 'Admin', status: 'active', permissions: ['Program.viewAny', 'Program.view', 'Program.create', 'Program.update', 'all'] }
        }
      }
      const userOrgB = {
        id: 'u-org-b',
        name: 'Akun Org B',
        role: 'admin',
        is_superadmin: false,
        status: 'active',
        email: 'orgb@pesantren.id',
        created_at: '',
        active_membership: {
          id: 'mem-orgb',
          user_id: 'u-org-b',
          organization_id: orgBId,
          role_id: 'role-admin-org',
          status: 'active',
          role: { id: 'role-admin-org', name: 'Admin', status: 'active', permissions: ['Program.viewAny', 'Program.view', 'Program.create', 'Program.update', 'all'] }
        }
      }

      // TEST 1: Storage Centralization
      // Create Program for Organisasi A
      const programA = await dataService.createProgram(
        {
          organization_id: orgAId,
          title: 'Program Hifdzil Quran Terpadu',
          code: 'PRG-QA-01',
          duration_type: 'terbatas',
          start_date: '2026-03-01',
          end_date: '2026-06-30',
          budget_planned: 15000000,
          budget_allocated: 15000000,
          status: 'draft',
          section_id: 'sec-dummy-01',
        },
        userOrgA
      )

      // Verify stored in shared store
      const rawShared = localStorage.getItem('filament_demo_v3_shared_programs')
      const parsedShared = rawShared ? JSON.parse(rawShared) : []
      const foundInShared = parsedShared.find((p) => p.id === programA.id)
      stepResults.push({
        step: 'TEST 1: Storage Centralization',
        pass: !!foundInShared && foundInShared.organization_id === orgAId,
        detail: `Program saved into filament_demo_v3_shared_programs with org ID [${foundInShared?.organization_id}]`
      })

      // TEST 2: Descendant Monitoring by Atasan
      // Seksi 1 queries with mode 'descendants'
      const seksi1Programs = await dataService.getPrograms(
        { organizationId: seksi1Id, mode: 'descendants' },
        userSeksi1
      )
      const seksiCanSeeOrgA = seksi1Programs.some((p) => p.id === programA.id)
      stepResults.push({
        step: 'TEST 2: Descendant Monitoring by Atasan',
        pass: seksiCanSeeOrgA,
        detail: `Seksi 1 query returned ${seksi1Programs.length} programs, including Org A program [${programA.title}]`
      })

      // TEST 3: Sibling Isolation
      // Organisasi B queries its own scope
      const orgBPrograms = await dataService.getPrograms(
        { organizationId: orgBId, mode: 'own' },
        userOrgB
      )
      const orgBCanSeeOrgA = orgBPrograms.some((p) => p.id === programA.id)
      stepResults.push({
        step: 'TEST 3: Sibling Isolation',
        pass: !orgBCanSeeOrgA,
        detail: `Org B cannot see Org A program (returned ${orgBPrograms.length} programs)`
      })

      // TEST 4: Ownership Continuity Across Person Replacement
      // Simulate Person Ahmad being replaced by Person Budi for Organisasi A
      const userOrgA_Budi = {
        id: 'u-org-a-budi',
        name: 'Akun Org A (Ust Budi Baru)',
        role: 'admin',
        is_superadmin: false,
        status: 'active',
        email: 'orga@pesantren.id',
        created_at: '',
        active_membership: {
          id: 'mem-orga-2',
          user_id: 'u-org-a-budi',
          organization_id: orgAId,
          role_id: 'role-admin-org',
          status: 'active',
          role: { id: 'role-admin-org', name: 'Admin', status: 'active', permissions: ['Program.viewAny', 'Program.view', 'all'] }
        }
      }

      const orgAProgramsAfterPersonChange = await dataService.getPrograms(
        { organizationId: orgAId, mode: 'own' },
        userOrgA_Budi
      )
      const budiCanSeePastProgram = orgAProgramsAfterPersonChange.some((p) => p.id === programA.id)
      stepResults.push({
        step: 'TEST 4: Ownership Continuity Across Person Replacement',
        pass: budiCanSeePastProgram,
        detail: `Person Budi successfully retrieved Organisasi A's past program without data loss`
      })

      // TEST 5: Non-Destructive Migration & Idempotency
      // Create legacy partitioned store for a legacy user
      const legacyUserId = '88888888-8888-8888-8888-888888888888'
      const legacyProgram = {
        id: 'prog-legacy-valid-01',
        organization_id: orgAId,
        title: 'Program Warisan Valid',
        code: 'PRG-LEGACY-01',
        duration_type: 'rutin',
        start_date: '2026-01-01',
        status: 'active',
      }
      localStorage.setItem(`filament_demo_v3_${legacyUserId}_programs`, JSON.stringify([legacyProgram]))

      // Run operational migration
      // Reset migration version marker to force migration scan
      localStorage.removeItem('filament_demo_v3_operational_migration_version')
      dataService.runOperationalMigration()

      // Verify legacy program is in shared store
      const sharedProgramsAfterMig = JSON.parse(localStorage.getItem('filament_demo_v3_shared_programs') || '[]')
      const legacyMigrated = sharedProgramsAfterMig.some((p) => p.id === 'prog-legacy-valid-01')

      // Verify old key is NOT deleted
      const oldKeyStillExists = !!localStorage.getItem(`filament_demo_v3_${legacyUserId}_programs`)

      // Run migration a second time (idempotency check)
      const countBeforeSecondRun = JSON.parse(localStorage.getItem('filament_demo_v3_shared_programs') || '[]').length
      dataService.runOperationalMigration()
      const countAfterSecondRun = JSON.parse(localStorage.getItem('filament_demo_v3_shared_programs') || '[]').length
      const idempotent = countBeforeSecondRun === countAfterSecondRun

      stepResults.push({
        step: 'TEST 5: Non-Destructive Migration & Idempotency',
        pass: legacyMigrated && oldKeyStillExists && idempotent,
        detail: `Legacy program migrated: ${legacyMigrated}, Old key preserved: ${oldKeyStillExists}, Idempotent: ${idempotent}`
      })

      // TEST 6: Quarantine for Unresolved Records
      const unresolvableUserId = '77777777-7777-7777-7777-777777777777'
      const unresolvableProgram = {
        id: 'prog-unresolved-ghost-01',
        // NO organization_id
        title: 'Program Tanpa Organisasi',
        code: 'PRG-GHOST',
        status: 'draft',
      }
      localStorage.setItem(`filament_demo_v3_${unresolvableUserId}_programs`, JSON.stringify([unresolvableProgram]))

      // Reset version marker and re-run migration
      localStorage.removeItem('filament_demo_v3_operational_migration_version')
      dataService.runOperationalMigration()

      // Inspect quarantine
      const quarantineReport = await dataService.getQuarantineReport()
      const quarantinePrograms = await dataService.getQuarantineRecords('programs')

      const foundInQuarantine = quarantinePrograms.some((p) => p.id === 'prog-unresolved-ghost-01')
      const foundInReport = quarantineReport.some((r) => r.item_id === 'prog-unresolved-ghost-01')
      const sharedDidNotTakeGhost = !JSON.parse(localStorage.getItem('filament_demo_v3_shared_programs') || '[]').some((p) => p.id === 'prog-unresolved-ghost-01')

      stepResults.push({
        step: 'TEST 6: Quarantine for Unresolved Records',
        pass: foundInQuarantine && foundInReport && sharedDidNotTakeGhost,
        detail: `Unresolved record placed in quarantine store: ${foundInQuarantine}, Logged in report: ${foundInReport}, Excluded from shared store: ${sharedDidNotTakeGhost}`
      })

      // TEST 7: Empty State & Graceful Termination
      const brandNewOrgId = '66666666-6666-6666-6666-666666666666'
      const emptyUser = {
        id: 'u-empty',
        name: 'User Kosong',
        role: 'admin',
        is_superadmin: false,
        status: 'active',
        email: 'empty@pesantren.id',
        active_membership: {
          id: 'mem-empty',
          user_id: 'u-empty',
          organization_id: brandNewOrgId,
          role_id: 'role-admin-org',
          status: 'active',
          role: { id: 'role-admin-org', name: 'Admin', status: 'active', permissions: ['Program.viewAny', 'Agenda.viewAny', 'Task.viewAny', 'Finance.viewAny', 'Report.viewAny', 'Performance.viewAny', 'all'] }
        }
      }

      const emptyPrograms = await dataService.getPrograms({ organizationId: brandNewOrgId, mode: 'own' }, emptyUser)
      const emptyAgendas = await dataService.getAgendas({ organizationId: brandNewOrgId, mode: 'own' }, undefined, emptyUser)
      const emptyTasks = await dataService.getTasks({ organizationId: brandNewOrgId, mode: 'own' }, undefined, emptyUser)
      const emptyReports = await dataService.getReports({ organizationId: brandNewOrgId, mode: 'own' }, undefined, emptyUser)
      const emptyBudgets = await dataService.getBudgets({ organizationId: brandNewOrgId, mode: 'own' }, undefined, emptyUser)

      const emptyClean =
        Array.isArray(emptyPrograms) && emptyPrograms.length === 0 &&
        Array.isArray(emptyAgendas) && emptyAgendas.length === 0 &&
        Array.isArray(emptyTasks) && emptyTasks.length === 0 &&
        Array.isArray(emptyReports) && emptyReports.length === 0 &&
        Array.isArray(emptyBudgets) && emptyBudgets.length === 0

      stepResults.push({
        step: 'TEST 7: Empty State & Graceful Termination',
        pass: emptyClean,
        detail: 'All operational endpoints returned empty arrays cleanly without infinite loops or hanging promises'
      })

      // TEST 8: Person & AccountHolderHistory Model (Model A)
      const newPerson = await dataService.createPerson({
        name: 'Ust. Zulkifli Rahman, M.Pd.',
        identifier: 'NIS-2024-001',
        phone: '081299988877',
        email: 'zulkifli@pesantren.id',
        status: 'active',
      }, userSuperadmin)

      const newHistory = await dataService.addAccountHolderHistory({
        account_id: 'u-org-a-ahmad',
        organization_id: orgAId,
        person_id: newPerson.id,
        person_name: newPerson.name,
        period_start: '2026-03-01',
        handover_notes: 'Serah terima jabatan ketua Jamiyyah Qurro periode 2026',
        created_by: userSuperadmin.id,
      })

      const allPersons = await dataService.getPersons()
      const allHistories = await dataService.getAccountHolderHistories('u-org-a-ahmad')

      const personStored = allPersons.some((p) => p.id === newPerson.id)
      const historyStored = allHistories.some((h) => h.id === newHistory.id)

      stepResults.push({
        step: 'TEST 8: Person & AccountHolderHistory Model (Model A)',
        pass: personStored && historyStored,
        detail: `Person created: ${newPerson.name}, History logged with account ${newHistory.account_id}`
      })

      // TEST 9: Pesantren Echelon Level Helper
      const kpLevel = getPesantrenEchelonLevel('kepala_pengurus')
      const wakaLevel = getPesantrenEchelonLevel('waka')
      const seksiLevel = getPesantrenEchelonLevel('seksi')
      const orgLevel = getPesantrenEchelonLevel('organisasi')

      const echelonCorrect = kpLevel === 0 && wakaLevel === 1 && seksiLevel === 2 && orgLevel === 3
      stepResults.push({
        step: 'TEST 9: Pesantren Echelon Level Helper',
        pass: echelonCorrect,
        detail: `Levels resolved: KP=${kpLevel}, Waka=${wakaLevel}, Seksi=${seksiLevel}, Org=${orgLevel}`
      })

      return stepResults
    })

    for (const r of testSuiteResult) {
      report(r.step, r.pass, r.detail)
    }

  } catch (err) {
    report('Test Suite Execution', false, err.message)
  } finally {
    await browser.close()
  }

  console.log('\n====================================================================')
  console.log(`FINAL RESULT: ${allPassed ? 'ALL STAGE 3 TESTS PASSED (100%)' : 'SOME TESTS FAILED'}`)
  console.log('====================================================================')

  if (!allPassed) {
    process.exit(1)
  }
}

runStage3Verification()
