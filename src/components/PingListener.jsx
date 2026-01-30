import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Zap, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function PingListener() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [notification, setNotification] = useState(null);
    const [open, setOpen] = useState(false);

    useEffect(() => {
        if (!user) return;

        const channel = supabase
            .channel('global_pings')
            .on(
                'postgres_changes',
                { event: 'INSERT', schema: 'public', table: 'pings' },
                async (payload) => {
                    const newPing = payload.new;
                    
                    if (newPing.to_user_id !== user.id) return;

                    const { data: sender } = await supabase
                        .from('profiles')
                        .select('full_name, avatar_url')
                        .eq('id', newPing.from_user_id)
                        .single();

                    if (sender) {
                        setNotification(sender);
                        setOpen(true);
                        try {
                            new Audio('https://assets.mixkit.co/active_storage/sfx/2869/2869-preview.mp3').play().catch(()=>{});
                        } catch (e) {}
                    }
                }
            )
            .subscribe();

        return () => supabase.removeChannel(channel);
    }, [user]);

    const handleGoSayHi = () => {
        setOpen(false);
        // FIX: Navigate to Home ('/') because that is where the Dashboard is now.
        // The '/profile' route no longer exists.
        navigate('/'); 
    };

    if (!open || !notification) return null;

    return (
        <div className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/80 backdrop-blur-md p-4 pointer-events-auto">
            <div className="bg-slate-900 border-2 border-amber-500 rounded-3xl p-6 w-full max-w-sm text-center shadow-2xl relative animate-in fade-in zoom-in duration-200">
                
                <button 
                    onClick={() => setOpen(false)}
                    className="absolute top-4 right-4 text-slate-500 hover:text-white p-2"
                >
                    <X className="w-6 h-6" />
                </button>

                <div className="flex justify-center mb-6 relative">
                    <div className="absolute inset-0 bg-amber-500/30 blur-xl rounded-full animate-pulse"></div>
                    <Avatar className="w-24 h-24 border-4 border-amber-500 shadow-xl relative z-10">
                        <AvatarImage src={notification.avatar_url} />
                        <AvatarFallback className="bg-amber-500 text-black text-3xl font-bold">
                            {notification.full_name?.[0]}
                        </AvatarFallback>
                    </Avatar>
                    <div className="absolute -bottom-2 -right-2 bg-black rounded-full p-2 border-2 border-amber-500 z-20">
                        <Zap className="w-5 h-5 text-amber-500 fill-amber-500" />
                    </div>
                </div>

                <h2 className="text-2xl font-bold text-white mb-2">You've been Tapped!</h2>
                <p className="text-slate-300 mb-8 text-lg">
                    <span className="text-amber-400 font-bold">{notification.full_name}</span> wants to connect.
                </p>

                <Button 
                    onClick={handleGoSayHi}
                    className="w-full h-14 text-lg bg-amber-500 hover:bg-amber-600 text-black font-extrabold rounded-2xl shadow-lg shadow-amber-900/20"
                >
                    GO SAY HI 👋
                </Button>
            </div>
        </div>
    );
}