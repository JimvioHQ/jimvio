-- Multi-store enablement: Remove unique constraint on user_id in vendors table
-- This allows one user to own and manage multiple independent storefronts.

DO $$ 
BEGIN
    IF EXISTS (SELECT 1 FROM pg_constraint WHERE conname = 'vendors_user_id_key') THEN
        ALTER TABLE vendors DROP CONSTRAINT vendors_user_id_key;
    END IF;
END $$;

-- Update indexes if they exist separately
DROP INDEX IF EXISTS vendors_user_id_key;
