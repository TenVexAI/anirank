-- =============================================================
-- 004: Like count trigger + Manual rank override
-- =============================================================

-- 1) Auto-update like_count via trigger (bypasses RLS)
-- ---------------------------------------------------------
CREATE OR REPLACE FUNCTION public.update_list_like_count()
RETURNS TRIGGER AS $$
BEGIN
    IF TG_OP = 'INSERT' THEN
        UPDATE lists SET like_count = like_count + 1 WHERE id = NEW.list_id;
        RETURN NEW;
    ELSIF TG_OP = 'DELETE' THEN
        UPDATE lists SET like_count = like_count - 1 WHERE id = OLD.list_id;
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_like_change
    AFTER INSERT OR DELETE ON likes
    FOR EACH ROW
    EXECUTE FUNCTION public.update_list_like_count();

-- Fix any existing like_count mismatches
UPDATE lists SET like_count = (
    SELECT COUNT(*) FROM likes WHERE likes.list_id = lists.id
);

-- 2) Manual rank override columns
-- ---------------------------------------------------------
-- Flag on the list: is manual ordering enabled?
ALTER TABLE lists ADD COLUMN IF NOT EXISTS rank_override_enabled BOOLEAN DEFAULT false;

-- Per-entry manual position (null = not manually positioned)
ALTER TABLE list_entries ADD COLUMN IF NOT EXISTS manual_position INTEGER;
