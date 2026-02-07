import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { supabase } from '../lib/supabase';
import { searchCharacters } from '../lib/anilist';
import { Upload, Search, X, Save, ArrowLeft, Link2, Unlink } from 'lucide-react';
import { TwitchIcon, DiscordIcon, GithubIcon } from '../components/ui/BrandIcons';
import { SCORE_CATEGORIES } from '../utils/categories';

function ProfileSettingsPage() {
  const { user, profile, fetchProfile } = useAuth();
  const navigate = useNavigate();

  const [displayName, setDisplayName] = useState('');
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [weightTechnical, setWeightTechnical] = useState(1);
  const [weightStorytelling, setWeightStorytelling] = useState(1);
  const [weightEnjoyment, setWeightEnjoyment] = useState(1);
  const [weightXfactor, setWeightXfactor] = useState(1);

  const [saving, setSaving] = useState(false);
  const [saveMsg, setSaveMsg] = useState(null);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Character search state
  const [charSearch, setCharSearch] = useState('');
  const [charResults, setCharResults] = useState([]);
  const [charSearching, setCharSearching] = useState(false);
  const [showCharSearch, setShowCharSearch] = useState(false);
  const charDebounceRef = useRef(null);

  useEffect(() => {
    if (profile) {
      setDisplayName(profile.display_name || '');
      setUsername(profile.username || '');
      setBio(profile.bio || '');
      setWeightTechnical(Number(profile.pref_weight_technical) || 1);
      setWeightStorytelling(Number(profile.pref_weight_storytelling) || 1);
      setWeightEnjoyment(Number(profile.pref_weight_enjoyment) || 1);
      setWeightXfactor(Number(profile.pref_weight_xfactor) || 1);
    }
  }, [profile]);

  const handleSave = async () => {
    setSaving(true);
    setSaveMsg(null);

    const updates = {
      display_name: displayName.trim(),
      username: username.trim().toLowerCase(),
      bio: bio.trim(),
      pref_weight_technical: weightTechnical,
      pref_weight_storytelling: weightStorytelling,
      pref_weight_enjoyment: weightEnjoyment,
      pref_weight_xfactor: weightXfactor,
      updated_at: new Date().toISOString(),
    };

    const { error } = await supabase
      .from('profiles')
      .update(updates)
      .eq('id', user.id);

    if (error) {
      setSaveMsg({ type: 'error', text: error.message });
    } else {
      await fetchProfile(user.id);
      setSaveMsg({ type: 'success', text: 'Profile saved!' });
      setTimeout(() => setSaveMsg(null), 3000);
    }
    setSaving(false);
  };

  const handleAvatarUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 2 * 1024 * 1024) {
      setSaveMsg({ type: 'error', text: 'Image must be under 2 MB.' });
      return;
    }

    setUploadingAvatar(true);
    setSaveMsg(null);

    const ext = file.name.split('.').pop();
    const filePath = `${user.id}/avatar.${ext}`;

    // Delete existing avatar files in user's folder
    const { data: existingFiles } = await supabase.storage
      .from('avatars')
      .list(user.id);

    if (existingFiles?.length) {
      const filesToRemove = existingFiles.map((f) => `${user.id}/${f.name}`);
      await supabase.storage.from('avatars').remove(filesToRemove);
    }

    // Upload new file
    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(filePath, file, { upsert: true });

    if (uploadError) {
      setSaveMsg({ type: 'error', text: `Upload failed: ${uploadError.message}` });
      setUploadingAvatar(false);
      return;
    }

    const { data: urlData } = supabase.storage
      .from('avatars')
      .getPublicUrl(filePath);

    // Update profile with new avatar URL, clear character fields
    await supabase
      .from('profiles')
      .update({
        avatar_url: urlData.publicUrl,
        avatar_character_id: null,
        avatar_character_name: null,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    await fetchProfile(user.id);
    setSaveMsg({ type: 'success', text: 'Avatar uploaded!' });
    setUploadingAvatar(false);
  };

  const handleCharacterSearch = useCallback(async (query) => {
    if (!query.trim()) {
      setCharResults([]);
      return;
    }
    setCharSearching(true);
    try {
      const result = await searchCharacters(query, 1, 12);
      setCharResults(result.characters || []);
    } catch {
      setCharResults([]);
    }
    setCharSearching(false);
  }, []);

  useEffect(() => {
    if (charDebounceRef.current) clearTimeout(charDebounceRef.current);
    if (charSearch.trim()) {
      charDebounceRef.current = setTimeout(() => handleCharacterSearch(charSearch), 300);
    } else {
      setCharResults([]);
    }
    return () => clearTimeout(charDebounceRef.current);
  }, [charSearch, handleCharacterSearch]);

  const selectCharacterAvatar = async (character) => {
    const avatarUrl = character.image?.large || character.image?.medium;
    if (!avatarUrl) return;

    setSaveMsg(null);

    await supabase
      .from('profiles')
      .update({
        avatar_url: avatarUrl,
        avatar_character_id: character.id,
        avatar_character_name: character.name.userPreferred || character.name.full,
        updated_at: new Date().toISOString(),
      })
      .eq('id', user.id);

    await fetchProfile(user.id);
    setShowCharSearch(false);
    setCharSearch('');
    setCharResults([]);
    setSaveMsg({ type: 'success', text: `Avatar set to ${character.name.userPreferred || character.name.full}!` });
  };

  if (!profile) return null;

  return (
    <div className="max-w-2xl mx-auto px-6 py-8">
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => navigate(-1)}
          className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
        >
          <ArrowLeft size={20} />
        </button>
        <h1 className="text-3xl text-[var(--color-accent-cyan)]">Profile Settings</h1>
      </div>

      {/* Save Message */}
      {saveMsg && (
        <div className={`mb-6 px-4 py-3 rounded text-sm ${
          saveMsg.type === 'error'
            ? 'bg-[var(--color-accent-red)]/10 border border-[var(--color-accent-red)]/30 text-[var(--color-accent-red)]'
            : 'bg-[var(--color-accent-green)]/10 border border-[var(--color-accent-green)]/30 text-[var(--color-accent-green)]'
        }`}>
          {saveMsg.text}
        </div>
      )}

      {/* Avatar Section */}
      <section className="mb-8">
        <h2 className="text-lg text-[var(--color-text-primary)] mb-4">Avatar</h2>
        <div className="flex items-start gap-6">
          {profile.avatar_url ? (
            <img
              src={profile.avatar_url}
              alt="Current avatar"
              className="w-20 h-20 rounded-full object-cover border-2 border-[var(--color-border)] shrink-0"
            />
          ) : (
            <div className="w-20 h-20 rounded-full bg-[var(--color-accent-purple)] flex items-center justify-center text-white text-2xl font-bold shrink-0">
              {(profile.display_name || '?')[0].toUpperCase()}
            </div>
          )}

          <div className="flex flex-col gap-3">
            {profile.avatar_character_name && (
              <p className="text-xs text-[var(--color-text-secondary)]">
                Current: {profile.avatar_character_name}
              </p>
            )}

            <div className="flex gap-2">
              <label className="cursor-pointer bg-[var(--color-bg-secondary)] border border-[var(--color-border)] px-4 py-2 rounded text-sm text-[var(--color-text-primary)] hover:border-[var(--color-accent-cyan)] transition-colors flex items-center gap-2">
                <Upload size={14} />
                {uploadingAvatar ? 'Uploading...' : 'Upload Image'}
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  onChange={handleAvatarUpload}
                  disabled={uploadingAvatar}
                  className="hidden"
                />
              </label>

              <button
                onClick={() => setShowCharSearch(!showCharSearch)}
                className="bg-[var(--color-bg-secondary)] border border-[var(--color-border)] px-4 py-2 rounded text-sm text-[var(--color-text-primary)] hover:border-[var(--color-accent-cyan)] transition-colors flex items-center gap-2"
              >
                <Search size={14} />
                Anime Character
              </button>
            </div>

            <p className="text-xs text-[var(--color-text-secondary)]">JPEG, PNG, or WebP. Max 2 MB.</p>
          </div>
        </div>

        {/* Character Search Panel */}
        {showCharSearch && (
          <div className="mt-4 p-4 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg">
            <div className="flex items-center gap-2 mb-3">
              <Search size={16} className="text-[var(--color-text-secondary)]" />
              <input
                type="text"
                value={charSearch}
                onChange={(e) => setCharSearch(e.target.value)}
                placeholder="Search anime characters..."
                className="flex-1 bg-transparent border-none outline-none text-[var(--color-text-primary)] placeholder:text-[var(--color-text-secondary)]"
                autoFocus
              />
              <button
                onClick={() => { setShowCharSearch(false); setCharSearch(''); setCharResults([]); }}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]"
              >
                <X size={16} />
              </button>
            </div>

            {charSearching && (
              <p className="text-sm text-[var(--color-text-secondary)] py-2">Searching...</p>
            )}

            {charResults.length > 0 && (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 max-h-80 overflow-y-auto">
                {charResults.map((char) => (
                  <button
                    key={char.id}
                    onClick={() => selectCharacterAvatar(char)}
                    className="flex flex-col items-center gap-2 p-3 rounded-lg border border-[var(--color-border)] hover:border-[var(--color-accent-cyan)] hover:bg-[var(--color-bg-primary)] transition-colors text-center"
                  >
                    <img
                      src={char.image?.medium || char.image?.large}
                      alt={char.name.userPreferred}
                      className="w-16 h-16 rounded-full object-cover"
                    />
                    <span className="text-xs text-[var(--color-text-primary)] font-medium truncate w-full">
                      {char.name.userPreferred || char.name.full}
                    </span>
                    {char.media?.nodes?.[0] && (
                      <span className="text-[10px] text-[var(--color-text-secondary)] truncate w-full">
                        {char.media.nodes[0].title.english || char.media.nodes[0].title.romaji}
                      </span>
                    )}
                  </button>
                ))}
              </div>
            )}

            {charSearch.trim() && !charSearching && charResults.length === 0 && (
              <p className="text-sm text-[var(--color-text-secondary)] py-2">No characters found.</p>
            )}
          </div>
        )}
      </section>

      {/* Profile Fields */}
      <section className="mb-8 space-y-4">
        <h2 className="text-lg text-[var(--color-text-primary)] mb-2">Profile Info</h2>

        <div>
          <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Display Name</label>
          <input
            type="text"
            value={displayName}
            onChange={(e) => setDisplayName(e.target.value)}
            className="w-full px-4 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:border-[var(--color-accent-cyan)] focus:outline-none transition-colors"
            maxLength={50}
          />
        </div>

        <div>
          <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Username</label>
          <div className="flex items-center gap-1">
            <span className="text-[var(--color-text-secondary)]">@</span>
            <input
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value.replace(/[^a-zA-Z0-9_]/g, ''))}
              className="flex-1 px-4 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:border-[var(--color-accent-cyan)] focus:outline-none transition-colors"
              maxLength={30}
            />
          </div>
        </div>

        <div>
          <label className="block text-sm text-[var(--color-text-secondary)] mb-1">Bio</label>
          <textarea
            value={bio}
            onChange={(e) => setBio(e.target.value)}
            rows={3}
            className="w-full px-4 py-2 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded text-[var(--color-text-primary)] focus:border-[var(--color-accent-cyan)] focus:outline-none transition-colors resize-none"
            maxLength={300}
            placeholder="Tell others about yourself..."
          />
          <p className="text-xs text-[var(--color-text-secondary)] mt-1">{bio.length}/300</p>
        </div>
      </section>

      {/* Weight Preferences */}
      <section className="mb-8">
        <h2 className="text-lg text-[var(--color-text-primary)] mb-2">Preferred Weights</h2>
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">
          Your default weights when viewing other people's lists with "My weights" mode.
        </p>

        <div className="grid grid-cols-2 gap-4">
          {SCORE_CATEGORIES.map((cat) => {
            const Icon = cat.icon;
            const valueMap = { technical: weightTechnical, storytelling: weightStorytelling, enjoyment: weightEnjoyment, xfactor: weightXfactor };
            const setterMap = { technical: setWeightTechnical, storytelling: setWeightStorytelling, enjoyment: setWeightEnjoyment, xfactor: setWeightXfactor };
            return (
              <div key={cat.key}>
                <label className="flex items-center gap-1.5 text-sm text-[var(--color-text-secondary)] mb-1" title={cat.description}>
                  <Icon size={14} /> {cat.label}
                </label>
                <div className="flex items-center gap-3">
                  <input
                    type="range"
                    min="0"
                    max="5"
                    step="0.1"
                    value={valueMap[cat.key]}
                    onChange={(e) => setterMap[cat.key](parseFloat(e.target.value))}
                    className="flex-1 accent-[var(--color-accent-cyan)]"
                  />
                  <span className="text-sm text-[var(--color-accent-cyan)] w-10 text-right font-medium">
                    ×{valueMap[cat.key]}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* Connected Accounts */}
      <section className="mb-8">
        <h2 className="text-lg text-[var(--color-text-primary)] mb-2">Connected Accounts</h2>
        <p className="text-sm text-[var(--color-text-secondary)] mb-4">
          Link additional login methods so you can sign in with any of them.
        </p>
        <div className="space-y-3">
          {['github', 'discord', 'twitch'].map((provider) => {
            const identity = user?.identities?.find((i) => i.provider === provider);
            const connected = !!identity;
            const labels = { github: 'GitHub', discord: 'Discord', twitch: 'Twitch' };
            const colors = {
              github: 'var(--color-text-primary)',
              discord: '#5865F2',
              twitch: '#9146FF',
            };

            return (
              <div key={provider}
                className="flex items-center justify-between p-3 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg">
                <div className="flex items-center gap-3">
                  <span className="text-lg" style={{ color: colors[provider] }}>
                    {provider === 'github' ? <GithubIcon size={20} /> : provider === 'discord' ? <DiscordIcon size={20} /> : <TwitchIcon size={20} />}
                  </span>
                  <div>
                    <p className="text-sm font-medium text-[var(--color-text-primary)]">{labels[provider]}</p>
                    {connected && identity.identity_data?.email && (
                      <p className="text-xs text-[var(--color-text-secondary)]">{identity.identity_data.email}</p>
                    )}
                  </div>
                </div>
                {connected ? (
                  <span className="flex items-center gap-1.5 text-xs text-[var(--color-accent-green)]">
                    <Link2 size={12} /> Connected
                  </span>
                ) : (
                  <button
                    onClick={async () => {
                      const { error } = await supabase.auth.linkIdentity({ provider });
                      if (error) setSaveMsg({ type: 'error', text: `Failed to link ${labels[provider]}: ${error.message}` });
                    }}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs bg-[var(--color-bg-primary)] border border-[var(--color-border)] rounded text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-accent-cyan)] transition-colors"
                  >
                    <Link2 size={12} /> Connect
                  </button>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* Save Button */}
      <button
        onClick={handleSave}
        disabled={saving}
        className="w-full py-3 bg-[var(--color-accent-cyan)] text-[var(--color-bg-primary)] rounded-lg font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-2 disabled:opacity-50"
      >
        <Save size={18} />
        {saving ? 'Saving...' : 'Save Changes'}
      </button>
    </div>
  );
}

export default ProfileSettingsPage;
