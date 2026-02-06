# AniRank — Anime List Ranking Web App

## Product Specification Document (MVP)

**Version:** 1.0
**Date:** February 5, 2026
**Platform:** Web application hosted on tenvexai.com (subdomain TBD, e.g., anirank.tenvexai.com)

---

## 1. Overview

AniRank is a web application that allows users to create, curate, and share personalized ranked anime lists. Users search for anime titles (shows and movies), add them to named lists, rate them across four scoring categories, and publish their lists for the community to browse, like, and comment on. Anime metadata (cover art, genres, descriptions, streaming availability) is pulled automatically from the AniList GraphQL API. Anime titles are stored in three forms — English, Romaji, and Japanese (native) — with English and Japanese displayed in the UI and Romaji used as an additional searchable field.

---

## 2. Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React (with React Router for SPA routing) |
| Styling | TBD (Tailwind CSS recommended) |
| Backend / Database | Supabase (Postgres + Row-Level Security) |
| Authentication | Supabase Auth with OAuth providers: Twitch, Discord, GitHub |
| Anime Data Source | AniList GraphQL API (https://graphql.anilist.co) — see [API docs](https://docs.anilist.co/) |
| Hosting | tenvexai.com subdomain (deployment method TBD) |

---

## 3. Authentication

### 3.1 OAuth Providers

Users log in via one of three OAuth providers, all natively supported by Supabase Auth:

- **Twitch**
- **Discord**
- **GitHub**

### 3.2 Auth Flow

1. User clicks "Sign In" and selects a provider.
2. Supabase handles the OAuth redirect and token exchange.
3. On first login, a user profile record is automatically created in the `profiles` table.
4. Subsequent logins link to the existing profile via Supabase's `auth.users` ID.

### 3.3 Unauthenticated Access

- Unauthenticated visitors can browse the main page, view public lists, and view user profiles.
- Creating lists, rating anime, liking, and commenting require authentication.

---

## 4. User Profiles

### 4.1 Profile Data

| Field | Source | Editable |
|---|---|---|
| Username / display name | Auto-populated from OAuth provider | Yes |
| Avatar | Auto-populated from OAuth provider | Yes (upload or URL) |
| Bio | Empty by default | Yes |
| Joined date | Auto-set on first login | No |

### 4.2 Profile Page (`/user/:username`)

Displays:

- Avatar, display name, bio
- Join date
- Count of public lists
- List of all public lists by this user (sorted by most recent)
- Total likes received across all lists

---

## 5. Lists

### 5.1 List Properties

| Field | Description |
|---|---|
| Title | User-defined name (e.g., "My Top 50 Anime Shows") |
| Description | Optional text describing the list's purpose or criteria |
| Visibility | Private (default) or Public |
| Category Weights | User-defined weights for each of the 4 rating categories (see §5.4) |
| Created at | Timestamp |
| Updated at | Timestamp (auto-updated on any edit) |

### 5.2 Creating a List

1. User clicks "New List" from their dashboard.
2. User provides a list title and optional description.
3. User sets category weights (defaults to equal weight; see §5.4).
4. List is created in Private visibility by default.
5. User is taken to the list editor view to begin adding anime.

### 5.3 List Size

There is no enforced minimum or maximum number of entries in a list. A list can contain any mix of anime shows and movies.

### 5.4 Rating Categories & Weighted Ranking

Each anime entry in a list is scored across four categories on a **0.0–10.0 scale** (one decimal place):

| Category | Description |
|---|---|
| Technical Execution | Audio/visual quality — animation, art direction, sound design, music |
| Storytelling | Narrative structure, writing, character development, pacing |
| Personal Enjoyment | Subjective enjoyment and emotional impact |
| X-Factor | Innovation, uniqueness, cultural impact, or anything that sets it apart |

**Weighted Overall Score:**

Each list has user-defined weights for the four categories. Weights are positive numbers that represent relative importance. The overall score for an anime entry is calculated as:

```
overall = (w1 × technical + w2 × storytelling + w3 × enjoyment + w4 × xfactor) / (w1 + w2 + w3 + w4)
```

Default weights: `w1 = 1, w2 = 1, w3 = 1, w4 = 1` (equal weight, simple average).

Example custom weights: A user who values enjoyment twice as much might set `w1 = 1, w2 = 1, w3 = 2, w4 = 1`, making the denominator 5.

**Auto-Ranking:** Entries in a list are automatically sorted by overall weighted score descending. Ties are broken by the order they were added (earlier entry ranks higher). The rank position (1, 2, 3, ...) is displayed alongside each entry.

### 5.5 Anime Entry Data

When a user adds an anime to a list, the following data is stored:

**From AniList API (auto-populated):**

| Field | AniList Source |
|---|---|
| AniList ID | `media.id` |
| Title (English) | `media.title.english` |
| Title (Romaji) | `media.title.romaji` (used for search; not displayed directly) |
| Title (Japanese / Native) | `media.title.native` |
| Cover image | `media.coverImage.large` |
| Banner image | `media.bannerImage` |
| Format | `media.format` (TV, MOVIE, OVA, ONA, SPECIAL, etc.) |
| Genres | `media.genres` |
| Tags | `media.tags` (with spoiler filtering) |
| Description / Synopsis | `media.description` |
| Average score | `media.averageScore` |
| Episodes / Duration | `media.episodes`, `media.duration` |
| Season / Year | `media.season`, `media.seasonYear` |
| Studio(s) | `media.studios.nodes` |
| Streaming links | `media.externalLinks` (filtered to streaming type) |

**User-provided per entry:**

| Field | Description |
|---|---|
| Technical Execution score | 0.0–10.0 |
| Storytelling score | 0.0–10.0 |
| Personal Enjoyment score | 0.0–10.0 |
| X-Factor score | 0.0–10.0 |
| Streaming availability | Auto-populated from AniList `externalLinks`, user can add/remove services from a predefined set (see §5.6) |
| Personal notes / review | Free-text field, supports basic formatting (optional) |

### 5.6 Streaming Services

The streaming availability field is auto-populated from AniList's `externalLinks` where the link type is `STREAMING`. The user can then manually add or remove services. The predefined set of services includes:

- Crunchyroll
- Netflix
- Hulu
- Amazon Prime Video
- Disney+
- Funimation
- HIDIVE
- HBO Max
- YouTube (official/free)
- Other (user-specified label)

Each service is displayed as a tag/badge on the anime entry.

### 5.7 Editing a List

The list editor view provides:

- **Anime search bar** — Search AniList by title (matches against English, Romaji, and Japanese titles); results show cover art, English title, Japanese title, format, year, and genres for easy identification. Click to add to list.
- **Inline rating** — Each entry shows four score sliders or input fields. Updating a score instantly recalculates the overall score and re-sorts the list.
- **Streaming tag editor** — Auto-populated tags with the ability to add/remove.
- **Notes field** — Expandable text area per entry.
- **Remove entry** — Remove an anime from the list.
- **List settings** — Edit title, description, category weights, and visibility.
- **Weight preview** — When weights are changed, the list re-sorts in real time so the user can see the impact.

### 5.8 Visibility

- **Private** (default): Only visible to the list owner. Does not appear on the main page or in search results.
- **Public**: Visible to all users (authenticated and unauthenticated). Appears on the main page and in search results. Can receive likes and comments.

Users can toggle visibility at any time from the list editor or their dashboard.

---

## 6. Main Page / Discovery

### 6.1 Layout

The main page (`/`) is the primary discovery surface for public lists. It displays:

- **Featured/Recent section** — Recently updated or newly published public lists.
- **Most Liked section** — Public lists sorted by like count.
- **Search bar** — Unified search (see §6.2).

### 6.2 Search

A single search bar with contextual results. The search returns results across three dimensions:

| Search Type | Matches On | Displays |
|---|---|---|
| By user | Username / display name | User profile cards with public list count |
| By list title | List title, list description | List cards with title, author, entry count, like count |
| By anime | Anime English, Romaji, or Japanese titles within public lists | Lists that contain the matched anime, showing that anime's rank in each list |

Search should be debounced (300ms) and show results grouped by type. Each result links to the corresponding profile, list, or filtered view.

### 6.3 List Card (Preview)

On the main page and in search results, each list is shown as a card containing:

- List title
- Author avatar + display name
- Number of entries
- Top 3 anime cover images (thumbnail strip)
- Like count
- Last updated date

---

## 7. List Detail View

### 7.1 Public List View (`/list/:id`)

When viewing a public list, the page shows:

**Header:**
- List title and description
- Author avatar + display name (links to profile)
- Category weights displayed (e.g., "Weights: Technical ×1 | Story ×2 | Enjoyment ×1.5 | X-Factor ×1")
- Like button + like count
- Last updated date

**Ranked Entries:**

Each anime entry displayed as a card/row in rank order:

1. **Rank number** (prominently displayed)
2. **Cover image**
3. **Title** (English title displayed prominently; Japanese native title displayed below or beside it)
4. **Format badge** (TV, Movie, OVA, etc.)
5. **Four category scores** (displayed as a mini score breakdown)
6. **Overall weighted score** (prominently displayed)
7. **Genres / Tags** (condensed)
8. **Streaming service badges**
9. **Synopsis** (truncated, expandable)
10. **Personal notes/review** (expandable section if present)
11. **AniList average score** (for reference/comparison)
12. **Studio(s) and year**

### 7.2 Comments Section

Below the list entries, a comments section allows authenticated users to leave comments on public lists.

| Feature | Detail |
|---|---|
| Comment text | Free text, reasonable max length (2000 chars) |
| Author | Avatar + display name |
| Timestamp | Relative time (e.g., "2 hours ago") |
| Sort order | Newest first (default) |
| Deletion | Comment author can delete their own comments; list owner can delete any comment on their list |
| Editing | Comment author can edit within 15 minutes of posting |

### 7.3 Likes

- Authenticated users can like a public list (one like per user per list, toggle on/off).
- Like count is displayed on the list detail view and on list cards.
- Users cannot like their own lists.

---

## 8. User Dashboard

### 8.1 Authenticated User Dashboard (`/dashboard`)

The logged-in user's home screen shows:

- **My Lists** — All lists (private and public) with visibility indicators, entry count, and last updated date. Sortable by title, date created, date updated.
- **Quick actions** — "New List" button.
- **Liked Lists** — Lists the user has liked (links to those lists).
- **Stats** — Total lists, total anime rated, total likes received.

---

## 9. Database Schema (Supabase / Postgres)

### 9.1 Tables

```sql
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
```

### 9.2 Key Indexes

```sql
CREATE INDEX idx_lists_user_id ON lists(user_id);
CREATE INDEX idx_lists_public ON lists(is_public) WHERE is_public = true;
CREATE INDEX idx_lists_like_count ON lists(like_count DESC) WHERE is_public = true;
CREATE INDEX idx_list_entries_list_id ON list_entries(list_id);
CREATE INDEX idx_likes_list_id ON likes(list_id);
CREATE INDEX idx_likes_user_id ON likes(user_id);
CREATE INDEX idx_comments_list_id ON comments(list_id);
CREATE INDEX idx_anime_cache_cached_at ON anime_cache(cached_at);
```

### 9.3 Row-Level Security (RLS) Policies

| Table | Policy | Rule |
|---|---|---|
| profiles | Read | Anyone can read any profile |
| profiles | Update | Users can only update their own profile |
| lists | Read | Owner can read all their lists; others can only read public lists |
| lists | Insert/Update/Delete | Owner only |
| list_entries | Read | Follows parent list visibility |
| list_entries | Insert/Update/Delete | List owner only |
| likes | Read | Anyone |
| likes | Insert/Delete | Authenticated users; cannot like own list |
| comments | Read | Anyone can read comments on public lists |
| comments | Insert | Authenticated users on public lists |
| comments | Update | Comment author only, within 15 minutes |
| comments | Delete | Comment author or list owner |

### 9.4 Anime Cache Strategy

To reduce AniList API calls and improve performance:

- When a user searches for anime, results are fetched from AniList and displayed directly.
- When an anime is added to a list, its metadata is upserted into `anime_cache`.
- Cache entries older than 7 days are refreshed on next access.
- Streaming links (`external_links`) are cached but the user's manual overrides are stored in `list_entries.streaming_services`.

---

## 10. AniList API Integration

> **Reference:** Full API documentation is available at [https://docs.anilist.co/](https://docs.anilist.co/). All queries target the endpoint `https://graphql.anilist.co`. Refer to the docs for schema details, pagination, and rate-limit headers.

### 10.1 Search Query

```graphql
query SearchAnime($search: String!, $page: Int, $perPage: Int) {
    Page(page: $page, perPage: $perPage) {
        pageInfo {
            total
            currentPage
            lastPage
            hasNextPage
        }
        media(search: $search, type: ANIME, sort: SEARCH_MATCH) {
            id
            title {
                english
                romaji
                native
            }
            coverImage {
                large
            }
            bannerImage
            format
            genres
            tags {
                name
                rank
                isMediaSpoiler
            }
            description(asHtml: false)
            averageScore
            episodes
            duration
            season
            seasonYear
            studios {
                nodes {
                    name
                    isAnimationStudio
                }
            }
            externalLinks {
                site
                url
                type
            }
        }
    }
}
```

### 10.2 Rate Limiting

AniList allows 90 requests per minute. The app should:

- Debounce search input (300ms).
- Cache search results client-side for the session.
- Use the `anime_cache` table to avoid re-fetching known entries.
- Display rate limit headers and gracefully degrade if limits are hit.

---

## 11. Routing Structure

| Route | View | Auth Required |
|---|---|---|
| `/` | Main page / discovery | No |
| `/login` | Login page with OAuth options | No |
| `/dashboard` | User's personal dashboard | Yes |
| `/list/new` | Create new list | Yes |
| `/list/:id` | View list (public or own) | No (respects visibility) |
| `/list/:id/edit` | Edit list | Yes (owner only) |
| `/user/:username` | User profile page | No |
| `/search?q=...` | Search results page | No |

---

## 12. UI/UX Notes

### 12.1 Design Direction

- Dark theme, use the same theme/colors in our website, https://tenvexai.com, you can see the code here: https://github.com/TenVexAI/tenvexai-website.
- Cover art-forward design — anime covers should be prominent throughout.
- Responsive — mobile-friendly, but desktop is the primary experience.
- Score visualization — consider color-coded score badges (red → yellow → green gradient from 0–10).
- For Japanese characters, use the Google Font (yuji_mai)
- For Headers, use the PixelCode font included in frontend/public/fonts/ 

### 12.1.1 Colors

  --color-bg-primary: #141414;
  --color-bg-secondary: #313131;
  --color-accent-purple: #a287f4;
  --color-accent-cyan: #12e6c8;
  --color-accent-green: #3cf281;
  --color-accent-red: #e44c55;
  --color-accent-yellow: #ffc107;
  --color-text-primary: #e0e0e0;
  --color-text-secondary: #a0a0a0;
  --color-border: #2a5a5e;


### 12.2 Key Interactions

- **Search autocomplete** — As the user types in the anime search bar, show a dropdown of matching results with cover thumbnails, format, and year.
- **Inline score editing** — Scores can be edited directly in the list view via sliders or number inputs. Changes trigger instant re-sort with a smooth animation.
- **Drag override** — Optional: allow users to manually drag-reorder entries if they want to override the calculated sort. (Nice-to-have, not required for MVP.)
- **Optimistic UI** — Likes and comments should update instantly with optimistic rendering, reverting on failure.

---

## 13. Future Considerations (Post-MVP)

These features are explicitly out of scope for MVP but worth designing around:

- **Collaborative lists** — Multiple users contribute ratings to a shared list, with aggregate scoring.
- **List comparison view** — Side-by-side comparison of two users' lists showing where they agree/disagree.
- **Import from MAL/AniList** — Import a user's existing anime list from MyAnimeList or AniList.
- **Custom scoring categories** — Allow users to define their own category names beyond the four defaults.
- **Notifications** — Notify users when their lists receive likes or comments.
- **Embed widget** — Embeddable iframe or card for sharing lists on other sites.
- **List templates** — Pre-built list structures (e.g., "Top 50 Shows", "Best Movies of 2025").
- **Advanced search filters** — Filter public lists by genre, minimum entry count, etc.

---

## 14. Summary of Key Decisions

| Decision | Choice |
|---|---|
| Backend | Supabase (Postgres + Auth + RLS) |
| Auth providers | Twitch, Discord, GitHub |
| Anime API | AniList GraphQL ([docs](https://docs.anilist.co/)) |
| List type | Mixed (shows and movies in one list) |
| List ownership | Individual (no collaborative lists for MVP) |
| Ranking method | Weighted average of 4 categories, user-defined weights per list |
| Streaming tags | Auto-populated from AniList + manual user edits |
| Default visibility | Private |
| Comments | Enabled on public lists |
| Likes | One per user per list, cannot like own |
| Profile | Avatar, bio, public list display |
