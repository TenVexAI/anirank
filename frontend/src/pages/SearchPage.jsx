import { useState, useEffect, useRef, useCallback } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { Search as SearchIcon, ExternalLink, Tv, Film, Clock, Heart, List, ChevronDown, ChevronUp } from 'lucide-react';
import { searchAnime } from '../lib/anilist';
import { supabase } from '../lib/supabase';
import AddToListButton from '../components/anime/AddToListButton';

const FORMAT_LABELS = {
  TV: 'TV',
  TV_SHORT: 'TV Short',
  MOVIE: 'Movie',
  SPECIAL: 'Special',
  OVA: 'OVA',
  ONA: 'ONA',
  MUSIC: 'Music',
};

const STATUS_LABELS = {
  FINISHED: 'Finished',
  RELEASING: 'Airing',
  NOT_YET_RELEASED: 'Upcoming',
  CANCELLED: 'Cancelled',
  HIATUS: 'Hiatus',
};

const STATUS_COLORS = {
  FINISHED: 'var(--color-accent-green)',
  RELEASING: 'var(--color-accent-cyan)',
  NOT_YET_RELEASED: 'var(--color-accent-yellow)',
  CANCELLED: 'var(--color-accent-red)',
  HIATUS: 'var(--color-text-secondary)',
};

function SearchPage() {
  const [searchParams] = useSearchParams();

  // List search state
  const [listQuery, setListQuery] = useState('');
  const [listResults, setListResults] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const listDebounceRef = useRef(null);

  // Anime search state
  const [query, setQuery] = useState(searchParams.get('q') || '');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [pageInfo, setPageInfo] = useState(null);
  const [page, setPage] = useState(1);
  const [expandedId, setExpandedId] = useState(null);
  const debounceRef = useRef(null);
  const cacheRef = useRef({});

  // Sync query from URL search params (e.g. when clicking a relation link)
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q !== query) {
      setQuery(q);
      setExpandedId(null);
    }
  }, [searchParams]);

  // List search — run two queries (title match + creator match) and merge
  const searchLists = useCallback(async (q) => {
    if (!q.trim()) {
      setListResults([]);
      return;
    }
    setListLoading(true);
    try {
      const pattern = `%${q}%`;

      // Query 1: search by list title
      const titleQuery = supabase
        .from('lists')
        .select('id, title, description, like_count, created_at, profiles(username, display_name, avatar_url)')
        .eq('is_public', true)
        .ilike('title', pattern)
        .order('like_count', { ascending: false })
        .limit(10);

      // Query 2: search by creator name (using !inner to filter on the join)
      const creatorQuery = supabase
        .from('lists')
        .select('id, title, description, like_count, created_at, profiles!inner(username, display_name, avatar_url)')
        .eq('is_public', true)
        .or(`username.ilike.${pattern},display_name.ilike.${pattern}`, { referencedTable: 'profiles' })
        .order('like_count', { ascending: false })
        .limit(10);

      const [titleRes, creatorRes] = await Promise.all([titleQuery, creatorQuery]);

      // Merge and deduplicate by list id
      const seen = new Set();
      const merged = [];
      for (const list of [...(titleRes.data || []), ...(creatorRes.data || [])]) {
        if (!seen.has(list.id)) {
          seen.add(list.id);
          merged.push(list);
        }
      }
      // Sort merged by like_count desc
      merged.sort((a, b) => (b.like_count || 0) - (a.like_count || 0));
      setListResults(merged.slice(0, 10));
    } catch {
      setListResults([]);
    }
    setListLoading(false);
  }, []);

  useEffect(() => {
    if (listDebounceRef.current) clearTimeout(listDebounceRef.current);
    if (listQuery.trim()) {
      listDebounceRef.current = setTimeout(() => searchLists(listQuery), 300);
    } else {
      setListResults([]);
    }
    return () => clearTimeout(listDebounceRef.current);
  }, [listQuery, searchLists]);

  const performSearch = useCallback(async (searchQuery, pageNum) => {
    if (!searchQuery.trim()) {
      setResults([]);
      setPageInfo(null);
      return;
    }

    const cacheKey = `${searchQuery}:${pageNum}`;
    if (cacheRef.current[cacheKey]) {
      setResults(cacheRef.current[cacheKey].media);
      setPageInfo(cacheRef.current[cacheKey].pageInfo);
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const data = await searchAnime(searchQuery, pageNum, 12);
      setResults(data.media || []);
      setPageInfo(data.pageInfo);
      cacheRef.current[cacheKey] = data;
    } catch (err) {
      setError(err.message);
      setResults([]);
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (query.trim()) {
      debounceRef.current = setTimeout(() => {
        setPage(1);
        performSearch(query, 1);
      }, 300);
    } else {
      setResults([]);
      setPageInfo(null);
    }
    return () => clearTimeout(debounceRef.current);
  }, [query, performSearch]);

  const handlePageChange = (newPage) => {
    setPage(newPage);
    performSearch(query, newPage);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const getMainStudio = (studios) => {
    if (!studios?.nodes?.length) return null;
    return studios.nodes.find((s) => s.isAnimationStudio)?.name || studios.nodes[0]?.name;
  };

  const getStreamingLinks = (externalLinks) => {
    if (!externalLinks) return [];
    return externalLinks.filter((l) => l.type === 'STREAMING');
  };

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      <h1 className="text-3xl mb-8 text-[var(--color-accent-cyan)]">Search</h1>

      {/* === List Search === */}
      <section className="mb-10">
        <h2 className="text-lg text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
          <List size={20} /> Search Lists
        </h2>
        <div className="relative mb-4">
          <SearchIcon size={18} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
          <input
            type="text"
            value={listQuery}
            onChange={(e) => setListQuery(e.target.value)}
            placeholder="Search by list name or creator..."
            className="w-full pl-11 pr-4 py-2.5 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-accent-cyan)] focus:outline-none transition-colors"
          />
        </div>

        {listLoading && (
          <div className="flex justify-center py-6">
            <div className="w-6 h-6 border-2 border-[var(--color-accent-cyan)] border-t-transparent rounded-full animate-spin" />
          </div>
        )}

        {!listLoading && listResults.length > 0 && (
          <div className="grid gap-2">
            {listResults.map((list) => (
              <Link
                key={list.id}
                to={`/list/${list.id}`}
                className="flex items-center gap-4 p-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg hover:border-[var(--color-accent-cyan)]/50 transition-colors"
              >
                {list.profiles?.avatar_url && (
                  <img src={list.profiles.avatar_url} alt="" className="w-8 h-8 rounded-full shrink-0" />
                )}
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">{list.title}</p>
                  <p className="text-xs text-[var(--color-text-secondary)] truncate">
                    by {list.profiles?.display_name || list.profiles?.username || 'Unknown'}
                    {list.description ? ` — ${list.description}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)] shrink-0">
                  <Heart size={12} /> {list.like_count || 0}
                </div>
              </Link>
            ))}
          </div>
        )}

        {!listLoading && listQuery.trim() && listResults.length === 0 && (
          <p className="text-sm text-[var(--color-text-secondary)] text-center py-4">No lists found for "{listQuery}".</p>
        )}
      </section>

      {/* === Anime Search === */}
      <section>
        <h2 className="text-lg text-[var(--color-text-primary)] mb-3 flex items-center gap-2">
          <Tv size={20} /> Search Anime
        </h2>

      {/* Search Input */}
      <div className="relative mb-8">
        <SearchIcon size={20} className="absolute left-4 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Search by title (English, Romaji, or Japanese)..."
          className="w-full pl-12 pr-4 py-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-accent-cyan)] focus:outline-none transition-colors text-lg"
          autoFocus
        />
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

      {/* Results */}
      {!loading && results.length > 0 && (
        <>
          <div className="grid gap-3">
            {results.map((anime) => {
              const isExpanded = expandedId === anime.id;
              const studio = getMainStudio(anime.studios);
              const streamingLinks = getStreamingLinks(anime.externalLinks);
              const title = anime.title.english || anime.title.romaji;
              const nativeTitle = anime.title.native;

              return (
                <div key={anime.id} className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg overflow-hidden">
                  <button onClick={() => setExpandedId(isExpanded ? null : anime.id)} className="w-full text-left">
                    <div className="flex items-center gap-4 p-4">
                      {/* Cover */}
                      <img src={anime.coverImage?.large} alt={title} className="w-14 h-20 object-cover rounded shrink-0" />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <h3 className="font-medium text-[var(--color-text-primary)] truncate">{title}</h3>
                        {nativeTitle && (
                          <p className="text-xs text-[var(--color-text-secondary)] truncate">
                            <span className={/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/.test(nativeTitle) ? 'font-japanese' : ''}>
                              {nativeTitle}
                            </span>
                            {anime.title.romaji && anime.title.romaji !== title && anime.title.romaji !== nativeTitle && (
                              <span className="ml-1.5 opacity-60">({anime.title.romaji})</span>
                            )}
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

                      {/* Score + Chevron */}
                      <div className="flex items-center gap-3 shrink-0">
                        {anime.averageScore && (
                          <div className="text-center">
                            <p className="text-xl font-bold text-[var(--color-accent-green)]">{anime.averageScore}%</p>
                            <p className="text-[9px] text-[var(--color-text-secondary)]">AniList</p>
                          </div>
                        )}
                        {isExpanded ? <ChevronUp size={16} className="text-[var(--color-text-secondary)]" /> : <ChevronDown size={16} className="text-[var(--color-text-secondary)]" />}
                      </div>
                    </div>
                  </button>

                  {/* Expanded */}
                  {isExpanded && (
                    <div className="border-t border-[var(--color-border)]">
                      {/* Banner */}
                      {anime.bannerImage && (
                        <div className="w-full overflow-hidden">
                          <img src={anime.bannerImage} alt="" className="w-full object-cover opacity-60" />
                        </div>
                      )}

                      <div className="px-4 pb-4">
                        {/* AniList Score + Status */}
                        <div className="flex flex-wrap items-center gap-3 mt-3">
                          {anime.status && (
                            <span
                              className="text-xs px-2 py-1 rounded"
                              style={{
                                backgroundColor: `${STATUS_COLORS[anime.status] || 'var(--color-text-secondary)'}20`,
                                color: STATUS_COLORS[anime.status] || 'var(--color-text-secondary)',
                              }}
                            >
                              {STATUS_LABELS[anime.status] || anime.status}
                            </span>
                          )}
                          {anime.source && (
                            <span className="text-xs px-2 py-1 rounded bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)]">
                              Source: {anime.source.replace(/_/g, ' ')}
                            </span>
                          )}
                        </div>

                        {/* Description — full text */}
                        {anime.description && (
                          <p className="text-sm text-[var(--color-text-secondary)] mt-3 leading-relaxed"
                            dangerouslySetInnerHTML={{ __html: anime.description }} />
                        )}

                        {/* Genres */}
                        {anime.genres?.length > 0 && (
                          <div className="flex flex-wrap gap-1.5 mt-3">
                            {anime.genres.map((g) => (
                              <span key={g} className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-bg-primary)] text-[var(--color-text-secondary)]">{g}</span>
                            ))}
                          </div>
                        )}

                        {/* Relations */}
                        {anime.relations?.edges?.length > 0 && (
                          <div className="mt-4">
                            <p className="text-xs font-medium text-[var(--color-text-primary)] mb-2">Relations</p>
                            <div className="flex flex-wrap gap-2">
                              {anime.relations.edges.map((edge, i) => (
                                <Link key={i} to={`/search?q=${encodeURIComponent(edge.node.title.english || edge.node.title.romaji || '')}`}
                                  className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[var(--color-bg-primary)] hover:bg-[var(--color-border)] transition-colors group">
                                  {edge.node.coverImage?.medium && (
                                    <img src={edge.node.coverImage.medium} alt="" className="w-8 h-11 object-cover rounded" />
                                  )}
                                  <div className="min-w-0">
                                    <p className="text-xs text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-cyan)] truncate max-w-[160px]">
                                      {edge.node.title.english || edge.node.title.romaji || 'Unknown'}
                                    </p>
                                    <p className="text-[10px] text-[var(--color-text-secondary)]">
                                      {(edge.relationType || '').replace(/_/g, ' ')}
                                      {edge.node.format ? ` · ${edge.node.format}` : ''}
                                    </p>
                                  </div>
                                </Link>
                              ))}
                            </div>
                          </div>
                        )}

                        {/* Trailer */}
                        {anime.trailer?.site === 'youtube' && (
                          <a href={`https://www.youtube.com/watch?v=${anime.trailer.id}`} target="_blank" rel="noopener noreferrer"
                            className="inline-flex items-center gap-1.5 text-xs text-[var(--color-accent-cyan)] hover:underline mt-3">
                            ▶ Watch Trailer
                          </a>
                        )}

                        {/* Streaming */}
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

                        {/* AniList link */}
                        <div className="flex items-center gap-3 mt-3">
                          {anime.siteUrl && (
                            <a href={anime.siteUrl} target="_blank" rel="noopener noreferrer"
                              className="flex items-center gap-1.5 text-xs text-[var(--color-accent-cyan)] hover:underline">
                              <ExternalLink size={10} /> View on AniList
                            </a>
                          )}
                          <AddToListButton anime={anime} />
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

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
        </>
      )}

      {/* Empty State */}
      {!loading && query.trim() && results.length === 0 && !error && (
        <div className="text-center py-12">
          <p className="text-[var(--color-text-secondary)]">No anime found for "{query}".</p>
        </div>
      )}

      
      </section>
    </div>
  );
}

export default SearchPage;
