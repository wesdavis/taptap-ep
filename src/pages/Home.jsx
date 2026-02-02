import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import LocationCard from '../components/location/LocationCard';
import { User, Settings, Users, MapPin } from 'lucide-react';

// Helper to calculate real distance (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return null;
  const R = 6371e3; // Earth radius in meters
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
            Math.cos(φ1) * Math.cos(φ1) *
            Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c; // Distance in meters
};

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth(); // Get the logged-in user ID
  
  // State
  const [profile, setProfile] = useState(null);
  const [locations, setLocations] = useState([]);
  const [recentPings, setRecentPings] = useState([]);
  const [userCoords, setUserCoords] = useState(null);
  const [loading, setLoading] = useState(true);

  // 1. Get Real GPS Position
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

  // 2. Fetch All Data (Profile, Pings, Locations)
  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // A. Fetch User Profile
        if (user) {
          const { data: profileData } = await supabase
            .from('profiles')
            .select('*')
            .eq('id', user.id)
            .single();
          setProfile(profileData);

          // B. Fetch Recent Connections (Pings)
          // (Find pings where I am sender OR receiver)
          const { data: pingsData } = await supabase
            .from('pings')
            .select(`
              *,
              sender:profiles!sender_id(username, avatar_url),
              receiver:profiles!receiver_id(username, avatar_url)
            `)
            .or(`sender_id.eq.${user.id},receiver_id.eq.${user.id}`)
            .order('created_at', { ascending: false })
            .limit(5);
          setRecentPings(pingsData || []);
        }

        // C. Fetch Locations
        const { data: locData, error } = await supabase
          .from('locations')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;
        setLocations(locData || []);

      } catch (err) {
        console.error('Error loading dashboard:', err.message);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [user]);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-slate-950">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <div className="pb-24 bg-slate-950 min-h-screen text-white"> 
      
      {/* --- SECTION 1: USER DASHBOARD --- */}
      <div className="bg-slate-900 border-b border-slate-800 p-6 rounded-b-3xl shadow-2xl">
        
        {/* Header: Name & Edit Button */}
        <div className="flex justify-between items-start mb-6">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-full bg-slate-800 border-2 border-amber-500 overflow-hidden relative">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                <User className="w-8 h-8 text-slate-400 absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2" />
              )}
            </div>
            <div>
              <h1 className="text-2xl font-bold">{profile?.username || "Explorer"}</h1>
              <p className="text-slate-400 text-sm">{profile?.bio || "Ready to connect"}</p>
            </div>
          </div>
          <button 
            onClick={() => navigate('/profile-setup')}
            className="p-2 bg-slate-800 rounded-full text-slate-400 hover:text-white hover:bg-slate-700 transition"
          >
            <Settings className="w-5 h-5" />
          </button>
        </div>

        {/* Stats Row */}
        <div className="grid grid-cols-2 gap-4 mb-6">
          <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 text-amber-500 mb-1">
              <Users className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Met</span>
            </div>
            <p className="text-2xl font-bold text-white">{recentPings.length}</p>
            <p className="text-xs text-slate-500">Connections made</p>
          </div>
           <div className="bg-slate-950/50 p-4 rounded-2xl border border-slate-800">
            <div className="flex items-center gap-2 text-green-500 mb-1">
              <MapPin className="w-4 h-4" />
              <span className="text-xs font-bold uppercase tracking-wider">Spots</span>
            </div>
            <p className="text-2xl font-bold text-white">{locations.length}</p>
            <p className="text-xs text-slate-500">Venues near you</p>
          </div>
        </div>

        {/* Recent People (Horizontal Scroll) */}
        <div>
          <h3 className="text-sm font-medium text-slate-400 mb-3">Recent Connections</h3>
          {recentPings.length === 0 ? (
            <div className="p-4 bg-slate-800/50 rounded-xl text-center text-xs text-slate-500">
              No connections yet. Tap a location to start!
            </div>
          ) : (
            <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide">
              {recentPings.map((ping) => {
                // Determine which profile is "the other person"
                const otherPerson = ping.sender_id === user.id ? ping.receiver : ping.sender;
                return (
                  <div key={ping.id} className="flex flex-col items-center gap-1 min-w-[60px]">
                    <div className="w-12 h-12 rounded-full bg-slate-800 border border-slate-700 overflow-hidden">
                      {otherPerson?.avatar_url && <img src={otherPerson.avatar_url} className="w-full h-full object-cover" />}
                    </div>
                    <span className="text-[10px] text-slate-400 truncate w-full text-center">
                      {otherPerson?.username || "User"}
                    </span>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* --- SECTION 2: LOCATIONS GRID --- */}
      <div className="p-6">
        <h2 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <MapPin className="w-5 h-5 text-amber-500" />
          Nearby Locations
        </h2>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {locations.map((loc) => {
            // CALCULATE REAL DISTANCE
            const distMeters = userCoords 
              ? calculateDistance(userCoords.latitude, userCoords.longitude, loc.latitude, loc.longitude)
              : null;

            return (
              <LocationCard 
                key={loc.id} 
                location={{
                  ...loc,
                  category: loc.type ? loc.type.toLowerCase() : 'bar'
                }}
                // This will count how many active pings are happening (Placeholder for now until we add 'checkins' table)
                activeCount={Math.floor(Math.random() * 20) + 5} 
                
                // Pass the real calculated distance
                distance={distMeters} 
                
                isCheckedIn={false}
                isNearby={distMeters && distMeters < 500} // Green ring if under 500m
                onClick={() => navigate(`/location/${loc.id}`)} 
              />
            );
          })}
        </div>
      </div>
    </div>
  );
};

export default Home;