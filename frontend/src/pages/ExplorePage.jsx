import { useState, useEffect, useCallback, useRef } from 'react';
import { Search as SearchIcon, ChevronDown, ChevronUp, ExternalLink, Tv, Film, Clock, Grid, List, X } from 'lucide-react';
import { browseAnime } from '../lib/anilist';

const GENRES = [
  'Action', 'Adventure', 'Comedy', 'Drama', 'Ecchi', 'Fantasy', 'Horror',
  'Mahou Shoujo', 'Mecha', 'Music', 'Mystery', 'Psychological', 'Romance',
  'Sci-Fi', 'Slice of Life', 'Sports', 'Supernatural', 'Thriller',
];

const SEASONS = [
  { value: '', label: 'Any' },
  { value: 'WINTER', label: 'Winter' },
  { value: 'SPRING', label: 'Spring' },
  { value: 'SUMMER', label: 'Summer' },
  { value: 'FALL', label: 'Fall' },
];

const FORMATS = [
  { value: '', label: 'Any' },
  { value: 'TV', label: 'TV' },
  { value: 'TV_SHORT', label: 'TV Short' },
  { value: 'MOVIE', label: 'Movie' },
  { value: 'SPECIAL', label: 'Special' },
  { value: 'OVA', label: 'OVA' },
  { value: 'ONA', label: 'ONA' },
  { value: 'MUSIC', label: 'Music' },
];

const STATUSES = [
  { value: '', label: 'Any' },
  { value: 'FINISHED', label: 'Finished' },
  { value: 'RELEASING', label: 'Airing' },
  { value: 'NOT_YET_RELEASED', label: 'Upcoming' },
  { value: 'CANCELLED', label: 'Cancelled' },
  { value: 'HIATUS', label: 'Hiatus' },
];

const SORT_OPTIONS = [
  { value: 'TRENDING_DESC', label: 'Trending' },
  { value: 'POPULARITY_DESC', label: 'Popularity' },
  { value: 'SCORE_DESC', label: 'Score' },
  { value: 'FAVOURITES_DESC', label: 'Favourites' },
  { value: 'START_DATE_DESC', label: 'Newest' },
  { value: 'START_DATE', label: 'Oldest' },
  { value: 'TITLE_ROMAJI', label: 'Title A-Z' },
];

const STATUS_COLORS = {
  FINISHED: 'var(--color-accent-green)',
  RELEASING: 'var(--color-accent-cyan)',
  NOT_YET_RELEASED: 'var(--color-accent-yellow)',
  CANCELLED: 'var(--color-accent-red)',
  HIATUS: 'var(--color-text-secondary)',
};

const STATUS_LABELS = {
  FINISHED: 'Finished',
  RELEASING: 'Airing',
  NOT_YET_RELEASED: 'Upcoming',
  CANCELLED: 'Cancelled',
  HIATUS: 'Hiatus',
};

const FORMAT_LABELS = {
  TV: 'TV', TV_SHORT: 'TV Short', MOVIE: 'Movie', SPECIAL: 'Special',
  OVA: 'OVA', ONA: 'ONA', MUSIC: 'Music',
};

// Generate year options from current year + 1 down to 1940
const currentYear = new Date().getFullYear();
const YEARS = [{ value: '', label: 'Any' }, ...Array.from({ length: currentYear - 1940 + 2 }, (_, i) => {
  const y = currentYear + 1 - i;
  return { value: y, label: String(y) };
})];

function ExplorePage() {
  const [search, setSearch] = useState('');
  const [selectedGenres, setSelectedGenres] = useState([]);
  const [year, setYear] = useState('');
  const [season, setSeason] = useState('');
  const [format, setFormat] = useState('');
  const [status, setStatus] = useState('');
  const [sort, setSort] = useState('TRENDING_DESC');
  const [viewMode, setViewMode] = useState('list'); // 'grid' or 'list'

  const [results, setResults] = useState([]);
  const [pageInfo, setPageInfo] = useState(null);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [showGenreDropdown, setShowGenreDropdown] = useState(false);

  const debounceRef = useRef(null);
  const genreRef = useRef(null);

  // Close genre dropdown on outside click
  useEffect(() => {
    function handleClick(e) {
      if (genreRef.current && !genreRef.current.contains(e.target)) setShowGenreDropdown(false);
    }
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  const fetchResults = useCallback(async (pageNum) => {
    setLoading(true);
    setError(null);
    try {
      const filters = { sort };
      if (search.trim()) filters.search = search.trim();
      if (selectedGenres.length) filters.genres = selectedGenres;
      if (year) filters.year = Number(year);
      if (season) filters.season = season;
      if (format) filters.format = format;
      if (status) filters.status = status;

      const data = await browseAnime(filters, pageNum, 24);
      setResults(data.media || []);
      setPageInfo(data.pageInfo);
    } catch (err) {
      setError(err.message);
      setResults([]);
    }
    setLoading(false);
  }, [search, selectedGenres, year, season, format, status, sort]);

  // Auto-fetch on filter changes (debounced for search input)
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      setPage(1);
      fetchResults(1);
    }, search.trim() ? 400 : 50);
    return () => clearTimeout(debounceRef.current);
  }, [fetchResults]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    fetchResults(newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const toggleGenre = (genre) => {
    setSelectedGenres((prev) =>
      prev.includes(genre) ? prev.filter((g) => g !== genre) : [...prev, genre]
    );
  };

  const clearFilters = () => {
    setSearch('');
    setSelectedGenres([]);
    setYear('');
    setSeason('');
    setFormat('');
    setStatus('');
    setSort('TRENDING_DESC');
  };

  const hasFilters = search || selectedGenres.length || year || season || format || status || sort !== 'TRENDING_DESC';

  const getStudio = (studios) => {
    if (!studios?.nodes?.length) return null;
    return studios.nodes.find((s) => s.isAnimationStudio)?.name || studios.nodes[0]?.name;
  };

  const getStreamingLinks = (externalLinks) => {
    if (!externalLinks) return [];
    return externalLinks.filter((l) => l.type === 'STREAMING');
  };

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h1 className="text-3xl mb-6 text-[var(--color-accent-cyan)]">Explore Anime</h1>

      {/* Filters Bar */}
      <div className="mb-6 p-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg space-y-4">
        {/* Search */}
        <div className="relative">
          <SearchIcon size={18} className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search anime..."
            className="w-full pl-10 pr-4 py-2.5 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-accent-cyan)] focus:outline-none transition-colors"
          />
        </div>

        {/* Filter Row */}
        <div className="flex flex-wrap items-center gap-3">
          {/* Genre Dropdown */}
          <div className="relative" ref={genreRef}>
            <button
              onClick={() => setShowGenreDropdown(!showGenreDropdown)}
              className={`px-3 py-2 text-sm rounded border transition-colors flex items-center gap-1.5 ${
                selectedGenres.length
                  ? 'bg-[var(--color-accent-purple)]/20 border-[var(--color-accent-purple)]/50 text-[var(--color-accent-purple)]'
                  : 'bg-[var(--color-bg-primary)] border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              Genres {selectedGenres.length > 0 && `(${selectedGenres.length})`}
              <ChevronDown size={14} />
            </button>
            {showGenreDropdown && (
              <div className="absolute z-20 top-full left-0 mt-1 p-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-lg w-64 max-h-64 overflow-y-auto">
                {GENRES.map((genre) => (
                  <button
                    key={genre}
                    onClick={() => toggleGenre(genre)}
                    className={`block w-full text-left px-3 py-1.5 text-sm rounded transition-colors ${
                      selectedGenres.includes(genre)
                        ? 'bg-[var(--color-accent-purple)]/20 text-[var(--color-accent-purple)]'
                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-primary)]'
                    }`}
                  >
                    {genre}
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Year */}
          <select
            value={year}
            onChange={(e) => setYear(e.target.value)}
            className="px-3 py-2 text-sm rounded border bg-[var(--color-bg-primary)] border-[var(--color-border)] text-[var(--color-text-secondary)] focus:border-[var(--color-accent-cyan)] focus:outline-none"
          >
            {YEARS.map((y) => (
              <option key={y.value} value={y.value}>{y.value ? y.label : 'Year'}</option>
            ))}
          </select>

          {/* Season */}
          <select
            value={season}
            onChange={(e) => setSeason(e.target.value)}
            className="px-3 py-2 text-sm rounded border bg-[var(--color-bg-primary)] border-[var(--color-border)] text-[var(--color-text-secondary)] focus:border-[var(--color-accent-cyan)] focus:outline-none"
          >
            {SEASONS.map((s) => (
              <option key={s.value} value={s.value}>{s.value ? s.label : 'Season'}</option>
            ))}
          </select>

          {/* Format */}
          <select
            value={format}
            onChange={(e) => setFormat(e.target.value)}
            className="px-3 py-2 text-sm rounded border bg-[var(--color-bg-primary)] border-[var(--color-border)] text-[var(--color-text-secondary)] focus:border-[var(--color-accent-cyan)] focus:outline-none"
          >
            {FORMATS.map((f) => (
              <option key={f.value} value={f.value}>{f.value ? f.label : 'Format'}</option>
            ))}
          </select>

          {/* Status */}
          <select
            value={status}
            onChange={(e) => setStatus(e.target.value)}
            className="px-3 py-2 text-sm rounded border bg-[var(--color-bg-primary)] border-[var(--color-border)] text-[var(--color-text-secondary)] focus:border-[var(--color-accent-cyan)] focus:outline-none"
          >
            {STATUSES.map((s) => (
              <option key={s.value} value={s.value}>{s.value ? s.label : 'Status'}</option>
            ))}
          </select>

          {/* Clear Filters */}
          {hasFilters && (
            <button onClick={clearFilters} className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent-red)] transition-colors flex items-center gap-1">
              <X size={12} /> Clear
            </button>
          )}
        </div>

        {/* Sort + View Toggle */}
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-xs text-[var(--color-text-secondary)]">Sort:</span>
            <div className="flex gap-1 flex-wrap">
              {SORT_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  onClick={() => setSort(opt.value)}
                  className={`px-2.5 py-1 rounded text-xs transition-colors ${
                    sort === opt.value
                      ? 'bg-[var(--color-accent-cyan)] text-[var(--color-bg-primary)]'
                      : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
          <div className="flex gap-1">
            <button onClick={() => setViewMode('grid')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'grid' ? 'text-[var(--color-accent-cyan)]' : 'text-[var(--color-text-secondary)]'}`}>
              <Grid size={16} />
            </button>
            <button onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-colors ${viewMode === 'list' ? 'text-[var(--color-accent-cyan)]' : 'text-[var(--color-text-secondary)]'}`}>
              <List size={16} />
            </button>
          </div>
        </div>

        {/* Active Genre Tags */}
        {selectedGenres.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {selectedGenres.map((g) => (
              <button key={g} onClick={() => toggleGenre(g)}
                className="inline-flex items-center gap-1 text-xs px-2 py-0.5 rounded bg-[var(--color-accent-purple)]/20 text-[var(--color-accent-purple)] hover:bg-[var(--color-accent-purple)]/30 transition-colors">
                {g} <X size={10} />
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Error */}
      {error && (
        <div className="mb-6 px-4 py-3 rounded bg-[var(--color-accent-red)]/10 border border-[var(--color-accent-red)]/30 text-[var(--color-accent-red)] text-sm">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-[var(--color-accent-cyan)] border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Results — Grid View */}
      {!loading && results.length > 0 && viewMode === 'grid' && (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-4">
          {results.map((anime) => {
            const title = anime.title.english || anime.title.romaji;
            return (
              <a key={anime.id} href={anime.siteUrl} target="_blank" rel="noopener noreferrer"
                className="group">
                <div className="relative aspect-[3/4] rounded-lg overflow-hidden mb-2">
                  <img src={anime.coverImage?.large} alt={title}
                    className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300" />
                  {anime.averageScore && (
                    <span className="absolute top-1.5 right-1.5 bg-black/70 text-[var(--color-accent-green)] text-xs font-bold px-1.5 py-0.5 rounded">
                      {anime.averageScore}%
                    </span>
                  )}
                  {anime.format && (
                    <span className="absolute bottom-1.5 left-1.5 bg-black/70 text-white text-[10px] px-1.5 py-0.5 rounded">
                      {FORMAT_LABELS[anime.format] || anime.format}
                    </span>
                  )}
                </div>
                <p className="text-sm text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-cyan)] transition-colors line-clamp-2 leading-tight">
                  {title}
                </p>
                {anime.seasonYear && (
                  <p className="text-[10px] text-[var(--color-text-secondary)] mt-0.5">
                    {anime.season ? `${anime.season.charAt(0) + anime.season.slice(1).toLowerCase()} ` : ''}{anime.seasonYear}
                    {anime.episodes ? ` · ${anime.episodes} eps` : ''}
                  </p>
                )}
              </a>
            );
          })}
        </div>
      )}

      {/* Results — List View */}
      {!loading && results.length > 0 && viewMode === 'list' && (
        <div className="grid gap-3">
          {results.map((anime) => {
            const isExpanded = expandedId === anime.id;
            const studio = getStudio(anime.studios);
            const streamingLinks = getStreamingLinks(anime.externalLinks);
            const title = anime.title.english || anime.title.romaji;
            const nativeTitle = anime.title.native;

            return (
              <div key={anime.id} className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg overflow-hidden">
                <button onClick={() => setExpandedId(isExpanded ? null : anime.id)} className="w-full text-left">
                  <div className="flex items-center gap-4 p-4">
                    <img src={anime.coverImage?.large} alt={title} className="w-14 h-20 object-cover rounded shrink-0" />
                    <div className="flex-1 min-w-0">
                      <h3 className="font-medium text-[var(--color-text-primary)] truncate">{title}</h3>
                      {nativeTitle && (
                        <p className="text-xs text-[var(--color-text-secondary)] truncate">
                          <span className={/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/.test(nativeTitle) ? 'font-japanese' : ''}>
                            {nativeTitle}
                          </span>
                        </p>
                      )}
                      <div className="flex flex-wrap items-center gap-2 mt-1.5">
                        {anime.format && (
                          <span className="inline-flex items-center gap-1 text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-accent-purple)]/20 text-[var(--color-accent-purple)]">
                            {anime.format === 'MOVIE' ? <Film size={9} /> : <Tv size={9} />}
                            {FORMAT_LABELS[anime.format] || anime.format}
                          </span>
                        )}
                        {anime.episodes && (
                          <span className="text-[10px] text-[var(--color-text-secondary)] flex items-center gap-0.5">
                            <Clock size={9} /> {anime.episodes} eps
                          </span>
                        )}
                        {studio && <span className="text-[10px] text-[var(--color-text-secondary)]">{studio}</span>}
                      </div>
                    </div>
                    <div className="flex items-center gap-3 shrink-0">
                      {anime.averageScore && (
                        <div className="text-center">
                          <p className="text-xl font-bold text-[var(--color-accent-green)]">{anime.averageScore}%</p>
                          <p className="text-[9px] text-[var(--color-text-secondary)]">Score</p>
                        </div>
                      )}
                      {isExpanded ? <ChevronUp size={16} className="text-[var(--color-text-secondary)]" /> : <ChevronDown size={16} className="text-[var(--color-text-secondary)]" />}
                    </div>
                  </div>
                </button>

                {isExpanded && (
                  <div className="border-t border-[var(--color-border)]">
                    {anime.bannerImage && (
                      <div className="w-full overflow-hidden">
                        <img src={anime.bannerImage} alt="" className="w-full object-cover opacity-60" />
                      </div>
                    )}
                    <div className="px-4 pb-4">
                      <div className="flex flex-wrap items-center gap-3 mt-3">
                        {anime.status && (
                          <span className="text-xs px-2 py-1 rounded"
                            style={{
                              backgroundColor: `${STATUS_COLORS[anime.status] || 'var(--color-text-secondary)'}20`,
                              color: STATUS_COLORS[anime.status] || 'var(--color-text-secondary)',
                            }}>
                            {STATUS_LABELS[anime.status] || anime.status}
                          </span>
                        )}
                        {anime.source && (
                          <span className="text-xs px-2 py-1 rounded bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)]">
                            Source: {anime.source.replace(/_/g, ' ')}
                          </span>
                        )}
                        {anime.popularity && (
                          <span className="text-xs text-[var(--color-text-secondary)]">
                            {anime.popularity.toLocaleString()} users
                          </span>
                        )}
                      </div>

                      {anime.description && (
                        <p className="text-sm text-[var(--color-text-secondary)] mt-3 leading-relaxed"
                          dangerouslySetInnerHTML={{ __html: anime.description }} />
                      )}

                      {anime.genres?.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mt-3">
                          {anime.genres.map((g) => (
                            <button key={g} onClick={() => { if (!selectedGenres.includes(g)) toggleGenre(g); }}
                              className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent-purple)] transition-colors cursor-pointer">
                              {g}
                            </button>
                          ))}
                        </div>
                      )}

                      {anime.trailer?.site === 'youtube' && (
                        <a href={`https://www.youtube.com/watch?v=${anime.trailer.id}`} target="_blank" rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 text-xs text-[var(--color-accent-cyan)] hover:underline mt-3">
                          ▶ Watch Trailer
                        </a>
                      )}

                      {streamingLinks.length > 0 && (
                        <div className="flex flex-wrap gap-2 mt-3">
                          {streamingLinks.map((link) => (
                            <a key={link.url} href={link.url} target="_blank" rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 text-xs rounded bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
                              <ExternalLink size={10} /> {link.site}
                            </a>
                          ))}
                        </div>
                      )}

                      {anime.siteUrl && (
                        <a href={anime.siteUrl} target="_blank" rel="noopener noreferrer"
                          className="flex items-center gap-1.5 text-xs text-[var(--color-accent-cyan)] hover:underline mt-3">
                          <ExternalLink size={10} /> View on AniList
                        </a>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Empty State */}
      {!loading && results.length === 0 && !error && (
        <div className="text-center py-12">
          <p className="text-[var(--color-text-secondary)]">No anime found. Try adjusting your filters.</p>
        </div>
      )}

      {/* Pagination */}
      {pageInfo && (pageInfo.currentPage > 1 || pageInfo.hasNextPage) && (
        <div className="flex items-center justify-center gap-4 mt-8">
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page <= 1}
            className="px-4 py-2 rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Previous
          </button>
          <span className="text-sm text-[var(--color-text-secondary)]">
            Page {pageInfo.currentPage} of {pageInfo.lastPage}
          </span>
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={!pageInfo.hasNextPage}
            className="px-4 py-2 rounded bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors disabled:opacity-30 disabled:cursor-not-allowed"
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
}

export default ExplorePage;
