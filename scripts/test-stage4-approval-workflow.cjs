/**
 * STAGE 4 — HIERARCHICAL APPROVAL WORKFLOW VERIFICATION
 * 20-Point Test Matrix:
 *  1. Organisasi A submit Program.
 *  2. Organisasi A self-approve -> DENIED.
 *  3. Seksi parent approve -> ALLOWED.
 *  4. Waka ancestor approve -> ALLOWED.
 *  5. Kepala Pengurus ancestor approve -> ALLOWED.
 *  6. Sibling approve -> DENIED.
 *  7. Unrelated branch approve -> DENIED.
 *  8. Child/descendant approve parent -> DENIED.
 *  9. User tanpa permission approve -> DENIED.
 * 10. Superadmin -> sesuai policy global.
 * 11. Approval tidak mengubah organization_id.
 * 12. Approval tidak mengubah executor/submitter.
 * 13. approved_by tersimpan.
 * 14. approved_by_organization_id tersimpan.
 * 15. approved_at tersimpan.
 * 16. Refresh tetap mempertahankan approval.
 * 17. Logout/login tetap mempertahankan approval.
 * 18. Account holder berganti -> histori approval tetap utuh.
 * 19. Direct unauthorized service call -> DENIED.
 * 20. UI visibility dan service authorization konsisten.
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

async function runStage4Verification() {
  console.log('====================================================================')
  console.log('STAGE 4: HIERARCHICAL APPROVAL WORKFLOW VERIFICATION SUITE')
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

    const testSuiteResult = await page.evaluate(async () => {
      const { dataService } = await import('/src/lib/dataService.ts')
      const { canApproveProgram, assertCanApproveProgram } = await import('/src/lib/authorization.ts')

      const stepResults = []

      // 1. SETUP HIERARCHY TEST FIXTURES
      // Kepala Pengurus (Level 0)
      //   -> Waka 1 (Level 1)
      //       -> Seksi 1 (Level 2)
      //           -> Organisasi A (Level 3)
      //           -> Organisasi B (Level 3 - Sibling)
      //   -> Waka 2 (Level 1)
      //       -> Seksi 2 (Level 2 - Unrelated branch)
      //           -> Organisasi C (Level 3)

      const orgKepalaId = '11111111-1111-1111-1111-111111111111'
      const orgWaka1Id = '22222222-2222-2222-2222-222222222222'
      const orgWaka2Id = '22222222-2222-2222-2222-222222222223'
      const orgSeksi1Id = '33333333-3333-3333-3333-333333333333'
      const orgSeksi2Id = '33333333-3333-3333-3333-333333333334'
      const orgAId = '44444444-4444-4444-4444-444444444441'
      const orgBId = '44444444-4444-4444-4444-444444444442'
      const orgCId = '44444444-4444-4444-4444-444444444443'

      const testOrgs = [
        { id: orgKepalaId, name: 'Kepala Pengurus Pesantren', unit_type: 'kepala_pengurus', parent_id: null, status: 'active' },
        { id: orgWaka1Id, name: 'Waka 1 Bidang Kurikulum', unit_type: 'waka', parent_id: orgKepalaId, status: 'active' },
        { id: orgWaka2Id, name: 'Waka 2 Bidang Sarpras', unit_type: 'waka', parent_id: orgKepalaId, status: 'active' },
        { id: orgSeksi1Id, name: 'Seksi Pendidikan', unit_type: 'seksi', parent_id: orgWaka1Id, status: 'active' },
        { id: orgSeksi2Id, name: 'Seksi Sarana Prasarana', unit_type: 'seksi', parent_id: orgWaka2Id, status: 'active' },
        { id: orgAId, name: 'Organisasi Bahasa A', unit_type: 'organisasi', parent_id: orgSeksi1Id, status: 'active' },
        { id: orgBId, name: 'Organisasi Olahraga B', unit_type: 'organisasi', parent_id: orgSeksi1Id, status: 'active' },
        { id: orgCId, name: 'Organisasi Logistik C', unit_type: 'organisasi', parent_id: orgSeksi2Id, status: 'active' },
      ]

      localStorage.setItem('filament_demo_v3_shared_organizations', JSON.stringify(testOrgs))
      dataService.reloadSharedStructural()

      // SETUP TEST ACCOUNTS
      const userOrgA = {
        id: 'user-org-a',
        name: 'Account Unit Organisasi A',
        email: 'admin.orga@pesantren.id',
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

      const userOrgB = {
        id: 'user-org-b',
        name: 'Account Unit Organisasi B (Sibling)',
        email: 'admin.orgb@pesantren.id',
        role: 'admin',
        status: 'active',
        active_membership: {
          id: 'mem-org-b',
          user_id: 'user-org-b',
          organization_id: orgBId,
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

      const userSeksi1 = {
        id: 'user-seksi-1',
        name: 'Account Unit Seksi 1 (Parent)',
        email: 'admin.seksi1@pesantren.id',
        role: 'admin',
        status: 'active',
        active_membership: {
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
        }
      }

      const userWaka1 = {
        id: 'user-waka-1',
        name: 'Account Unit Waka 1 (Ancestor)',
        email: 'admin.waka1@pesantren.id',
        role: 'admin',
        status: 'active',
        active_membership: {
          id: 'mem-waka-1',
          user_id: 'user-waka-1',
          organization_id: orgWaka1Id,
          role_id: 'role-ketua',
          status: 'active',
          role: {
            id: 'role-ketua',
            name: 'Waka / Pimpinan',
            status: 'active',
            permissions: ['Program.viewAny', 'Program.view', 'Program.update']
          }
        }
      }

      const userKepala = {
        id: 'user-kepala',
        name: 'Account Unit Kepala Pengurus (Top Ancestor)',
        email: 'kepala@pesantren.id',
        role: 'admin',
        status: 'active',
        active_membership: {
          id: 'mem-kepala',
          user_id: 'user-kepala',
          organization_id: orgKepalaId,
          role_id: 'role-ketua',
          status: 'active',
          role: {
            id: 'role-ketua',
            name: 'Kepala Pengurus',
            status: 'active',
            permissions: ['Program.viewAny', 'Program.view', 'Program.update']
          }
        }
      }

      const userSeksi2 = {
        id: 'user-seksi-2',
        name: 'Account Unit Seksi 2 (Unrelated Branch)',
        email: 'admin.seksi2@pesantren.id',
        role: 'admin',
        status: 'active',
        active_membership: {
          id: 'mem-seksi-2',
          user_id: 'user-seksi-2',
          organization_id: orgSeksi2Id,
          role_id: 'role-seksi',
          status: 'active',
          role: {
            id: 'role-seksi',
            name: 'Seksi',
            status: 'active',
            permissions: ['Program.viewAny', 'Program.view', 'Program.update']
          }
        }
      }

      const userNoPermSeksi1 = {
        id: 'user-noperm-seksi1',
        name: 'Personel Seksi 1 (No Update Permission)',
        email: 'staff.seksi1@pesantren.id',
        role: 'member',
        status: 'active',
        active_membership: {
          id: 'mem-noperm-seksi-1',
          user_id: 'user-noperm-seksi1',
          organization_id: orgSeksi1Id,
          role_id: 'role-personel',
          status: 'active',
          role: {
            id: 'role-personel',
            name: 'Personel',
            status: 'active',
            permissions: ['Program.viewAny', 'Program.view'] // NO Program.update
          }
        }
      }

      const userSuperadmin = {
        id: 'user-superadmin',
        name: 'Superadmin Sistem',
        email: 'superadmin@pesantren.id',
        role: 'superadmin',
        is_superadmin: true,
        status: 'active'
      }

      // Ensure mock programs are clean
      localStorage.setItem('filament_demo_v3_shared_programs', JSON.stringify([]))
      dataService.reloadSharedStructural()

      // TEST 1: Organisasi A submit Program
      const createdProg = await dataService.createProgram({
        organization_id: orgAId,
        section_id: 'sec-dummy',
        title: 'Program Pelatihan Bahasa Arab',
        code: 'PROG-BA-01',
        duration_type: 'terbatas',
        status: 'draft',
        start_date: '2026-03-01',
        end_date: '2026-06-01',
        budget_allocated: 5000000
      }, userOrgA)

      const submittedProg = await dataService.transitionProgramStatus(createdProg.id, 'submitted', userOrgA)
      stepResults.push({
        num: 1,
        name: 'Organisasi A submit Program',
        pass: submittedProg.status === 'submitted' && submittedProg.organization_id === orgAId,
        detail: `status=${submittedProg.status}, org=${submittedProg.organization_id}`
      })

      // TEST 2: Organisasi A self-approve -> DENIED
      let selfApproveDenied = false
      try {
        await dataService.transitionProgramStatus(submittedProg.id, 'approved', userOrgA)
      } catch (err) {
        selfApproveDenied = err.message.includes('Self-Approval') || err.message.includes('Akses ditolak')
      }
      stepResults.push({
        num: 2,
        name: 'Organisasi A self-approve -> DENIED',
        pass: selfApproveDenied,
        detail: `selfApproveDenied=${selfApproveDenied}`
      })

      // TEST 6: Sibling approve -> DENIED
      let siblingApproveDenied = false
      try {
        await dataService.transitionProgramStatus(submittedProg.id, 'approved', userOrgB)
      } catch (err) {
        siblingApproveDenied = err.message.includes('bukan merupakan atasan') || err.message.includes('Akses ditolak')
      }
      stepResults.push({
        num: 6,
        name: 'Sibling approve -> DENIED',
        pass: siblingApproveDenied,
        detail: `siblingApproveDenied=${siblingApproveDenied}`
      })

      // TEST 7: Unrelated branch approve -> DENIED
      let unrelatedBranchDenied = false
      try {
        await dataService.transitionProgramStatus(submittedProg.id, 'approved', userSeksi2)
      } catch (err) {
        unrelatedBranchDenied = err.message.includes('bukan merupakan atasan') || err.message.includes('Akses ditolak')
      }
      stepResults.push({
        num: 7,
        name: 'Unrelated branch approve -> DENIED',
        pass: unrelatedBranchDenied,
        detail: `unrelatedBranchDenied=${unrelatedBranchDenied}`
      })

      // TEST 8: Child/descendant approve parent -> DENIED
      // Create a program owned by Seksi 1
      const seksiProg = await dataService.createProgram({
        organization_id: orgSeksi1Id,
        section_id: 'sec-dummy',
        title: 'Program Kurikulum Terpadu Seksi',
        code: 'PROG-SEK-01',
        duration_type: 'terbatas',
        status: 'draft',
        start_date: '2026-03-01',
        end_date: '2026-08-01',
        budget_allocated: 10000000
      }, userSeksi1)
      await dataService.transitionProgramStatus(seksiProg.id, 'submitted', userSeksi1)

      let childApproveParentDenied = false
      try {
        // Organisasi A (child) tries to approve Seksi 1's program
        await dataService.transitionProgramStatus(seksiProg.id, 'approved', userOrgA)
      } catch (err) {
        childApproveParentDenied = err.message.includes('bukan merupakan atasan') || err.message.includes('Akses ditolak')
      }
      stepResults.push({
        num: 8,
        name: 'Child/descendant approve parent -> DENIED',
        pass: childApproveParentDenied,
        detail: `childApproveParentDenied=${childApproveParentDenied}`
      })

      // TEST 9: User tanpa permission approve -> DENIED
      let userNoPermDenied = false
      try {
        await dataService.transitionProgramStatus(submittedProg.id, 'approved', userNoPermSeksi1)
      } catch (err) {
        userNoPermDenied = err.message.includes('permission') || err.message.includes('Akses ditolak')
      }
      stepResults.push({
        num: 9,
        name: 'User tanpa permission approve -> DENIED',
        pass: userNoPermDenied,
        detail: `userNoPermDenied=${userNoPermDenied}`
      })

      // TEST 3: Seksi parent approve -> ALLOWED
      const approvedBySeksi = await dataService.transitionProgramStatus(submittedProg.id, 'approved', userSeksi1)
      stepResults.push({
        num: 3,
        name: 'Seksi parent approve -> ALLOWED',
        pass: approvedBySeksi.status === 'approved',
        detail: `status=${approvedBySeksi.status}`
      })

      // TEST 11: Approval tidak mengubah organization_id
      const orgIdUnchanged = approvedBySeksi.organization_id === orgAId
      stepResults.push({
        num: 11,
        name: 'Approval tidak mengubah organization_id',
        pass: orgIdUnchanged,
        detail: `expected=${orgAId}, actual=${approvedBySeksi.organization_id}`
      })

      // TEST 12: Approval tidak mengubah executor/submitter
      const executorUnchanged = approvedBySeksi.created_by === userOrgA.id &&
                                approvedBySeksi.title === 'Program Pelatihan Bahasa Arab' &&
                                approvedBySeksi.code === 'PROG-BA-01'
      stepResults.push({
        num: 12,
        name: 'Approval tidak mengubah executor/submitter',
        pass: executorUnchanged,
        detail: `created_by=${approvedBySeksi.created_by}`
      })

      // TEST 13: approved_by tersimpan
      const approvedBySaved = approvedBySeksi.approved_by === userSeksi1.id
      stepResults.push({
        num: 13,
        name: 'approved_by tersimpan',
        pass: approvedBySaved,
        detail: `approved_by=${approvedBySeksi.approved_by}`
      })

      // TEST 14: approved_by_organization_id tersimpan
      const approvedByOrgSaved = approvedBySeksi.approved_by_organization_id === orgSeksi1Id
      stepResults.push({
        num: 14,
        name: 'approved_by_organization_id tersimpan',
        pass: approvedByOrgSaved,
        detail: `approved_by_organization_id=${approvedBySeksi.approved_by_organization_id}`
      })

      // TEST 15: approved_at tersimpan
      const approvedAtValid = typeof approvedBySeksi.approved_at === 'string' &&
                              !isNaN(Date.parse(approvedBySeksi.approved_at))
      stepResults.push({
        num: 15,
        name: 'approved_at tersimpan',
        pass: approvedAtValid,
        detail: `approved_at=${approvedBySeksi.approved_at}`
      })

      // TEST 4: Waka ancestor approve -> ALLOWED
      // Create new program by Org A to test Waka approval
      const prog2 = await dataService.createProgram({
        organization_id: orgAId,
        section_id: 'sec-dummy',
        title: 'Program Pertukaran Santri',
        code: 'PROG-BA-02',
        duration_type: 'terbatas',
        status: 'draft',
        start_date: '2026-04-01',
        end_date: '2026-07-01',
        budget_allocated: 7500000
      }, userOrgA)
      await dataService.transitionProgramStatus(prog2.id, 'submitted', userOrgA)
      const approvedByWaka = await dataService.transitionProgramStatus(prog2.id, 'approved', userWaka1)
      stepResults.push({
        num: 4,
        name: 'Waka ancestor approve -> ALLOWED',
        pass: approvedByWaka.status === 'approved' && approvedByWaka.approved_by_organization_id === orgWaka1Id,
        detail: `status=${approvedByWaka.status}, approverOrg=${approvedByWaka.approved_by_organization_id}`
      })

      // TEST 5: Kepala Pengurus ancestor approve -> ALLOWED
      const prog3 = await dataService.createProgram({
        organization_id: orgAId,
        section_id: 'sec-dummy',
        title: 'Program Beasiswa Santri Unggul',
        code: 'PROG-BA-03',
        duration_type: 'terbatas',
        status: 'draft',
        start_date: '2026-05-01',
        end_date: '2026-10-01',
        budget_allocated: 12000000
      }, userOrgA)
      await dataService.transitionProgramStatus(prog3.id, 'submitted', userOrgA)
      const approvedByKepala = await dataService.transitionProgramStatus(prog3.id, 'approved', userKepala)
      stepResults.push({
        num: 5,
        name: 'Kepala Pengurus ancestor approve -> ALLOWED',
        pass: approvedByKepala.status === 'approved' && approvedByKepala.approved_by_organization_id === orgKepalaId,
        detail: `status=${approvedByKepala.status}, approverOrg=${approvedByKepala.approved_by_organization_id}`
      })

      // TEST 10: Superadmin -> sesuai policy global
      const prog4 = await dataService.createProgram({
        organization_id: orgAId,
        section_id: 'sec-dummy',
        title: 'Program Digitalisasi Pesantren',
        code: 'PROG-BA-04',
        duration_type: 'terbatas',
        status: 'draft',
        start_date: '2026-06-01',
        end_date: '2026-12-01',
        budget_allocated: 20000000
      }, userOrgA)
      await dataService.transitionProgramStatus(prog4.id, 'submitted', userOrgA)
      const approvedBySuper = await dataService.transitionProgramStatus(prog4.id, 'approved', userSuperadmin)
      stepResults.push({
        num: 10,
        name: 'Superadmin -> sesuai policy global',
        pass: approvedBySuper.status === 'approved',
        detail: `status=${approvedBySuper.status}, approver=${approvedBySuper.approved_by}`
      })

      // TEST 18: Account holder berganti -> histori approval tetap utuh
      // Simulate account holder update for user-seksi-1
      const personA = await dataService.createPerson({
        full_name: 'Ustadz Ahmad Al-Farisi',
        nik: '3501010101010001',
        phone: '081234567890'
      }, userSuperadmin)

      const personB = await dataService.createPerson({
        full_name: 'Ustadz Burhanudin Zaki',
        nik: '3501010101010002',
        phone: '081234567891'
      }, userSuperadmin)

      await dataService.addAccountHolderHistory({
        account_id: userSeksi1.id,
        person_id: personA.id,
        assigned_at: new Date().toISOString(),
        notes: 'Penunjukan Awal'
      })
      await dataService.addAccountHolderHistory({
        account_id: userSeksi1.id,
        person_id: personB.id,
        assigned_at: new Date().toISOString(),
        notes: 'Pergantian Pemegang Akun Resmi'
      })

      // Verify program 1 approved by userSeksi1 still has intact approval history
      const fetchedProg1 = await dataService.getProgramById(createdProg.id, userSuperadmin)
      const historyIntact = fetchedProg1.approved_by === userSeksi1.id &&
                            fetchedProg1.approved_by_organization_id === orgSeksi1Id &&
                            fetchedProg1.organization_id === orgAId &&
                            Boolean(fetchedProg1.approved_at)

      stepResults.push({
        num: 18,
        name: 'Account holder berganti -> histori approval tetap utuh',
        pass: historyIntact,
        detail: `approved_by=${fetchedProg1.approved_by}, approved_org=${fetchedProg1.approved_by_organization_id}, prog_org=${fetchedProg1.organization_id}`
      })

      // TEST 19: Direct unauthorized service call -> DENIED
      let directCallDenied = false
      try {
        // Organisasi B directly calls transition on seksiProg
        await dataService.transitionProgramStatus(seksiProg.id, 'approved', userOrgB)
      } catch (err) {
        directCallDenied = err.message.includes('Akses ditolak')
      }
      stepResults.push({
        num: 19,
        name: 'Direct unauthorized service call -> DENIED',
        pass: directCallDenied,
        detail: `directCallDenied=${directCallDenied}`
      })

      // TEST 20: UI visibility dan service authorization konsisten
      const uiCanOrgA = canApproveProgram(userOrgA, seksiProg, testOrgs) // Child trying to approve parent -> false
      const uiCanOrgBSelf = canApproveProgram(userOrgB, submittedProg, testOrgs) // Sibling -> false
      const uiCanSeksi1 = canApproveProgram(userSeksi1, prog4, testOrgs) // Parent on already approved -> false (status is approved, not submitted)
      
      // Submit a fresh program for testing canApproveProgram
      const freshProg = await dataService.createProgram({
        organization_id: orgAId,
        section_id: 'sec-dummy',
        title: 'Program Verifikasi UI',
        code: 'PROG-UI-01',
        duration_type: 'terbatas',
        status: 'draft',
        start_date: '2026-07-01',
        end_date: '2026-12-01'
      }, userOrgA)
      const freshSubmitted = await dataService.transitionProgramStatus(freshProg.id, 'submitted', userOrgA)

      const uiSubmitter = canApproveProgram(userOrgA, freshSubmitted, testOrgs) // Self-approval -> false
      const uiAncestor = canApproveProgram(userSeksi1, freshSubmitted, testOrgs) // Ancestor -> true
      const uiSibling = canApproveProgram(userOrgB, freshSubmitted, testOrgs) // Sibling -> false
      const uiUnrelated = canApproveProgram(userSeksi2, freshSubmitted, testOrgs) // Unrelated -> false

      const uiConsistent = (uiSubmitter === false) &&
                           (uiAncestor === true) &&
                           (uiSibling === false) &&
                           (uiUnrelated === false)

      stepResults.push({
        num: 20,
        name: 'UI visibility dan service authorization konsisten',
        pass: uiConsistent,
        detail: `self=${uiSubmitter}, ancestor=${uiAncestor}, sibling=${uiSibling}, unrelated=${uiUnrelated}`
      })

      return {
        stepResults,
        approvedProgId: createdProg.id,
        orgAId,
        orgSeksi1Id
      }
    })

    // Process browser in-memory test results
    for (const s of testSuiteResult.stepResults) {
      report(`Point ${s.num}: ${s.name}`, s.pass, s.detail)
    }

    // TEST 16: Refresh tetap mempertahankan approval
    console.log('\nTesting Point 16: Refresh browser page...')
    await page.reload({ waitUntil: 'networkidle0' })
    const refreshResult = await page.evaluate(async (progId, orgAId, orgSeksi1Id) => {
      const { dataService } = await import('/src/lib/dataService.ts')
      const prog = await dataService.getProgramById(progId, {
        id: 'user-superadmin',
        role: 'superadmin',
        is_superadmin: true,
        status: 'active'
      })

      return {
        status: prog?.status,
        orgId: prog?.organization_id,
        approvedByOrg: prog?.approved_by_organization_id,
        hasApprovedAt: Boolean(prog?.approved_at)
      }
    }, testSuiteResult.approvedProgId, testSuiteResult.orgAId, testSuiteResult.orgSeksi1Id)

    const point16Pass = refreshResult.status === 'approved' &&
                        refreshResult.orgId === testSuiteResult.orgAId &&
                        refreshResult.approvedByOrg === testSuiteResult.orgSeksi1Id &&
                        refreshResult.hasApprovedAt

    report('Point 16: Refresh tetap mempertahankan approval', point16Pass,
      `status=${refreshResult.status}, org=${refreshResult.orgId}, approvedByOrg=${refreshResult.approvedByOrg}, hasApprovedAt=${refreshResult.hasApprovedAt}`)

    // TEST 17: Logout/login tetap mempertahankan approval
    console.log('\nTesting Point 17: Logout / context switch...')
    const logoutLoginResult = await page.evaluate(async (progId, orgAId, orgSeksi1Id) => {
      sessionStorage.clear()
      const { dataService } = await import('/src/lib/dataService.ts')
      dataService.reloadSharedStructural()

      // Read as a newly logged in Seksi 1 admin
      const prog = await dataService.getProgramById(progId, {
        id: 'new-session-user',
        role: 'admin',
        status: 'active',
        active_membership: {
          id: 'mem-new',
          user_id: 'new-session-user',
          organization_id: orgSeksi1Id,
          role_id: 'role-seksi',
          status: 'active',
          role: {
            id: 'role-seksi',
            name: 'Seksi',
            status: 'active',
            permissions: ['Program.viewAny', 'Program.view']
          }
        }
      })

      return {
        status: prog?.status,
        orgId: prog?.organization_id,
        approvedByOrg: prog?.approved_by_organization_id,
        hasApprovedAt: Boolean(prog?.approved_at)
      }
    }, testSuiteResult.approvedProgId, testSuiteResult.orgAId, testSuiteResult.orgSeksi1Id)

    const point17Pass = logoutLoginResult.status === 'approved' &&
                        logoutLoginResult.orgId === testSuiteResult.orgAId &&
                        logoutLoginResult.approvedByOrg === testSuiteResult.orgSeksi1Id &&
                        logoutLoginResult.hasApprovedAt

    report('Point 17: Logout/login tetap mempertahankan approval', point17Pass,
      `status=${logoutLoginResult.status}, org=${logoutLoginResult.orgId}, approvedByOrg=${logoutLoginResult.approvedByOrg}`)

  } catch (err) {
    console.error('Fatal error during test suite execution:', err)
    allPassed = false
  } finally {
    await browser.close()
  }

  console.log('\n====================================================================')
  console.log(`STAGE 4 VERIFICATION SUMMARY: ${allPassed ? 'ALL TESTS PASSED (20/20)' : 'SOME TESTS FAILED'}`)
  console.log('====================================================================\n')

  if (!allPassed) {
    process.exit(1)
  }
}

runStage4Verification()
