import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Zap, Check, Loader2 } from 'lucide-react'; 
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function UserGrid({ locationId }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [sentPings, setSentPings] = useState(new Set()); 
    const [myGender, setMyGender] = useState(null);
    
    // Track which user is currently being tapped (to show spinner on specific button)
    const [tappingUserId, setTappingUserId] = useState(null);

    const debounceTimer = useRef(null);

    useEffect(() => {
        if (locationId && user) {
            fetchMyGender();
            fetchUsers();
            fetchMySentPings();
        }

        const channel = supabase
            .channel(`grid-updates-optimized`)
            .on(
                'postgres_changes',
                { event: '*', schema: 'public', table: 'checkins' },
                () => {
                    if (debounceTimer.current) clearTimeout(debounceTimer.current);
                    debounceTimer.current = setTimeout(() => {
                        fetchUsers();
                    }, 500);
                }
            )
            .subscribe();

        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            supabase.removeChannel(channel);
        };
    }, [locationId, user]);

    async function fetchMyGender() {
        const { data } = await supabase.from('profiles').select('gender').eq('id', user.id).single();
        if (data) setMyGender(data.gender);
    }

    async function fetchUsers() {
        try {
            const { data, error } = await supabase
                .from('checkins')
                .select(`
                    user_id,
                    profiles:user_id ( id, full_name, avatar_url, gender )
                `)
                .eq('location_id', locationId)
                .eq('is_active', true);
            
            if (error) throw error;
            if (data) {
                setUsers(data
                    .filter(u => u.user_id !== user.id)
                    .filter(u => u.profiles) 
                );
            }
        } catch (e) { console.log("Grid fetch error:", e); }
    }

    async function fetchMySentPings() {
        if (!user) return;
        const { data } = await supabase
            .from('pings')
            .select('to_user_id')
            .eq('from_user_id', user.id)
            .eq('location_id', locationId);
            
        if (data) {
            const pingedIds = new Set(data.map(p => p.to_user_id));
            setSentPings(pingedIds);
        }
    }

    const handleTap = async (e, targetUserId, targetName) => {
        e.stopPropagation(); 
        
        // 1. Verify Check-in
        const { data: myCheckin } = await supabase
            .from('checkins')
            .select('location_id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .maybeSingle();

        if (!myCheckin || myCheckin.location_id !== locationId) {
            toast.error("You must be checked in here to tap!");
            return;
        }

        setTappingUserId(targetUserId);

        try {
            const { error } = await supabase.from('pings').insert({
                from_user_id: user.id,
                to_user_id: targetUserId,
                location_id: locationId,
                status: 'pending'
            });

            if (error) throw error;
            
            toast.success(`You tapped ${targetName}!`);
            setSentPings(prev => new Set(prev).add(targetUserId));
        } catch (error) {
            console.error(error);
            toast.error("Tap failed. Try again.");
        } finally {
            setTappingUserId(null);
        }
    };

    if (users.length === 0) return (
        <div className="p-4 text-center text-slate-500 text-sm">Just you here.</div>
    );

    const canPing = (myGender || '').toLowerCase() === 'female';

    return (
        <div className="grid grid-cols-4 gap-4 p-4">
            {users.map((item) => {
                const isPinged = sentPings.has(item.user_id);
                const isTappingThisUser = tappingUserId === item.user_id;
                const profile = item.profiles; 

                return (
                    <div key={item.user_id} className="flex flex-col items-center group relative">
                        <div 
                            className="relative mb-1 cursor-pointer transition-transform active:scale-95"
                            onClick={() => navigate(`/user/${item.user_id}`)}
                        >
                            <Avatar className="w-12 h-12 border-2 border-amber-500/50">
                                <AvatarImage src={profile?.avatar_url} />
                                <AvatarFallback>{profile?.full_name?.[0]}</AvatarFallback>
                            </Avatar>
                            
                            {canPing && (
                                <Button
                                    size="sm"
                                    disabled={isPinged || isTappingThisUser}
                                    className={`absolute -bottom-3 left-1/2 -translate-x-1/2 h-6 px-2 rounded-full text-[10px] font-bold shadow-lg z-10 flex items-center gap-1 ${
                                        isPinged 
                                        ? "bg-slate-700 text-slate-400" 
                                        : "bg-green-500 hover:bg-green-600 text-black"
                                    }`}
                                    onClick={(e) => handleTap(e, item.user_id, profile?.full_name)}
                                >
                                    {isTappingThisUser ? (
                                        <Loader2 className="w-3 h-3 animate-spin" />
                                    ) : isPinged ? (
                                        <> <Check className="w-3 h-3" /> SENT </>
                                    ) : (
                                        <> <Zap className="w-3 h-3 fill-black" /> TAP </>
                                    )}
                                </Button>
                            )}
                        </div>

                        <span className="text-xs text-slate-300 truncate w-16 text-center mt-2">
                            {profile?.full_name?.split(' ')[0]}
                        </span>
                    </div>
                );
            })}
        </div>
    );
}