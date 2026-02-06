import { useEffect, useState } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { Settings, Calendar, List, Heart } from 'lucide-react';

function ProfilePage() {
  const { username } = useParams();
  const { user } = useAuth();
  const [profile, setProfile] = useState(null);
  const [lists, setLists] = useState([]);
  const [stats, setStats] = useState({ listCount: 0, totalLikes: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const isOwnProfile = user && profile && user.id === profile.id;

  useEffect(() => {
    async function loadProfile() {
      setLoading(true);
      setError(null);

      const { data: profileData, error: profileError } = await supabase
        .from('profiles')
        .select('*')
        .eq('username', username)
        .single();

      if (profileError) {
        setError('User not found.');
        setLoading(false);
        return;
      }

      setProfile(profileData);

      const { data: listsData } = await supabase
        .from('lists')
        .select('id, title, description, is_public, like_count, created_at, updated_at')
        .eq('user_id', profileData.id)
        .eq('is_public', true)
        .order('updated_at', { ascending: false });

      const publicLists = listsData || [];
      setLists(publicLists);

      const totalLikes = publicLists.reduce((sum, l) => sum + (l.like_count || 0), 0);
      setStats({ listCount: publicLists.length, totalLikes });

      setLoading(false);
    }

    loadProfile();
  }, [username]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="inline-block w-8 h-8 border-2 border-[var(--color-accent-cyan)] border-t-transparent rounded-full animate-spin" />
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

  const weights = [
    { label: 'Tech', value: profile.pref_weight_technical },
    { label: 'Story', value: profile.pref_weight_storytelling },
    { label: 'Enjoy', value: profile.pref_weight_enjoyment },
    { label: 'X', value: profile.pref_weight_xfactor },
  ];

  return (
    <div className="max-w-4xl mx-auto px-6 py-8">
      {/* Profile Header */}
      <div className="flex items-start gap-6 mb-8">
        {profile.avatar_url ? (
          <img
            src={profile.avatar_url}
            alt={profile.display_name}
            className="w-24 h-24 rounded-full object-cover border-2 border-[var(--color-border)] shrink-0"
          />
        ) : (
          <div className="w-24 h-24 rounded-full bg-[var(--color-accent-purple)] flex items-center justify-center text-white text-3xl font-bold shrink-0">
            {(profile.display_name || '?')[0].toUpperCase()}
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-3 mb-1">
            <h1 className="text-3xl text-[var(--color-text-primary)] truncate">{profile.display_name}</h1>
            {isOwnProfile && (
              <Link
                to="/settings"
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent-cyan)] transition-colors"
                title="Edit Profile"
              >
                <Settings size={20} />
              </Link>
            )}
          </div>
          <p className="text-[var(--color-text-secondary)] mb-3">@{profile.username}</p>

          {profile.bio && (
            <p className="text-[var(--color-text-primary)] mb-3">{profile.bio}</p>
          )}

          {profile.avatar_character_name && (
            <p className="text-xs text-[var(--color-text-secondary)] mb-3">
              Avatar: {profile.avatar_character_name}
            </p>
          )}

          <div className="flex flex-wrap items-center gap-4 text-sm text-[var(--color-text-secondary)]">
            <span className="flex items-center gap-1.5">
              <Calendar size={14} />
              Joined {new Date(profile.created_at).toLocaleDateString('en-US', { month: 'long', year: 'numeric' })}
            </span>
            <span className="flex items-center gap-1.5">
              <List size={14} />
              {stats.listCount} public {stats.listCount === 1 ? 'list' : 'lists'}
            </span>
            <span className="flex items-center gap-1.5">
              <Heart size={14} />
              {stats.totalLikes} {stats.totalLikes === 1 ? 'like' : 'likes'} received
            </span>
          </div>
        </div>
      </div>

      {/* Weight Preferences */}
      <div className="mb-8 p-4 bg-[var(--color-bg-secondary)] rounded-lg border border-[var(--color-border)]">
        <h3 className="text-sm font-medium text-[var(--color-text-secondary)] mb-2">Preferred Weights</h3>
        <div className="flex gap-4 text-sm">
          {weights.map((w) => (
            <span key={w.label} className="text-[var(--color-text-primary)]">
              {w.label} <span className="text-[var(--color-accent-cyan)]">×{Number(w.value)}</span>
            </span>
          ))}
        </div>
      </div>

      {/* Public Lists */}
      <section>
        <h2 className="text-xl text-[var(--color-text-primary)] mb-4">Public Lists</h2>
        {lists.length === 0 ? (
          <div className="border border-[var(--color-border)] rounded-lg p-8 text-center">
            <p className="text-[var(--color-text-secondary)]">No public lists yet.</p>
          </div>
        ) : (
          <div className="grid gap-3">
            {lists.map((list) => (
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
                {list.description && (
                  <p className="text-sm text-[var(--color-text-secondary)] line-clamp-2">{list.description}</p>
                )}
                <p className="text-xs text-[var(--color-text-secondary)] mt-2">
                  Updated {new Date(list.updated_at).toLocaleDateString()}
                </p>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

export default ProfilePage;
