import { useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';
import { Plus, Trophy, Bookmark, X } from 'lucide-react';

function AddToListModal({ anime, onClose }) {
  const { user } = useAuth();
  const [myLists, setMyLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [result, setResult] = useState(null);
  const [showNew, setShowNew] = useState(false);
  const [newTitle, setNewTitle] = useState('');
  const [newType, setNewType] = useState('watch');

  useEffect(() => {
    if (!user) return;
    supabase.from('lists').select('id, title, list_type').eq('user_id', user.id).order('updated_at', { ascending: false })
      .then(({ data }) => { setMyLists(data || []); setLoading(false); });
  }, [user]);

  const anilistId = anime.id || anime.anilist_id;
  const title = anime.title?.english || anime.title?.romaji || anime.title_english || anime.title_romaji;

  const upsertCache = async () => {
    if (!anime.id) return;
    const cacheData = {
      anilist_id: anime.id,
      title_english: anime.title?.english,
      title_romaji: anime.title?.romaji,
      title_native: anime.title?.native,
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
  };

  const addTo = async (listId) => {
    setResult(null);
    const { data: existing } = await supabase.from('list_entries').select('id').eq('list_id', listId).eq('anilist_id', anilistId).maybeSingle();
    if (existing) {
      setResult({ type: 'info', text: 'Already on that list' });
      setTimeout(() => setResult(null), 2000);
      return;
    }
    await upsertCache();
    const insertData = { list_id: listId, anilist_id: anilistId };
    if (anime.externalLinks) {
      insertData.streaming_services = (anime.externalLinks || []).filter((l) => l.type === 'STREAMING').map((l) => l.site);
    }
    const { error } = await supabase.from('list_entries').insert(insertData);
    await supabase.from('lists').update({ updated_at: new Date().toISOString() }).eq('id', listId);
    if (error) setResult({ type: 'error', text: error.message });
    else { setResult({ type: 'success', text: 'Added!' }); setTimeout(() => onClose(), 1200); }
  };

  const createAndAdd = async () => {
    if (!newTitle.trim()) return;
    const { data: newList, error: createErr } = await supabase.from('lists')
      .insert({ user_id: user.id, title: newTitle.trim(), list_type: newType, is_public: false })
      .select('id').single();
    if (createErr) { setResult({ type: 'error', text: createErr.message }); return; }
    setMyLists((prev) => [{ id: newList.id, title: newTitle.trim(), list_type: newType }, ...prev]);
    setShowNew(false);
    setNewTitle('');
    await addTo(newList.id);
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-xl w-full max-w-md shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between p-4 border-b border-[var(--color-border)]">
          <div>
            <h3 className="text-lg font-medium text-[var(--color-text-primary)]">Add to List</h3>
            <p className="text-xs text-[var(--color-text-secondary)] truncate mt-0.5">{title}</p>
          </div>
          <button onClick={onClose} className="p-1 text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
            <X size={18} />
          </button>
        </div>

        {result && (
          <div className={`mx-4 mt-3 px-3 py-2 rounded text-sm ${
            result.type === 'error' ? 'bg-[var(--color-accent-red)]/10 text-[var(--color-accent-red)]'
              : result.type === 'success' ? 'bg-[var(--color-accent-green)]/10 text-[var(--color-accent-green)]'
              : 'bg-[var(--color-accent-cyan)]/10 text-[var(--color-accent-cyan)]'
          }`}>{result.text}</div>
        )}

        <div className="max-h-64 overflow-y-auto p-2">
          {loading ? (
            <p className="text-sm text-[var(--color-text-secondary)] px-2 py-6 text-center">Loading...</p>
          ) : myLists.length === 0 ? (
            <p className="text-sm text-[var(--color-text-secondary)] px-2 py-6 text-center">No lists yet. Create one below!</p>
          ) : (
            myLists.map((l) => (
              <button key={l.id} onClick={() => addTo(l.id)}
                className="w-full text-left px-3 py-2.5 rounded-lg hover:bg-[var(--color-bg-primary)] transition-colors flex items-center gap-2.5 text-sm">
                {(l.list_type || 'rank') === 'watch'
                  ? <Bookmark size={14} className="shrink-0 text-[var(--color-accent-purple)]" />
                  : <Trophy size={14} className="shrink-0 text-[var(--color-accent-cyan)]" />}
                <span className="text-[var(--color-text-primary)] truncate">{l.title}</span>
              </button>
            ))
          )}
        </div>

        <div className="border-t border-[var(--color-border)] p-4">
          {!showNew ? (
            <button onClick={() => setShowNew(true)} className="text-sm text-[var(--color-accent-cyan)] hover:underline flex items-center gap-1.5">
              <Plus size={14} /> Create new list
            </button>
          ) : (
            <div className="space-y-2">
              <input type="text" value={newTitle} onChange={(e) => setNewTitle(e.target.value)} placeholder="List title..."
                className="w-full px-3 py-2 text-sm bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)] focus:border-[var(--color-accent-cyan)] focus:outline-none" autoFocus />
              <div className="flex gap-2">
                <button onClick={() => setNewType('rank')}
                  className={`px-3 py-1 text-xs rounded flex items-center gap-1 ${newType === 'rank' ? 'bg-[var(--color-accent-cyan)]/20 text-[var(--color-accent-cyan)]' : 'text-[var(--color-text-secondary)]'}`}>
                  <Trophy size={11} /> Rank
                </button>
                <button onClick={() => setNewType('watch')}
                  className={`px-3 py-1 text-xs rounded flex items-center gap-1 ${newType === 'watch' ? 'bg-[var(--color-accent-purple)]/20 text-[var(--color-accent-purple)]' : 'text-[var(--color-text-secondary)]'}`}>
                  <Bookmark size={11} /> Watch
                </button>
                <button onClick={createAndAdd} disabled={!newTitle.trim()}
                  className="ml-auto px-3 py-1 text-xs bg-[var(--color-accent-green)] text-[var(--color-bg-primary)] rounded font-medium disabled:opacity-50">
                  Create & Add
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function AddToListButton({ anime, size = 'sm' }) {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);

  if (!user) return null;

  return (
    <>
      <button onClick={(e) => { e.preventDefault(); e.stopPropagation(); setOpen(true); }}
        className="p-1.5 rounded text-[var(--color-text-secondary)] hover:text-[var(--color-accent-green)] hover:bg-[var(--color-accent-green)]/10 transition-colors"
        title="Add to list">
        <Plus size={14} />
      </button>
      {open && <AddToListModal anime={anime} onClose={() => setOpen(false)} />}
    </>
  );
}

export { AddToListModal };
export default AddToListButton;
