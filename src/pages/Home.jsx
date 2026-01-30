import React, { useState, useEffect, useRef } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { MapPin, Search, Users, LogOut, Edit, Zap } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Sheet, SheetContent } from "@/components/ui/sheet";
import { useNavigate } from 'react-router-dom';

// Components
import CheckInStatus from '@/components/location/CheckInStatus';
import UserGrid from '@/components/location/UserGrid';
import PingNotifications from '@/components/notifications/PingNotifications';
import PeopleMetList from '@/components/notifications/PeopleMetList';

// Coordinates
const EL_PASO_LOCATIONS = [
    { id: 'loc_ep_1', name: 'Coffee Box', type: 'Cafe', image: 'https://images.unsplash.com/photo-1509042239860-f550ce710b93?w=800&q=80', description: 'Iconic shipping container coffee shop.', lat: 31.7615, lng: -106.4868 },
    { id: 'loc_ep_2', name: 'The Tap Bar', type: 'Dive Bar', image: 'https://images.unsplash.com/photo-1514362545857-3bc16549766b?w=800&q=80', description: 'Legendary nachos and historic vibes.', lat: 31.7592, lng: -106.4881 },
    { id: 'loc_ep_3', name: 'San Jacinto Plaza', type: 'Park', image: 'https://images.unsplash.com/photo-1560252019-90d5658e37d0?w=800&q=80', description: 'The heart of downtown El Paso.', lat: 31.7601, lng: -106.4873 },
    { id: 'loc_ep_4', name: 'Hotel Paso del Norte', type: 'Lounge', image: 'https://images.unsplash.com/photo-1570966468453-73ba52668b0b?w=800&q=80', description: 'Upscale dome bar with city views.', lat: 31.7589, lng: -106.4892 }
];

export default function Home() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    
    // State
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [refreshTrigger, setRefreshTrigger] = useState(0);
    const [locationCounts, setLocationCounts] = useState({}); 
    const [myProfile, setMyProfile] = useState(null);
    const [realTally, setRealTally] = useState(0);

    const debounceTimer = useRef(null);

    useEffect(() => {
        if (user) {
            fetchMyProfile();
            fetchCounts();
        }

        const channel = supabase
            .channel('home_super_channel')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'checkins' }, () => {
                if (debounceTimer.current) clearTimeout(debounceTimer.current);
                debounceTimer.current = setTimeout(() => {
                    fetchCounts();
                    setRefreshTrigger(prev => prev + 1); // Auto-refresh UI on external changes too
                }, 500);
            })
            .subscribe();

        const onFocus = () => {
            fetchCounts();
            fetchMyProfile();
            setRefreshTrigger(prev => prev + 1);
        };
        window.addEventListener('focus', onFocus);

        return () => {
            supabase.removeChannel(channel);
            window.removeEventListener('focus', onFocus);
        };
    }, [user]);

    async function fetchMyProfile() {
        const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        if (data) {
            setMyProfile(data);
            setRealTally(data.people_met_count || 0);
        }
    }

    async function fetchCounts() {
        const { data } = await supabase.from('checkins').select('location_id').eq('is_active', true);
        if (data) {
            const counts = {};
            data.forEach(item => { counts[item.location_id] = (counts[item.location_id] || 0) + 1; });
            setLocationCounts(counts);
        }
    }

    const handleStatusChange = () => {
        setRefreshTrigger(prev => prev + 1);
        fetchCounts(); 
    };

    const handleLogout = async () => {
        await logout();
        navigate('/landing');
    };

    return (
        <div className="min-h-screen bg-slate-950 pb-8 text-white">
            
            {/* --- TOP BAR --- */}
            <div className="sticky top-0 z-20 bg-slate-950/90 backdrop-blur-md px-4 py-3 border-b border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <Avatar className="w-10 h-10 border-2 border-amber-500/20 cursor-pointer" onClick={() => navigate('/profile-setup')}>
                        <AvatarImage src={myProfile?.avatar_url} />
                        <AvatarFallback>{myProfile?.full_name?.[0]}</AvatarFallback>
                    </Avatar>
                    <div className="flex flex-col">
                        <span className="font-bold text-sm leading-none flex items-center gap-1">
                            {myProfile?.full_name?.split(' ')[0] || 'Me'}
                            <Edit className="w-3 h-3 text-slate-500 cursor-pointer" onClick={() => navigate('/profile-setup')} />
                        </span>
                        <span className="text-[10px] text-amber-500 font-medium">
                            {realTally} People Met
                        </span>
                    </div>
                </div>

                <div className="flex items-center gap-2">
                    <Button variant="ghost" size="icon" className="text-slate-400 hover:text-red-400" onClick={handleLogout}>
                        <LogOut className="w-5 h-5" />
                    </Button>
                </div>
            </div>

            {/* --- CONTENT --- */}
            <div className="p-4 space-y-6">

                <div className="animate-in slide-in-from-right-2 duration-500">
                    <PeopleMetList onCountChange={setRealTally} />
                </div>

                <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <MapPin className="w-3 h-3" /> Live Locations
                    </h3>
                    
                    <div className="flex flex-wrap gap-3 justify-center sm:justify-start">
                        {EL_PASO_LOCATIONS.map(location => {
                            const count = locationCounts[location.id] || 0;
                            const isActive = count > 0;

                            return (
                                <div key={location.id} className="flex flex-col gap-2 w-[100px] sm:w-[120px]">
                                    <div 
                                        onClick={() => setSelectedLocation(location)} 
                                        className="relative h-24 sm:h-32 rounded-2xl overflow-hidden border border-white/10 shadow-lg cursor-pointer active:scale-95 transition-transform bg-slate-900"
                                    >
                                        <img src={location.image} alt={location.name} className="w-full h-full object-cover opacity-80 hover:opacity-100 transition-opacity" />
                                        
                                        <div className="absolute top-1 right-1">
                                            <div className={`
                                                flex items-center gap-1 px-1.5 py-0.5 rounded-md text-[9px] font-bold backdrop-blur-sm border
                                                ${isActive 
                                                    ? 'bg-green-500/80 border-green-400/50 text-white' 
                                                    : 'bg-black/40 border-white/10 text-slate-300'}
                                            `}>
                                                <Users className="w-2.5 h-2.5" />
                                                {count}
                                            </div>
                                        </div>

                                        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-transparent to-transparent flex flex-col justify-end p-2">
                                            <h3 className="font-bold text-[10px] leading-none mb-1 truncate">{location.name}</h3>
                                            <p className="text-[8px] text-slate-400 leading-none">{location.type}</p>
                                        </div>
                                    </div>

                                    <div className="scale-90 origin-top">
                                        {/* PASSED refreshTrigger HERE */}
                                        <CheckInStatus 
                                            locationId={location.id} 
                                            locationName={location.name} 
                                            lat={location.lat}
                                            lng={location.lng}
                                            onStatusChange={handleStatusChange} 
                                            refreshTrigger={refreshTrigger}
                                        />
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                </div>

                <div>
                    <h3 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 flex items-center gap-2">
                        <Zap className="w-3 h-3" /> Live Activity
                    </h3>
                    <div className="bg-white/5 rounded-3xl p-4 border border-white/5 min-h-[100px]">
                        <PingNotifications />
                    </div>
                </div>
            </div>

            <Sheet open={!!selectedLocation} onOpenChange={() => setSelectedLocation(null)}>
                <SheetContent side="bottom" className="h-[85vh] bg-slate-900 border-t border-white/10 text-white rounded-t-3xl p-0">
                    {selectedLocation && (
                        <div className="h-full overflow-y-auto">
                            <div className="relative h-64">
                                <img src={selectedLocation.image} className="w-full h-full object-cover" />
                                <div className="absolute inset-0 bg-gradient-to-t from-slate-900 to-transparent" />
                                <div className="absolute bottom-0 left-0 p-6">
                                    <h2 className="text-3xl font-bold">{selectedLocation.name}</h2>
                                    <p className="text-slate-400">{selectedLocation.type}</p>
                                </div>
                            </div>

                            <div className="p-6 space-y-6">
                                {/* PASSED refreshTrigger HERE TOO */}
                                <CheckInStatus 
                                    locationId={selectedLocation.id} 
                                    locationName={selectedLocation.name}
                                    lat={selectedLocation.lat}
                                    lng={selectedLocation.lng}
                                    onStatusChange={handleStatusChange}
                                    refreshTrigger={refreshTrigger}
                                />

                                <div>
                                    <h3 className="font-bold mb-4 text-amber-500 uppercase text-xs tracking-widest flex items-center justify-between">
                                        <span>Who's Here Now</span>
                                        <span className="text-white bg-white/10 px-2 py-0.5 rounded-full text-[10px]">
                                            {locationCounts[selectedLocation.id] || 0} Online
                                        </span>
                                    </h3>
                                    <div className="bg-white/5 rounded-2xl border border-white/10">
                                        <UserGrid 
                                            key={refreshTrigger} 
                                            locationId={selectedLocation.id} 
                                        />
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </SheetContent>
            </Sheet>
        </div>
    );
}