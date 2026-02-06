import { Link } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';

function Navbar() {
  const { user, signOut, loading } = useAuth();

  return (
    <nav className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="font-[var(--font-pixel)] text-2xl text-[var(--color-accent-cyan)] hover:text-[var(--color-accent-green)] transition-colors">
          AniRank
        </Link>

        <div className="flex items-center gap-4">
          <Link to="/search" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
            Search
          </Link>

          {loading ? null : user ? (
            <>
              <Link to="/dashboard" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors">
                Dashboard
              </Link>
              <button
                onClick={signOut}
                className="text-[var(--color-text-secondary)] hover:text-[var(--color-accent-red)] transition-colors"
              >
                Sign Out
              </button>
            </>
          ) : (
            <Link
              to="/login"
              className="bg-[var(--color-accent-purple)] text-white px-4 py-1.5 rounded hover:opacity-90 transition-opacity"
            >
              Sign In
            </Link>
          )}
        </div>
      </div>
    </nav>
  );
}

export default Navbar;
