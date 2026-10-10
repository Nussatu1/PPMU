-- ==============================================================================
-- MIGRATION: 20261002_stage4_hierarchical_approval.sql
-- DESCRIPTION: Stage 4 — Hierarchical Approval Workflow Schema & RLS Policies
-- NON-DESTRUCTIVE: Adds columns and triggers without deleting existing data
-- ==============================================================================

-- 1. ADD APPROVAL TRACKING COLUMNS (IF NOT EXISTS)
ALTER TABLE programs
    ADD COLUMN IF NOT EXISTS approved_by_organization_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS approved_at TIMESTAMPTZ;

COMMENT ON COLUMN programs.approved_by_organization_id IS
    'Stage 4: ID organisasi superior (ancestor) yang memberikan persetujuan resmi.';
COMMENT ON COLUMN programs.approved_at IS
    'Stage 4: Timestamp saat persetujuan resmi diberikan oleh atasan.';

-- 2. CREATE INDEX FOR APPROVAL SEARCH & AUDIT
CREATE INDEX IF NOT EXISTS idx_programs_approved_by_org_id
    ON programs(approved_by_organization_id)
    WHERE approved_by_organization_id IS NOT NULL;

-- 3. VALIDATION TRIGGER: ENFORCE HIERARCHICAL APPROVAL RULES
-- - Self-approval is strictly forbidden (approver_org != owner_org)
-- - Approver organization must be an ancestor of program owner organization
-- - Superadmin can bypass
CREATE OR REPLACE FUNCTION validate_program_approval()
RETURNS TRIGGER AS $$
DECLARE
    is_ancestor_valid BOOLEAN;
BEGIN
    -- Only validate when transitioning to 'approved' or modifying approved fields
    IF NEW.status = 'approved' AND (OLD.status IS DISTINCT FROM 'approved' OR NEW.approved_by_organization_id IS DISTINCT FROM OLD.approved_by_organization_id) THEN
        
        -- Check superadmin bypass
        IF is_superadmin() THEN
            IF NEW.approved_at IS NULL THEN
                NEW.approved_at := NOW();
            END IF;
            RETURN NEW;
        END IF;

        -- Approver organization must be specified
        IF NEW.approved_by_organization_id IS NULL THEN
            RAISE EXCEPTION 'Akses ditolak: Persetujuan program wajib mencatat approved_by_organization_id.';
        END IF;

        -- Self-approval forbidden
        IF NEW.approved_by_organization_id = NEW.organization_id THEN
            RAISE EXCEPTION 'Akses ditolak: Unit pemilik tidak diizinkan menyetujui programnya sendiri (Self-Approval dilarang).';
        END IF;

        -- Verify approver is in the ancestor chain
        WITH RECURSIVE ancestor_tree AS (
            SELECT parent_id FROM organizations WHERE id = NEW.organization_id
            UNION ALL
            SELECT o.parent_id FROM organizations o
            INNER JOIN ancestor_tree at ON o.id = at.parent_id
            WHERE o.parent_id IS NOT NULL
        )
        SELECT EXISTS(SELECT 1 FROM ancestor_tree WHERE parent_id = NEW.approved_by_organization_id)
        INTO is_ancestor_valid;

        IF NOT is_ancestor_valid THEN
            RAISE EXCEPTION 'Akses ditolak: Unit approver (%) bukan merupakan atasan (ancestor) sah dari unit pemilik (%). Sibling atau cabang berbeda ditolak.',
                NEW.approved_by_organization_id, NEW.organization_id;
        END IF;

        -- Guarantee ownership immutability
        IF NEW.organization_id IS DISTINCT FROM OLD.organization_id THEN
            RAISE EXCEPTION 'Akses ditolak: Approval tidak diizinkan mengubah unit pemilik (organization_id).';
        END IF;

        -- Stamp approval time if not set
        IF NEW.approved_at IS NULL THEN
            NEW.approved_at := NOW();
        END IF;

    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_validate_program_approval ON programs;
CREATE TRIGGER trg_validate_program_approval
    BEFORE UPDATE ON programs
    FOR EACH ROW
    EXECUTE FUNCTION validate_program_approval();

-- 4. RLS POLICY EXTENSION FOR APPROVAL BY ANCESTOR
-- Ancestor organization members can UPDATE program status to approved
CREATE POLICY "Programs Ancestor Approval Policy" ON programs FOR UPDATE
USING (
    is_superadmin() OR
    organization_id IN (
        -- Descendant organizations whose programs this user can view/approve
        SELECT id FROM organizations
        WHERE parent_id IN (SELECT organization_id FROM get_user_active_organization_ids())
    )
);
