import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { CheckCircle, AlertCircle, Loader2 } from 'lucide-react';

function ProfileSetupPage() {
  const { user, fetchProfile } = useAuth();
  const navigate = useNavigate();

  const [username, setUsername] = useState('');
  const [displayName, setDisplayName] = useState('');
  const [checking, setChecking] = useState(false);
  const [available, setAvailable] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  const checkUsername = async (value) => {
    const clean = value.toLowerCase().replace(/[^a-z0-9_]/g, '');
    setUsername(clean);
    setAvailable(null);

    if (clean.length < 3) {
      setAvailable(null);
      return;
    }

    setChecking(true);
    const { data } = await supabase
      .from('profiles')
      .select('id')
      .eq('username', clean)
      .neq('id', user.id)
      .maybeSingle();

    setAvailable(!data);
    setChecking(false);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!username || username.length < 3 || !available) return;

    setSaving(true);
    setError(null);

    const { error: updateError } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        username: username.toLowerCase(),
        display_name: displayName.trim() || username,
        setup_complete: true,
        updated_at: new Date().toISOString(),
      }, { onConflict: 'id' });

    if (updateError) {
      if (updateError.message.includes('unique') || updateError.code === '23505') {
        setError('That username is already taken. Try another.');
        setAvailable(false);
      } else {
        setError(updateError.message);
      }
      setSaving(false);
      return;
    }

    await fetchProfile(user.id);
    navigate('/dashboard');
  };

  if (!user) return null;

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="text-center mb-8">
        <h1 className="text-3xl text-[var(--color-accent-cyan)] mb-2">Welcome to AniRank!</h1>
        <p className="text-[var(--color-text-secondary)]">
          Let's set up your profile. Choose a unique username to get started.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Username */}
        <div>
          <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
            Username <span className="text-[var(--color-accent-red)]">*</span>
          </label>
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-[var(--color-text-secondary)]">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => checkUsername(e.target.value)}
              placeholder="your_username"
              className="w-full pl-8 pr-10 py-2.5 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:border-[var(--color-accent-cyan)] focus:outline-none transition-colors"
              maxLength={20}
              autoFocus
            />
            <div className="absolute right-3 top-1/2 -translate-y-1/2">
              {checking && <Loader2 size={16} className="text-[var(--color-text-secondary)] animate-spin" />}
              {!checking && available === true && <CheckCircle size={16} className="text-[var(--color-accent-green)]" />}
              {!checking && available === false && <AlertCircle size={16} className="text-[var(--color-accent-red)]" />}
            </div>
          </div>
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">
            {username.length > 0 && username.length < 3
              ? 'At least 3 characters'
              : available === false
              ? 'Username is taken'
              : available === true
              ? 'Username is available!'
              : 'Letters, numbers, and underscores only'}
          </p>
        </div>

        {/* Display Name */}
        <div>
          <label className="block text-sm text-[var(--color-text-secondary)] mb-1">
            Display Name <span className="text-xs text-[var(--color-text-secondary)]">(optional)</span>
          </label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            placeholder="How you want to be shown"
            className="w-full px-4 py-2.5 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg text-[var(--color-text-primary)] focus:border-[var(--color-accent-cyan)] focus:outline-none transition-colors"
            maxLength={50}
          />
        </div>

        {error && (
          <div className="px-4 py-3 rounded bg-[var(--color-accent-red)]/10 border border-[var(--color-accent-red)]/30 text-sm text-[var(--color-accent-red)]">
            {error}
          </div>
        )}

        <button
          type="submit"
          disabled={saving || !available || username.length < 3}
          className="w-full py-3 bg-[var(--color-accent-cyan)] text-[var(--color-bg-primary)] rounded-lg font-medium hover:opacity-90 transition-opacity disabled:opacity-30 disabled:cursor-not-allowed"
        >
          {saving ? 'Creating Profile...' : 'Complete Setup'}
        </button>
      </form>

      <p className="text-xs text-[var(--color-text-secondary)] text-center mt-6">
        You can change your username and add more details later in Settings.
      </p>
    </div>
  );
}

export default ProfileSetupPage;
