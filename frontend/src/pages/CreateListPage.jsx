import { useAuth } from '../hooks/useAuth';
import { Navigate } from 'react-router-dom';

function CreateListPage() {
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="max-w-3xl mx-auto px-6 py-8">
      <h1 className="text-3xl mb-6 text-[var(--color-accent-cyan)]">Create New List</h1>
      <p className="text-[var(--color-text-secondary)]">List creation form coming soon.</p>
    </div>
  );
}

export default CreateListPage;
