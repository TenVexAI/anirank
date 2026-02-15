import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';
import { Heart, TrendingUp, Clock, Search, ArrowRight, MessageSquare, Compass, Trophy, Bookmark } from 'lucide-react';

function HomePage() {
  const { user, loading: authLoading } = useAuth();
  const [popularLists, setPopularLists] = useState([]);
  const [recentLists, setRecentLists] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadLists();
  }, []);

  async function loadLists() {
    setLoading(true);
    try {
      const [popRes, recRes] = await Promise.all([
        supabase
          .from('lists')
          .select('id, title, description, like_count, list_type, created_at, updated_at, profiles(display_name, username, avatar_url), comments(count)')
          .eq('is_public', true)
          .order('like_count', { ascending: false })
          .limit(20),
        supabase
          .from('lists')
          .select('id, title, description, like_count, list_type, updated_at, profiles(display_name, username, avatar_url), comments(count)')
          .eq('is_public', true)
          .order('updated_at', { ascending: false })
          .limit(6),
      ]);
      if (popRes.error) console.error('Popular lists error:', popRes.error);
      if (recRes.error) console.error('Recent lists error:', recRes.error);

      // Extract comment_count from nested aggregate
      const withCommentCount = (arr) => (arr || []).map((l) => ({
        ...l,
        comment_count: l.comments?.[0]?.count ?? 0,
      }));

      // Sort popular: likes desc → comments desc → created_at asc (older first)
      const popular = withCommentCount(popRes.data)
        .sort((a, b) => {
          if ((b.like_count || 0) !== (a.like_count || 0)) return (b.like_count || 0) - (a.like_count || 0);
          if (b.comment_count !== a.comment_count) return b.comment_count - a.comment_count;
          return new Date(a.created_at) - new Date(b.created_at);
        })
        .slice(0, 6);

      setPopularLists(popular);
      setRecentLists(withCommentCount(recRes.data));
    } catch (err) {
      console.error('Failed to load lists:', err);
    }
    setLoading(false);
  }

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      {/* Hero */}
      <div className="text-center py-12 mb-10">
        <h1 className="text-5xl mb-4 text-[var(--color-accent-cyan)]">AniRank</h1>
        <p className="text-lg text-[var(--color-text-secondary)] max-w-xl mx-auto mb-8">
          Create, curate, and share personalized ranked anime lists.
        </p>
        <div className="flex justify-center gap-4">
          <Link to="/search"
            className="px-6 py-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-lg font-medium hover:border-[var(--color-accent-cyan)] transition-colors flex items-center gap-2">
            <Search size={16} /> Search
          </Link>
          <Link to="/explore"
            className="px-6 py-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] text-[var(--color-text-primary)] rounded-lg font-medium hover:border-[var(--color-accent-purple)] transition-colors flex items-center gap-2">
            <Compass size={16} /> Explore
          </Link>
          {!authLoading && user ? (
            <Link to="/dashboard"
              className="px-6 py-3 bg-[var(--color-accent-cyan)] text-[var(--color-bg-primary)] rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center gap-2">
              Go to Dashboard <ArrowRight size={16} />
            </Link>
          ) : !authLoading ? (
            <Link to="/login"
              className="px-6 py-3 bg-[var(--color-accent-cyan)] text-[var(--color-bg-primary)] rounded-lg font-medium hover:opacity-90 transition-opacity">
              Get Started
            </Link>
          ) : null}
        </div>
      </div>

      {loading ? (
        <div className="flex justify-center py-12">
          <div className="w-8 h-8 border-2 border-[var(--color-accent-cyan)] border-t-transparent rounded-full animate-spin" />
        </div>
      ) : (
        <>
          {/* Popular Lists */}
          <ListSection
            title="Popular Lists"
            icon={<TrendingUp size={20} />}
            lists={popularLists}
            emptyText="No public lists yet. Be the first to create one!"
          />

          {/* Recent Lists */}
          <ListSection
            title="Recently Updated"
            icon={<Clock size={20} />}
            lists={recentLists}
            emptyText="No recent lists."
          />
        </>
      )}
    </div>
  );
}

function ListSection({ title, icon, lists, emptyText }) {
  return (
    <section className="mb-10">
      <h2 className="text-xl text-[var(--color-text-primary)] mb-4 flex items-center gap-2">
        {icon} {title}
      </h2>
      {lists.length === 0 ? (
        <div className="border border-[var(--color-border)] rounded-lg p-8 text-center">
          <p className="text-[var(--color-text-secondary)]">{emptyText}</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {lists.map((list) => (
            <Link key={list.id} to={`/list/${list.id}`}
              className="block p-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg hover:border-[var(--color-accent-cyan)] transition-colors">
              <h3 className="font-medium text-[var(--color-text-primary)] truncate mb-1 flex items-center gap-1.5">
                {(list.list_type || 'rank') === 'watch'
                  ? <Bookmark size={13} className="shrink-0 text-[var(--color-accent-purple)]" />
                  : <Trophy size={13} className="shrink-0 text-[var(--color-accent-cyan)]" />}
                {list.title}
              </h3>
              {list.description && (
                <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2 mb-3">{list.description}</p>
              )}
              <div className="flex items-center justify-between">
                {list.profiles && (
                  <div className="flex items-center gap-2">
                    {list.profiles.avatar_url ? (
                      <img src={list.profiles.avatar_url} alt="" className="w-5 h-5 rounded-full object-cover" />
                    ) : (
                      <div className="w-5 h-5 rounded-full bg-[var(--color-accent-purple)] flex items-center justify-center text-white text-[9px] font-medium">
                        {(list.profiles.display_name || '?')[0].toUpperCase()}
                      </div>
                    )}
                    <span className="text-xs text-[var(--color-text-secondary)]">{list.profiles.display_name}</span>
                  </div>
                )}
                <div className="flex items-center gap-3">
                  <span className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
                    <Heart size={10} /> {list.like_count || 0}
                  </span>
                  <span className="flex items-center gap-1 text-xs text-[var(--color-text-secondary)]">
                    <MessageSquare size={10} /> {list.comment_count || 0}
                  </span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      )}
    </section>
  );
}

export default HomePage;
