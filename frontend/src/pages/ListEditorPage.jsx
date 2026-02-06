import { useParams, Navigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';

function ListEditorPage() {
  const { id } = useParams();
  const { user, loading } = useAuth();

  if (loading) return null;
  if (!user) return <Navigate to="/login" replace />;

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h1 className="text-3xl mb-6 text-[var(--color-accent-cyan)]">Edit List</h1>
      <p className="text-[var(--color-text-secondary)]">Editing list: {id}</p>
    </div>
  );
}

export default ListEditorPage;
