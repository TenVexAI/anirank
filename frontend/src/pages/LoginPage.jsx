import { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { Navigate, useLocation } from 'react-router-dom';
import { TwitchIcon, DiscordIcon, GithubIcon } from '../components/ui/BrandIcons';

const providers = [
  { id: 'twitch', label: 'Twitch', color: '#9146FF', icon: TwitchIcon },
  { id: 'discord', label: 'Discord', color: '#5865F2', icon: DiscordIcon },
  { id: 'github', label: 'GitHub', color: '#333', icon: GithubIcon },
];

function LoginPage() {
  const { user, signInWithProvider, loading } = useAuth();
  const [signingIn, setSigningIn] = useState(null);
  const [error, setError] = useState(null);
  const location = useLocation();

  if (loading) return null;
  if (user) {
    const from = location.state?.from?.pathname || '/dashboard';
    return <Navigate to={from} replace />;
  }

  const handleSignIn = async (providerId) => {
    setSigningIn(providerId);
    setError(null);
    try {
      await signInWithProvider(providerId);
    } catch (err) {
      setError(err.message);
      setSigningIn(null);
    }
  };

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <div className="text-center mb-10">
        <h1 className="text-4xl mb-3 text-[var(--color-accent-cyan)]">Welcome to AniRank</h1>
        <p className="text-[var(--color-text-secondary)]">
          Sign in to create and share your ranked anime lists.
        </p>
      </div>

      {error && (
        <div className="mb-6 px-4 py-3 rounded bg-[var(--color-accent-red)]/10 border border-[var(--color-accent-red)]/30 text-[var(--color-accent-red)] text-sm">
          {error}
        </div>
      )}

      <div className="flex flex-col gap-3">
        {providers.map((provider) => {
          const Icon = provider.icon;
          return (
            <button
              key={provider.id}
              onClick={() => handleSignIn(provider.id)}
              disabled={signingIn !== null}
              className="w-full py-3 px-4 rounded-lg text-white font-medium hover:opacity-90 transition-opacity flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed"
              style={{ backgroundColor: provider.color }}
            >
              <Icon size={20} />
              {signingIn === provider.id ? 'Redirecting...' : `Continue with ${provider.label}`}
            </button>
          );
        })}
      </div>

      <p className="text-center text-xs text-[var(--color-text-secondary)] mt-8">
        By signing in, you agree to let AniRank access your basic profile information.
      </p>
    </div>
  );
}

export default LoginPage;
