import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { rankEntries, calculateOverallScore } from '../utils/scoring';
import { Heart, Pencil, ExternalLink, Clock, Tv, Film, ChevronDown, ChevronUp, Scale, Share2, Check, Square, Trophy, Bookmark, Copy, Plus, X } from 'lucide-react';
import { SCORE_CATEGORIES } from '../utils/categories';
import Comments from '../components/lists/Comments';
import AddToListButton, { AddToListModal } from '../components/anime/AddToListButton';

const FORMAT_LABELS = { TV: 'TV', TV_SHORT: 'TV Short', MOVIE: 'Movie', SPECIAL: 'Special', OVA: 'OVA', ONA: 'ONA', MUSIC: 'Music' };
const WEIGHT_MODES = { custom: 'Custom Order', creator: "Creator's Weights", user: 'My Weights', even: 'Even Weights' };

function CopyToListModal({ entries, listOwnerId, onClose }) {
  const { user } = useAuth();
  const [myLists, setMyLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [copying, setCopying] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('rank');
  const [showNew, setShowNew] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    if (!user) return;
    supabase.from('lists').select('id, title, list_type').eq('user_id', user.id).order('updated_at', { ascending: false })
      .then(({ data }) => { setMyLists(data || []); setLoading(false); });
  }, [user]);

  const isOwnList = user?.id === listOwnerId;

  const copyTo = async (targetListId) => {
    setCopying(true);
    const { data: existingEntries } = await supabase.from('list_entries').select('anilist_id').eq('list_id', targetListId);
    const existingIds = new Set((existingEntries || []).map((e) => e.anilist_id));
    const toCopy = entries.filter((e) => !existingIds.has(e.anilist_id));

    if (toCopy.length === 0) {
      setResult({ type: 'info', text: 'All anime are already on that list.' });
      setCopying(false);
      return;
    }

    const inserts = toCopy.map((e) => {
      const base = { list_id: targetListId, anilist_id: e.anilist_id };
      if (isOwnList) {
        base.notes = e.notes || null;
        base.score_technical = e.score_technical;
        base.score_storytelling = e.score_storytelling;
        base.score_enjoyment = e.score_enjoyment;
        base.score_xfactor = e.score_xfactor;
        base.watched = e.watched;
      }
      return base;
    });

    const { error } = await supabase.from('list_entries').insert(inserts);
    await supabase.from('lists').update({ updated_at: new Date().toISOString() }).eq('id', targetListId);
    if (error) setResult({ type: 'error', text: error.message });
    else setResult({ type: 'success', text: `Added ${toCopy.length} anime!` });
    setCopying(false);
  };

  const createAndCopy = async () => {
    if (!newTitle.trim()) return;
    setCopying(true);
    const { data: newList, error: createErr } = await supabase.from('lists')
      .insert({ user_id: user.id, title: newTitle.trim(), list_type: newType, is_public: false })
      .select('id').single();
    if (createErr) { setResult({ type: 'error', text: createErr.message }); setCopying(false); return; }
    await copyTo(newList.id);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60" onClick={onClose}>
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg w-full max-w-md mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <h3 className="text-lg text-[var(--color-text-primary)] flex items-center gap-2"><Copy size={18} /> Copy Anime To List</h3>
          <button onClick={onClose} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"><X size={18} /></button>
        </div>
        <div className="p-4 space-y-3">
          {result && (
            <div className={`px-3 py-2 rounded text-sm ${
              result.type === 'error' ? 'bg-[var(--color-accent-red)]/10 text-[var(--color-accent-red)]'
                : result.type === 'success' ? 'bg-[var(--color-accent-green)]/10 text-[var(--color-accent-green)]'
                : 'bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)]'
            }`}>{result.text}</div>
          )}
          {loading ? (
            <p className="text-sm text-[var(--color-text-secondary)]">Loading your lists...</p>
          ) : (
            <>
              {myLists.length > 0 && (
                <div className="space-y-1">
                  <p className="text-xs text-[var(--color-text-secondary)] mb-1">Your lists:</p>
                  {myLists.map((l) => (
                    <button key={l.id} onClick={() => copyTo(l.id)} disabled={copying}
                      className="w-full text-left px-3 py-2 rounded hover:bg-[var(--color-bg-primary)] transition-colors flex items-center gap-2 disabled:opacity-50">
                      {(l.list_type || 'rank') === 'watch' ? <Bookmark size={14} className="text-[var(--color-accent-purple)]" /> : <Trophy size={14} className="text-[var(--color-accent-cyan)]" />}
                      <span className="text-sm text-[var(--color-text-primary)] truncate">{l.title}</span>
                    </button>
                  ))}
                </div>
              )}
              <div className="border-t border-[var(--color-border)] pt-3">
                {!showNew ? (
                  <button onClick={() => setShowNew(true)} className="text-sm text-[var(--color-accent-cyan)] hover:underline flex items-center gap-1">
                    <Plus size={14} /> Create new list & copy
                  </button>
                ) : (
                  <div className="space-y-2">
                    <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="New list title..."
                      className="w-full px-3 py-2 text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-accent-cyan)] focus:outline-none" autoFocus />
                    <div className="flex gap-2">
                      <button onClick={() => setNewType('rank')}
                        className={`px-2.5 py-1 text-xs rounded flex items-center gap-1 ${newType === 'rank' ? 'bg-[var(--color-accent-cyan)]/20 text-[var(--color-accent-cyan)]' : 'text-[var(--color-text-secondary)]'}`}>
                        <Trophy size={10} /> Rank
                      </button>
                      <button onClick={() => setNewType('watch')}
                        className={`px-2.5 py-1 text-xs rounded flex items-center gap-1 ${newType === 'watch' ? 'bg-[var(--color-accent-purple)]/20 text-[var(--color-accent-purple)]' : 'text-[var(--color-text-secondary)]'}`}>
                        <Bookmark size={10} /> Watch
                      </button>
                    </div>
                    <button onClick={createAndCopy} disabled={copying || !newTitle.trim()}
                      className="px-4 py-2 text-sm bg-[var(--color-accent-green)] text-[var(--color-bg-primary)] rounded font-medium hover:opacity-90 disabled:opacity-50 flex items-center gap-1.5">
                      <Plus size={14} /> {copying ? 'Copying...' : 'Create & Copy'}
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

function ListDetailPage() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [list, setList] = useState(null);
  const [owner, setOwner] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(0);
  const [expandedId, setExpandedId] = useState(null);
  const [weightMode, setWeightMode] = useState(null);
  const [shareCopied, setShareCopied] = useState(false);
  const [showCopyModal, setShowCopyModal] = useState(false);
  const [addToListAnime, setAddToListAnime] = useState(null);

  useEffect(() => {
    loadList();
  }, [id]);

  useEffect(() => {
    if (user && list) checkLiked();
  }, [user, list]);

  async function loadList() {
    setLoading(true);

    const { data: listData, error: listError } = await supabase
      .from('lists')
      .select('*, profiles(id, username, display_name, avatar_url, pref_weight_technical, pref_weight_storytelling, pref_weight_enjoyment, pref_weight_xfactor)')
      .eq('id', id)
      .single();

    if (listError || !listData) {
      setError('List not found or is private.');
      setLoading(false);
      return;
    }

    setList(listData);
    setOwner(listData.profiles);
    setLikeCount(listData.like_count || 0);
    setWeightMode(listData.rank_override_enabled ? 'custom' : 'creator');

    const { data: entriesData } = await supabase
      .from('list_entries')
      .select('*, anime_cache(*)')
      .eq('list_id', id);

    setEntries(entriesData || []);
    setLoading(false);
  }

  async function checkLiked() {
    const { data } = await supabase
      .from('likes')
      .select('id')
      .eq('user_id', user.id)
      .eq('list_id', id)
      .maybeSingle();
    setLiked(!!data);
  }

  const toggleLike = async () => {
    if (!user) return;
    if (liked) {
      await supabase.from('likes').delete().eq('user_id', user.id).eq('list_id', id);
      setLiked(false);
      setLikeCount((c) => c - 1);
    } else {
      await supabase.from('likes').insert({ user_id: user.id, list_id: id });
      setLiked(true);
      setLikeCount((c) => c + 1);
    }
  };

  const getActiveWeights = () => {
    if (weightMode === 'even') return { technical: 1, storytelling: 1, enjoyment: 1, xfactor: 1 };
    if (weightMode === 'user' && profile) {
      return {
        technical: Number(profile.pref_weight_technical),
        storytelling: Number(profile.pref_weight_storytelling),
        enjoyment: Number(profile.pref_weight_enjoyment),
        xfactor: Number(profile.pref_weight_xfactor),
      };
    }
    return {
      technical: Number(list.weight_technical),
      storytelling: Number(list.weight_storytelling),
      enjoyment: Number(list.weight_enjoyment),
      xfactor: Number(list.weight_xfactor),
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-[var(--color-accent-cyan)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (error) {
    return (
      <div className="max-w-7xl mx-auto px-6 py-16 text-center">
        <h1 className="text-3xl mb-4 text-[var(--color-accent-red)]">Not Found</h1>
        <p className="text-[var(--color-text-secondary)]">{error}</p>
      </div>
    );
  }

  const activeWeights = getActiveWeights();
  const isWatch = (list.list_type || 'rank') === 'watch';

  const ranked = isWatch
    ? (weightMode === 'custom'
        ? [...entries].sort((a, b) => (a.manual_position ?? Infinity) - (b.manual_position ?? Infinity))
        : [...entries].sort((a, b) => {
            const tA = (a.anime_cache?.title_english || a.anime_cache?.title_romaji || '').toLowerCase();
            const tB = (b.anime_cache?.title_english || b.anime_cache?.title_romaji || '').toLowerCase();
            return tA.localeCompare(tB);
          })
      ).map((e) => ({ ...e, overallScore: 0 }))
    : weightMode === 'custom'
      ? [...entries]
          .map((e) => ({ ...e, overallScore: calculateOverallScore({ technical: e.score_technical, storytelling: e.score_storytelling, enjoyment: e.score_enjoyment, xfactor: e.score_xfactor }, activeWeights) }))
          .sort((a, b) => (a.manual_position ?? Infinity) - (b.manual_position ?? Infinity))
      : rankEntries(entries, activeWeights);
  const isOwner = user && list.user_id === user.id;

  const toggleWatched = async (entryId, currentWatched) => {
    if (!isOwner) return;
    const newWatched = !currentWatched;
    setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, watched: newWatched } : e));
    await supabase.from('list_entries').update({ watched: newWatched, updated_at: new Date().toISOString() }).eq('id', entryId);
  };

  const handleShare = async () => {
    await navigator.clipboard.writeText(window.location.href);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  const weightLabels = [
    { key: 'technical', label: 'Tech' },
    { key: 'storytelling', label: 'Story' },
    { key: 'enjoyment', label: 'Enjoy' },
    { key: 'xfactor', label: 'X' },
  ];

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-start justify-between gap-4 mb-3">
          <div>
            <h1 className="text-3xl text-[var(--color-accent-cyan)] mb-1">{list.title}</h1>
            {list.description && (
              <p className="text-[var(--color-text-secondary)]">{list.description}</p>
            )}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {isOwner && (
              <Link to={`/list/${id}/edit`}
                className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-accent-cyan)] transition-colors" title="Edit">
                <Pencil size={18} />
              </Link>
            )}
            <button onClick={handleShare}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
              {shareCopied ? <><Check size={14} /> Copied!</> : <><Share2 size={14} /> Share</>}
            </button>
            <button onClick={() => user ? setShowCopyModal(true) : navigate('/login')}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
              title="Copy all anime to one of your lists">
              <Copy size={14} /> Copy
            </button>
            {user && !isOwner && (
              <button onClick={toggleLike}
                className={`flex items-center gap-1.5 px-3 py-1.5 rounded text-sm transition-colors ${
                  liked ? 'bg-[var(--color-accent-red)]/20 text-[var(--color-accent-red)]' : 'bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-secondary)] hover:text-[var(--color-accent-red)]'
                }`}>
                <Heart size={14} fill={liked ? 'currentColor' : 'none'} /> {likeCount}
              </button>
            )}
            {!user && (
              <span className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]">
                <Heart size={14} /> {likeCount}
              </span>
            )}
          </div>
        </div>

        {/* Creator Info */}
        {owner && (
          <Link to={`/user/${owner.username}`} className="inline-flex items-center gap-2 mb-4">
            {owner.avatar_url ? (
              <img src={owner.avatar_url} alt={owner.display_name} className="w-6 h-6 rounded-full object-cover" />
            ) : (
              <div className="w-6 h-6 rounded-full bg-[var(--color-accent-purple)] flex items-center justify-center text-white text-xs font-medium">
                {(owner.display_name || '?')[0].toUpperCase()}
              </div>
            )}
            <span className="text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
              {owner.display_name}
            </span>
          </Link>
        )}

        {/* Weight Mode Toggle + Active Weights (rank lists only) */}
        {(list.list_type || 'rank') === 'rank' ? (
          <div className="flex flex-wrap items-center gap-4 p-3 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
            <div className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)]">
              <Scale size={14} />
              <span>Weights:</span>
            </div>
            <div className="flex gap-1">
              {Object.entries(WEIGHT_MODES).map(([key, label]) => {
                if (key === 'user' && !user) return null;
                if (key === 'custom' && !list.rank_override_enabled) return null;
                return (
                  <button key={key} onClick={() => setWeightMode(key)}
                    className={`px-2.5 py-1 rounded text-xs transition-colors ${
                      weightMode === key
                        ? 'bg-[var(--color-accent-cyan)] text-[var(--color-bg-primary)]'
                        : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
                    }`}>
                    {label}
                  </button>
                );
              })}
            </div>
            <div className="flex gap-3 ml-auto text-xs">
              {weightLabels.map((w) => (
                <span key={w.key} className="text-[var(--color-text-secondary)]">
                  {w.label} <span className="text-[var(--color-accent-cyan)]">×{activeWeights[w.key]}</span>
                </span>
              ))}
            </div>
          </div>
        ) : (
          <div className="flex flex-wrap items-center gap-2 p-3 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] text-sm text-[var(--color-text-secondary)]">
            <Bookmark size={14} className="text-[var(--color-accent-purple)]" />
            <span>Watch List</span>
            {list.rank_override_enabled && (
              <div className="flex gap-1 ml-2">
                <button onClick={() => setWeightMode('creator')}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${weightMode !== 'custom' ? 'bg-[var(--color-accent-purple)]/20 text-[var(--color-accent-purple)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}>
                  A→Z
                </button>
                <button onClick={() => setWeightMode('custom')}
                  className={`px-2 py-0.5 rounded text-xs transition-colors ${weightMode === 'custom' ? 'bg-[var(--color-accent-yellow)]/20 text-[var(--color-accent-yellow)]' : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'}`}>
                  Custom
                </button>
              </div>
            )}
            <span className="ml-auto text-xs">{entries.filter((e) => e.watched).length}/{entries.length} watched</span>
          </div>
        )}
      </div>

      {/* Entries */}
      {ranked.length === 0 ? (
        <div className="border border-[var(--color-border)] rounded-lg p-12 text-center">
          <p className="text-[var(--color-text-secondary)]">This list has no entries yet.</p>
        </div>
      ) : (
        <div className="grid gap-3">
          {ranked.map((entry, index) => {
            const anime = entry.anime_cache;
            if (!anime) return null;
            const title = anime.title_english || anime.title_romaji;
            const isExpanded = expandedId === entry.id;
            const studio = (anime.studios || []).find((s) => s.isAnimationStudio)?.name || (anime.studios || [])[0]?.name;
            const streamingLinks = (anime.external_links || []).filter((l) => l.type === 'STREAMING');

            return (
              <div key={entry.id} className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg overflow-hidden">
                <div className="flex items-center gap-4 p-4">
                  {/* Rank or Watch Checkbox */}
                  {isWatch ? (
                    <button onClick={(e) => { e.stopPropagation(); toggleWatched(entry.id, entry.watched); }}
                      className={`shrink-0 w-8 flex justify-center ${isOwner ? 'cursor-pointer' : 'cursor-default'}`}
                      title={isOwner ? (entry.watched ? 'Mark unwatched' : 'Mark watched') : ''}>
                      {entry.watched ? (
                        <div className="w-6 h-6 rounded bg-[var(--color-accent-green)] flex items-center justify-center">
                          <Check size={14} className="text-white" />
                        </div>
                      ) : (
                        <Square size={22} className="text-[var(--color-text-secondary)]" />
                      )}
                    </button>
                  ) : (
                    <span className={`text-2xl font-bold w-8 text-center shrink-0 ${
                      index === 0 ? 'text-[var(--color-accent-yellow)]' : index <= 2 ? 'text-[var(--color-accent-cyan)]' : 'text-[var(--color-text-secondary)]'
                    }`}>
                      {index + 1}
                    </span>
                  )}

                  {/* Cover */}
                  <img src={anime.cover_image_url} alt={title} className="w-14 h-20 object-cover rounded shrink-0" />

                  {/* Info */}
                  <div className="flex-1 min-w-0 cursor-pointer" onClick={() => setExpandedId(isExpanded ? null : entry.id)}>
                    <h3 className={`font-medium text-[var(--color-text-primary)] truncate ${isWatch && entry.watched ? 'line-through opacity-60' : ''}`}>{title}</h3>
                      {anime.title_native && (
                        <p className="text-xs text-[var(--color-text-secondary)] truncate">
                          <span className={/[\u3000-\u303f\u3040-\u309f\u30a0-\u30ff\uff00-\uff9f\u4e00-\u9faf]/.test(anime.title_native) ? 'font-japanese' : ''}>
                            {anime.title_native}
                          </span>
                          {anime.title_romaji && anime.title_romaji !== title && anime.title_romaji !== anime.title_native && (
                            <span className="ml-1.5 opacity-60">({anime.title_romaji})</span>
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

                  {/* Scores (rank lists only) */}
                  <div className="flex items-center gap-2 shrink-0">
                    {!isWatch && (
                      <>
                        <div className="hidden sm:flex gap-2">
                          {SCORE_CATEGORIES.map((cat) => {
                            const Icon = cat.icon;
                            return (
                              <div key={cat.key} className="text-center w-8" title={cat.description}>
                                <Icon size={12} className="mx-auto mb-0.5 text-[var(--color-text-secondary)]" />
                                <p className="text-sm text-[var(--color-text-primary)]">{Number(entry[cat.scoreKey]).toFixed(1)}</p>
                              </div>
                            );
                          })}
                        </div>
                        <div className="text-center w-14">
                          <p className="text-xl font-bold text-[var(--color-accent-green)]">{entry.overallScore.toFixed(1)}</p>
                          <p className="text-[9px] text-[var(--color-text-secondary)]">Overall</p>
                        </div>
                      </>
                    )}
                    <AddToListButton anime={{ anilist_id: entry.anilist_id, title_english: anime.title_english, title_romaji: anime.title_romaji, cover_image_url: anime.cover_image_url }} />
                    <button onClick={() => setExpandedId(isExpanded ? null : entry.id)}
                      className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
                      {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                    </button>
                  </div>
                </div>

                {/* Expanded */}
                {isExpanded && (
                  <div className="border-t border-[var(--color-border)]">
                    {/* Banner Image */}
                    {anime.banner_image_url && (
                      <div className="w-full overflow-hidden">
                        <img src={anime.banner_image_url} alt="" className="w-full object-cover opacity-60" />
                      </div>
                    )}

                    <div className="px-4 pb-4">
                      {/* Category scores on mobile (rank lists only) */}
                      {(list.list_type || 'rank') === 'rank' && (
                        <div className="sm:hidden flex gap-3 mt-3 mb-3">
                          {SCORE_CATEGORIES.map((cat) => {
                            const Icon = cat.icon;
                            return (
                              <div key={cat.key} className="text-center flex-1" title={cat.description}>
                                <div className="flex items-center justify-center gap-1 mb-0.5">
                                  <Icon size={10} className="text-[var(--color-text-secondary)]" />
                                  <p className="text-[10px] text-[var(--color-text-secondary)]">{cat.label}</p>
                                </div>
                                <p className="text-sm text-[var(--color-text-primary)]">{Number(entry[cat.scoreKey]).toFixed(1)}</p>
                              </div>
                            );
                          })}
                        </div>
                      )}

                      {/* AniList Average Score */}
                      {anime.average_score != null && (
                        <div className="mt-3">
                          <span className="inline-flex items-center gap-1.5 text-xs px-2 py-1 rounded bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)]">
                            AniList Score: {anime.average_score}%
                          </span>
                        </div>
                      )}

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
                      {anime.relations?.length > 0 && (
                        <div className="mt-4">
                          <p className="text-xs font-medium text-[var(--color-text-primary)] mb-2">Relations</p>
                          <div className="flex flex-wrap gap-2">
                            {anime.relations.map((rel, i) => (
                              <Link key={i} to={`/search?q=${encodeURIComponent(rel.title?.english || rel.title?.romaji || '')}`}
                                className="flex items-center gap-2 px-2.5 py-1.5 rounded bg-[var(--color-bg-primary)] hover:bg-[var(--color-border)] transition-colors group">
                                {rel.coverImage?.medium && (
                                  <img src={rel.coverImage.medium} alt="" className="w-8 h-11 object-cover rounded" />
                                )}
                                <div className="min-w-0">
                                  <p className="text-xs text-[var(--color-text-primary)] group-hover:text-[var(--color-accent-cyan)] truncate max-w-[160px]">
                                    {rel.title?.english || rel.title?.romaji || 'Unknown'}
                                  </p>
                                  <p className="text-[10px] text-[var(--color-text-secondary)]">
                                    {(rel.relationType || '').replace(/_/g, ' ')}
                                    {rel.format ? ` · ${rel.format}` : ''}
                                  </p>
                                </div>
                              </Link>
                            ))}
                          </div>
                        </div>
                      )}

                      {/* Notes */}
                      {entry.notes && (
                        <div className="mt-3 p-3 bg-[var(--color-bg-primary)] rounded text-sm text-[var(--color-text-secondary)] italic">
                          "{entry.notes}" —{owner?.display_name || owner?.username || 'Anonymous'}
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
                      {anime.site_url && (
                        <a href={anime.site_url} target="_blank" rel="noopener noreferrer"
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

      {/* Comments */}
      <Comments listId={id} />

      {/* Copy Modal */}
      {showCopyModal && (
        <CopyToListModal entries={entries} listOwnerId={list.user_id} onClose={() => setShowCopyModal(false)} />
      )}
    </div>
  );
}

export default ListDetailPage;
