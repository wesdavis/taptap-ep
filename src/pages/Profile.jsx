import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, LogOut, Edit } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PingNotifications from '@/components/notifications/PingNotifications';
import PeopleMetList from '@/components/notifications/PeopleMetList';

export default function Profile() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentLocation, setCurrentLocation] = useState(null);
    
    // NEW: Live Tally State (Defaults to 0, updates from list)
    const [realTally, setRealTally] = useState(0);

    useEffect(() => {
        if (user) fetchProfileData();
    }, [user]);

    async function fetchProfileData() {
        setLoading(true);
        const timeout = setTimeout(() => setLoading(false), 3000);

        try {
            // 1. Fetch Profile
            const { data, error } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', user.id)
                .single();

            if (error) throw error;
            setProfile(data);
            
            // Initialize tally from DB (will be overridden by live list shortly)
            setRealTally(data.people_met_count || 0);

            // 2. Fetch Location
            try {
                const { data: checkIn } = await supabase
                    .from('checkins')
                    .select('location_id')
                    .eq('user_id', user.id)
                    .eq('is_active', true)
                    .maybeSingle();

                if (checkIn) {
                    const locationNames = {
                        'loc_ep_1': 'Coffee Box',
                        'loc_ep_2': 'The Tap Bar',
                        'loc_ep_3': 'San Jacinto Plaza',
                        'loc_ep_4': 'Hotel Paso del Norte'
                    };
                    setCurrentLocation(locationNames[checkIn.location_id] || "Checked In");
                }
            } catch (err) {}

        } catch (error) {
            console.error('Profile load error:', error);
        } finally {
            clearTimeout(timeout);
            setLoading(false);
        }
    }

    const handleLogout = async () => {
        try { await logout(); } catch (e) {} finally { navigate('/landing'); }
    };

    if (loading) return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center">
            <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
        </div>
    );

    if (!profile) return (
        <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center text-white p-4">
            <p className="mb-4 text-slate-300">Profile loading failed.</p>
            <div className="flex gap-3">
                <Button onClick={fetchProfileData} className="bg-amber-500 hover:bg-amber-600 text-black">Retry</Button>
                <Button onClick={handleLogout} variant="destructive">Log Out</Button>
            </div>
        </div>
    );

    return (
        <div className="min-h-screen bg-slate-950 pb-24 text-white p-4">
            <div className="max-w-md mx-auto space-y-6">
                
                <div className="flex justify-between items-center">
                    <h1 className="text-2xl font-bold">My Profile</h1>
                    <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-400 hover:text-red-300">
                        <LogOut className="w-4 h-4 mr-2" /> Log Out
                    </Button>
                </div>

                {/* Profile Card */}
                <div className="relative bg-white/5 border border-white/10 rounded-3xl p-6 flex flex-col items-center text-center">
                    <Button 
                        size="icon" 
                        variant="ghost" 
                        className="absolute top-4 right-4 text-slate-400 hover:text-white"
                        onClick={() => navigate('/profile-setup')}
                    >
                        <Edit className="w-4 h-4" />
                    </Button>

                    <Avatar className="w-24 h-24 border-4 border-amber-500/20 mb-4">
                        <AvatarImage src={profile.avatar_url} />
                        <AvatarFallback className="bg-amber-500 text-black text-2xl font-bold">
                            {profile.full_name?.[0]?.toUpperCase()}
                        </AvatarFallback>
                    </Avatar>
                    
                    <h2 className="text-2xl font-bold mb-1">{profile.full_name}</h2>
                    
                    {currentLocation && (
                        <div className="flex items-center gap-1 text-amber-500 text-sm font-medium mb-2">
                            <MapPin className="w-3 h-3" /> {currentLocation}
                        </div>
                    )}

                    <p className="text-slate-400 text-sm mb-4 max-w-[80%]">
                        {profile.bio || "No bio yet."}
                    </p>
                    
                    <div className="flex gap-2 justify-center flex-wrap">
                        <Badge variant="outline" className="border-white/10 text-slate-300">
                            {profile.gender || 'Unknown'}
                        </Badge>
                        {/* LIVE TALLY BADGE */}
                        <Badge variant="outline" className="border-amber-500/50 text-amber-400 bg-amber-500/10">
                            People Met: {realTally}
                        </Badge>
                    </div>
                </div>

                {/* People Met List (Passes count back up!) */}
                <PeopleMetList onCountChange={setRealTally} />

                {/* Activity Feed */}
                <div className="bg-white/5 border border-white/10 rounded-3xl p-6">
                    <h3 className="font-semibold mb-4 flex items-center gap-2">
                        <MapPin className="w-4 h-4 text-amber-500" /> Recent Pings
                    </h3>
                    <div className="min-h-[50px]">
                        <PingNotifications /> 
                    </div>
                </div>

            </div>
        </div>
    );
}