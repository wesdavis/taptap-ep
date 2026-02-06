import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Zap, Check, Loader2, X } from 'lucide-react';
import { toast } from 'sonner';

export default function PublicProfile() {
    const params = useParams();
    const userId = params.userId || params.userid;

    const { user } = useAuth();
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState(null);
    const [myGender, setMyGender] = useState(null);
    const [isSubmitting, setIsSubmitting] = useState(false);
    
    // 🟢 NEW: Full Screen Photo State
    const [selectedPhoto, setSelectedPhoto] = useState(null);

    useEffect(() => {
        if (user && userId && userId !== "undefined") {
            loadUniversalData();
        } else if (!userId || userId === "undefined") {
            setLoading(false);
        }
    }, [user, userId]);

    async function loadUniversalData() {
        try {
            // 1. Fetch Target User
            const { data: profileData, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
            
            if (error) throw error;
            setProfile(profileData);

            // 2. Fetch MY Gender
            const { data: myProfile } = await supabase
                .from('profiles')
                .select('gender')
                .eq('id', user.id)
                .single();
            setMyGender(myProfile?.gender);

            // 3. 🟢 ISSUE 2 FIX: Check Status (Scoped to Current Session)
            const { data: myCheckin } = await supabase
                .from('checkins')
                .select('location_id, created_at')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .maybeSingle();

            if (myCheckin) {
                // Only check for pings sent AFTER I checked in
                const { data: ping } = await supabase
                    .from('pings')
                    .select('status')
                    .eq('from_user_id', user.id)
                    .eq('to_user_id', userId)
                    .eq('location_id', myCheckin.location_id) // Match location
                    .gt('created_at', myCheckin.created_at)   // Match time
                    .maybeSingle();

                if (ping) setStatus(ping.status || 'pending');
            }

        } catch (error) {
            console.error("Error loading profile:", error);
        } finally {
            setLoading(false);
        }
    }

    const handleUniversalTap = async () => {
        const { data: myCheckin } = await supabase
            .from('checkins')
            .select('location_id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .maybeSingle();

        const { data: targetCheckin } = await supabase
            .from('checkins')
            .select('location_id')
            .eq('user_id', userId)
            .eq('is_active', true)
            .maybeSingle();

        if (!myCheckin || !targetCheckin || String(myCheckin.location_id) !== String(targetCheckin.location_id)) {
            toast.error("You must be at the same venue to tap!");
            return;
        }

        setIsSubmitting(true);
        try {
            const { error } = await supabase.from('pings').insert({
                from_user_id: user.id,
                to_user_id: userId,
                location_id: myCheckin.location_id,
                status: 'pending'
            });
            if (error) throw error;
            setStatus('pending');
            toast.success(`You tapped ${profile.full_name}!`);
        } catch (error) {
            toast.error("Tap failed.");
        } finally {
            setIsSubmitting(false);
        }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
    );

    if (!profile) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">User not found</div>;

    const isFemale = (myGender || '').toLowerCase() === 'female';
    // 🟢 Use the new photos array, or fallback to avatar
    const photos = (profile.photos && profile.photos.length > 0) ? profile.photos : [profile.avatar_url];

    return (
        <div className="min-h-screen bg-slate-950 text-white p-4 pb-32">
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-slate-400">
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <h1 className="text-lg font-bold">Profile</h1>
            </div>

            <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
                
                {/* 🟢 NEW: PHOTO GALLERY (Click to Expand) */}
                <div className="w-full max-w-sm mb-6 grid grid-cols-2 gap-2">
                    {/* Main Photo (Big) */}
                    <div 
                        className="col-span-2 aspect-square rounded-2xl overflow-hidden border-2 border-slate-800 shadow-2xl cursor-pointer"
                        onClick={() => setSelectedPhoto(photos[0])}
                    >
                        <img src={photos[0]} className="w-full h-full object-cover hover:scale-105 transition-transform duration-500" />
                    </div>
                    {/* Smaller Photos */}
                    {photos.slice(1, 3).map((photo, i) => (
                         <div 
                            key={i} 
                            className="aspect-square rounded-xl overflow-hidden border border-slate-800 cursor-pointer"
                            onClick={() => setSelectedPhoto(photo)}
                        >
                            <img src={photo} className="w-full h-full object-cover hover:opacity-80 transition" />
                        </div>
                    ))}
                </div>

                <h2 className="text-3xl font-bold mb-2 text-center">{profile.full_name}</h2>
                
                <div className="flex items-center gap-2 text-slate-400 mb-6">
                    <MapPin className="w-4 h-4" /> 
                    <span>El Paso, TX</span>
                </div>

                <div className="w-full max-w-xs bg-white/5 rounded-2xl p-6 border border-white/10 mb-8 text-center">
                    <p className="text-slate-300 italic">"{profile.bio || 'Just checking in.'}"</p>
                </div>

                <div className="flex gap-3">
                    <Badge variant="secondary" className="bg-slate-800 text-slate-300 px-3 py-1">
                        {profile.gender || 'User'}
                    </Badge>
                </div>

                {isFemale && status === null && (
                    <div className="fixed bottom-24 left-0 right-0 px-6 z-50">
                        <Button 
                            disabled={isSubmitting}
                            className="w-full h-14 text-lg font-bold bg-amber-500 hover:bg-amber-600 text-black shadow-lg shadow-amber-900/20 rounded-2xl animate-in slide-in-from-bottom-4 disabled:opacity-50"
                            onClick={handleUniversalTap}
                        >
                            {isSubmitting ? <Loader2 className="w-5 h-5 animate-spin mr-2" /> : <><Zap className="w-5 h-5 mr-2 fill-black" /> TAP TO CONNECT</>}
                        </Button>
                    </div>
                )}

                {isFemale && status === 'pending' && (
                    <div className="fixed bottom-24 left-0 right-0 px-6 z-50">
                        <Button disabled className="w-full h-14 text-lg font-bold bg-slate-800 text-slate-400 border border-slate-700 rounded-2xl">
                            <Check className="w-5 h-5 mr-2" /> TAP SENT
                        </Button>
                    </div>
                )}
            </div>

            {/* 🟢 FULL SCREEN LIGHTBOX */}
            {selectedPhoto && (
                <div 
                    className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 animate-in fade-in duration-200"
                    onClick={() => setSelectedPhoto(null)}
                >
                    <button className="absolute top-6 right-6 text-white/50 hover:text-white p-2">
                        <X className="w-8 h-8" />
                    </button>
                    <img 
                        src={selectedPhoto} 
                        className="max-w-full max-h-[85vh] rounded-xl shadow-2xl object-contain" 
                        onClick={(e) => e.stopPropagation()} 
                    />
                </div>
            )}
        </div>
    );
}