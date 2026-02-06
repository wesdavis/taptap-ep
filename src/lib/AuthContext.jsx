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

    // 1. Check active session immediately
    const checkSession = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (mounted) {
          if (session?.user) {
            setUser(session.user);
            await checkProfile(session.user.id);
          }
        }
      } catch (error) {
        console.error("Session check failed:", error);
      } finally {
        if (mounted) setLoading(false);
      }
    };

    checkSession();

    // 2. Listen for auth changes (Login, Logout, Tab Switch)
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (!mounted) return;

      // 🟢 FIX: Don't trigger loading on tab focus or token refresh if we already have a user
      if (event === 'SIGNED_IN' || event === 'TOKEN_REFRESHED') {
        if (session?.user) {
           setUser(session.user);
           // Only check profile if we didn't have a user before
           if (!user) await checkProfile(session.user.id); 
        }
      } else if (event === 'SIGNED_OUT') {
        setUser(null);
        setProfileMissing(false);
        setLoading(false);
      }
      
      // Ensure loading is turned off after any event is processed
      setLoading(false);
    });

    return () => {
      mounted = false;
      subscription.unsubscribe();
    };
  }, []);

  const checkProfile = async (userId) => {
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('id')
        .eq('id', userId)
        .maybeSingle(); // Use maybeSingle to avoid 406 errors on 0 rows
      
      if (!data) setProfileMissing(true);
      else setProfileMissing(false);
    } catch (err) {
      console.error("Profile check error:", err);
    }
  };

  const logout = async () => {
    setLoading(true);
    await supabase.auth.signOut();
    // State updates handled by onAuthStateChange('SIGNED_OUT')
  };

  return (
    <AuthContext.Provider value={{ user, loading, profileMissing, logout }}>
      {children}
    </AuthContext.Provider>
  );
};