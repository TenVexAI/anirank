import { useParams } from 'react-router-dom';

function ProfilePage() {
  const { username } = useParams();

  return (
    <div className="max-w-7xl mx-auto px-6 py-8">
      <h1 className="text-3xl mb-6 text-[var(--color-accent-cyan)]">Profile</h1>
      <p className="text-[var(--color-text-secondary)]">Viewing profile: {username}</p>
    </div>
  );
}

export default ProfilePage;
