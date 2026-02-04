This is a fantastic idea. It turns the Home Screen into a "Live Mode" when you are out, instantly showing you who is around you without making you click into the location.

I have updated Home.jsx to do exactly what you asked:

Auto-Detects Check-in: It looks for your active check-in.

"Live" Section: If you are checked in, it inserts a massive "You are here" card at the top.

Big Avatars: It displays the people at your location with extra large profile pictures (larger than the details page).

One-Tap Actions: Added a "Check Out" button right there for convenience.

The Update: src/pages/Home.jsx
JavaScript
import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import MissionCard from '../components/gamification/MissionCard'; 
import MysteryCard from '../components/gamification/MysteryCard'; 
import { User, Settings, MapPin, Star, ChevronRight, Trophy, LogOut, Loader2 } from 'lucide-react';

// Distance Calculator
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity; 
  const R = 6371e3; 
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ1) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c * 0.000621371; // Miles
};

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState(null);
  const [locations, setLocations] = useState([]);
  const [activeMissions, setActiveMissions] = useState([]); 
  const [mysteryPings, setMysteryPings] = useState([]);     
  const [userCoords, setUserCoords] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('distance'); 
  
  // 🟢 NEW: Active Check-in State
  const [currentCheckIn, setCurrentCheckIn] = useState(null); 
  const [activeUsersAtLocation, setActiveUsersAtLocation] = useState([]);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setUserCoords({ latitude: position.coords.latitude, longitude: position.coords.longitude });
      });
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (user) {
          // 1. Fetch Profile
          const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          setProfile(profileData);

          // 2. Fetch Gamification Data
          const { data: sentData } = await supabase
            .from('pings')
            .select(`*, receiver:profiles!receiver_id(*)`)
            .eq('from_user_id', user.id)
            .eq('met_confirmed', null) 
            .order('created_at', { ascending: false });
          setActiveMissions(sentData || []);

          const { data: receivedData } = await supabase
            .from('pings')
            .select(`*, sender:profiles!sender_id(*)`)
            .eq('to_user_id', user.id)
            .eq('met_confirmed', null)
            .order('created_at', { ascending: false });
          setMysteryPings(receivedData || []);

          // 🟢 NEW: Fetch Current Active Check-in
          const { data: myCheckIn } = await supabase
            .from('checkins')
            .select(`
                *,
                locations (*)
            `)
            .eq('user_id', user.id)
            .eq('is_active', true)
            .maybeSingle();
            
          setCurrentCheckIn(myCheckIn);

          // 🟢 NEW: If checked in, fetch everyone else there
          if (myCheckIn) {
            const { data: people } = await supabase
                .from('checkins')
                .select(`
                    user_id,
                    profiles:user_id ( id, display_name, avatar_url, handle )
                `)
                .eq('location_id', myCheckIn.location_id)
                .eq('is_active', true);
            
            // Filter out myself from the visual list (optional, but usually looks better)
            setActiveUsersAtLocation(people?.filter(p => p.user_id !== user.id) || []);
          }
        }

        // 3. Fetch All Locations
        const { data: locData } = await supabase.from('locations').select('*');
        setLocations(locData || []);
      } catch (err) { console.error('Error:', err); } finally { setLoading(false); }
    };
    fetchData();
  }, [user]);

  const handleCheckOut = async () => {
    if (!currentCheckIn) return;
    try {
        await supabase.from('checkins').update({ is_active: false }).eq('id', currentCheckIn.id);
        setCurrentCheckIn(null);
        setActiveUsersAtLocation([]);
    } catch (error) { console.error(error); }
  };

  const sortedLocations = useMemo(() => {
    const mapped = locations.map(loc => {
      const dist = userCoords ? calculateDistance(userCoords.latitude, userCoords.longitude, loc.latitude, loc.longitude) : Infinity;
      return { ...loc, _distance: dist };
    });
    return mapped.sort((a, b) => {
      if (sortBy === 'distance') return a._distance - b._distance;
      if (sortBy === 'rating') return b.rating - a.rating; 
      return 0;
    });
  }, [locations, userCoords, sortBy]);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-500">Loading...</div>;

  return (
    <div className="pb-24 bg-slate-950 min-h-screen text-white"> 
      
      {/* Dashboard Header */}
      <div className="bg-slate-900 border-b border-slate-800 p-6 rounded-b-3xl shadow-2xl mb-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-full bg-slate-800 border-2 border-amber-500 overflow-hidden relative">
              {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : <User className="w-6 h-6 m-auto mt-3 text-slate-400" />}
            </div>
            <div>
              <h1 className="text-xl font-bold">{profile?.display_name || "Explorer"}</h1>
              
              <div className="flex items-center gap-2 mt-1">
                 <p className="text-amber-500 text-xs font-medium">@{profile?.handle || "user"}</p>
                 <span 
                   onClick={() => navigate('/achievements')} 
                   className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-full border border-slate-700 flex items-center gap-1 cursor-pointer hover:bg-slate-700 transition"
                 >
                   <Trophy className="w-3 h-3 text-yellow-500" />
                   {profile?.xp || 0} XP
                 </span>
              </div>
            </div>
          </div>
          <button onClick={() => navigate('/profile-setup')}><Settings className="w-5 h-5 text-slate-400" /></button>
        </div>
        
        {/* GAME LAYER: Active Missions & Mysteries */}
        <div className="space-y-4">
           {activeMissions.map(ping => (
             <MissionCard key={ping.id} ping={ping} onComplete={() => window.location.reload()} />
           ))}
           {mysteryPings.map(ping => (
             <MysteryCard key={ping.id} ping={ping} />
           ))}
        </div>
      </div>

      {/* 🟢 NEW: ACTIVE LOCATION CARD (The "Bump Down" Feature) */}
      {currentCheckIn && (
        <div className="px-4 mb-8">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-amber-500/50 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
                
                {/* Background Glow */}
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>

                {/* Header */}
                <div className="flex justify-between items-start mb-6 relative z-10">
                    <div>
                        <span className="flex items-center gap-1.5 text-green-400 text-xs font-bold uppercase tracking-wider mb-1">
                            <span className="relative flex h-2 w-2">
                              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                              <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            You are here
                        </span>
                        <h2 className="text-2xl font-bold text-white leading-none">{currentCheckIn.locations.name}</h2>
                    </div>
                    <button 
                        onClick={handleCheckOut}
                        className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition"
                    >
                        <LogOut className="w-5 h-5" />
                    </button>
                </div>

                {/* Users List (LARGE AVATARS) */}
                {activeUsersAtLocation.length > 0 ? (
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase mb-3">Who's Here</p>
                        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                            {activeUsersAtLocation.map((person) => (
                                <div 
                                    key={person.user_id} 
                                    onClick={() => navigate(`/user/${person.user_id}`)}
                                    className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group"
                                >
                                    <div className="w-20 h-20 rounded-full border-2 border-slate-700 group-hover:border-amber-500 transition p-0.5 relative">
                                        <img 
                                            src={person.profiles.avatar_url} 
                                            className="w-full h-full object-cover rounded-full bg-slate-800"
                                        />
                                        <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-slate-900 rounded-full"></div>
                                    </div>
                                    <span className="text-xs font-medium text-slate-300 max-w-[80px] truncate text-center">
                                        {person.profiles.display_name.split(' ')[0]}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-slate-500 text-sm italic bg-black/20 p-4 rounded-xl text-center border border-white/5">
                        You're the first one here! 
                        <br/>
                        <span className="text-xs">Wait for others to join...</span>
                    </div>
                )}
            </div>
        </div>
      )}

      {/* List Header */}
      <div className="px-6 mb-2 flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <MapPin className="w-5 h-5 text-amber-500" /> Nearby Spots
        </h2>
        <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
           <button onClick={() => setSortBy('distance')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${sortBy === 'distance' ? 'bg-amber-500 text-black' : 'text-slate-400'}`}>Near</button>
           <button onClick={() => setSortBy('rating')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${sortBy === 'rating' ? 'bg-amber-500 text-black' : 'text-slate-400'}`}>Top</button>
        </div>
      </div>
        
      {/* Locations List (Clean View) */}
      <div className="px-4 space-y-3">
        {sortedLocations.map((loc) => (
          <div 
            key={loc.id}
            onClick={() => navigate(`/location/${loc.id}`)}
            className="flex items-center justify-between bg-slate-900/50 border border-slate-800 p-3 rounded-xl active:scale-[0.98] transition-transform cursor-pointer"
          >
            <div className="flex-1 min-w-0 pr-4">
              <div className="flex items-center gap-2 mb-1">
                <span className="text-white font-bold truncate text-base">{loc.name}</span>
                {loc.rating && <div className="flex items-center gap-0.5 text-yellow-400 text-xs"><Star className="w-3 h-3 fill-yellow-400" /><span>{loc.rating}</span></div>}
              </div>
              
              <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
                <span className="px-2 py-0.5 bg-slate-800 rounded text-amber-500 uppercase font-bold text-[10px]">{loc.type}</span>
                <span>•</span>
                <span>{loc._distance < 100 ? `${loc._distance.toFixed(1)} mi` : 'Far away'}</span>
              </div>
              <p className="text-slate-500 text-xs truncate">{loc.address}</p>
            </div>
            <div className="relative w-16 h-16 shrink-0">
               <img src={loc.image_url} alt={loc.name} className="w-full h-full object-cover rounded-lg border border-slate-700" />
            </div>
            <ChevronRight className="w-4 h-4 text-slate-600 ml-2" />
          </div>
        ))}
      </div>
    </div>
  );
};

export default Home;