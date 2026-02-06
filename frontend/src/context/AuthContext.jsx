import { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { supabase } from '../lib/supabase';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [profile, setProfile] = useState(null);
  const [session, setSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const initRef = useRef(false);

  const fetchProfile = useCallback(async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', userId)
        .maybeSingle();

      if (error) {
        console.error('Error fetching profile:', error.message);
        return null;
      }
      // data is null if no profile row exists yet (trigger may not have run)
      setProfile(data);
      return data;
    } catch (err) {
      console.error('fetchProfile exception:', err);
      return null;
    }
  }, []);

  // Initialize auth state once, outside of StrictMode's double-mount cycle
  useEffect(() => {
    // Only run initialization once across StrictMode remounts
    if (initRef.current) return;
    initRef.current = true;

    async function init() {
      try {
        const { data: { session: s }, error } = await supabase.auth.getSession();
        if (error || !s) {
          // No valid session — clear any stale tokens from localStorage
          await supabase.auth.signOut().catch(() => {});
          setSession(null);
          setUser(null);
          setProfile(null);
          setLoading(false);
          return;
        }

        // Check if the access token is expired and try to refresh
        const expiresAt = s.expires_at;
        const now = Math.floor(Date.now() / 1000);
        if (expiresAt && now >= expiresAt) {
          const { data: { session: refreshed }, error: refreshError } = await supabase.auth.refreshSession();
          if (refreshError || !refreshed) {
            console.warn('Session expired and refresh failed, signing out');
            await supabase.auth.signOut().catch(() => {});
            setSession(null);
            setUser(null);
            setProfile(null);
            setLoading(false);
            return;
          }
          setSession(refreshed);
          setUser(refreshed.user);
          await fetchProfile(refreshed.user.id);
        } else {
          setSession(s);
          setUser(s.user);
          await fetchProfile(s.user.id);
        }
      } catch (err) {
        console.warn('Auth init error:', err.name);
        await supabase.auth.signOut().catch(() => {});
        setSession(null);
        setUser(null);
        setProfile(null);
      }
      setLoading(false);
    }

    init();

    // Listen for future auth changes (sign-in, sign-out, token refresh)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, newSession) => {
        if (event === 'INITIAL_SESSION') return; // already handled above
        setSession(newSession);
        setUser(newSession?.user ?? null);
        if (newSession?.user) {
          await fetchProfile(newSession.user.id).catch(() => null);
        } else {
          setProfile(null);
        }
      }
    );

    // Periodically verify session is still valid (every 5 minutes)
    const interval = setInterval(async () => {
      const { data: { session: s }, error } = await supabase.auth.getSession();
      if (error || !s) {
        // Clear stale tokens from localStorage
        await supabase.auth.signOut().catch(() => {});
        setSession(null);
        setUser(null);
        setProfile(null);
      }
    }, 5 * 60 * 1000);

    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [fetchProfile]);

  const signInWithProvider = async (provider) => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: `${window.location.origin}/auth/callback`,
      },
    });
    if (error) throw error;
  };

  const signOut = async () => {
    const { error } = await supabase.auth.signOut();
    if (error) throw error;
    setProfile(null);
  };

  const value = {
    user,
    profile,
    session,
    loading,
    signInWithProvider,
    signOut,
    fetchProfile,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
