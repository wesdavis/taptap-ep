import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, MapPin, Zap, Check, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function PublicProfile() {
    const { userId } = useParams();
    const { user } = useAuth();
    const navigate = useNavigate();

    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [status, setStatus] = useState(null);
    const [myGender, setMyGender] = useState(null);
    
    // SMART STATE: We track the user's live location here
    const [myLiveLocation, setMyLiveLocation] = useState(null); 
    const [isSubmitting, setIsSubmitting] = useState(false);

    useEffect(() => {
        if (user && userId) {
            loadUniversalData();
        }
    }, [user, userId]);

    async function loadUniversalData() {
        try {
            // 1. Fetch Target User (Wes)
            const { data: profileData, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', userId)
                .single();
            
            if (error) throw error;
            setProfile(profileData);

            // 2. Fetch MY Real Gender (Sarah)
            // (We never trust the session metadata, we always ask the DB)
            const { data: myProfile } = await supabase
                .from('profiles')
                .select('gender')
                .eq('id', user.id)
                .single();
            setMyGender(myProfile?.gender);

            // 3. UNIVERSAL LOCATION CHECK
            // Find out where *I* am right now, regardless of what page I'm on.
            const { data: myCheckin } = await supabase
                .from('checkins')
                .select('location_id')
                .eq('user_id', user.id)
                .eq('is_active', true)
                .maybeSingle();

            if (myCheckin) {
                setMyLiveLocation(myCheckin.location_id);
            }

            // 4. Check if I already tapped them
            const { data: ping } = await supabase
                .from('pings')
                .select('status')
                .eq('from_user_id', user.id)
                .eq('to_user_id', userId)
                .maybeSingle();

            if (ping) setStatus(ping.status || 'pending');

        } catch (error) {
            console.error("Error loading profile:", error);
        } finally {
            setLoading(false);
        }
    }

    const handleUniversalTap = async () => {
        // SAFETY: Prevent tapping if not checked in
        if (!myLiveLocation) {
            toast.error("You must be checked in to a location to tap!");
            return;
        }

        setIsSubmitting(true);

        try {
            const { error } = await supabase.from('pings').insert({
                from_user_id: user.id,
                to_user_id: userId,
                location_id: myLiveLocation, // <--- Uses the live check-in ID
                status: 'pending'
            });

            if (error) throw error;
            
            setStatus('pending');
            toast.success(`You tapped ${profile.full_name}!`);
        } catch (error) {
            console.error(error);
            toast.error("Could not send tap. Try refreshing.");
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

    return (
        <div className="min-h-screen bg-slate-950 text-white p-4 pb-32">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-slate-400">
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <h1 className="text-lg font-bold">Profile</h1>
            </div>

            {/* Profile Card */}
            <div className="flex flex-col items-center animate-in fade-in zoom-in-95 duration-300">
                <Avatar className="w-32 h-32 border-4 border-amber-500/20 mb-4 shadow-2xl">
                    <AvatarImage src={profile.avatar_url} />
                    <AvatarFallback className="text-4xl bg-slate-800">{profile.full_name?.[0]}</AvatarFallback>
                </Avatar>

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
                    <Badge variant="outline" className="border-amber-500/50 text-amber-400 bg-amber-500/10">
                        People Met: {profile.people_met_count || 0}
                    </Badge>
                </div>

                {/* --- SMART TAP BUTTON (Bottom 24 = Above Nav) --- */}
                {isFemale && status === null && (
                    <div className="fixed bottom-24 left-0 right-0 px-6 z-50">
                        <Button 
                            disabled={isSubmitting}
                            className="w-full h-14 text-lg font-bold bg-amber-500 hover:bg-amber-600 text-black shadow-lg shadow-amber-900/20 rounded-2xl animate-in slide-in-from-bottom-4 disabled:opacity-50"
                            onClick={handleUniversalTap}
                        >
                            {isSubmitting ? (
                                <Loader2 className="w-5 h-5 animate-spin mr-2" /> 
                            ) : (
                                <>
                                    <Zap className="w-5 h-5 mr-2 fill-black" /> TAP TO CONNECT
                                </>
                            )}
                        </Button>
                    </div>
                )}

                {/* --- ALREADY SENT STATE --- */}
                {isFemale && status === 'pending' && (
                    <div className="fixed bottom-24 left-0 right-0 px-6 z-50">
                        <Button disabled className="w-full h-14 text-lg font-bold bg-slate-800 text-slate-400 border border-slate-700 rounded-2xl">
                            <Check className="w-5 h-5 mr-2" /> TAP SENT
                        </Button>
                    </div>
                )}
            </div>
        </div>
    );
}