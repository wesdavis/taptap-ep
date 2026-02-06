import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import MissionCard from '../components/gamification/MissionCard'; 
import MysteryCard from '../components/gamification/MysteryCard'; 
import { User, Settings, MapPin, Star, ChevronRight, Trophy, LogOut, Edit3, Crown } from 'lucide-react';
import { toast } from 'sonner';

// 🟢 API KEY
const GOOGLE_MAPS_API_KEY = "AIzaSyD6a6NR3DDmw15x2RgQcpV3NaBunD2ZYxk";

// 🟢 CONFIG: The Name of the place to Promote (Case Sensitive)
const PROMOTED_VENUE_NAME = "The Coffee Box";

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
  const [currentCity, setCurrentCity] = useState("El Paso"); // 🟢 Default City
  
  const [currentCheckIn, setCurrentCheckIn] = useState(null); 
  const [activeUsersAtLocation, setActiveUsersAtLocation] = useState([]);

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserCoords({ latitude: lat, longitude: lng });

        // 🟢 NEW: Reverse Geocode to get City Name
        try {
            const res = await fetch(`https://maps.googleapis.com/maps/api/geocode/json?latlng=${lat},${lng}&key=${GOOGLE_MAPS_API_KEY}`);
            const data = await res.json();
            if (data.results && data.results.length > 0) {
                // Find the "locality" (City) component
                const addressComponents = data.results[0].address_components;
                const cityObj = addressComponents.find(c => c.types.includes("locality"));
                if (cityObj) setCurrentCity(cityObj.long_name);
            }
        } catch (err) {
            console.error("City fetch failed", err);
        }
      });
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);
        if (user) {
          const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          setProfile(profileData);

          const { data: sentData } = await supabase
            .from('pings')
            .select(`*, receiver:profiles!to_user_id(*)`) 
            .eq('from_user_id', user.id)
            .is('met_confirmed', null)
            .order('created_at', { ascending: false });
          setActiveMissions(sentData || []);

          const { data: receivedData } = await supabase
            .from('pings')
            .select(`*, sender:profiles!from_user_id(*)`) 
            .eq('to_user_id', user.id)
            .is('met_confirmed', null)
            .order('created_at', { ascending: false });
          setMysteryPings(receivedData || []);

          const { data: myCheckIn } = await supabase
            .from('checkins')
            .select(`*, locations (*)`)
            .eq('user_id', user.id)
            .eq('is_active', true)
            .maybeSingle();
          setCurrentCheckIn(myCheckIn);

          if (myCheckIn) {
            const { data: people } = await supabase
                .from('checkins')
                .select(`user_id, profiles:user_id ( id, display_name, avatar_url, handle )`)
                .eq('location_id', myCheckIn.location_id)
                .eq('is_active', true);
            setActiveUsersAtLocation(people?.filter(p => p.user_id !== user.id) || []);
          }
        }

        const { data: locData } = await supabase.from('locations').select('*');
        setLocations(locData || []);
      } catch (err) { console.error('Error:', err); } finally { setLoading(false); }
    };
    fetchData();
  }, [user]);

  const handleCheckOut = async () => {
    const checkinId = currentCheckIn?.id;
    if (!checkinId) return;

    try {
        await supabase.from('checkins').update({ is_active: false }).eq('id', checkinId);
        setCurrentCheckIn(null);
        setActiveUsersAtLocation([]);
    } catch (error) { console.error(error); }
  };

  useEffect(() => {
    if (currentCheckIn && userCoords && currentCheckIn.locations) {
      const loc = currentCheckIn.locations;
      const dist = calculateDistance(userCoords.latitude, userCoords.longitude, loc.latitude, loc.longitude);
      
      if (dist > 1.0) {
        console.log("Auto checking out due to distance...");
        handleCheckOut();
        toast.info(`You have been checked out of ${loc.name} because you left the area.`);
      }
    }
  }, [userCoords, currentCheckIn]);

  const handleCancelPing = async (pingId) => {
    setActiveMissions(prev => prev.filter(p => p.id !== pingId));
    setMysteryPings(prev => prev.filter(p => p.id !== pingId));
    
    const { error } = await supabase.from('pings').delete().eq('id', pingId);
    if (error) {
        toast.error("Failed to cancel ping");
    } else {
        toast.success("Card dismissed");
    }
  };

  const sortedLocations = useMemo(() => {
    const mapped = locations.map(loc => {
      const dist = userCoords ? calculateDistance(userCoords.latitude, userCoords.longitude, loc.latitude, loc.longitude) : Infinity;
      return { ...loc, _distance: dist };
    });
    return mapped.sort((a, b) => {
      if (sortBy === 'distance') return a._distance - b._distance;
      if (sortBy === 'rating') return (b.google_rating || b.rating || 0) - (a.google_rating || a.rating || 0); 
      return 0;
    });
  }, [locations, userCoords, sortBy]);

  // 🟢 NEW: Split List into Promoted vs Others
  const promotedLocation = sortedLocations.find(l => l.name === PROMOTED_VENUE_NAME);
  const otherLocations = sortedLocations.filter(l => l.name !== PROMOTED_VENUE_NAME);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-500">Loading...</div>;

  return (
    <div className="pb-24 bg-slate-950 min-h-screen text-white"> 
      
      {/* CINEMATIC HEADER */}
      <div className="relative w-full h-[45vh] min-h-[400px] bg-slate-900 rounded-b-[3rem] overflow-hidden shadow-2xl mb-8 group">
        {profile?.avatar_url ? (
            <img 
                src={profile.avatar_url} 
                className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
                onClick={() => navigate(`/user/${user?.id}`)}
                alt="Profile"
            />
        ) : (
            <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                <User className="w-24 h-24 text-slate-600" />
            </div>
        )}
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent pointer-events-none" />

        <div className="absolute bottom-0 left-0 right-0 p-8 flex flex-col items-center text-center z-10">
            <h1 
                onClick={() => navigate(`/user/${user?.id}`)}
                className="text-4xl font-black text-white tracking-tight drop-shadow-lg cursor-pointer"
            >
                {profile?.display_name || "Explorer"}
            </h1>
            <p className="text-amber-400 text-lg font-bold tracking-wide drop-shadow-md mb-4">
                @{profile?.handle || "user"}
            </p>
            <div className="flex items-center gap-3">
                <div className="bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full flex items-center gap-2 shadow-lg">
                    <Trophy className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                    <span className="text-sm font-bold text-white">{profile?.xp || 0} XP</span>
                </div>
                <button 
                    onClick={(e) => { e.stopPropagation(); navigate('/profile-setup'); }}
                    className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full flex items-center gap-2 hover:bg-white/20 transition active:scale-95 shadow-lg"
                >
                    <Edit3 className="w-4 h-4 text-white" />
                    <span className="text-sm font-bold text-white">Edit Profile</span>
                </button>
            </div>
        </div>
      </div>

      {/* GAME LAYER */}
      <div className="space-y-4 px-4 -mt-4 relative z-20">
         {activeMissions.map(ping => (
              <MissionCard 
                  key={ping.id} 
                  ping={ping} 
                  onCancel={() => handleCancelPing(ping.id)} 
                  onComplete={() => window.location.reload()} 
              />
          ))}
         {mysteryPings.map(ping => (
              <MysteryCard 
                  key={ping.id} 
                  ping={ping} 
                  onCancel={() => handleCancelPing(ping.id)} 
              />
          ))}
      </div>

      {/* ACTIVE LOCATION CARD */}
      {currentCheckIn && (
        <div className="px-4 mb-8 mt-6">
            <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-amber-500/50 rounded-2xl p-5 shadow-2xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                <div className="flex justify-between items-start mb-6 relative z-10">
                    <div>
                        <span className="flex items-center gap-1.5 text-green-400 text-xs font-bold uppercase tracking-wider mb-1">
                            Live Mode Active
                        </span>
                        <h2 className="text-2xl font-bold text-white leading-none">
                          <MapPin className="inline-block w-5 h-5 mr-1 text-amber-500 animate-pulse" /> 
                          {currentCheckIn.locations?.name || "Unknown Location"}
                        </h2>
                    </div>
                    <button onClick={handleCheckOut} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition"><LogOut className="w-5 h-5" /></button>
                </div>
                {activeUsersAtLocation.length > 0 ? (
                    <div>
                        <p className="text-slate-400 text-xs font-bold uppercase mb-3">Who's Here</p>
                        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                            {activeUsersAtLocation.map((person) => (
                                <div key={person.user_id} onClick={() => navigate(`/user/${person.user_id}`)} className="flex flex-col items-center gap-2 shrink-0 cursor-pointer group">
                                    <div className="w-20 h-20 rounded-full border-2 border-slate-700 group-hover:border-amber-500 transition p-0.5 relative">
                                        <img src={person.profiles?.avatar_url} className="w-full h-full object-cover rounded-full bg-slate-800" />
                                        <div className="absolute bottom-1 right-1 w-4 h-4 bg-green-500 border-2 border-slate-900 rounded-full"></div>
                                    </div>
                                    <span className="text-xs font-medium text-slate-300 max-w-[80px] truncate text-center">{person.profiles?.display_name?.split(' ')[0] || "User"}</span>
                                </div>
                            ))}
                        </div>
                    </div>
                ) : (
                    <div className="text-slate-500 text-sm italic bg-black/20 p-4 rounded-xl text-center border border-white/5">You're the first one here! <br/><span className="text-xs">Wait for others to join...</span></div>
                )}
            </div>
        </div>
      )}

      {/* 🟢 NEW: DYNAMIC CITY HEADER */}
      <div className="px-6 mb-2 flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
            <MapPin className="w-5 h-5 text-amber-500" /> 
            Tap Tap - {currentCity}
        </h2>
        <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
           <button onClick={() => setSortBy('distance')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${sortBy === 'distance' ? 'bg-amber-500 text-black' : 'text-slate-400'}`}>Near</button>
           <button onClick={() => setSortBy('rating')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${sortBy === 'rating' ? 'bg-amber-500 text-black' : 'text-slate-400'}`}>Top</button>
        </div>
      </div>
      
      <div className="px-4 space-y-3">
        {/* 🟢 NEW: PROMOTED SLOT (Pinned to Top) */}
        {promotedLocation && (
            <div 
                key={promotedLocation.id} 
                onClick={() => navigate(`/location/${promotedLocation.id}`)}
                className="bg-amber-950/20 border-2 border-amber-500/50 p-3 rounded-xl active:scale-[0.98] transition-transform cursor-pointer relative overflow-hidden"
            >
                {/* Gold Glow Effect */}
                <div className="absolute -right-10 -top-10 w-32 h-32 bg-amber-500/20 blur-3xl rounded-full pointer-events-none"></div>
                
                {/* Promoted Badge */}
                <div className="absolute top-2 right-2 flex items-center gap-1 bg-amber-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10">
                    <Crown className="w-3 h-3 fill-black" />
                    PROMOTED
                </div>

                <div className="flex items-center justify-between relative z-0">
                    <div className="flex-1 min-w-0 pr-4">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="text-white font-bold truncate text-base">{promotedLocation.name}</span>
                            <div className="flex items-center gap-0.5 text-yellow-400 text-xs">
                                <Star className="w-3 h-3 fill-yellow-400" />
                                <span>{promotedLocation.google_rating || promotedLocation.rating || 4.5}</span>
                            </div>
                        </div>
                        <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
                            <span className="px-2 py-0.5 bg-slate-800 rounded text-amber-500 uppercase font-bold text-[10px]">{promotedLocation.type}</span>
                            <span className="text-green-400">{promotedLocation.price_level}</span>
                            <span>•</span>
                            <span>{promotedLocation._distance < 100 ? `${promotedLocation._distance.toFixed(1)} mi` : 'Far away'}</span>
                        </div>
                        <p className="text-amber-200/70 text-xs truncate italic">{promotedLocation.address}</p>
                    </div>
                    <div className="relative w-16 h-16 shrink-0">
                        <img 
                            src={
                                (promotedLocation.google_photos && promotedLocation.google_photos.length > 0)
                                ? `https://places.googleapis.com/v1/${promotedLocation.google_photos[0]}/media?key=${GOOGLE_MAPS_API_KEY}&maxHeightPx=400&maxWidthPx=400`
                                : (promotedLocation.image_url || "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400")
                            } 
                            alt={promotedLocation.name} 
                            className="w-full h-full object-cover rounded-lg border border-amber-500/30" 
                        />
                    </div>
                    <ChevronRight className="w-4 h-4 text-amber-500 ml-2" />
                </div>
            </div>
        )}

        {/* STANDARD LIST (Mapped normally) */}
        {otherLocations.map((loc) => {
            const imageUrl = (loc.google_photos && loc.google_photos.length > 0)
                ? `https://places.googleapis.com/v1/${loc.google_photos[0]}/media?key=${GOOGLE_MAPS_API_KEY}&maxHeightPx=400&maxWidthPx=400`
                : (loc.image_url || "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400");

            return (
              <div key={loc.id} onClick={() => navigate(`/location/${loc.id}`)} className="flex items-center justify-between bg-slate-900/50 border border-slate-800 p-3 rounded-xl active:scale-[0.98] transition-transform cursor-pointer">
                <div className="flex-1 min-w-0 pr-4">
                  <div className="flex items-center gap-2 mb-1">
                    <span className="text-white font-bold truncate text-base">{loc.name}</span>
                    <div className="flex items-center gap-0.5 text-yellow-400 text-xs">
                       <Star className="w-3 h-3 fill-yellow-400" />
                       <span>{loc.google_rating || loc.rating || 4.5}</span>
                    </div>
                  </div>
                  <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
                    <span className="px-2 py-0.5 bg-slate-800 rounded text-amber-500 uppercase font-bold text-[10px]">{loc.type}</span>
                    {loc.price_level && <span className="text-green-400">{loc.price_level}</span>}
                    <span>•</span>
                    <span>{loc._distance < 100 ? `${loc._distance.toFixed(1)} mi` : 'Far away'}</span>
                  </div>
                  <p className="text-slate-500 text-xs truncate">{loc.address}</p>
                </div>
                <div className="relative w-16 h-16 shrink-0">
                    <img src={imageUrl} alt={loc.name} className="w-full h-full object-cover rounded-lg border border-slate-700" loading="lazy" />
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600 ml-2" />
              </div>
            );
        })}
      </div>
    </div>
  );
};

export default Home;