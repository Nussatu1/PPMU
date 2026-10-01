-- ==============================================================================
-- Migration: 20261001_hierarchical_organizations.sql
-- STAGE 2: Hierarchical Organization Model & RLS Security Hardening
-- ==============================================================================

-- 1. ADD HIERARCHY COLUMNS TO ORGANIZATIONS
ALTER TABLE organizations
    ADD COLUMN IF NOT EXISTS parent_id UUID REFERENCES organizations(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS unit_type VARCHAR(50) DEFAULT 'unit',
    ADD COLUMN IF NOT EXISTS level INT DEFAULT 0;

-- 2. ADD SELF-PARENT CONSTRAINT & INDEXES
DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1 FROM pg_constraint WHERE conname = 'chk_no_self_parent'
    ) THEN
        ALTER TABLE organizations
            ADD CONSTRAINT chk_no_self_parent CHECK (parent_id IS NULL OR parent_id <> id);
    END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_organizations_parent_id ON organizations(parent_id);
CREATE INDEX IF NOT EXISTS idx_organizations_unit_type ON organizations(unit_type);

-- 3. RLS HELPER FUNCTIONS (SECURITY DEFINER)
-- Checks if current user is superadmin
CREATE OR REPLACE FUNCTION is_superadmin()
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = auth.uid() AND (role = 'admin' OR role = 'superadmin')
    ) OR EXISTS (
        SELECT 1 FROM organization_memberships
        WHERE user_id = auth.uid() AND role_id = 'superadmin' AND status = 'active'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- Direct active memberships for the user
CREATE OR REPLACE FUNCTION get_user_active_organization_ids()
RETURNS TABLE (organization_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT om.organization_id
    FROM organization_memberships om
    WHERE om.user_id = auth.uid()
      AND om.status = 'active';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- User's accessible organization IDs:
-- Direct active organizations + downward descendants if user has descendant viewing permission
CREATE OR REPLACE FUNCTION get_user_accessible_organization_ids()
RETURNS TABLE (organization_id UUID) AS $$
BEGIN
    IF is_superadmin() THEN
        RETURN QUERY SELECT id FROM organizations;
        RETURN;
    END IF;

    RETURN QUERY
    WITH RECURSIVE org_tree AS (
        -- Base: Direct active memberships
        SELECT o.id, o.parent_id
        FROM organizations o
        INNER JOIN organization_memberships om ON om.organization_id = o.id
        WHERE om.user_id = auth.uid()
          AND om.status = 'active'
          AND o.status = 'active'

        UNION

        -- Downward recursive traversal (parent -> children only, never upward to ancestors)
        -- Only if user role on parent allows descendant reading
        SELECT child.id, child.parent_id
        FROM organizations child
        INNER JOIN org_tree parent ON child.parent_id = parent.id
        INNER JOIN organization_memberships om ON om.organization_id = parent.id
        INNER JOIN roles r ON r.id = om.role_id
        WHERE om.user_id = auth.uid()
          AND om.status = 'active'
          AND (
              r.id IN ('superadmin', 'admin', 'pimpinan', 'ketua')
              OR r.permissions::jsonb ? 'view:descendants'
              OR r.permissions::jsonb ? 'organization.hierarchy.view'
              OR r.permissions::jsonb ? 'all'
          )
    )
    SELECT DISTINCT id FROM org_tree;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER STABLE;

-- 4. DROP PERMISSIVE USING(true) POLICIES
DROP POLICY IF EXISTS "Public Read/Write Organizations" ON organizations;
DROP POLICY IF EXISTS "Public Read/Write Roles" ON roles;
DROP POLICY IF EXISTS "Public Read/Write Memberships" ON organization_memberships;
DROP POLICY IF EXISTS "Public Read/Write Structures" ON structures;
DROP POLICY IF EXISTS "Public Read/Write Sections" ON sections;
DROP POLICY IF EXISTS "Public Read/Write Personnels" ON personnels;
DROP POLICY IF EXISTS "Public Read/Write Programs" ON programs;
DROP POLICY IF EXISTS "Public Read/Write Agendas" ON agendas;
DROP POLICY IF EXISTS "Public Read/Write Performances" ON performances;
DROP POLICY IF EXISTS "Public Read/Write Budgets" ON budgets;
DROP POLICY IF EXISTS "Public Read/Write Transactions" ON transactions;
DROP POLICY IF EXISTS "Public Read/Write Reports" ON reports;
DROP POLICY IF EXISTS "Public Read/Write Tasks" ON tasks;
DROP POLICY IF EXISTS "Public Read/Write Notifications" ON notifications;
DROP POLICY IF EXISTS "Public Read/Write AuditLogs" ON audit_logs;

-- 5. APPLY SCOPED RLS POLICIES

-- Organizations
CREATE POLICY "Organizations Select Policy" ON organizations FOR SELECT
USING (
    is_superadmin()
    OR id IN (SELECT organization_id FROM get_user_accessible_organization_ids())
);

CREATE POLICY "Organizations Modify Policy" ON organizations FOR ALL
USING (
    is_superadmin()
    OR id IN (
        SELECT om.organization_id FROM organization_memberships om
        INNER JOIN roles r ON r.id = om.role_id
        WHERE om.user_id = auth.uid() AND om.status = 'active'
          AND (r.id IN ('superadmin', 'admin') OR r.permissions::jsonb ? 'manage:organization')
    )
);

-- Roles (system dictionary / read-only for normal users)
CREATE POLICY "Roles Select Policy" ON roles FOR SELECT USING (true);
CREATE POLICY "Roles Admin Policy" ON roles FOR ALL USING (is_superadmin());

-- Organization Memberships
CREATE POLICY "Memberships Select Policy" ON organization_memberships FOR SELECT
USING (
    is_superadmin()
    OR user_id = auth.uid()
    OR organization_id IN (SELECT organization_id FROM get_user_accessible_organization_ids())
);

CREATE POLICY "Memberships Admin Policy" ON organization_memberships FOR ALL
USING (
    is_superadmin()
    OR organization_id IN (
        SELECT om.organization_id FROM organization_memberships om
        WHERE om.user_id = auth.uid() AND om.status = 'active' AND om.role_id IN ('superadmin', 'admin')
    )
);

-- Structures & Sections & Personnels
CREATE POLICY "Structures Select Policy" ON structures FOR SELECT
USING (is_superadmin() OR organization_id IN (SELECT organization_id FROM get_user_accessible_organization_ids()));
CREATE POLICY "Structures Modify Policy" ON structures FOR ALL
USING (is_superadmin() OR organization_id IN (SELECT organization_id FROM get_user_active_organization_ids()));

CREATE POLICY "Sections Select Policy" ON sections FOR SELECT
USING (is_superadmin() OR organization_id IN (SELECT organization_id FROM get_user_accessible_organization_ids()));
CREATE POLICY "Sections Modify Policy" ON sections FOR ALL
USING (is_superadmin() OR organization_id IN (SELECT organization_id FROM get_user_active_organization_ids()));

CREATE POLICY "Personnels Select Policy" ON personnels FOR SELECT
USING (is_superadmin() OR organization_id IN (SELECT organization_id FROM get_user_accessible_organization_ids()));
CREATE POLICY "Personnels Modify Policy" ON personnels FOR ALL
USING (is_superadmin() OR organization_id IN (SELECT organization_id FROM get_user_active_organization_ids()));

-- Operational Modules (Programs, Agendas, Performances, Budgets, Transactions, Reports, Tasks)
CREATE POLICY "Programs Select Policy" ON programs FOR SELECT
USING (is_superadmin() OR organization_id IN (SELECT organization_id FROM get_user_accessible_organization_ids()));
CREATE POLICY "Programs Modify Policy" ON programs FOR ALL
USING (is_superadmin() OR organization_id IN (SELECT organization_id FROM get_user_active_organization_ids()));

CREATE POLICY "Agendas Select Policy" ON agendas FOR SELECT
USING (is_superadmin() OR organization_id IN (SELECT organization_id FROM get_user_accessible_organization_ids()));
CREATE POLICY "Agendas Modify Policy" ON agendas FOR ALL
USING (is_superadmin() OR organization_id IN (SELECT organization_id FROM get_user_active_organization_ids()));

CREATE POLICY "Performances Select Policy" ON performances FOR SELECT
USING (is_superadmin() OR organization_id IN (SELECT organization_id FROM get_user_accessible_organization_ids()));
CREATE POLICY "Performances Modify Policy" ON performances FOR ALL
USING (is_superadmin() OR organization_id IN (SELECT organization_id FROM get_user_active_organization_ids()));

CREATE POLICY "Budgets Select Policy" ON budgets FOR SELECT
USING (is_superadmin() OR organization_id IN (SELECT organization_id FROM get_user_accessible_organization_ids()));
CREATE POLICY "Budgets Modify Policy" ON budgets FOR ALL
USING (is_superadmin() OR organization_id IN (SELECT organization_id FROM get_user_active_organization_ids()));

CREATE POLICY "Transactions Select Policy" ON transactions FOR SELECT
USING (is_superadmin() OR organization_id IN (SELECT organization_id FROM get_user_accessible_organization_ids()));
CREATE POLICY "Transactions Modify Policy" ON transactions FOR ALL
USING (is_superadmin() OR organization_id IN (SELECT organization_id FROM get_user_active_organization_ids()));

CREATE POLICY "Reports Select Policy" ON reports FOR SELECT
USING (is_superadmin() OR organization_id IN (SELECT organization_id FROM get_user_accessible_organization_ids()));
CREATE POLICY "Reports Modify Policy" ON reports FOR ALL
USING (is_superadmin() OR organization_id IN (SELECT organization_id FROM get_user_active_organization_ids()));

CREATE POLICY "Tasks Select Policy" ON tasks FOR SELECT
USING (is_superadmin() OR organization_id IN (SELECT organization_id FROM get_user_accessible_organization_ids()));
CREATE POLICY "Tasks Modify Policy" ON tasks FOR ALL
USING (is_superadmin() OR organization_id IN (SELECT organization_id FROM get_user_active_organization_ids()));

-- Notifications & Audit Logs
CREATE POLICY "Notifications User Policy" ON notifications FOR ALL
USING (recipient_user_id = auth.uid() OR is_superadmin());

CREATE POLICY "AuditLogs Select Policy" ON audit_logs FOR SELECT
USING (is_superadmin() OR organization_id IN (SELECT organization_id FROM get_user_accessible_organization_ids()));
CREATE POLICY "AuditLogs Insert Policy" ON audit_logs FOR INSERT
WITH CHECK (true);
