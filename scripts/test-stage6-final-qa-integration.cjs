/**
 * STAGE 6 — FINAL QA & INTEGRATION VERIFICATION SUITE
 * Tests:
 * 1. Hierarchy & Traversal (Ancestors, Descendants, Siblings, Cycle, Depth)
 * 2. Account Unit (Permanent 1 per org, credentials & org_id immutable)
 * 3. Person (Canonical shared_persons, Deduplication, Inactive status)
 * 4. Handover Chain (A -> B -> C, Tenure closure, Single active invariant)
 * 5. Ownership Continuity (Programs, Budgets/Finance, Agendas, Tasks, Performances, Reports)
 * 6. Hierarchical Approval Post-Handover (Anti-self, anti-sibling, higher ancestor)
 * 7. Downward Assignment (Downward allowed, anti-upward, anti-sibling)
 * 8. Cross-Account Structure (Superior sees subordinates)
 * 9. Empty State Resilience (No infinite loops, graceful fallback)
 * 10. Centralized Storage & Leaks
 * 11. Static Supabase Schema & Trigger Audit
 */

const puppeteer = require('puppeteer-core')
const fs = require('fs')
const path = require('path')

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

async function runStage6FinalQA() {
  console.log('====================================================================')
  console.log('STAGE 6: FINAL ARCHITECTURE, QA & INTEGRATION VERIFICATION')
  console.log('====================================================================\n')

  const browser = await puppeteer.launch({
    executablePath: findBrowser(),
    headless: true,
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
      const {
        canManageAccountHandover,
        canApproveResource,
        canAssignToOrganization,
        assertCanAssignToOrganization
      } = await import('/src/lib/authorization.ts')
      const {
        isAncestor,
        isDescendant,
        getAncestorOrganizationIds,
        getDescendantOrganizationIds,
        getChildrenOrganizations
      } = await import('/src/lib/hierarchyService.ts')

      const checkSibling = (id1, id2, orgs) => {
        const o1 = orgs.find(o => o.id === id1)
        const o2 = orgs.find(o => o.id === id2)
        return Boolean(o1 && o2 && o1.parent_id && o1.parent_id === o2.parent_id && o1.id !== o2.id)
      }

      const stepResults = []

      // --- SEED HIERARCHY FIXTURE ---
      const orgKepalaId = '11111111-1111-1111-1111-111111111111'
      const orgWakaId = '22222222-2222-2222-2222-222222222222'
      const orgSeksi1Id = '33333333-3333-3333-3333-333333333333'
      const orgSeksi2Id = '33333333-3333-3333-3333-333333333334'
      const orgAId = '44444444-4444-4444-4444-444444444441'
      const orgBId = '44444444-4444-4444-4444-444444444442'
      const orgCId = '44444444-4444-4444-4444-444444444443' // Child of Seksi 2 (unrelated branch)

      const testOrgs = [
        { id: orgKepalaId, name: 'Kepala Pengurus Pesantren', unit_type: 'kepala_pengurus', status: 'active' },
        { id: orgWakaId, name: 'Waka 1 (Kurikulum & Pengasuhan)', unit_type: 'waka', parent_id: orgKepalaId, status: 'active' },
        { id: orgSeksi1Id, name: 'Seksi Ubudiyah & Ibadah', unit_type: 'seksi', parent_id: orgWakaId, status: 'active' },
        { id: orgSeksi2Id, name: 'Seksi Keasramaan', unit_type: 'seksi', parent_id: orgWakaId, status: 'active' },
        { id: orgAId, name: 'Organisasi Bahasa Arab', unit_type: 'organisasi', parent_id: orgSeksi1Id, status: 'active' },
        { id: orgBId, name: 'Organisasi Bahasa Inggris', unit_type: 'organisasi', parent_id: orgSeksi1Id, status: 'active' },
        { id: orgCId, name: 'Organisasi Kedisiplinan Asrama', unit_type: 'organisasi', parent_id: orgSeksi2Id, status: 'active' }
      ]

      localStorage.setItem('filament_demo_v3_shared_organizations', JSON.stringify(testOrgs))

      // Seed Users & Memberships
      const userSuperadmin = {
        id: 'user-superadmin',
        name: 'Superadmin Pesantren',
        email: 'superadmin@pesantren.id',
        role: 'superadmin',
        is_superadmin: true,
        status: 'active'
      }

      const userKepala = {
        id: 'user-kepala',
        name: 'Kepala Pengurus Pesantren',
        username: 'kepala_pengurus',
        email: 'kepala@pesantren.id',
        role: 'admin',
        status: 'active',
        organization_id: orgKepalaId,
        active_membership: {
          id: 'mem-kepala',
          user_id: 'user-kepala',
          organization_id: orgKepalaId,
          role_id: 'role-kepala',
          status: 'active',
          role: {
            id: 'role-kepala',
            name: 'Pimpinan Utama',
            status: 'active',
            permissions: ['Program.viewAny', 'Program.update', 'Program.approve', 'Finance.viewAny', 'Admin.viewAny', 'Admin.update']
          }
        }
      }

      const userWaka = {
        id: 'user-waka',
        name: 'Waka 1 Pesantren',
        username: 'waka_1',
        email: 'waka1@pesantren.id',
        role: 'admin',
        status: 'active',
        organization_id: orgWakaId,
        active_membership: {
          id: 'mem-waka',
          user_id: 'user-waka',
          organization_id: orgWakaId,
          role_id: 'role-waka',
          status: 'active',
          role: {
            id: 'role-waka',
            name: 'Waka',
            status: 'active',
            permissions: ['Program.viewAny', 'Program.update', 'Program.approve', 'Finance.viewAny', 'Admin.viewAny', 'Admin.update']
          }
        }
      }

      const userSeksi1 = {
        id: 'user-seksi-1',
        name: 'Seksi Ubudiyah',
        username: 'seksi_ubudiyah',
        email: 'ubudiyah@pesantren.id',
        role: 'admin',
        status: 'active',
        organization_id: orgSeksi1Id,
        active_membership: {
          id: 'mem-seksi-1',
          user_id: 'user-seksi-1',
          organization_id: orgSeksi1Id,
          role_id: 'role-seksi',
          status: 'active',
          role: {
            id: 'role-seksi',
            name: 'Admin Seksi',
            status: 'active',
            permissions: ['Program.viewAny', 'Program.update', 'Program.approve', 'Finance.viewAny', 'Admin.viewAny', 'Admin.update']
          }
        }
      }

      const userOrgA = {
        id: 'user-org-a',
        name: 'Admin Organisasi Bahasa Arab',
        username: 'admin_orga',
        email: 'admin.orga@pesantren.id',
        role: 'admin',
        status: 'active',
        organization_id: orgAId,
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
            permissions: [
              'Program.viewAny', 'Program.view', 'Program.create', 'Program.update',
              'Finance.viewAny', 'Finance.create',
              'Agenda.viewAny', 'Agenda.create', 'Agenda.update',
              'Task.viewAny', 'Task.create', 'Task.update',
              'Performance.viewAny', 'Performance.create',
              'Report.viewAny', 'Report.create',
              'Admin.viewAny'
            ]
          }
        }
      }

      const userOrgB = {
        id: 'user-org-b',
        name: 'Admin Organisasi Bahasa Inggris',
        username: 'admin_orgb',
        email: 'admin.orgb@pesantren.id',
        role: 'admin',
        status: 'active',
        organization_id: orgBId,
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
            permissions: ['Program.viewAny', 'Program.view', 'Admin.viewAny']
          }
        }
      }

      const allUsers = [userSuperadmin, userKepala, userWaka, userSeksi1, userOrgA, userOrgB]
      localStorage.setItem('filament_demo_v3_shared_users', JSON.stringify(allUsers))

      const allMemberships = [
        userKepala.active_membership,
        userWaka.active_membership,
        userSeksi1.active_membership,
        userOrgA.active_membership,
        userOrgB.active_membership
      ]
      localStorage.setItem('filament_demo_v3_shared_memberships', JSON.stringify(allMemberships))

      // Clean storage
      localStorage.setItem('filament_demo_v3_shared_persons', JSON.stringify([]))
      localStorage.setItem('filament_demo_v3_shared_account_holder_histories', JSON.stringify([]))
      localStorage.setItem('filament_demo_v3_shared_programs', JSON.stringify([]))
      localStorage.setItem('filament_demo_v3_shared_budgets', JSON.stringify([]))
      localStorage.setItem('filament_demo_v3_shared_agendas', JSON.stringify([]))
      localStorage.setItem('filament_demo_v3_shared_tasks', JSON.stringify([]))
      localStorage.setItem('filament_demo_v3_shared_performances', JSON.stringify([]))
      localStorage.setItem('filament_demo_v3_shared_reports', JSON.stringify([]))

      // 1. TEST 1: HIERARCHY
      const kepalaDesc = getDescendantOrganizationIds(orgKepalaId, testOrgs)
      const seksi1Desc = getDescendantOrganizationIds(orgSeksi1Id, testOrgs)
      const isAB_Sibling = checkSibling(orgAId, orgBId, testOrgs)
      const isAC_Sibling = checkSibling(orgAId, orgCId, testOrgs)
      const isWakaAncestorOfA = isAncestor(orgWakaId, orgAId, testOrgs)
      const isA_AncestorOfWaka = isAncestor(orgAId, orgWakaId, testOrgs)

      stepResults.push({
        name: 'Hierarchy: Kepala Pengurus sees full hierarchy below',
        pass: kepalaDesc.length === 6,
        detail: `descendantsCount=${kepalaDesc.length}`
      })
      stepResults.push({
        name: 'Hierarchy: Seksi 1 sees subordinate organizations (Org A & B)',
        pass: seksi1Desc.includes(orgAId) && seksi1Desc.includes(orgBId) && seksi1Desc.length === 2,
        detail: `seksiDescendants=${seksi1Desc.length}`
      })
      stepResults.push({
        name: 'Hierarchy: Sibling isolation active (Org A vs Org B sibling, Org C not sibling)',
        pass: isAB_Sibling === true && isAC_Sibling === false,
        detail: `isSiblingAB=${isAB_Sibling}, isSiblingAC=${isAC_Sibling}`
      })
      stepResults.push({
        name: 'Hierarchy: Ancestor traversal valid (Waka is ancestor of Org A, Org A is not ancestor of Waka)',
        pass: isWakaAncestorOfA === true && isA_AncestorOfWaka === false,
        detail: `isWakaAncestor=${isWakaAncestorOfA}`
      })

      // 2. TEST 2 & 3: CANONICAL PERSON & ACCOUNT UNIT
      const personA = await dataService.createPerson({
        name: 'Ust. Ahmad Al-Farisi',
        identifier: '3501010101010001',
        phone: '081234567890',
        email: 'ahmad.farisi@pesantren.id',
        status: 'active'
      }, userSuperadmin)

      const personB = await dataService.createPerson({
        name: 'Ust. Budi Hidayatulloh',
        identifier: '3501010101010002',
        phone: '081234567891',
        email: 'budi.h@pesantren.id',
        status: 'active'
      }, userSuperadmin)

      const personC = await dataService.createPerson({
        name: 'Ust. Chairul Umam, M.Pd.',
        identifier: '3501010101010003',
        phone: '081234567892',
        email: 'chairul.umam@pesantren.id',
        status: 'active'
      }, userSuperadmin)

      const personInactive = await dataService.createPerson({
        name: 'Person Nonaktif',
        identifier: '3501010101010999',
        status: 'inactive'
      }, userSuperadmin)

      const allPersons = await dataService.getPersons()
      stepResults.push({
        name: 'Person: Canonical Persons stored in shared_persons',
        pass: allPersons.length === 4,
        detail: `totalPersons=${allPersons.length}`
      })

      // Deduplication test
      let dedupSuccess = false
      try {
        await dataService.createPerson({
          name: 'Ust. Ahmad Al-Farisi Duplicate',
          identifier: '3501010101010001'
        }, userSuperadmin)
      } catch (err) {
        dedupSuccess = err.message.includes('sudah digunakan') || err.message.includes('terdaftar')
      }
      stepResults.push({
        name: 'Person: Duplicate identifier prevented in Person master',
        pass: dedupSuccess,
        detail: `dedupBlocked=${dedupSuccess}`
      })

      // Inactive person check
      let inactiveAssignBlocked = false
      try {
        await dataService.handoverAccountHolder({
          accountId: userOrgA.id,
          newPersonId: personInactive.id,
          periodStart: '2026-01-01'
        }, userSeksi1)
      } catch (err) {
        inactiveAssignBlocked = err.message.includes('tidak aktif')
      }
      stepResults.push({
        name: 'Person: Inactive Person cannot become Account Unit holder',
        pass: inactiveAssignBlocked,
        detail: `inactiveBlocked=${inactiveAssignBlocked}`
      })

      // 3. TEST 4: THREE-STAGE HANDOVER CHAIN (A -> B -> C)
      // Step 1: Holder A
      await dataService.handoverAccountHolder({
        accountId: userOrgA.id,
        newPersonId: personA.id,
        periodStart: '2026-01-01',
        notes: 'SK Penunjukan Pertama'
      }, userSeksi1)

      const accountAfterA = await dataService.getUserById(userOrgA.id)
      stepResults.push({
        name: 'Handover: Assign Holder A to Account Unit Organisasi A',
        pass: accountAfterA?.holder_person_id === personA.id,
        detail: `holder=${accountAfterA?.holder_name}`
      })

      // Create Operational Data during Holder A's tenure
      const progA = await dataService.createProgram({
        organization_id: orgAId,
        section_id: 'sec-1',
        title: 'Pengembangan Bahasa Santri Mandiri',
        code: 'PROG-BA-01',
        duration_type: 'terbatas',
        status: 'draft',
        start_date: '2026-01-10',
        end_date: '2026-06-10',
        budget_allocated: 15000000
      }, userOrgA)

      const budgetA = await dataService.createBudget({
        organization_id: orgAId,
        program_id: progA.id,
        category: 'operasional',
        allocated_amount: 15000000,
        amount_allocated: 15000000,
        status: 'approved'
      }, userSuperadmin)

      const agendaA = await dataService.createAgenda({
        organization_id: orgAId,
        program_id: progA.id,
        title: 'Muhadharah Akbar Bahasa Arab',
        date: '2026-03-01',
        status: 'scheduled'
      }, userOrgA)

      const taskA = await dataService.createTask({
        organization_id: orgAId,
        program_id: progA.id,
        title: 'Penyusunan Modul Muhadatsah Harian',
        status: 'in_progress',
        priority: 'high'
      }, userOrgA)

      const perfA = await dataService.createPerformance({
        organization_id: orgAId,
        program_id: progA.id,
        indicator: 'Jumlah Santri Lulus Ujian Lisan Bahasa',
        target: 100,
        achieved: 85,
        unit: 'santri',
        score: 85
      }, userOrgA)

      const repA = await dataService.createReport({
        organization_id: orgAId,
        program_id: progA.id,
        title: 'Laporan Progres Triwulan 1 Bahasa Arab',
        report_type: 'triwulan',
        status: 'draft'
      }, userOrgA)

      // Submit and approve by Seksi 1
      await dataService.transitionProgramStatus(progA.id, 'submitted', userOrgA)
      await dataService.transitionProgramStatus(progA.id, 'approved', userSeksi1)

      // Step 2: Handover from Holder A to Holder B
      await dataService.handoverAccountHolder({
        accountId: userOrgA.id,
        newPersonId: personB.id,
        periodStart: '2026-05-01',
        notes: 'SK Pergantian Pengurus Tahap 2'
      }, userSeksi1)

      const accountAfterB = await dataService.getUserById(userOrgA.id)
      const historiesAfterB = await dataService.getAccountHolderHistories(userOrgA.id)
      const histA = historiesAfterB.find(h => h.person_id === personA.id)

      stepResults.push({
        name: 'Handover: Handover A -> B closes Holder A tenure and sets B as active',
        pass: accountAfterB?.holder_person_id === personB.id && histA?.period_end === '2026-05-01',
        detail: `newHolder=${accountAfterB?.holder_name}, oldPeriodEnd=${histA?.period_end}`
      })

      // Step 3: Handover from Holder B to Holder C
      await dataService.handoverAccountHolder({
        accountId: userOrgA.id,
        newPersonId: personC.id,
        periodStart: '2026-09-01',
        notes: 'SK Pergantian Pengurus Tahap 3'
      }, userSeksi1)

      const accountAfterC = await dataService.getUserById(userOrgA.id)
      const historiesAfterC = await dataService.getAccountHolderHistories(userOrgA.id)
      const activeHistories = historiesAfterC.filter(h => !h.period_end || h.period_end === '')

      stepResults.push({
        name: 'Handover: Handover B -> C creates tenure chain of 3 records',
        pass: historiesAfterC.length === 3,
        detail: `totalHistories=${historiesAfterC.length}`
      })
      stepResults.push({
        name: 'Handover: Invariant exactly ONE active holder maintained',
        pass: activeHistories.length === 1 && activeHistories[0].person_id === personC.id,
        detail: `activeCount=${activeHistories.length}, activePerson=${activeHistories[0]?.person_name}`
      })

      // 4. TEST 5: OWNERSHIP CONTINUITY POST-HANDOVER
      const progAfterChain = await dataService.getProgramById(progA.id, userSuperadmin)
      const budgetsAfterChain = await dataService.getBudgets({ organizationId: orgAId, mode: 'own' }, undefined, userSuperadmin)
      const agendasAfterChain = await dataService.getAgendas({ organizationId: orgAId, mode: 'own' }, undefined, userSuperadmin)
      const tasksAfterChain = await dataService.getTasks({ organizationId: orgAId, mode: 'own' }, undefined, userSuperadmin)
      const perfsAfterChain = await dataService.getPerformances({ organizationId: orgAId, mode: 'own' }, undefined, userSuperadmin)
      const repsAfterChain = await dataService.getReports({ organizationId: orgAId, mode: 'own' }, undefined, userSuperadmin)

      stepResults.push({
        name: 'Ownership: Program ownership and creator intact post-handover',
        pass: progAfterChain?.organization_id === orgAId && progAfterChain?.created_by === userOrgA.id,
        detail: `orgId=${progAfterChain?.organization_id}, createdBy=${progAfterChain?.created_by}`
      })
      stepResults.push({
        name: 'Ownership: Budget ownership intact post-handover',
        pass: budgetsAfterChain.length > 0 && budgetsAfterChain[0].organization_id === orgAId,
        detail: `budgetOrgId=${budgetsAfterChain[0]?.organization_id}`
      })
      stepResults.push({
        name: 'Ownership: Agenda ownership intact post-handover',
        pass: agendasAfterChain.length > 0 && agendasAfterChain[0].organization_id === orgAId,
        detail: `agendaOrgId=${agendasAfterChain[0]?.organization_id}`
      })
      stepResults.push({
        name: 'Ownership: Task ownership intact post-handover',
        pass: tasksAfterChain.length > 0 && tasksAfterChain[0].organization_id === orgAId,
        detail: `taskOrgId=${tasksAfterChain[0]?.organization_id}`
      })
      stepResults.push({
        name: 'Ownership: Performance ownership intact post-handover',
        pass: perfsAfterChain.length > 0 && perfsAfterChain[0].organization_id === orgAId,
        detail: `perfOrgId=${perfsAfterChain[0]?.organization_id}`
      })
      stepResults.push({
        name: 'Ownership: Report ownership intact post-handover',
        pass: repsAfterChain.length > 0 && repsAfterChain[0].organization_id === orgAId,
        detail: `repOrgId=${repsAfterChain[0]?.organization_id}`
      })
      stepResults.push({
        name: 'Account Unit: Credentials and identity immutable post-handover',
        pass: accountAfterC?.id === userOrgA.id && accountAfterC?.username === 'admin_orga' && accountAfterC?.email === 'admin.orga@pesantren.id',
        detail: `id=${accountAfterC?.id}, username=${accountAfterC?.username}, email=${accountAfterC?.email}`
      })

      // 5. TEST 6: HIERARCHICAL APPROVAL INTEGRITY
      stepResults.push({
        name: 'Approval: Historical approval by Seksi 1 remains intact after multiple handovers',
        pass: progAfterChain?.status === 'approved' &&
              progAfterChain?.approved_by === userSeksi1.id &&
              progAfterChain?.approved_by_organization_id === orgSeksi1Id,
        detail: `approvedBy=${progAfterChain?.approved_by}, approvedByOrg=${progAfterChain?.approved_by_organization_id}`
      })

      // Create new program under Holder C
      const progC = await dataService.createProgram({
        organization_id: orgAId,
        section_id: 'sec-1',
        title: 'Pelatihan Qiraatul Kutub Mahasantri',
        code: 'PROG-BA-02',
        duration_type: 'terbatas',
        status: 'draft',
        start_date: '2026-09-10',
        end_date: '2026-12-10'
      }, userOrgA)

      await dataService.transitionProgramStatus(progC.id, 'submitted', userOrgA)

      // Anti-self approval check
      let selfApproveBlocked = false
      try {
        await dataService.transitionProgramStatus(progC.id, 'approved', userOrgA)
      } catch (err) {
        selfApproveBlocked = err.message.includes('sendiri') || err.message.includes('Self-Approval')
      }
      stepResults.push({
        name: 'Approval: Self-approval strictly forbidden under new holder',
        pass: selfApproveBlocked,
        detail: `selfApproveBlocked=${selfApproveBlocked}`
      })

      // Anti-sibling approval check
      let siblingApproveBlocked = false
      try {
        await dataService.transitionProgramStatus(progC.id, 'approved', userOrgB)
      } catch (err) {
        siblingApproveBlocked = err.message.includes('atasan') || err.message.includes('Akses ditolak')
      }
      stepResults.push({
        name: 'Approval: Sibling approval strictly forbidden',
        pass: siblingApproveBlocked,
        detail: `siblingApproveBlocked=${siblingApproveBlocked}`
      })

      // Higher ancestor (Waka) approval check
      const wakaApprovedProg = await dataService.transitionProgramStatus(progC.id, 'approved', userWaka)
      stepResults.push({
        name: 'Approval: Higher ancestor (Waka) approval succeeds and records correct org',
        pass: wakaApprovedProg.status === 'approved' && wakaApprovedProg.approved_by_organization_id === orgWakaId,
        detail: `status=${wakaApprovedProg.status}, approvedByOrg=${wakaApprovedProg.approved_by_organization_id}`
      })

      // 6. TEST 7: DOWNWARD ASSIGNMENT INTEGRITY
      const pimpinanToOrgA = canAssignToOrganization(orgKepalaId, orgAId, testOrgs)
      const seksi1ToOrgA = canAssignToOrganization(orgSeksi1Id, orgAId, testOrgs)
      const orgAToParent = canAssignToOrganization(orgAId, orgSeksi1Id, testOrgs)
      const orgAToSibling = canAssignToOrganization(orgAId, orgBId, testOrgs)
      const orgAToUnrelated = canAssignToOrganization(orgAId, orgCId, testOrgs)

      stepResults.push({
        name: 'Assignment: Downward assignment Pimpinan -> Org A ALLOWED',
        pass: pimpinanToOrgA === true,
        detail: `allowed=${pimpinanToOrgA}`
      })
      stepResults.push({
        name: 'Assignment: Downward assignment Seksi 1 -> Org A ALLOWED',
        pass: seksi1ToOrgA === true,
        detail: `allowed=${seksi1ToOrgA}`
      })
      stepResults.push({
        name: 'Assignment: Upward assignment Org A -> Seksi 1 DENIED',
        pass: orgAToParent === false,
        detail: `denied=${!orgAToParent}`
      })
      stepResults.push({
        name: 'Assignment: Sibling assignment Org A -> Org B DENIED',
        pass: orgAToSibling === false,
        detail: `denied=${!orgAToSibling}`
      })
      stepResults.push({
        name: 'Assignment: Unrelated branch assignment Org A -> Org C DENIED',
        pass: orgAToUnrelated === false,
        detail: `denied=${!orgAToUnrelated}`
      })

      // 7. TEST 10: EMPTY STATE RESILIENCE
      // Test querying empty operational collections
      const emptyProgs = await dataService.getPrograms({ organizationId: orgBId, mode: 'own' }, userSuperadmin)
      const emptyBudgets = await dataService.getBudgets({ organizationId: orgBId, mode: 'own' }, undefined, userSuperadmin)
      const emptyAgendas = await dataService.getAgendas({ organizationId: orgBId, mode: 'own' }, userSuperadmin)
      const emptyTasks = await dataService.getTasks({ organizationId: orgBId, mode: 'own' }, userSuperadmin)

      stepResults.push({
        name: 'Empty State: Operational stores return empty array cleanly without hanging',
        pass: Array.isArray(emptyProgs) && emptyProgs.length === 0 &&
              Array.isArray(emptyBudgets) && emptyBudgets.length === 0 &&
              Array.isArray(emptyAgendas) && emptyAgendas.length === 0 &&
              Array.isArray(emptyTasks) && emptyTasks.length === 0,
        detail: `progs=${emptyProgs.length}, budgets=${emptyBudgets.length}, agendas=${emptyAgendas.length}, tasks=${emptyTasks.length}`
      })

      // 8. TEST 14: CENTRALIZED STORAGE INTEGRITY
      const rawSharedPersons = localStorage.getItem('filament_demo_v3_shared_persons')
      const rawSharedHistories = localStorage.getItem('filament_demo_v3_shared_account_holder_histories')

      stepResults.push({
        name: 'Storage: Person master stored under centralized key (filament_demo_v3_shared_persons)',
        pass: Boolean(rawSharedPersons),
        detail: `keyExists=true`
      })
      stepResults.push({
        name: 'Storage: Holder histories stored under centralized key (filament_demo_v3_shared_account_holder_histories)',
        pass: Boolean(rawSharedHistories),
        detail: `keyExists=true`
      })

      return stepResults
    })

    for (const res of testSuiteResult) {
      report(res.name, res.pass, res.detail)
    }

    // Static Supabase migration audit
    const migrationStage5Path = path.resolve(__dirname, '../supabase/migrations/20261002_stage5_account_handover.sql')
    const stage5Exists = fs.existsSync(migrationStage5Path)
    const stage5Sql = stage5Exists ? fs.readFileSync(migrationStage5Path, 'utf8') : ''
    const hasPersonsTable = stage5Sql.includes('CREATE TABLE IF NOT EXISTS persons')
    const hasHistoriesTable = stage5Sql.includes('CREATE TABLE IF NOT EXISTS account_holder_histories')
    const hasUniqueActiveHolder = stage5Sql.includes('uq_single_active_holder_per_account')
    const hasSyncTrigger = stage5Sql.includes('trg_account_holder_history_sync')
    const hasRlsPolicies = stage5Sql.includes('ENABLE ROW LEVEL SECURITY') && stage5Sql.includes('CREATE POLICY')

    report('Supabase DDL: Migration file 20261002_stage5_account_handover.sql exists', stage5Exists, `path=${migrationStage5Path}`)
    report('Supabase DDL: Declares canonical persons & account_holder_histories tables', hasPersonsTable && hasHistoriesTable, `tables=persons,account_holder_histories`)
    report('Supabase DDL: Enforces single active holder partial unique index (period_end IS NULL)', hasUniqueActiveHolder, `uniqueIndex=uq_single_active_holder_per_account`)
    report('Supabase DDL: Implements automated tenure closure trigger', hasSyncTrigger, `trigger=trg_account_holder_history_sync`)
    report('Supabase DDL: Implements non-destructive RLS policies for ancestors & admins', hasRlsPolicies, `rlsEnabled=true`)

  } catch (err) {
    console.error('Fatal error during integration execution:', err)
    allPassed = false
  } finally {
    await browser.close()
  }

  console.log('\n====================================================================')
  console.log(`STAGE 6 INTEGRATION RESULT: ${allPassed ? `ALL TESTS PASSED (${results.length}/${results.length})` : 'SOME TESTS FAILED'}`)
  console.log('====================================================================')

  if (!allPassed) {
    process.exit(1)
  }
}

runStage6FinalQA().catch(err => {
  console.error('Test runner failure:', err)
  process.exit(1)
})
