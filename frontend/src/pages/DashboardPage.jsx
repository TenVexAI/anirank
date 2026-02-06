import { useAuth } from '../hooks/useAuth';
import { Navigate, Link } from 'react-router-dom';

function DashboardPage() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-3xl text-[var(--color-accent-cyan)]">My Dashboard</h1>
        <Link
          to="/list/new"
          className="bg-[var(--color-accent-green)] text-[var(--color-bg-primary)] px-5 py-2 rounded font-medium hover:opacity-90 transition-opacity"
        >
          New List
        </Link>
      </div>
      <p className="text-[var(--color-text-secondary)]">Your lists will appear here.</p>
    </div>
  );
}

export default DashboardPage;
