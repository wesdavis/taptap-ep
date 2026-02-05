import React, { useEffect, useState } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Loader2, MapPin, LogOut, Edit, Zap } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import PingNotifications from '@/components/notifications/PingNotifications';
import PeopleMetList from '@/components/notifications/PeopleMetList';
import { toast } from 'sonner';

// 🟢 YOUR API KEY (Added automatically for you)
const GOOGLE_KEY = "AIzaSyD6a6NR3DDmw15x2RgQcpV3NaBunD2ZYxk"; 

export default function Profile() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [currentLocation, setCurrentLocation] = useState(null);
    
    // Live Tally State
    const [realTally, setRealTally] = useState(0);

    // 🟢 TEMP: ADMIN ENRICHMENT FUNCTION
    // This is "inside the component" - meaning it sits right here with your other logic
    const runEnrichment = async () => {
        if (!confirm("This will update all locations in your database with live Google data. Continue?")) return;
        
        console.log("🚀 Starting Deep Enrichment...");
        toast.info("Starting enrichment... check Console (F12) for logs.");

        try {
            // 1. Get locations that HAVE a Place ID
            const { data: locs, error } = await supabase
                .from('locations')
                .select('id, name, google_place_id')
                .not('google_place_id', 'is', null);

            if (error) throw error;
            console.log(`Found ${locs.length} locations to enrich.`);

            const formatPrice = (level) => {
                const map = {
                    'PRICE_LEVEL_INEXPENSIVE': '$',
                    'PRICE_LEVEL_MODERATE': '$$',
                    'PRICE_LEVEL_EXPENSIVE': '$$$',
                    'PRICE_LEVEL_VERY_EXPENSIVE': '$$$$'
                };
                return map[level] || '$$';
            };

            // 2. Loop through each location
            let updatedCount = 0;
            for (const loc of locs) {
                try {
                    console.log(`📥 Fetching: ${loc.name}...`);

                    // Call Google Places Details API
                    const res = await fetch(`https://places.googleapis.com/v1/places/${loc.google_place_id}`, {
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Goog-Api-Key': GOOGLE_KEY,
                            'X-Goog-FieldMask': 'rating,userRatingCount,priceLevel,nationalPhoneNumber,websiteUri,regularOpeningHours,editorialSummary'
                        }
                    });

                    const data = await res.json();
                    const updates = {};
                    
                    if (data.rating) updates.google_rating = data.rating;
                    if (data.userRatingCount) updates.google_user_ratings_total = data.userRatingCount;
                    if (data.nationalPhoneNumber) updates.phone = data.nationalPhoneNumber;
                    if (data.websiteUri) updates.website = data.websiteUri;
                    if (data.priceLevel) updates.price_level = formatPrice(data.priceLevel);
                    if (data.editorialSummary?.text) updates.description = data.editorialSummary.text;
                    if (data.regularOpeningHours?.weekdayDescriptions) {
                        updates.hours = data.regularOpeningHours.weekdayDescriptions.join('\n');
                    }

                    // 3. Save to Supabase
                    if (Object.keys(updates).length > 0) {
                        await supabase.from('locations').update(updates).eq('id', loc.id);
                        updatedCount++;
                        console.log(`✅ Updated ${loc.name}`);
                    }

                    // Small pause to respect API limits
                    await new Promise(r => setTimeout(r, 200));

                } catch (err) {
                    console.error(`❌ Error on ${loc.name}:`, err);
                }
            }
            toast.success(`Success! Updated ${updatedCount} locations.`);
        } catch (err) {
            console.error(err);
            toast.error("Enrichment failed. See console.");
        }
    };

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
            
            setRealTally(data.people_met_count || 0);

            // 2. Fetch Location
            try {
                const { data: checkIn } = await supabase
                    .from('checkins')
                    .select('location_id, locations(name)')
                    .eq('user_id', user.id)
                    .eq('is_active', true)
                    .maybeSingle();

                if (checkIn && checkIn.locations) {
                    setCurrentLocation(checkIn.locations.name);
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
                        <Badge variant="outline" className="border-amber-500/50 text-amber-400 bg-amber-500/10">
                            People Met: {realTally}
                        </Badge>
                    </div>

                    {/* 🟢 TEMP ADMIN BUTTON */}
                    <div className="mt-6 pt-6 border-t border-white/10 w-full">
                        <Button 
                            onClick={runEnrichment}
                            className="w-full bg-indigo-600 hover:bg-indigo-500 text-white font-bold"
                        >
                            <Zap className="w-4 h-4 mr-2 fill-yellow-400 text-yellow-400" /> 
                            Enrich Data (Admin)
                        </Button>
                        <p className="text-[10px] text-slate-500 mt-2">
                            Click once to fetch ratings, hours, and prices from Google for all locations.
                        </p>
                    </div>
                </div>

                {/* People Met List */}
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