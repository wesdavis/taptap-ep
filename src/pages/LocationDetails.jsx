import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Zap, Check, Loader2, User } from 'lucide-react'; 
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function UserGrid({ locationId }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [users, setUsers] = useState([]);
    const [sentPings, setSentPings] = useState(new Set()); 
    const [myGender, setMyGender] = useState(null);
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
                    debounceTimer.current = setTimeout(() => fetchUsers(), 500);
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
            // FIX: Ensure we select the right fields from joined profiles
            const { data, error } = await supabase
                .from('checkins')
                .select(`
                    user_id,
                    profiles:user_id ( id, display_name, full_name, avatar_url, gender )
                `)
                .eq('location_id', locationId)
                .eq('is_active', true);
            
            if (error) throw error;
            if (data) {
                // Filter out myself so I don't see my own button
                setUsers(data
                    .filter(u => u.user_id !== user.id) 
                    .filter(u => u.profiles) // Ensure profile data exists
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
        
        // Safety check: Am I actually checked in?
        const { data: myCheckin } = await supabase
            .from('checkins')
            .select('location_id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .maybeSingle();

        // Note: String conversion ensures matching types (text vs bigint) doesn't break logic
        if (!myCheckin || String(myCheckin.location_id) !== String(locationId)) {
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
        <div className="p-8 text-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/30">
            <p className="text-slate-500 text-sm">No one else is here yet.</p>
            <p className="text-amber-500 text-xs font-bold mt-1">Be the first!</p>
        </div>
    );

    // CHANGE THIS if you want men to be able to ping too. 
    // Currently set to only allow females (or if gender is missing/null for testing)
    const canPing = (myGender || '').toLowerCase() === 'female' || !myGender;

    return (
        <div className="space-y-3">
             <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                Who's Here ({users.length})
            </h3>
            <div className="grid grid-cols-4 gap-4">
                {users.map((item) => {
                    const isPinged = sentPings.has(item.user_id);
                    const isTappingThisUser = tappingUserId === item.user_id;
                    const profile = item.profiles; 
                    const displayName = profile?.display_name || profile?.full_name || "Guest";

                    return (
                        <div key={item.user_id} className="flex flex-col items-center group relative">
                            <div 
                                className="relative mb-2 cursor-pointer transition-transform active:scale-95"
                                onClick={() => navigate(`/user/${item.user_id}`)}
                            >
                                <div className="relative w-14 h-14 rounded-full bg-slate-800 border-2 border-amber-500/50 p-0.5 overflow-hidden">
                                    <Avatar className="w-full h-full">
                                        <AvatarImage src={profile?.avatar_url} className="object-cover" />
                                        <AvatarFallback><User className="w-6 h-6 text-slate-400" /></AvatarFallback>
                                    </Avatar>
                                    {/* Online Dot */}
                                    <div className="absolute bottom-0 right-0 w-3.5 h-3.5 bg-green-500 border-2 border-slate-900 rounded-full"></div>
                                </div>
                                
                                {/* TAP BUTTON */}
                                {canPing && (
                                    <Button
                                        size="sm"
                                        disabled={isPinged || isTappingThisUser}
                                        className={`absolute -bottom-3 left-1/2 -translate-x-1/2 h-6 px-2 rounded-full text-[10px] font-bold shadow-lg z-10 flex items-center gap-1 ${
                                            isPinged 
                                            ? "bg-slate-700 text-slate-400" 
                                            : "bg-green-500 hover:bg-green-600 text-black"
                                        }`}
                                        onClick={(e) => handleTap(e, item.user_id, displayName)}
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

                            <span className="text-xs text-slate-300 truncate w-16 text-center">
                                {displayName.split(' ')[0]}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}