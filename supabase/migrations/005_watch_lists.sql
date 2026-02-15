-- 1) Add list_type to lists (default 'rank' for existing lists)
ALTER TABLE lists ADD COLUMN IF NOT EXISTS list_type TEXT NOT NULL DEFAULT 'rank';

-- 2) Add watched boolean to list_entries (for watch lists)
ALTER TABLE list_entries ADD COLUMN IF NOT EXISTS watched BOOLEAN NOT NULL DEFAULT false;
