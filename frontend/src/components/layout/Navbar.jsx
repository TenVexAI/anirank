import { useState, useRef, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../hooks/useAuth';
import { Search, LayoutDashboard, LogOut, User, ChevronDown, Settings } from 'lucide-react';

function Navbar() {
  const { user, profile, signOut, loading } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setMenuOpen(false);
      }
    }
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleSignOut = async () => {
    setMenuOpen(false);
    await signOut();
    navigate('/');
  };

  return (
    <nav className="bg-[var(--color-bg-secondary)] border-b border-[var(--color-border)] px-6 py-3">
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <Link to="/" className="font-[var(--font-pixel)] text-2xl text-[var(--color-accent-purple)] hover:text-[var(--color-accent-cyan)] transition-colors">
          AniRank
        </Link>

        <div className="flex items-center gap-4">
          <Link to="/search" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors flex items-center gap-1.5">
            <Search size={16} />
            <span className="hidden sm:inline">Search</span>
          </Link>

          {loading ? null : user ? (
            <>
              <Link to="/dashboard" className="text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors flex items-center gap-1.5">
                <LayoutDashboard size={16} />
                <span className="hidden sm:inline">Dashboard</span>
              </Link>

              <div className="relative" ref={menuRef}>
                <button
                  onClick={() => setMenuOpen(!menuOpen)}
                  className="flex items-center gap-2 hover:opacity-90 transition-opacity"
                >
                  {profile?.avatar_url ? (
                    <img
                      src={profile.avatar_url}
                      alt={profile.display_name || 'Avatar'}
                      className="w-8 h-8 rounded-full object-cover border border-[var(--color-border)]"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-[var(--color-accent-purple)] flex items-center justify-center text-white text-sm font-medium">
                      {(profile?.display_name || user.email || '?')[0].toUpperCase()}
                    </div>
                  )}
                  <ChevronDown size={14} className="text-[var(--color-text-secondary)]" />
                </button>

                {menuOpen && (
                  <div className="absolute right-0 top-full mt-2 w-48 bg-[var(--color-bg-secondary)] border border-[var(--color-border)] rounded-lg shadow-lg overflow-hidden z-50">
                    <div className="px-4 py-3 border-b border-[var(--color-border)]">
                      <p className="text-sm font-medium text-[var(--color-text-primary)] truncate">
                        {profile?.display_name || 'User'}
                      </p>
                      <p className="text-xs text-[var(--color-text-secondary)] truncate">
                        @{profile?.username || '...'}
                      </p>
                    </div>
                    <Link
                      to={profile?.username ? `/user/${profile.username}` : '#'}
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-primary)] transition-colors"
                    >
                      <User size={14} />
                      Profile
                    </Link>
                    <Link
                      to="/settings"
                      onClick={() => setMenuOpen(false)}
                      className="flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-primary)] transition-colors"
                    >
                      <Settings size={14} />
                      Settings
                    </Link>
                    <button
                      onClick={handleSignOut}
                      className="w-full flex items-center gap-2 px-4 py-2.5 text-sm text-[var(--color-text-secondary)] hover:text-[var(--color-accent-red)] hover:bg-[var(--color-bg-primary)] transition-colors"
                    >
                      <LogOut size={14} />
                      Sign Out
                    </button>
                  </div>
                )}
              </div>
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
