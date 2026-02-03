import React, { useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';

// This component now ONLY listens for sounds/toasts
// It does NOT render the full UI anymore (Home.jsx does that)
const PingListener = () => {
    const { user } = useAuth();

    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('global_pings')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'pings', filter: `to_user_id=eq.${user.id}` },
                (payload) => {
                    // Just play a sound or show a small toast
                    // new Audio('/ping-sound.mp3').play().catch(() => {}); 
                    toast("Someone is interested! Check your Home Screen.");
                }
            )
            .subscribe();

        return () => {
            supabase.removeChannel(channel);
        };
    }, [user]);

    return null; // Don't render anything visual!
};

export default PingListener;