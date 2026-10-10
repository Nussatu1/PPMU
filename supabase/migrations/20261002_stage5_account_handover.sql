-- ==============================================================================
-- MIGRATION: 20261002_stage5_account_handover.sql
-- DESCRIPTION: Stage 5 — Account Unit & Person Holder Handover Schema & RLS
-- NON-DESTRUCTIVE: Creates persons, account_holder_histories, and user holder columns
-- ==============================================================================

-- 1. CREATE CANONICAL PERSON MASTER TABLE (IF NOT EXISTS)
CREATE TABLE IF NOT EXISTS persons (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    identifier VARCHAR(100), -- NIK / NIP / ID Santri / Kepegawaian
    phone VARCHAR(50),
    email VARCHAR(255),
    gender VARCHAR(20),
    address TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    metadata JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Unique index on identifier (when provided) to prevent duplicates
CREATE UNIQUE INDEX IF NOT EXISTS uq_persons_identifier 
    ON persons (identifier) 
    WHERE identifier IS NOT NULL AND identifier <> '';

CREATE INDEX IF NOT EXISTS idx_persons_status ON persons (status);
CREATE INDEX IF NOT EXISTS idx_persons_name ON persons (name);

-- 2. EXTEND USERS TABLE (ACCOUNT UNIT) WITH HOLDER REFERENCE
ALTER TABLE users
    ADD COLUMN IF NOT EXISTS holder_person_id UUID REFERENCES persons(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS holder_name VARCHAR(255),
    ADD COLUMN IF NOT EXISTS holder_phone VARCHAR(50);

COMMENT ON COLUMN users.holder_person_id IS
    'Stage 5: ID manusia (Person) yang saat ini aktif memegang / mengelola Akun Unit.';
COMMENT ON COLUMN users.holder_name IS
    'Stage 5: Denormalized display name pemegang akun aktif untuk query cepat.';

CREATE INDEX IF NOT EXISTS idx_users_holder_person_id
    ON users(holder_person_id)
    WHERE holder_person_id IS NOT NULL;

-- 3. CREATE ACCOUNT HOLDER HISTORIES TABLE
CREATE TABLE IF NOT EXISTS account_holder_histories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    account_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES organizations(id) ON DELETE RESTRICT,
    person_id UUID NOT NULL REFERENCES persons(id) ON DELETE RESTRICT,
    person_name VARCHAR(255) NOT NULL,
    period_start DATE NOT NULL,
    period_end DATE,
    handover_notes TEXT,
    created_by UUID REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

COMMENT ON TABLE account_holder_histories IS
    'Stage 5: Catatan riwayat seluruh pemegang (tenure) Akun Unit dari waktu ke waktu.';

-- 4. CONSTRAINTS & INDEXES
-- Invariant: Hanya ada 1 pemegang aktif per Akun Unit pada satu waktu (period_end IS NULL)
CREATE UNIQUE INDEX IF NOT EXISTS uq_single_active_holder_per_account
    ON account_holder_histories (account_id)
    WHERE period_end IS NULL;

CREATE INDEX IF NOT EXISTS idx_holder_histories_account_id
    ON account_holder_histories (account_id);

CREATE INDEX IF NOT EXISTS idx_holder_histories_org_id
    ON account_holder_histories (organization_id);

CREATE INDEX IF NOT EXISTS idx_holder_histories_person_id
    ON account_holder_histories (person_id);

-- 5. TRIGGER: CLOSE OLD HOLDER HISTORY AND SYNC USER HOLDER
CREATE OR REPLACE FUNCTION trg_sync_account_holder_after_history()
RETURNS TRIGGER AS $$
BEGIN
    -- When a new active history is inserted (period_end IS NULL)
    IF NEW.period_end IS NULL THEN
        -- 1. Close any other open histories for this account (set period_end = NEW.period_start)
        UPDATE account_holder_histories
        SET period_end = NEW.period_start
        WHERE account_id = NEW.account_id
          AND id <> NEW.id
          AND period_end IS NULL;

        -- 2. Synchronize user active holder metadata
        UPDATE users
        SET holder_person_id = NEW.person_id,
            holder_name = NEW.person_name,
            updated_at = NOW()
        WHERE id = NEW.account_id;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_account_holder_history_sync ON account_holder_histories;
CREATE TRIGGER trg_account_holder_history_sync
    AFTER INSERT ON account_holder_histories
    FOR EACH ROW
    EXECUTE FUNCTION trg_sync_account_holder_after_history();

-- 6. NON-DESTRUCTIVE RLS POLICIES
ALTER TABLE persons ENABLE ROW LEVEL SECURITY;
ALTER TABLE account_holder_histories ENABLE ROW LEVEL SECURITY;

-- Persons: Viewable by any authenticated user; Manageable by Admin/Superadmin
CREATE POLICY "Persons View Policy" ON persons FOR SELECT
USING (auth.role() = 'authenticated');

CREATE POLICY "Persons Insert/Update Policy" ON persons FOR ALL
USING (
    is_superadmin() OR 
    EXISTS (
        SELECT 1 FROM organization_memberships om
        WHERE om.user_id = auth.uid() 
          AND om.status = 'active'
          AND om.level = 'admin'
    )
);

-- Account Holder Histories: Viewable by organization members and superiors
CREATE POLICY "Account Holder Histories View Policy" ON account_holder_histories FOR SELECT
USING (
    is_superadmin() OR
    organization_id IN (SELECT organization_id FROM get_user_active_organization_ids()) OR
    organization_id IN (
        SELECT id FROM organizations
        WHERE parent_id IN (SELECT organization_id FROM get_user_active_organization_ids())
    )
);

CREATE POLICY "Account Holder Histories Insert Policy" ON account_holder_histories FOR INSERT
WITH CHECK (
    is_superadmin() OR
    EXISTS (
        SELECT 1 FROM organization_memberships om
        WHERE om.user_id = auth.uid() 
          AND om.status = 'active'
          AND om.level = 'admin'
    )
);
