import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';

function LoginPage() {
  const { user, signInWithProvider, loading } = useAuth();

  if (loading) return null;
  if (user) return <Navigate to="/dashboard" replace />;

  const providers = [
    { id: 'twitch', label: 'Twitch', color: '#9146FF' },
    { id: 'discord', label: 'Discord', color: '#5865F2' },
    { id: 'github', label: 'GitHub', color: '#333' },
  ];

  return (
    <div className="max-w-md mx-auto px-6 py-16">
      <h1 className="text-3xl mb-8 text-center text-[var(--color-accent-cyan)]">Sign In</h1>
      <div className="flex flex-col gap-4">
        {providers.map((provider) => (
          <button
            key={provider.id}
            onClick={() => signInWithProvider(provider.id)}
            className="w-full py-3 rounded text-white font-medium hover:opacity-90 transition-opacity"
            style={{ backgroundColor: provider.color }}
          >
            Continue with {provider.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export default LoginPage;
