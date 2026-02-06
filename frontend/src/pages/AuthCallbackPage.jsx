import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';

function AuthCallbackPage() {
  const navigate = useNavigate();

  useEffect(() => {
    const handleCallback = async () => {
      const { data: { session }, error } = await supabase.auth.getSession();
      if (error || !session) {
        console.error('Auth callback error:', error?.message);
        navigate('/login', { replace: true });
        return;
      }

      // Check if profile setup is complete
      const { data: profile } = await supabase
        .from('profiles')
        .select('setup_complete')
        .eq('id', session.user.id)
        .single();

      if (profile?.setup_complete) {
        navigate('/dashboard', { replace: true });
      } else {
        navigate('/setup', { replace: true });
      }
    };

    handleCallback();
  }, [navigate]);

  return (
    <div className="flex items-center justify-center min-h-[60vh]">
      <div className="text-center">
        <div className="inline-block w-8 h-8 border-2 border-[var(--color-accent-cyan)] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-[var(--color-text-secondary)]">Signing you in...</p>
      </div>
    </div>
  );
}

export default AuthCallbackPage;
