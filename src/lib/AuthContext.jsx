import React, { createContext, useContext, useEffect, useState } from 'react';
import { supabase } from './supabase';

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
    const [user, setUser] = useState(null);
    const [session, setSession] = useState(null);
    const [loading, setLoading] = useState(true); 
    const [profileMissing, setProfileMissing] = useState(false);

    useEffect(() => {
        let mounted = true;

        async function initAuth() {
            try {
                const { data: { session: initialSession } } = await supabase.auth.getSession();
                
                if (mounted) {
                    if (initialSession) {
                        setSession(initialSession);
                        setUser(initialSession.user);
                        await checkProfile(initialSession.user.id);
                    }
                }
            } catch (error) {
                console.error("Auth Init Error:", error);
            } finally {
                if (mounted) setLoading(false);
            }

            const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
                if (!mounted) return;
                setSession(newSession);
                setUser(newSession?.user ?? null);
                if (newSession?.user) await checkProfile(newSession.user.id);
                setLoading(false);
            });

            return () => {
                mounted = false;
                subscription.unsubscribe();
            };
        }
        initAuth();
    }, []);

    async function checkProfile(userId) {
        try {
            const { data } = await supabase.from('profiles').select('id').eq('id', userId).maybeSingle(); 
            setProfileMissing(!data);
        } catch (err) {
            setProfileMissing(false); 
        }
    }

    const signUp = async (email, password, fullName) => {
        const { data, error } = await supabase.auth.signUp({
            email, password, options: { data: { full_name: fullName } }
        });
        if (error) throw error;
        return data;
    };

    const loginWithPassword = async (email, password) => {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        return data;
    };

    // --- FIX: SAFE LOGOUT ---
    const logout = async () => {
        // 1. Attempt Auto-Checkout (Don't let errors stop us)
        try {
            if (user) {
                await supabase.from('checkins').update({ is_active: false }).eq('user_id', user.id);
            }
        } catch (e) { console.error("Checkout failed", e); }

        // 2. NUKE LOCAL STATE FIRST (Prevents UI freezing)
        setUser(null);
        setSession(null);
        localStorage.clear(); 

        // 3. Finally, tell Supabase to sign out (Fire and forget)
        try {
            await supabase.auth.signOut();
        } catch (e) { console.error("SignOut Error", e); }
    };

    return (
        <AuthContext.Provider value={{ user, session, loading, profileMissing, signUp, loginWithPassword, logout }}>
            {children}
        </AuthContext.Provider>
    );
};