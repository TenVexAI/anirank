import { useEffect, useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Link, useNavigate } from 'react-router-dom';
import { Plus, Pencil, Trash2, Eye, EyeOff, Heart, List } from 'lucide-react';

function DashboardPage() {
  const { user, profile } = useAuth();
  const navigate = useNavigate();
  const [myLists, setMyLists] = useState([]);
  const [likedLists, setLikedLists] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState(null);

  useEffect(() => {
    if (!user) return;
    loadData();
  }, [user]);

  async function loadData() {
    setLoading(true);

    const [listsRes, likesRes] = await Promise.all([
      supabase
        .from('lists')
        .select('id, title, description, is_public, like_count, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false }),
      supabase
        .from('likes')
        .select('list_id, lists(id, title, description, is_public, like_count, updated_at, profiles(display_name, username))')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false }),
    ]);

    setMyLists(listsRes.data || []);
    setLikedLists(
      (likesRes.data || [])
        .map((l) => l.lists)
        .filter(Boolean)
    );
    setLoading(false);
  }

  const toggleVisibility = async (listId, currentPublic) => {
    const newPublic = !currentPublic;
    setMyLists((prev) => prev.map((l) => l.id === listId ? { ...l, is_public: newPublic } : l));
    await supabase.from('lists').update({ is_public: newPublic, updated_at: new Date().toISOString() }).eq('id', listId);
  };

  const handleDelete = async (listId, listTitle) => {
    if (!window.confirm(`Delete "${listTitle}"? This cannot be undone.`)) return;
    setDeleting(listId);

    const { error } = await supabase.from('lists').delete().eq('id', listId);
    if (!error) {
      setMyLists((prev) => prev.filter((l) => l.id !== listId));
    }
    setDeleting(null);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="w-8 h-8 border-2 border-[var(--color-accent-cyan)] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl text-[var(--color-accent-cyan)]">My Dashboard</h1>
        <Link
          to="/list/new"
          className="bg-[var(--color-accent-green)] text-[var(--color-bg-primary)] px-5 py-2 rounded font-medium hover:opacity-90 transition-opacity flex items-center gap-2"
        >
          <Plus size={18} />
          New List
        </Link>
      </div>

      {profile && (
        <p className="text-[var(--color-text-secondary)] mb-6">
          Welcome back, <span className="text-[var(--color-text-primary)]">{profile.display_name}</span>
        </p>
      )}

      {/* Stats */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] text-center">
          <p className="text-2xl font-bold text-[var(--color-accent-cyan)]">{myLists.length}</p>
          <p className="text-xs text-[var(--color-text-secondary)]">Lists</p>
        </div>
        <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] text-center">
          <p className="text-2xl font-bold text-[var(--color-accent-cyan)]">
            {myLists.reduce((sum, l) => sum + (l.like_count || 0), 0)}
          </p>
          <p className="text-xs text-[var(--color-text-secondary)]">Likes Received</p>
        </div>
        <div className="p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)] text-center">
          <p className="text-2xl font-bold text-[var(--color-accent-cyan)]">{likedLists.length}</p>
          <p className="text-xs text-[var(--color-text-secondary)]">Lists Liked</p>
        </div>
      </div>

      <div className="grid gap-8">
        {/* My Lists */}
        <section>
          <h2 className="text-xl text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
            <List size={20} /> My Lists
          </h2>
          {myLists.length === 0 ? (
            <div className="border border-[var(--color-border)] rounded-lg p-8 text-center">
              <p className="text-[var(--color-text-secondary)] mb-4">You haven't created any lists yet.</p>
              <Link to="/list/new" className="text-[var(--color-accent-cyan)] hover:underline">
                Create your first list
              </Link>
            </div>
          ) : (
            <div className="grid gap-3">
              {myLists.map((list) => (
                <div
                  key={list.id}
                  className="flex items-center gap-4 p-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg"
                >
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <Link
                        to={`/list/${list.id}`}
                        className="font-medium text-[var(--color-text-primary)] hover:text-[var(--color-accent-cyan)] transition-colors truncate"
                      >
                        {list.title}
                      </Link>
                      <button
                        onClick={(e) => { e.preventDefault(); toggleVisibility(list.id, list.is_public); }}
                        className="shrink-0 p-0.5 rounded hover:bg-[var(--color-bg-primary)] transition-colors"
                        title={list.is_public ? 'Public — click to make private' : 'Private — click to make public'}
                      >
                        {list.is_public ? (
                          <Eye size={14} className="text-[var(--color-accent-green)]" />
                        ) : (
                          <EyeOff size={14} className="text-[var(--color-text-secondary)]" />
                        )}
                      </button>
                    </div>
                    {list.description && (
                      <p className="text-sm text-[var(--color-text-secondary)] truncate">{list.description}</p>
                    )}
                    <div className="flex items-center gap-3 mt-1 text-xs text-[var(--color-text-secondary)]">
                      <span className="flex items-center gap-1">
                        <Heart size={10} /> {list.like_count || 0}
                      </span>
                      <span>Updated {new Date(list.updated_at).toLocaleDateString()}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      onClick={() => navigate(`/list/${list.id}/edit`)}
                      className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-accent-cyan)] transition-colors"
                      title="Edit"
                    >
                      <Pencil size={16} />
                    </button>
                    <button
                      onClick={() => handleDelete(list.id, list.title)}
                      disabled={deleting === list.id}
                      className="p-2 text-[var(--color-text-secondary)] hover:text-[var(--color-accent-red)] transition-colors disabled:opacity-50"
                      title="Delete"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Liked Lists */}
        <section>
          <h2 className="text-xl text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
            <Heart size={20} /> Liked Lists
          </h2>
          {likedLists.length === 0 ? (
            <div className="border border-[var(--color-border)] rounded-lg p-8 text-center">
              <p className="text-[var(--color-text-secondary)]">Lists you like will appear here.</p>
            </div>
          ) : (
            <div className="grid gap-3">
              {likedLists.map((list) => (
                <Link
                  key={list.id}
                  to={`/list/${list.id}`}
                  className="block p-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg hover:border-[var(--color-accent-cyan)] transition-colors"
                >
                  <div className="flex items-center justify-between mb-1">
                    <h3 className="font-medium text-[var(--color-text-primary)]">{list.title}</h3>
                    <span className="flex items-center gap-1 text-sm text-[var(--color-text-secondary)]">
                      <Heart size={12} /> {list.like_count || 0}
                    </span>
                  </div>
                  {list.profiles && (
                    <p className="text-xs text-[var(--color-text-secondary)]">
                      by {list.profiles.display_name || `@${list.profiles.username}`}
                    </p>
                  )}
                </Link>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  );
}

export default DashboardPage;
