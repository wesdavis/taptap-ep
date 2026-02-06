import { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [profileMissing, setProfileMissing] = useState(false);

  useEffect(() => {
    let mounted = true;

    // 1. Initial Load (Blocking Check)
    // We want to wait for the profile check here so we don't flash the wrong screen.
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted && session?.user) {
          setUser(session.user);
          await checkProfile(session.user.id);
        }
      } catch (error) {
        console.error("Session check failed:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkSession();

    // 2. Auth Listener (Non-Blocking Updates)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
           setUser(session.user);
           // 🟢 FIX: Run this in background! Do NOT await it.
           // This prevents the "Loading..." hang when switching apps.
           checkProfile(session.user.id); 
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfileMissing(false);
      }
      
      // 🟢 FIX: Ensure loading is turned off immediately
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const checkProfile = async (userId) => {
    try {
      const { data } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle();
      
      // Only update state if it actually changes to prevent re-renders
      if (!data) setProfileMissing(true);
      else setProfileMissing(false);
    } catch (err) {
      console.error("Profile check error:", err);
    }
  };

  const logout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
  };

  return (
    <AuthContext.Provider value={{ user, loading, profileMissing, logout }}>
      {children}
    </AuthContext.Provider>
  );
};