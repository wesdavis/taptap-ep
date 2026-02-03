import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import LocationCard from '../components/location/LocationCard';
import { User, Settings, MapPin } from 'lucide-react';

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
  return R * c; 
};

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState(null);
  const [locations, setLocations] = useState([]);
  const [recentPings, setRecentPings] = useState([]);
  const [userCoords, setUserCoords] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('distance'); 

  useEffect(() => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition((position) => {
        setUserCoords({
          latitude: position.coords.latitude,
          longitude: position.coords.longitude
        });
      });
    }
  }, []);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // Fetch User (Matches your schema)
        if (user) {
          const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          setProfile(profileData);

          const { data: pingsData } = await supabase
            .from('pings')
            .select(`*, sender:profiles!sender_id(*), receiver:profiles!receiver_id(*)`)
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
            .order('created_at', { ascending: false })
            .limit(5);
          setRecentPings(pingsData || []);
        }

        // Fetch Locations
        const { data: locData } = await supabase.from('locations').select('*');
        setLocations(locData || []);

      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [user]);

  const sortedLocations = useMemo(() => {
    const mapped = locations.map(loc => {
      // For now, we simulate crowd count. Real app would fetch "checkins" count here.
      const mockActiveCount = Math.floor(Math.random() * 20); 
      
      const dist = userCoords 
        ? calculateDistance(userCoords.latitude, userCoords.longitude, loc.latitude, loc.longitude)
        : Infinity;
        
      return { ...loc, _distance: dist, _activeCount: mockActiveCount };
    });

    return mapped.sort((a, b) => {
      if (sortBy === 'distance') return a._distance - b._distance;
      if (sortBy === 'rating') return b.rating - a.rating; 
      if (sortBy === 'crowd') return b._activeCount - a._activeCount;
      return 0;
    });
  }, [locations, userCoords, sortBy]);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-500">Loading...</div>;

  return (
    <div className="pb-24 bg-slate-950 min-h-screen text-white"> 
      
      {/* User Dashboard */}
      <div className="bg-slate-900 border-b border-slate-800 p-6 rounded-b-3xl shadow-2xl mb-6">
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-amber-500 overflow-hidden">
              {profile?.avatar_url ? <img src={profile.avatar_url} className="w-full h-full object-cover" /> : <User className="w-8 h-8 m-auto mt-4 text-slate-400" />}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{profile?.display_name || "Explorer"}</h1>
              <p className="text-amber-500 text-sm font-medium">@{profile?.handle || "user"}</p>
            </div>
          </div>
          <button onClick={() => navigate('/profile-setup')}><Settings className="w-6 h-6 text-slate-400" /></button>
        </div>
        
        {/* Connections */}
        <div>
          <h3 className="text-xs font-bold uppercase text-slate-500 mb-3 tracking-wider">Recent Connections</h3>
          <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
             {recentPings.length === 0 && <span className="text-sm text-slate-600 italic">No meets yet. Go out there!</span>}
             {recentPings.map(ping => (
               <div key={ping.id} className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 overflow-hidden shrink-0">
                  <img src={ping.sender_id === user.id ? ping.receiver.avatar_url : ping.sender.avatar_url} className="w-full h-full object-cover" />
               </div>
             ))}
          </div>
        </div>
      </div>

      {/* Locations Header & Sorter */}
      <div className="px-6 mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold flex items-center gap-2">
          <MapPin className="w-5 h-5 text-amber-500" /> Nearby
        </h2>
        
        <div className="flex bg-slate-900 rounded-lg p-1 border border-slate-800">
           <button onClick={() => setSortBy('distance')} className={`px-3 py-1 text-xs font-bold rounded-md transition ${sortBy === 'distance' ? 'bg-amber-500 text-black' : 'text-slate-400'}`}>Near</button>
           <button onClick={() => setSortBy('crowd')} className={`px-3 py-1 text-xs font-bold rounded-md transition ${sortBy === 'crowd' ? 'bg-amber-500 text-black' : 'text-slate-400'}`}>Hot</button>
           <button onClick={() => setSortBy('rating')} className={`px-3 py-1 text-xs font-bold rounded-md transition ${sortBy === 'rating' ? 'bg-amber-500 text-black' : 'text-slate-400'}`}>Top</button>
        </div>
      </div>
        
      {/* The List */}
      <div className="px-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        {sortedLocations.map((loc) => (
          <LocationCard 
            key={loc.id} 
            location={{ ...loc, category: loc.type ? loc.type.toLowerCase() : 'bar' }}
            activeCount={loc._activeCount} 
            distance={loc._distance} 
            isNearby={loc._distance < 500}
            onClick={() => navigate(`/location/${loc.id}`)} 
          />
        ))}
      </div>
    </div>
  );
};

export default Home;