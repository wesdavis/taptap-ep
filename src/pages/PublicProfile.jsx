import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Zap, Check, Loader2, X, ChevronLeft, ChevronRight } from 'lucide-react';
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
    
    // Location State
    const [isSameLocation, setIsSameLocation] = useState(false);
    
    // 🟢 NEW: Gallery State
    const [photos, setPhotos] = useState([]);
    const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
    const [selectedPhoto, setSelectedPhoto] = useState(null); // For Full Screen

    const isMe = user?.id === userId;

    useEffect(() => {
        if (user && userId && userId !== "undefined") {
            loadUniversalData();
        } else if (!userId || userId === "undefined") {
            setLoading(false);
        }
    }, [user, userId]);

    async function loadUniversalData() {
        try {
            // 1. Fetch Target User Profile
            const { data: profileData, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
            
            if (error) throw error;
            setProfile(profileData);

            // 🟢 NEW: Setup Photos Array (Avatar + Extra Photos)
            const p = (profileData.photos && profileData.photos.length > 0) 
                ? profileData.photos 
                : [profileData.avatar_url];
            setPhotos(p);

            // 2. Fetch MY Gender
            const { data: myProfile } = await supabase
                .from('profiles')
                .select('gender')
                .eq('id', user.id)
                .single();
            setMyGender(myProfile?.gender);

            // 3. LOCATION CHECK
            // Fetch MY active checkin
            const { data: myCheckin } = await supabase
                .from('checkins')
                .select('location_id')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .maybeSingle();

            // Fetch TARGET'S active checkin
            const { data: targetCheckin } = await supabase
                .from('checkins')
                .select('location_id')
                .eq('user_id', userId)
                .eq('is_active', true)
                .maybeSingle();

            // Are we at the same place?
            const match = myCheckin && targetCheckin && (myCheckin.location_id === targetCheckin.location_id);
            setIsSameLocation(match);

            // 4. Check Status
            if (myCheckin) {
                const { data: ping } = await supabase
                    .from('pings')
                    .select('status')
                    .eq('from_user_id', user.id)
                    .eq('to_user_id', userId)
                    .eq('location_id', myCheckin.location_id)
                    .gt('created_at', new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString()) 
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
        if (!isSameLocation) {
            toast.error("You must be at the same venue to tap!");
            return;
        }

        setIsSubmitting(true);
        try {
            const { data: myCheckin } = await supabase
                .from('checkins')
                .select('location_id')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .single();

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

    // 🟢 NEW: Gallery Navigation Logic
    const nextPhoto = (e) => {
        e.stopPropagation();
        setCurrentPhotoIndex((prev) => (prev + 1) % photos.length);
    };

    const prevPhoto = (e) => {
        e.stopPropagation();
        setCurrentPhotoIndex((prev) => (prev - 1 + photos.length) % photos.length);
    };

    const openFullScreen = () => {
        setSelectedPhoto(photos[currentPhotoIndex]);
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
    );

    if (!profile) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">User not found</div>;

    const isFemale = (myGender || '').toLowerCase() === 'female';

    return (
        <div className="min-h-screen bg-slate-950 text-white p-4 pb-32">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-slate-400">
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <h1 className="text-lg font-bold">Profile</h1>
            </div>

            <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
                
                {/* 🟢 NEW: SWIPEABLE MAIN GALLERY */}
                <div 
                    className="w-full max-w-sm mb-6 relative aspect-square rounded-2xl overflow-hidden border-2 border-slate-800 shadow-2xl group cursor-pointer"
                    onClick={openFullScreen}
                >
                    <img 
                        src={photos[currentPhotoIndex]} 
                        className="w-full h-full object-cover transition-all duration-500" 
                        alt="Profile"
                    />
                    
                    {/* Progress Bars (Like Instagram Stories) */}
                    <div className="absolute top-2 left-2 right-2 flex gap-1 z-20">
                        {photos.map((_, i) => (
                            <div 
                                key={i} 
                                className={`h-1 flex-1 rounded-full transition-colors duration-300 ${i === currentPhotoIndex ? 'bg-white' : 'bg-white/30'}`} 
                            />
                        ))}
                    </div>

                    {/* Navigation Areas (Invisible Tap Zones) */}
                    <div className="absolute inset-0 flex z-10">
                        <div className="w-1/3 h-full" onClick={prevPhoto} />
                        <div className="w-1/3 h-full" onClick={openFullScreen} /> {/* Center tap opens full screen */}
                        <div className="w-1/3 h-full" onClick={nextPhoto} />
                    </div>

                    {/* Arrows (Visible on hover or touch) */}
                    {photos.length > 1 && (
                        <>
                            <button onClick={prevPhoto} className="absolute left-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition pointer-events-none z-20">
                                <ChevronLeft className="w-5 h-5" />
                            </button>
                            <button onClick={nextPhoto} className="absolute right-2 top-1/2 -translate-y-1/2 p-2 bg-black/40 backdrop-blur-md rounded-full text-white opacity-0 group-hover:opacity-100 transition pointer-events-none z-20">
                                <ChevronRight className="w-5 h-5" />
                            </button>
                        </>
                    )}
                </div>

                <h2 className="text-3xl font-bold mb-2 text-center">{profile.display_name || profile.full_name}</h2>
                <p className="text-amber-500 font-bold mb-4">@{profile.handle}</p>
                
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

                {/* Shared History Component */}
                <SharedHistory targetUserId={userId} />

                {/* THE SMART BUTTON LOGIC */}
                {isFemale && !isMe && isSameLocation && status === null && (
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

                {isFemale && !isMe && status === 'pending' && (
                    <div className="fixed bottom-24 left-0 right-0 px-6 z-50">
                        <Button disabled className="w-full h-14 text-lg font-bold bg-slate-800 text-slate-400 border border-slate-700 rounded-2xl">
                            <Check className="w-5 h-5 mr-2" /> TAP SENT
                        </Button>
                    </div>
                )}
            </div>

            {/* FULL SCREEN LIGHTBOX */}
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

function SharedHistory({ targetUserId }) {
    const { user } = useAuth();
    const [events, setEvents] = useState([]);

    useEffect(() => {
        async function load() {
            if (user?.id === targetUserId) return; 
            
            const { data } = await supabase.from('pings')
                .select('created_at, locations(name)')
                .or(`and(from_user_id.eq.${user.id},to_user_id.eq.${targetUserId}),and(from_user_id.eq.${targetUserId},to_user_id.eq.${user.id})`)
                .eq('status', 'accepted')
                .order('created_at', { ascending: false });
            
            setEvents(data || []);
        }
        if (user && targetUserId) load();
    }, [user, targetUserId]);

    if (events.length === 0) return null;

    return (
        <div className="w-full max-w-xs mt-6 bg-slate-900/50 rounded-xl p-4 border border-slate-800">
            <h3 className="text-[10px] font-bold text-slate-500 uppercase tracking-widest mb-3 text-center">Connection History</h3>
            <div className="space-y-2">
                {events.map((e, i) => (
                    <div key={i} className="flex items-center justify-between text-xs text-slate-300">
                        <span className="flex items-center gap-2"><MapPin className="w-3 h-3 text-amber-500" /> {e.locations?.name || "Unknown"}</span>
                        <span className="text-slate-500">{new Date(e.created_at).toLocaleDateString()}</span>
                    </div>
                ))}
            </div>
        </div>
    );
}