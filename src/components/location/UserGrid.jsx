import React, { useEffect, useState, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Zap, Check, Loader2, User, Lock, Radio } from 'lucide-react'; 
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
    const [myGender, setMyGender] = useState(null);
    
    // Logic State
    const [activeTapId, setActiveTapId] = useState(null); // ID of the person I am currently "Locked" to
    const [isTapLoading, setIsTapLoading] = useState(false);
    
    // Modal State
    const [selectedTarget, setSelectedTarget] = useState(null); // { id, name } for modal
    const [isModalOpen, setIsModalOpen] = useState(false);

    const debounceTimer = useRef(null);

    useEffect(() => {
        if (locationId && user) {
            fetchMyGender();
            fetchUsersAndStatus();
        }

        // Realtime Listener for Checkins (People arriving/leaving)
        const channel = supabase
            .channel(`grid-updates-optimized`)
            .on('postgres_changes', { event: '*', schema: 'public', table: 'checkins' }, () => {
                refreshGrid();
            })
            // Realtime Listener for Pings (If they reject/accept, unlock me)
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

    async function fetchMyGender() {
        const { data } = await supabase.from('profiles').select('gender').eq('id', user.id).single();
        if (data) setMyGender(data.gender);
    }

    // 🟢 CORE LOGIC: Fetch Users AND Determine Lock State
    async function fetchUsersAndStatus() {
        try {
            // 1. Get Active Users at Location
            const { data: activeUsers, error } = await supabase
                .from('checkins')
                .select(`user_id, profiles:user_id ( id, display_name, full_name, avatar_url, gender )`)
                .eq('location_id', locationId)
                .eq('is_active', true);
            
            if (error) throw error;
            
            const validUsers = activeUsers ? activeUsers.filter(u => u.profiles) : [];
            setUsers(validUsers);

            // 2. Check if I am "Locked" to anyone here
            if (user) {
                const { data: myPings } = await supabase
                    .from('pings')
                    .select('to_user_id, status, met_confirmed')
                    .eq('from_user_id', user.id)
                    .is('met_confirmed', null) // Only fetch unresolved pings
                    .or('status.eq.pending,status.eq.revealed'); // Only active states

                if (myPings && myPings.length > 0) {
                    // Check if the person I pinged is STILL at this location
                    // If they left (checked out), the lock lifts automatically
                    const activePing = myPings.find(p => 
                        validUsers.some(u => u.user_id === p.to_user_id)
                    );

                    if (activePing) {
                        setActiveTapId(activePing.to_user_id);
                    } else {
                        setActiveTapId(null); // They left, so I am free
                    }
                } else {
                    setActiveTapId(null);
                }
            }

        } catch (e) { console.log("Grid fetch error:", e); }
    }

    // 🟢 STEP 1: Open Confirmation Modal
    const initiateTap = (e, targetUserId, targetName) => {
        e.stopPropagation();
        setSelectedTarget({ id: targetUserId, name: targetName });
        setIsModalOpen(true);
    };

    // 🟢 STEP 2: Execute Tap (After Confirmation)
    const handleConfirmTap = async () => {
        if (!selectedTarget) return;
        
        setIsTapLoading(true);
        setIsModalOpen(false); // Close modal immediately
        
        const targetId = selectedTarget.id;
        const targetName = selectedTarget.name;

        try {
            // Double check location (Security)
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
            setActiveTapId(targetId); // 🔒 LOCK THE GRID

        } catch (error) {
            console.error(error);
            toast.error("Tap failed. Try again.");
        } finally {
            setIsTapLoading(false);
            setSelectedTarget(null);
        }
    };

    if (users.length === 0) return (
        <div className="p-8 text-center border-2 border-dashed border-slate-800 rounded-xl bg-slate-900/30">
            <p className="text-slate-500 text-sm">No one else is here yet.</p>
            <p className="text-amber-500 text-xs font-bold mt-1">Be the first!</p>
        </div>
    );

    // Only females (or unspecified) can initiate pings in this model
    const canPing = (myGender || '').toLowerCase() === 'female' || !myGender;

    return (
        <div className="space-y-3">
             <div className="flex justify-between items-end">
                <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider">
                    Who's Here ({users.length})
                </h3>
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
                    
                    // Logic for this specific card
                    const isTheTarget = activeTapId === item.user_id;
                    const isLocked = activeTapId !== null && !isTheTarget; // Locked if I tapped someone else

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
                                    
                                    {/* Status Dot */}
                                    <div className={`absolute bottom-0 right-0 w-3.5 h-3.5 border-2 border-slate-900 rounded-full ${isTheTarget ? 'bg-amber-500 animate-ping' : 'bg-green-500'}`}></div>
                                </div>
                                
                                {/* TAP BUTTON LOGIC */}
                                {canPing && !isMe && (
                                    <div className="absolute -bottom-3 left-1/2 -translate-x-1/2 z-10">
                                        {isTheTarget ? (
                                            // 🟢 ACTIVE STATE: Waiting for him
                                            <div className="bg-slate-900 text-amber-500 text-[9px] font-black px-2 py-1 rounded-full border border-amber-500/50 flex items-center gap-1 shadow-lg whitespace-nowrap">
                                                <Loader2 className="w-3 h-3 animate-spin" /> WAITING
                                            </div>
                                        ) : isLocked ? (
                                            // 🔴 LOCKED STATE: Someone else is active
                                            null 
                                        ) : (
                                            // ⚪️ DEFAULT STATE: Ready to Tap
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

            {/* CONFIRMATION MODAL */}
            <AlertDialog open={isModalOpen} onOpenChange={setIsModalOpen}>
                <AlertDialogContent className="bg-slate-900 border border-slate-800 text-white w-[90%] rounded-2xl">
                    <AlertDialogHeader>
                        <AlertDialogTitle>Tap {selectedTarget?.name}?</AlertDialogTitle>
                        <AlertDialogDescription className="text-slate-400">
                            You can only tap <strong>one person</strong> at a time. 
                            <br/><br/>
                            This locks your radar until they accept or leave the venue. High stakes!
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter className="flex gap-2">
                        <AlertDialogCancel className="bg-transparent border-slate-700 text-slate-300 hover:bg-slate-800 hover:text-white mt-0">
                            Cancel
                        </AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={handleConfirmTap}
                            className="bg-amber-500 text-black font-bold hover:bg-amber-400"
                        >
                            Yes, Send Signal
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}