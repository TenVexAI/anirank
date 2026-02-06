-- User profiles (extends Supabase auth.users)
CREATE TABLE profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    username TEXT UNIQUE NOT NULL,
    display_name TEXT,
    avatar_url TEXT,
    bio TEXT DEFAULT '',
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Anime cache (local cache of AniList data to reduce API calls)
CREATE TABLE anime_cache (
    anilist_id INTEGER PRIMARY KEY,
    title_english TEXT,
    title_romaji TEXT,       -- used for search matching; not displayed in UI
    title_native TEXT,        -- Japanese title
    cover_image_url TEXT,
    banner_image_url TEXT,
    format TEXT,  -- TV, MOVIE, OVA, ONA, SPECIAL
    genres TEXT[],
    tags JSONB,  -- [{name, rank, isMediaSpoiler}]
    description TEXT,
    average_score INTEGER,
    episodes INTEGER,
    duration INTEGER,
    season TEXT,
    season_year INTEGER,
    studios JSONB,  -- [{name, isAnimationStudio}]
    external_links JSONB,  -- [{site, url, type}]
    cached_at TIMESTAMPTZ DEFAULT now()
);

-- User lists
CREATE TABLE lists (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    is_public BOOLEAN DEFAULT false,
    weight_technical NUMERIC(4,2) DEFAULT 1.00,
    weight_storytelling NUMERIC(4,2) DEFAULT 1.00,
    weight_enjoyment NUMERIC(4,2) DEFAULT 1.00,
    weight_xfactor NUMERIC(4,2) DEFAULT 1.00,
    like_count INTEGER DEFAULT 0,  -- denormalized for sort performance
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Anime entries within a list
CREATE TABLE list_entries (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    anilist_id INTEGER NOT NULL REFERENCES anime_cache(anilist_id),
    score_technical NUMERIC(3,1) DEFAULT 0.0 CHECK (score_technical >= 0 AND score_technical <= 10),
    score_storytelling NUMERIC(3,1) DEFAULT 0.0 CHECK (score_storytelling >= 0 AND score_storytelling <= 10),
    score_enjoyment NUMERIC(3,1) DEFAULT 0.0 CHECK (score_enjoyment >= 0 AND score_enjoyment <= 10),
    score_xfactor NUMERIC(3,1) DEFAULT 0.0 CHECK (score_xfactor >= 0 AND score_xfactor <= 10),
    streaming_services TEXT[],  -- ['Crunchyroll', 'Netflix', ...]
    notes TEXT DEFAULT '',
    added_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(list_id, anilist_id)  -- prevent duplicates within a list
);

-- Likes
CREATE TABLE likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    created_at TIMESTAMPTZ DEFAULT now(),
    UNIQUE(user_id, list_id)
);

-- Comments
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
    list_id UUID NOT NULL REFERENCES lists(id) ON DELETE CASCADE,
    body TEXT NOT NULL CHECK (char_length(body) <= 2000),
    created_at TIMESTAMPTZ DEFAULT now(),
    updated_at TIMESTAMPTZ DEFAULT now()
);

-- Indexes
CREATE INDEX idx_lists_user_id ON lists(user_id);
CREATE INDEX idx_lists_public ON lists(is_public) WHERE is_public = true;
CREATE INDEX idx_lists_like_count ON lists(like_count DESC) WHERE is_public = true;
CREATE INDEX idx_list_entries_list_id ON list_entries(list_id);
CREATE INDEX idx_likes_list_id ON likes(list_id);
CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_comments_list_id ON comments(list_id);
CREATE INDEX idx_anime_cache_cached_at ON anime_cache(cached_at);
