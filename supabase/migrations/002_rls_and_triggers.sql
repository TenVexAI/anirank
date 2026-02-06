-- =============================================================
-- RLS Policies & Auto-Profile Trigger
-- =============================================================

-- Enable RLS on all tables
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE anime_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE lists ENABLE ROW LEVEL SECURITY;
ALTER TABLE list_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- =============================================================
-- PROFILES
-- =============================================================
-- Anyone can read profiles
CREATE POLICY "Profiles are viewable by everyone"
    ON profiles FOR SELECT
    USING (true);

-- Users can update their own profile
CREATE POLICY "Users can update their own profile"
    ON profiles FOR UPDATE
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

-- Users can insert their own profile (for trigger/fallback)
CREATE POLICY "Users can insert their own profile"
    ON profiles FOR INSERT
    WITH CHECK (auth.uid() = id);

-- =============================================================
-- ANIME_CACHE
-- =============================================================
-- Anyone can read cached anime data
CREATE POLICY "Anime cache is viewable by everyone"
    ON anime_cache FOR SELECT
    USING (true);

-- Authenticated users can insert/update cache entries
CREATE POLICY "Authenticated users can insert anime cache"
    ON anime_cache FOR INSERT
    TO authenticated
    WITH CHECK (true);

CREATE POLICY "Authenticated users can update anime cache"
    ON anime_cache FOR UPDATE
    TO authenticated
    USING (true)
    WITH CHECK (true);

-- =============================================================
-- LISTS
-- =============================================================
-- Anyone can view public lists; owners can view their own (including private)
CREATE POLICY "Public lists are viewable by everyone"
    ON lists FOR SELECT
    USING (is_public = true OR auth.uid() = user_id);

-- Owners can insert lists
CREATE POLICY "Users can create their own lists"
    ON lists FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Owners can update their own lists
CREATE POLICY "Users can update their own lists"
    ON lists FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Owners can delete their own lists
CREATE POLICY "Users can delete their own lists"
    ON lists FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- =============================================================
-- LIST_ENTRIES
-- =============================================================
-- Viewable if the parent list is viewable
CREATE POLICY "List entries are viewable if list is viewable"
    ON list_entries FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM lists
            WHERE lists.id = list_entries.list_id
            AND (lists.is_public = true OR lists.user_id = auth.uid())
        )
    );

-- Owners of the list can manage entries
CREATE POLICY "List owners can insert entries"
    ON list_entries FOR INSERT
    TO authenticated
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM lists
            WHERE lists.id = list_entries.list_id
            AND lists.user_id = auth.uid()
        )
    );

CREATE POLICY "List owners can update entries"
    ON list_entries FOR UPDATE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM lists
            WHERE lists.id = list_entries.list_id
            AND lists.user_id = auth.uid()
        )
    )
    WITH CHECK (
        EXISTS (
            SELECT 1 FROM lists
            WHERE lists.id = list_entries.list_id
            AND lists.user_id = auth.uid()
        )
    );

CREATE POLICY "List owners can delete entries"
    ON list_entries FOR DELETE
    TO authenticated
    USING (
        EXISTS (
            SELECT 1 FROM lists
            WHERE lists.id = list_entries.list_id
            AND lists.user_id = auth.uid()
        )
    );

-- =============================================================
-- LIKES
-- =============================================================
-- Anyone can see likes
CREATE POLICY "Likes are viewable by everyone"
    ON likes FOR SELECT
    USING (true);

-- Authenticated users can like (but not their own lists — enforced in app logic)
CREATE POLICY "Authenticated users can like lists"
    ON likes FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid() = user_id);

-- Users can remove their own likes
CREATE POLICY "Users can remove their own likes"
    ON likes FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- =============================================================
-- COMMENTS
-- =============================================================
-- Comments are viewable on public lists
CREATE POLICY "Comments are viewable on public lists"
    ON comments FOR SELECT
    USING (
        EXISTS (
            SELECT 1 FROM lists
            WHERE lists.id = comments.list_id
            AND lists.is_public = true
        )
    );

-- Authenticated users can comment on public lists
CREATE POLICY "Authenticated users can comment on public lists"
    ON comments FOR INSERT
    TO authenticated
    WITH CHECK (
        auth.uid() = user_id
        AND EXISTS (
            SELECT 1 FROM lists
            WHERE lists.id = comments.list_id
            AND lists.is_public = true
        )
    );

-- Users can update their own comments
CREATE POLICY "Users can update their own comments"
    ON comments FOR UPDATE
    TO authenticated
    USING (auth.uid() = user_id)
    WITH CHECK (auth.uid() = user_id);

-- Users can delete their own comments
CREATE POLICY "Users can delete their own comments"
    ON comments FOR DELETE
    TO authenticated
    USING (auth.uid() = user_id);

-- =============================================================
-- AUTO-CREATE PROFILE ON SIGNUP (trigger)
-- =============================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    _username TEXT;
    _display_name TEXT;
    _avatar_url TEXT;
BEGIN
    -- Extract metadata from OAuth provider
    _display_name := COALESCE(
        NEW.raw_user_meta_data ->> 'full_name',
        NEW.raw_user_meta_data ->> 'name',
        NEW.raw_user_meta_data ->> 'user_name',
        NEW.raw_user_meta_data ->> 'preferred_username',
        'User'
    );

    _avatar_url := COALESCE(
        NEW.raw_user_meta_data ->> 'avatar_url',
        NEW.raw_user_meta_data ->> 'picture'
    );

    -- Generate a unique username from the display name
    _username := lower(regexp_replace(_display_name, '[^a-zA-Z0-9]', '', 'g'));
    IF _username = '' THEN
        _username := 'user';
    END IF;

    -- Append random suffix to ensure uniqueness
    _username := _username || '_' || substr(md5(random()::text), 1, 6);

    INSERT INTO public.profiles (id, username, display_name, avatar_url)
    VALUES (NEW.id, _username, _display_name, _avatar_url);

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Trigger on auth.users insert
CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW
    EXECUTE FUNCTION public.handle_new_user();
