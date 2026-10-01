-- ==============================================================================
-- Migration: 20261002_stage6_downward_assignment.sql
-- STAGE 6: Downward Control & Unit Assignment
-- Adds assigned_to_organization_id to programs and tasks.
--
-- Semantics:
--   organization_id          = pemilik / context utama data (TIDAK DIUBAH)
--   assigned_to_organization_id = unit penerima / delegasi (NULLABLE, backward-compatible)
--
-- Rules enforced at application layer (authorization.ts / dataService.ts):
--   PASS: source === target (self)
--   PASS: target is descendant of source
--   PASS: superadmin
--   DENY: target is ancestor of source
--   DENY: target is sibling of source
--   DENY: target is in an unrelated branch
-- ==============================================================================

-- 1. ADD COLUMN TO PROGRAMS
ALTER TABLE programs
    ADD COLUMN IF NOT EXISTS assigned_to_organization_id UUID
        REFERENCES organizations(id) ON DELETE SET NULL;

COMMENT ON COLUMN programs.assigned_to_organization_id IS
    'Stage 6 — Unit organisasi penerima penugasan (downward-control). NULL = tidak ada unit delegasi.';

-- 2. ADD COLUMN TO TASKS
ALTER TABLE tasks
    ADD COLUMN IF NOT EXISTS assigned_to_organization_id UUID
        REFERENCES organizations(id) ON DELETE SET NULL;

COMMENT ON COLUMN tasks.assigned_to_organization_id IS
    'Stage 6 — Unit organisasi penerima penugasan (downward-control). NULL = tidak ada unit delegasi.';

-- 3. INDEXES FOR QUERY PERFORMANCE
CREATE INDEX IF NOT EXISTS idx_programs_assigned_to_org_id
    ON programs(assigned_to_organization_id)
    WHERE assigned_to_organization_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to_org_id
    ON tasks(assigned_to_organization_id)
    WHERE assigned_to_organization_id IS NOT NULL;

-- 4. RLS EXTENSION: assigned unit can SELECT programs/tasks assigned to them
--    This is additive and does NOT replace existing organization_id-based policies.
--    The assigned unit can view, but NOT modify (modify is still owner-org only).

CREATE POLICY IF NOT EXISTS "Programs AssignedTo Select Policy" ON programs FOR SELECT
USING (
    is_superadmin()
    OR organization_id IN (SELECT organization_id FROM get_user_accessible_organization_ids())
    OR (
        -- Members of the assigned-to unit can see the program
        assigned_to_organization_id IS NOT NULL
        AND assigned_to_organization_id IN (SELECT organization_id FROM get_user_active_organization_ids())
    )
);

CREATE POLICY IF NOT EXISTS "Tasks AssignedTo Select Policy" ON tasks FOR SELECT
USING (
    is_superadmin()
    OR organization_id IN (SELECT organization_id FROM get_user_accessible_organization_ids())
    OR (
        assigned_to_organization_id IS NOT NULL
        AND assigned_to_organization_id IN (SELECT organization_id FROM get_user_active_organization_ids())
    )
);

-- NOTE: Modify policies (INSERT/UPDATE/DELETE) remain scoped to the owning organization only.
-- The assigned unit can view but NOT mutate ownership-level fields.

-- 5. HELPER FUNCTION: Validate assignment direction at DB level (defense-in-depth)
--    This is an advisory guard; primary enforcement is in application-layer authorization.ts.
CREATE OR REPLACE FUNCTION validate_assignment_direction()
RETURNS TRIGGER AS $$
DECLARE
    is_valid BOOLEAN;
BEGIN
    -- Allow NULL (no assignment)
    IF NEW.assigned_to_organization_id IS NULL THEN
        RETURN NEW;
    END IF;

    -- Allow self-assignment
    IF NEW.organization_id = NEW.assigned_to_organization_id THEN
        RETURN NEW;
    END IF;

    -- Superadmin bypass: check via is_superadmin()
    IF is_superadmin() THEN
        RETURN NEW;
    END IF;

    -- Check if assigned_to is a descendant of owner org using recursive CTE
    WITH RECURSIVE org_descendants AS (
        SELECT id, parent_id FROM organizations WHERE id = NEW.organization_id
        UNION ALL
        SELECT child.id, child.parent_id
        FROM organizations child
        INNER JOIN org_descendants parent ON child.parent_id = parent.id
    )
    SELECT EXISTS (
        SELECT 1 FROM org_descendants WHERE id = NEW.assigned_to_organization_id
    ) INTO is_valid;

    IF NOT is_valid THEN
        RAISE EXCEPTION
            'Assignment direction violation: Unit [%] is not a descendant of owner [%]. Only downward assignment is permitted.',
            NEW.assigned_to_organization_id, NEW.organization_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Attach trigger to programs
DROP TRIGGER IF EXISTS trg_validate_program_assignment ON programs;
CREATE TRIGGER trg_validate_program_assignment
    BEFORE INSERT OR UPDATE OF assigned_to_organization_id ON programs
    FOR EACH ROW EXECUTE FUNCTION validate_assignment_direction();

-- Attach trigger to tasks
DROP TRIGGER IF EXISTS trg_validate_task_assignment ON tasks;
CREATE TRIGGER trg_validate_task_assignment
    BEFORE INSERT OR UPDATE OF assigned_to_organization_id ON tasks
    FOR EACH ROW EXECUTE FUNCTION validate_assignment_direction();
