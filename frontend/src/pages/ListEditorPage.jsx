import { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { searchAnime } from '../lib/anilist';
import { rankEntries } from '../utils/scoring';
import { ArrowLeft, Search, Plus, X, Trash2, ChevronDown, ChevronUp, Save, Eye, EyeOff, ExternalLink } from 'lucide-react';
import { SCORE_CATEGORIES } from '../utils/categories';

function ListEditorPage() {
  const { id } = useParams();
  const { user, profile } = useAuth();
  const navigate = useNavigate();

  const [list, setList] = useState(null);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);

  // Anime search
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [searching, setSearching] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const searchDebounce = useRef(null);

  // Expanded entry for scoring
  const [expandedEntry, setExpandedEntry] = useState(null);

  // List settings
  const [showSettings, setShowSettings] = useState(false);
  const [settingsTitle, setSettingsTitle] = useState('');
  const [settingsDesc, setSettingsDesc] = useState('');
  const [settingsPublic, setSettingsPublic] = useState(false);
  const [settingsWeights, setSettingsWeights] = useState({ technical: 1, storytelling: 1, enjoyment: 1, xfactor: 1 });

  useEffect(() => {
    loadList();
  }, [id]);

  async function loadList() {
    setLoading(true);
    setError(null);

    const { data: listData, error: listError } = await supabase
      .from('lists')
      .select('*')
      .eq('id', id)
      .single();

    if (listError || !listData) {
      setError('List not found.');
      setLoading(false);
      return;
    }

    if (listData.user_id !== user.id) {
      setError('You do not own this list.');
      setLoading(false);
      return;
    }

    setList(listData);
    setSettingsTitle(listData.title);
    setSettingsDesc(listData.description || '');
    setSettingsPublic(listData.is_public);
    setSettingsWeights({
      technical: Number(listData.weight_technical),
      storytelling: Number(listData.weight_storytelling),
      enjoyment: Number(listData.weight_enjoyment),
      xfactor: Number(listData.weight_xfactor),
    });

    const { data: entriesData } = await supabase
      .from('list_entries')
      .select('*, anime_cache(*)')
      .eq('list_id', id);

    setEntries(entriesData || []);
    setLoading(false);
  }

  const weights = list ? {
    technical: Number(list.weight_technical),
    storytelling: Number(list.weight_storytelling),
    enjoyment: Number(list.weight_enjoyment),
    xfactor: Number(list.weight_xfactor),
  } : { technical: 1, storytelling: 1, enjoyment: 1, xfactor: 1 };

  const frozenOrderRef = useRef(null);

  const rankedEntries = useMemo(() => {
    const sorted = rankEntries(entries, weights);
    if (expandedEntry && frozenOrderRef.current) {
      // While a panel is expanded, keep the frozen order and just update scores in place
      const frozenIds = new Set(frozenOrderRef.current);
      const map = new Map(sorted.map((e) => [e.id, e]));
      // Keep frozen order, then append any new entries not yet in the frozen list
      const result = frozenOrderRef.current
        .map((id) => map.get(id))
        .filter(Boolean);
      for (const e of sorted) {
        if (!frozenIds.has(e.id)) result.push(e);
      }
      frozenOrderRef.current = result.map((e) => e.id);
      return result;
    }
    // When collapsed, sort normally and snapshot the order
    frozenOrderRef.current = sorted.map((e) => e.id);
    return sorted;
  }, [entries, weights, expandedEntry]);

  // Anime search
  const performSearch = useCallback(async (q) => {
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    try {
      const data = await searchAnime(q, 1, 8);
      setSearchResults(data.media || []);
    } catch { setSearchResults([]); }
    setSearching(false);
  }, []);

  useEffect(() => {
    if (searchDebounce.current) clearTimeout(searchDebounce.current);
    if (searchQuery.trim()) {
      searchDebounce.current = setTimeout(() => performSearch(searchQuery), 300);
    } else {
      setSearchResults([]);
    }
    return () => clearTimeout(searchDebounce.current);
  }, [searchQuery, performSearch]);

  const addAnime = async (anime) => {
    if (entries.some((e) => e.anilist_id === anime.id)) {
      setSaveMsg({ type: 'error', text: 'This anime is already in your list.' });
      setTimeout(() => setSaveMsg(null), 3000);
      return;
    }

    // Upsert to anime_cache
    const cacheData = {
      anilist_id: anime.id,
      title_english: anime.title.english,
      title_romaji: anime.title.romaji,
      title_native: anime.title.native,
      synonyms: anime.synonyms || [],
      cover_image_url: anime.coverImage?.large,
      banner_image_url: anime.bannerImage,
      format: anime.format,
      status: anime.status,
      source: anime.source,
      genres: anime.genres || [],
      tags: (anime.tags || []).map((t) => ({ name: t.name, rank: t.rank, isMediaSpoiler: t.isMediaSpoiler })),
      description: anime.description,
      average_score: anime.averageScore,
      episodes: anime.episodes,
      duration: anime.duration,
      studios: (anime.studios?.nodes || []).map((s) => ({ name: s.name, isAnimationStudio: s.isAnimationStudio })),
      trailer: anime.trailer,
      external_links: (anime.externalLinks || []).map((l) => ({ site: l.site, url: l.url, type: l.type })),
      relations: (anime.relations?.edges || []).map((e) => ({
        id: e.node.id, relationType: e.relationType,
        title: e.node.title, format: e.node.format, status: e.node.status,
        coverImage: e.node.coverImage,
      })),
      site_url: anime.siteUrl,
      cached_at: new Date().toISOString(),
    };

    await supabase.from('anime_cache').upsert(cacheData, { onConflict: 'anilist_id' });

    // Insert entry
    const { data: newEntry, error: entryError } = await supabase
      .from('list_entries')
      .insert({
        list_id: id,
        anilist_id: anime.id,
        streaming_services: (anime.externalLinks || []).filter((l) => l.type === 'STREAMING').map((l) => l.site),
      })
      .select('*, anime_cache(*)')
      .single();

    if (entryError) {
      setSaveMsg({ type: 'error', text: entryError.message });
      setTimeout(() => setSaveMsg(null), 3000);
      return;
    }

    setEntries((prev) => [...prev, newEntry]);
    setShowSearch(false);
    setSearchQuery('');
    setSearchResults([]);
    setExpandedEntry(newEntry.id);

    // Update list timestamp
    await supabase.from('lists').update({ updated_at: new Date().toISOString() }).eq('id', id);
  };

  const updateEntryScore = async (entryId, field, value) => {
    const numValue = parseFloat(value) || 0;
    setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, [field]: numValue } : e));

    await supabase
      .from('list_entries')
      .update({ [field]: numValue, updated_at: new Date().toISOString() })
      .eq('id', entryId);
  };

  const updateEntryNotes = async (entryId, notes) => {
    setEntries((prev) => prev.map((e) => e.id === entryId ? { ...e, notes } : e));

    await supabase
      .from('list_entries')
      .update({ notes, updated_at: new Date().toISOString() })
      .eq('id', entryId);
  };

  const removeEntry = async (entryId) => {
    setEntries((prev) => prev.filter((e) => e.id !== entryId));
    await supabase.from('list_entries').delete().eq('id', entryId);
    await supabase.from('lists').update({ updated_at: new Date().toISOString() }).eq('id', id);
  };

  const saveSettings = async () => {
    setSaving(true);
    const { error: updateError } = await supabase
      .from('lists')
      .update({
        title: settingsTitle.trim(),
        description: settingsDesc.trim(),
        is_public: settingsPublic,
        weight_technical: settingsWeights.technical,
        weight_storytelling: settingsWeights.storytelling,
        weight_enjoyment: settingsWeights.enjoyment,
        weight_xfactor: settingsWeights.xfactor,
        updated_at: new Date().toISOString(),
      })
      .eq('id', id);

    if (updateError) {
      setSaveMsg({ type: 'error', text: updateError.message });
    } else {
      setList((prev) => ({
        ...prev,
        title: settingsTitle.trim(),
        description: settingsDesc.trim(),
        is_public: settingsPublic,
        weight_technical: settingsWeights.technical,
        weight_storytelling: settingsWeights.storytelling,
        weight_enjoyment: settingsWeights.enjoyment,
        weight_xfactor: settingsWeights.xfactor,
      }));
      setSaveMsg({ type: 'success', text: 'Settings saved!' });
      setShowSettings(false);
    }
    setSaving(false);
    setTimeout(() => setSaveMsg(null), 3000);
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
        <h1 className="text-3xl mb-4 text-[var(--color-accent-red)]">Error</h1>
        <p className="text-[var(--color-text-secondary)]">{error}</p>
        <Link to="/dashboard" className="text-[var(--color-accent-cyan)] hover:underline mt-4 inline-block">Back to Dashboard</Link>
      </div>
    );
  }

  const scoreFields = SCORE_CATEGORIES;

  return (
    <div className="max-w-5xl mx-auto px-6 py-8">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/dashboard')} className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
            <ArrowLeft size={20} />
          </button>
          <div>
            <h1 className="text-2xl text-[var(--color-accent-cyan)]">{list.title}</h1>
            <div className="flex items-center gap-2 text-sm text-[var(--color-text-secondary)]">
              {list.is_public ? <Eye size={12} /> : <EyeOff size={12} />}
              <span>{list.is_public ? 'Public' : 'Private'}</span>
              <span>·</span>
              <span>{entries.length} {entries.length === 1 ? 'entry' : 'entries'}</span>
            </div>
          </div>
        </div>
        <div className="flex gap-2">
          <button
            onClick={() => setShowSettings(!showSettings)}
            className="px-4 py-2 text-sm bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
          >
            Settings
          </button>
          <button
            onClick={() => setShowSearch(!showSearch)}
            className="px-4 py-2 text-sm bg-[var(--color-accent-green)] text-[var(--color-bg-primary)] rounded font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5"
          >
            <Plus size={16} /> Add Anime
          </button>
        </div>
      </div>

      {/* Messages */}
      {saveMsg && (
        <div className={`mb-4 px-4 py-3 rounded text-sm ${
          saveMsg.type === 'error'
            ? 'bg-[var(--color-accent-red)]/10 border border-[var(--color-accent-red)]/30 text-[var(--color-accent-red)]'
            : 'bg-[var(--color-accent-green)]/10 border border-[var(--color-accent-green)]/30 text-[var(--color-accent-green)]'
        }`}>
          {saveMsg.text}
        </div>
      )}

      {/* Settings Panel */}
      {showSettings && (
        <div className="mb-6 p-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg space-y-4">
          <h3 className="text-lg text-[var(--color-text-primary)]">List Settings</h3>
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Title</label>
            <input type="text" value={settingsTitle} onChange={(e) => setSettingsTitle(e.target.value)}
              className="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:border-[var(--color-accent-cyan)] focus:outline-none" maxLength={100} />
          </div>
          <div>
            <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Description</label>
            <textarea value={settingsDesc} onChange={(e) => setSettingsDesc(e.target.value)} rows={2}
              className="w-full px-3 py-2 bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:border-[var(--color-accent-cyan)] focus:outline-none resize-none" maxLength={500} />
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={() => setSettingsPublic(false)}
              className={`px-3 py-1.5 rounded text-sm ${!settingsPublic ? 'bg-[var(--color-accent-purple)] text-white' : 'bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[var(--color-text-secondary)]'}`}>
              Private
            </button>
            <button type="button" onClick={() => setSettingsPublic(true)}
              className={`px-3 py-1.5 rounded text-sm ${settingsPublic ? 'bg-[var(--color-accent-green)] text-[var(--color-bg-primary)]' : 'bg-[var(--color-bg-primary)] border border-[var(--color-border)] text-[var(--color-text-secondary)]'}`}>
              Public
            </button>
          </div>
          <div className="grid grid-cols-2 gap-3">
            {SCORE_CATEGORIES.map((cat) => {
              const Icon = cat.icon;
              return (
                <div key={cat.key}>
                  <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)] mb-1" title={cat.description}>
                    <Icon size={12} /> {cat.label}
                  </label>
                  <div className="flex items-center gap-2">
                    <input type="range" min="0" max="5" step="0.1" value={settingsWeights[cat.key]}
                      onChange={(e) => setSettingsWeights((p) => ({ ...p, [cat.key]: parseFloat(e.target.value) }))}
                      className="flex-1 accent-[var(--color-accent-cyan)]" />
                    <span className="text-sm text-[var(--color-accent-cyan)] w-8 text-right">×{settingsWeights[cat.key]}</span>
                  </div>
                </div>
              );
            })}
          </div>
          <button
            type="button"
            onClick={() => {
              if (!profile) return;
              setSettingsWeights({
                technical: profile.pref_weight_technical ?? 1,
                storytelling: profile.pref_weight_storytelling ?? 1,
                enjoyment: profile.pref_weight_enjoyment ?? 1,
                xfactor: profile.pref_weight_xfactor ?? 1,
              });
            }}
            className="px-3 py-1.5 text-xs border border-[var(--color-border)] rounded text-[var(--color-text-secondary)] hover:text-[var(--color-accent-cyan)] hover:border-[var(--color-accent-cyan)] transition-colors"
          >
            Use My Preferred Weights
          </button>
          <button onClick={saveSettings} disabled={saving}
            className="px-4 py-2 bg-[var(--color-accent-cyan)] text-[var(--color-bg-primary)] rounded font-medium hover:opacity-90 transition-opacity flex items-center gap-1.5 disabled:opacity-50">
            <Save size={14} /> {saving ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      )}

      {/* Search Panel */}
      {showSearch && (
        <div className="mb-6 p-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg">
          <div className="flex items-center gap-2 mb-3">
            <Search size={16} className="text-[var(--color-text-secondary)]" />
            <input type="text" value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search anime to add..." autoFocus
              className="flex-1 bg-transparent border-none outline-none text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]" />
            <button onClick={() => { setShowSearch(false); setSearchQuery(''); setSearchResults([]); }}
              className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]">
              <X size={16} />
            </button>
          </div>
          {searching && <p className="text-sm text-[var(--color-text-secondary)]">Searching...</p>}
          {searchResults.length > 0 && (
            <div className="grid gap-2 max-h-72 overflow-y-auto">
              {searchResults.map((anime) => {
                const alreadyAdded = entries.some((e) => e.anilist_id === anime.id);
                const title = anime.title.english || anime.title.romaji;
                return (
                  <button key={anime.id} onClick={() => !alreadyAdded && addAnime(anime)} disabled={alreadyAdded}
                    className={`flex items-center gap-3 p-2 rounded text-left transition-colors ${alreadyAdded ? 'opacity-40 cursor-not-allowed' : 'hover:bg-[var(--color-bg-primary)]'}`}>
                    <img src={anime.coverImage?.large} alt={title} className="w-10 h-14 object-cover rounded shrink-0" />
                    <div className="min-w-0">
                      <p className="text-sm text-[var(--color-text-primary)] truncate">{title}</p>
                      <p className="text-xs text-[var(--color-text-secondary)]">{anime.format} · {anime.episodes ? `${anime.episodes} eps` : ''} {alreadyAdded ? '(already added)' : ''}</p>
                    </div>
                  </button>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Ranked Entries */}
      {rankedEntries.length === 0 ? (
        <div className="border border-[var(--color-border)] rounded-lg p-12 text-center">
          <p className="text-[var(--color-text-secondary)] mb-4">No anime in this list yet.</p>
          <button onClick={() => setShowSearch(true)} className="text-[var(--color-accent-cyan)] hover:underline">
            Add your first anime
          </button>
        </div>
      ) : (
        <div className="grid gap-3">
          {rankedEntries.map((entry, index) => {
            const anime = entry.anime_cache;
            if (!anime) return null;
            const title = anime.title_english || anime.title_romaji;
            const isExpanded = expandedEntry === entry.id;

            return (
              <div key={entry.id} className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg overflow-hidden">
                {/* Entry Row */}
                <div className="flex items-center gap-4 p-4">
                  {/* Rank */}
                  <span className="text-2xl font-bold text-[var(--color-accent-cyan)] w-8 text-center shrink-0">
                    {index + 1}
                  </span>

                  {/* Cover */}
                  <img src={anime.cover_image_url} alt={title} className="w-12 h-16 object-cover rounded shrink-0" />

                  {/* Info */}
                  <div className="flex-1 min-w-0">
                    <p className="font-medium text-[var(--color-text-primary)] truncate">{title}</p>
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
                    <div className="flex items-center gap-2 mt-1">
                      {anime.format && <span className="text-[10px] px-1.5 py-0.5 rounded bg-[var(--color-accent-purple)]/20 text-[var(--color-accent-purple)]">{anime.format}</span>}
                      {anime.episodes && <span className="text-[10px] text-[var(--color-text-secondary)]">{anime.episodes} eps</span>}
                    </div>
                  </div>

                  {/* Overall Score */}
                  <div className="text-center shrink-0">
                    <p className="text-xl font-bold text-[var(--color-accent-green)]">{entry.overallScore.toFixed(1)}</p>
                    <p className="text-[10px] text-[var(--color-text-secondary)]">Overall</p>
                  </div>

                  {/* Expand/Collapse */}
                  <button onClick={() => setExpandedEntry(isExpanded ? null : entry.id)}
                    className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors shrink-0">
                    {isExpanded ? <ChevronUp size={18} /> : <ChevronDown size={18} />}
                  </button>
                </div>

                {/* Expanded Scoring */}
                {isExpanded && (
                  <div className="px-4 pb-4 border-t border-[var(--color-border)] pt-4">
                    {/* Score Sliders */}
                    <div className="grid grid-cols-2 gap-4 mb-4">
                      {scoreFields.map((cat) => {
                        const Icon = cat.icon;
                        return (
                          <div key={cat.scoreKey}>
                            <div className="flex items-center justify-between mb-1">
                              <label className="flex items-center gap-1.5 text-xs text-[var(--color-text-secondary)]" title={cat.description}>
                                <Icon size={12} /> {cat.label}
                              </label>
                              <span className="text-sm font-medium text-[var(--color-text-primary)]">{Number(entry[cat.scoreKey]).toFixed(1)}</span>
                            </div>
                            <input type="range" min="0" max="10" step="0.1" value={Number(entry[cat.scoreKey])}
                              onChange={(e) => updateEntryScore(entry.id, cat.scoreKey, e.target.value)}
                              className="w-full accent-[var(--color-accent-cyan)]" />
                          </div>
                        );
                      })}
                    </div>

                    {/* Notes */}
                    <div className="mb-4">
                      <label className="block text-xs text-[var(--color-text-secondary)] mb-1">Notes</label>
                      <textarea value={entry.notes || ''} onChange={(e) => updateEntryNotes(entry.id, e.target.value)}
                        rows={2} placeholder="Personal thoughts or review..."
                        className="w-full px-3 py-2 text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-accent-cyan)] focus:outline-none resize-none" />
                    </div>

                    {/* Actions */}
                    <div className="flex items-center justify-between">
                      {anime.site_url && (
                        <a href={anime.site_url} target="_blank" rel="noopener noreferrer"
                          className="text-xs text-[var(--color-accent-cyan)] hover:underline flex items-center gap-1">
                          <ExternalLink size={10} /> View on AniList
                        </a>
                      )}
                      <button onClick={() => removeEntry(entry.id)}
                        className="text-xs text-[var(--color-text-secondary)] hover:text-[var(--color-accent-red)] transition-colors flex items-center gap-1">
                        <Trash2 size={12} /> Remove
                      </button>
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default ListEditorPage;
