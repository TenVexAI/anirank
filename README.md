# AniRank

AniRank is a web application that allows users to create, curate, and share personalized ranked anime lists. Users search for anime titles, add them to named lists, rate them across four scoring categories (Technical Execution, Storytelling, Personal Enjoyment, X-Factor), and publish their lists for the community to browse, like, and comment on.

Anime metadata is pulled automatically from the [AniList GraphQL API](https://docs.anilist.co/).

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 19 + React Router 7 (Vite) |
| Styling | Tailwind CSS 4 |
| Backend / Database | Supabase (Postgres + Row-Level Security) |
| Authentication | Supabase Auth (Twitch, Discord, GitHub) |
| Anime Data | AniList GraphQL API |
| Icons | Lucide React |

## Project Structure

```
anirank/
├── .env                        # Environment variables (not committed)
├── .env.example                # Template for env vars
├── .gitignore
├── README.md
├── SPEC.md                     # Full product specification
├── frontend/
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── public/
│   │   └── fonts/              # PixelCode font (headers)
│   └── src/
│       ├── main.jsx            # Entry point
│       ├── App.jsx             # Router + layout shell
│       ├── index.css           # Tailwind + custom fonts + CSS vars
│       ├── components/
│       │   ├── layout/         # Navbar, Footer
│       │   ├── auth/           # Auth-related components
│       │   ├── lists/          # List cards, list editor components
│       │   ├── anime/          # Anime search, anime cards
│       │   ├── profile/        # Profile display components
│       │   └── ui/             # Shared UI primitives
│       ├── pages/              # Route-level page components
│       ├── lib/
│       │   ├── supabase.js     # Supabase client
│       │   └── anilist.js      # AniList GraphQL queries
│       ├── hooks/              # Custom React hooks
│       ├── context/
│       │   └── AuthContext.jsx  # Auth state provider
│       └── utils/
│           └── scoring.js      # Weighted score calculation
└── supabase/
    └── migrations/
        └── 001_initial_schema.sql  # Database tables + indexes
```

## Getting Started

### Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project with Auth configured (Twitch, Discord, GitHub providers)

### Setup

1. Clone the repo and navigate to the project:
   ```bash
   git clone <repo-url>
   cd anirank
   ```

2. Copy the env template and fill in your Supabase credentials:
   ```bash
   cp .env.example .env
   ```

3. Install dependencies:
   ```bash
   cd frontend
   npm install
   ```

4. Run the Supabase migration against your project (via the Supabase dashboard SQL editor or CLI).

5. Start the dev server:
   ```bash
   npm run dev
   ```

## Environment Variables

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL |
| `VITE_SUPABASE_ANON_KEY` | Your Supabase anonymous/public key |
| `VITE_ANILIST_API_URL` | AniList GraphQL endpoint (`https://graphql.anilist.co`) |

## Fonts

- **PixelCode** — Used for headings. Included in `frontend/public/fonts/`.
- **Yuji Mai** — Used for Japanese text. Loaded from Google Fonts.

## License

Private — all rights reserved.
