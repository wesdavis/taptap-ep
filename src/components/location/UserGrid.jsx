import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Zap, Loader2, User, Radio, EyeOff } from 'lucide-react'; 
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";

export default function UserGrid({ locationId }) {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    // Data State
    const [users, setUsers] = useState([]);
    
    // 🟢 FIX 1: Default to NULL (Don't assume 'Everyone')
    const [myProfile, setMyProfile] = useState({ gender: null, interested_in: null });
    
    const [amIHere, setAmIHere] = useState(false); 
    const [loading, setLoading] = useState(true);
    const [activeTapId, setActiveTapId] = useState(null); 
    const [selectedTarget, setSelectedTarget] = useState(null); 
    const [isModalOpen, setIsModalOpen] = useState(false);

    const debounceTimer = useRef(null);

    useEffect(() => {
        if (locationId && user) {
            fetchMyProfile();
            fetchUsersAndStatus();
        }

        const channel = supabase
            .channel(`grid-updates-optimized`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'checkins' }, () => {
                refreshGrid();
            })
            .on('postgres_changes', { event: '*', schema: 'public', table: 'pings', filter: `from_user_id=eq.${user.id}` }, () => {
                refreshGrid();
            })
            .subscribe();

        return () => {
            if (debounceTimer.current) clearTimeout(debounceTimer.current);
            supabase.removeChannel(channel);
        };
    }, [locationId, user]);

    const refreshGrid = () => {
        if (debounceTimer.current) clearTimeout(debounceTimer.current);
        debounceTimer.current = setTimeout(() => fetchUsersAndStatus(), 500);
    };

    async function fetchMyProfile() {
        const { data } = await supabase
            .from('profiles')
            .select('gender, interested_in')
            .eq('id', user.id)
            .single();
        
        // 🟢 DEBUG: Log what the DB actually sends back
        console.log("MY PROFILE LOADED:", data);
        if (data) setMyProfile(data);
    }

    async function fetchUsersAndStatus() {
        try {
            const { data: activeUsers, error } = await supabase
                .from('checkins')
                .select(`user_id, profiles:user_id ( id, display_name, full_name, avatar_url, gender )`)
                .eq('location_id', locationId)
                .eq('is_active', true);
            
            if (error) throw error;
            
            const validUsers = activeUsers ? activeUsers.filter(u => u.profiles) : [];
            setUsers(validUsers);

            const amICheckedIn = validUsers.some(u => u.user_id === user.id);
            setAmIHere(amICheckedIn);

            if (amICheckedIn) {
                const { data: myPings } = await supabase
                    .from('pings')
                    .select('to_user_id, status')
                    .eq('from_user_id', user.id)
                    .is('met_confirmed', null) 
                    .or('status.eq.pending,status.eq.revealed');

                if (myPings && myPings.length > 0) {
                    const activePing = myPings.find(p => 
                        validUsers.some(u => u.user_id === p.to_user_id)
                    );
                    setActiveTapId(activePing ? activePing.to_user_id : null);
                } else {
                    setActiveTapId(null);
                }
            }

        } catch (e) { console.log("Grid fetch error:", e); } finally { setLoading(false); }
    }

    // 🟢 FIX 2: STRICT MATCHING LOGIC
    const isMatch = (targetGender) => {
        const interest = myProfile.interested_in; // "Male" or "Female"
        
        // Safety: If I haven't set a preference, I see NO ONE.
        if (!interest) return false; 
        
        const theirGender = targetGender || "Unknown";

        // Logic
        if (interest === "Everyone") return true; // (Legacy support, though we removed it from UI)
        if (interest === "Male" && theirGender === "Male") return true;
        if (interest === "Female" && theirGender === "Female") return true;
        
        return false;
    };

    const initiateTap = (e, targetUserId, targetName) => {
        e.stopPropagation();
        setSelectedTarget({ id: targetUserId, name: targetName });
        setIsModalOpen(true);
    };

    const handleConfirmTap = async () => {
        if (!selectedTarget) return;
        setIsModalOpen(false); 
        
        const targetId = selectedTarget.id;
        const targetName = selectedTarget.name;

        try {
            const { data: myCheckin } = await supabase
                .from('checkins')
                .select('location_id')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .maybeSingle();

            if (!myCheckin || String(myCheckin.location_id) !== String(locationId)) {
                toast.error("You must be checked in here to tap!");
                return;
            }

            const { error } = await supabase.from('pings').insert({
                from_user_id: user.id,
                to_user_id: targetId,
                location_id: locationId,
                status: 'pending'
            });

            if (error) throw error;
            toast.success(`Signal sent to ${targetName}!`);
            setActiveTapId(targetId); 

        } catch (error) {
            console.error(error);
            toast.error("Tap failed. Try again.");
        } finally {
            setSelectedTarget(null);
        }
    };

    if (loading) return <div className="p-8 text-center"><Loader2 className="w-6 h-6 animate-spin mx-auto text-amber-500"/></div>;

    if (!amIHere) {
        return (
            <div className="relative overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 p-6 text-center">
                <div className="absolute inset-0 grid grid-cols-4 gap-4 p-4 opacity-20 blur-sm pointer-events-none">
                     {[1,2,3,4,5,6,7,8].map(i => (
                         <div key={i} className="flex flex-col items-center"><div className="w-14 h-14 rounded-full bg-slate-700"></div></div>
                     ))}
                </div>
                <div className="relative z-10 flex flex-col items-center justify-center py-4">
                    <div className="bg-slate-900/80 p-4 rounded-full mb-3 border border-slate-700 shadow-xl"><EyeOff className="w-8 h-8 text-slate-400" /></div>
                    <h3 className="text-white font-bold text-lg">Who's Here?</h3>
                    <p className="text-slate-400 text-sm mb-4 max-w-[200px]">You must be checked in to see the crowd.</p>
                </div>
            </div>
        );
    }

    if (users.length === 0) return (
        <div className="p-8 text-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/30">
            <p className="text-slate-500 text-sm">No one else is here yet.</p>
            <p className="text-amber-500 text-xs font-bold mt-1">Be the first!</p>
        </div>
    );

    return (
        <div className="space-y-3">
             <div className="flex justify-between items-end">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Who's Here ({users.length})
                </h3>
                {/* 🟢 DEBUG BADGE (Remove before Launch) */}
                <span className="text-[9px] text-slate-600 font-mono">
                   Mode: {myProfile.interested_in || "Loading..."}
                </span>
                
                {activeTapId && (
                    <span className="text-[10px] font-bold text-amber-500 animate-pulse flex items-center gap-1">
                        <Radio className="w-3 h-3" /> SIGNAL ACTIVE
                    </span>
                )}
             </div>

            <div className="grid grid-cols-4 gap-4">
                {users.map((item) => {
                    const isMe = item.user_id === user.id; 
                    const profile = item.profiles; 
                    const displayName = profile?.display_name || profile?.full_name || "Guest";
                    const isTheTarget = activeTapId === item.user_id;
                    const isLocked = activeTapId !== null && !isTheTarget;
                    
                    // 🟢 STRICT CHECK
                    const canITap = isMatch(profile?.gender);

                    return (
                        <div key={item.user_id} className={`flex flex-col items-center group relative ${isLocked ? 'opacity-30 grayscale pointer-events-none' : ''}`}>
                            <div 
                                className="relative mb-2 cursor-pointer transition-transform active:scale-95"
                                onClick={() => !isLocked && navigate(`/user/${item.user_id}`)}
                            >
                                <div className={`relative w-14 h-14 rounded-full bg-slate-800 border-2 p-0.5 overflow-hidden ${isMe ? 'border-amber-500' : (isTheTarget ? 'border-amber-500 shadow-[0_0_15px_rgba(245,158,11,0.5)]' : 'border-slate-700')}`}>
                                    <Avatar className="w-full h-full">
                                        <AvatarImage src={profile?.avatar_url} className="object-cover" />
                                        <AvatarFallback><User className="w-6 h-6 text-slate-400" /></AvatarFallback>
                                    </Avatar>
                                    <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-slate-900 rounded-full ${isTheTarget ? 'bg-amber-500 animate-ping' : 'bg-green-500'}`}></div>
                                </div>
                                
                                {/* Only show button if NOT me AND is a match */}
                                {!isMe && canITap && (
                                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10">
                                        {isTheTarget ? (
                                            <div className="bg-slate-900 text-amber-500 text-[9px] font-black px-2 py-1 rounded-full border border-amber-500/50 flex items-center gap-1 shadow-lg whitespace-nowrap">
                                                <Loader2 className="w-3 h-3 animate-spin" /> WAITING
                                            </div>
                                        ) : isLocked ? null : (
                                            <Button
                                                size="sm"
                                                className="h-6 px-2 rounded-full text-[10px] font-bold shadow-lg bg-green-500 hover:bg-green-600 text-black flex items-center gap-1"
                                                onClick={(e) => initiateTap(e, item.user_id, displayName)}
                                            >
                                                <Zap className="w-3 h-3 fill-black" /> TAP
                                            </Button>
                                        )}
                                    </div>
                                )}
                            </div>
                            <span className={`text-xs truncate w-16 text-center ${isTheTarget ? 'text-amber-400 font-bold' : 'text-slate-300'}`}>
                                {isMe ? "You" : displayName.split(' ')[0]}
                            </span>
                        </div>
                    );
                })}
            </div>

            <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <AlertDialogContent className="bg-slate-900 border border-slate-800 text-white w-[90%] rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Tap {selectedTarget?.name}?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            You can only tap <strong>one person</strong> at a time.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex gap-2">
                        <AlertDialogCancel className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white mt-0">Cancel</AlertDialogCancel>
                        <AlertDialogAction onClick={handleConfirmTap} className="bg-amber-500 text-black font-bold hover:bg-amber-400">Yes, Send Signal</AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}