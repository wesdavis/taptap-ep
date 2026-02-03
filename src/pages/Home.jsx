import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import MissionCard from '../components/gamification/MissionCard'; // Make sure this file exists
import MysteryCard from '../components/gamification/MysteryCard'; // Make sure this file exists
import { User, Settings, MapPin, Star, ChevronRight, Trophy } from 'lucide-react';

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
  const [activeMissions, setActiveMissions] = useState([]); // For Women (Sent Pings)
  const [mysteryPings, setMysteryPings] = useState([]);     // For Men (Received Pings)
  const [userCoords, setUserCoords] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('distance'); 

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

          // 2. Fetch Sent Pings (Missions) - Pending only
          const { data: sentData } = await supabase
            .from('pings')
            .select(`*, receiver:profiles!receiver_id(*)`)
            .eq('from_user_id', user.id)
            .eq('met_confirmed', null) // Only active missions
            .order('created_at', { ascending: false });
          setActiveMissions(sentData || []);

          // 3. Fetch Received Pings (Mysteries) - Pending only
          const { data: receivedData } = await supabase
            .from('pings')
            .select(`*, sender:profiles!sender_id(*)`)
            .eq('to_user_id', user.id)
            .eq('met_confirmed', null)
            .order('created_at', { ascending: false });
          setMysteryPings(receivedData || []);
        }

        // 4. Fetch Locations
        const { data: locData } = await supabase.from('locations').select('*');
        setLocations(locData || []);
      } catch (err) { console.error('Error:', err); } finally { setLoading(false); }
    };
    fetchData();
  }, [user]);

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
                 
                 {/* 👇 THIS IS THE CLICKABLE BADGE YOU ASKED FOR 👇 */}
                 <span 
                   onClick={() => navigate('/achievements')} 
                   className="bg-slate-800 text-slate-300 text-[10px] px-2 py-0.5 rounded-full border border-slate-700 flex items-center gap-1 cursor-pointer hover:bg-slate-700 transition"
                 >
                   <Trophy className="w-3 h-3 text-yellow-500" />
                   {profile?.xp || 0} XP
                 </span>
                 {/* 👆 IT ACTS AS A BUTTON NOW 👆 */}

              </div>
            </div>
          </div>
          <button onClick={() => navigate('/profile-setup')}><Settings className="w-5 h-5 text-slate-400" /></button>
        </div>
        
        {/* GAME LAYER: Active Missions & Mysteries */}
        <div className="space-y-4">
           {/* If I sent a ping, show Mission Card */}
           {activeMissions.map(ping => (
             <MissionCard key={ping.id} ping={ping} onComplete={() => window.location.reload()} />
           ))}

           {/* If I received a ping, show Mystery Card */}
           {mysteryPings.map(ping => (
             <MysteryCard key={ping.id} ping={ping} />
           ))}
        </div>
      </div>

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