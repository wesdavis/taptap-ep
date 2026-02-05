import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { ArrowLeft, MapPin, Clock, Loader2, Star, LogOut } from 'lucide-react';
import UserGrid from '../components/location/UserGrid'; 

const LocationDetails = () => {
  const { id } = useParams(); 
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [location, setLocation] = useState(null);
  const [activeCount, setActiveCount] = useState(0); 
  const [checkedIn, setCheckedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [gridRefreshKey, setGridRefreshKey] = useState(0);

  useEffect(() => {
    const fetchLocationData = async () => {
      try {
        setLoading(true);
        // Fetch Location
        const { data: locData, error } = await supabase.from('locations').select('*').eq('id', id).single();
        if (error) throw error;
        setLocation(locData);

        // Fetch Count
        const { count } = await supabase.from('checkins')
          .select('*', { count: 'exact', head: true })
          .eq('location_id', id)
          .eq('is_active', true);
        setActiveCount(count || 0);

        // Am I checked in?
        if (user) {
           const { data: myCheckin } = await supabase.from('checkins')
             .select('*')
             .eq('user_id', user.id)
             .eq('location_id', id)
             .eq('is_active', true)
             .maybeSingle();
           if (myCheckin) setCheckedIn(true);
        }

      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
    };
    fetchLocationData();
  }, [id, user]);

  const handleCheckIn = async () => {
  if (!user) return navigate('/auth');
  if (checkedIn) return;

  setLoading(true);

  if (!("geolocation" in navigator)) {
    alert("Geolocation is not supported by your browser.");
    setLoading(false);
    return;
  }

  navigator.geolocation.getCurrentPosition(async (position) => {
    const userLat = position.coords.latitude;
    const userLng = position.coords.longitude;

    // Haversine formula to calculate distance from venue
    const R = 6371; // Radius of earth in km
    const dLat = (location.latitude - userLat) * Math.PI / 180;
    const dLon = (location.longitude - userLng) * Math.PI / 180;
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(userLat * Math.PI / 180) * Math.cos(location.latitude * Math.PI / 180) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    const distance = R * c;

    // Block check-in if distance > 0.5km (approx 0.3 miles)
    if (distance > 0.5) {
      alert(`Too far! You are ${distance.toFixed(2)}km away. Please be at the venue to check in.`);
      setLoading(false);
      return;
    }

    try {
      // Clear old check-ins and insert new one
      await supabase.from('checkins').update({ is_active: false }).eq('user_id', user.id);
      const { error } = await supabase.from('checkins').insert({
        user_id: user.id,
        location_id: id,
        is_active: true
      });

      if (error) throw error;
      
      setCheckedIn(true);
      setActiveCount(prev => prev + 1);
      setGridRefreshKey(prev => prev + 1);
    } catch (error) {
      console.error(error);
      alert("Check-in failed.");
    } finally {
      setLoading(false);
    }
  }, (err) => {
    alert("Please enable location services to check in.");
    setLoading(false);
  });
};

  const handleCheckOut = async () => {
    if (!user) return;
    try {
        // 1. Mark as inactive
        const { error } = await supabase
            .from('checkins')
            .update({ is_active: false })
            .eq('user_id', user.id)
            .eq('location_id', id);

        if (error) throw error;

        // 2. Update UI
        setCheckedIn(false);
        setActiveCount(prev => Math.max(0, prev - 1));
        setGridRefreshKey(prev => prev + 1); // Refresh grid to remove my face

    } catch (error) {
        console.error("Check-out failed", error);
        alert("Could not check out.");
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-500"><Loader2 className="animate-spin" /></div>;
  
  if (!location) return (
    <div className="min-h-screen bg-slate-950 p-10 text-white flex flex-col items-center">
        <p>Location not found.</p> 
        <button onClick={() => navigate('/')} className="mt-4 px-4 py-2 bg-slate-800 rounded">Go Home</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      
      {/* Hero Image */}
      <div className="relative h-72 w-full">
        <img 
            src={location.image_url || "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800"} 
            alt={location.name} 
            className="w-full h-full object-cover" 
        />
        
        <button 
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 p-3 bg-black/60 backdrop-blur-md rounded-full text-white z-50 hover:bg-black/80 transition"
        >
          <ArrowLeft size={24} />
        </button>

        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent pointer-events-none" />
        
        <div className="absolute bottom-0 left-0 p-6 w-full z-20">
          <h1 className="text-3xl font-bold text-white mb-1">{location.name}</h1>
          <div className="flex items-center gap-2 mb-2">
             <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
             <span className="text-white font-bold">{location.rating || 4.5}</span>
             <span className="text-slate-400 text-sm">({location.review_count || 100} reviews)</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-amber-500 text-black text-xs font-bold rounded-full uppercase">{location.type}</span>
            <div className="flex items-center gap-1.5 text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20">
              <span className={`w-2 h-2 rounded-full bg-green-500 ${activeCount > 0 ? 'animate-pulse' : ''}`}></span>
              <span className="text-xs font-medium">{activeCount === 0 ? "Be the first here" : `${activeCount} checked in`}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        <div className="bg-slate-900/50 p-5 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-4 text-slate-300">
            <Clock className="text-amber-500 w-5 h-5 shrink-0" />
            <span>{location.hours || "Open Daily"}</span>
          </div>
          <div className="flex items-center gap-4 text-slate-300">
            <MapPin className="text-amber-500 w-5 h-5 shrink-0" />
            <span>{location.address || "El Paso, TX"}</span>
          </div>
        </div>

        {/* CHECK IN / CHECK OUT BUTTONS */}
        <div className="w-full">
            {!checkedIn ? (
                <button 
                    onClick={handleCheckIn}
                    className="w-full py-4 font-bold rounded-xl transition shadow-lg flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20 active:scale-95"
                >
                    Check In Here
                </button>
            ) : (
                <div className="flex gap-3">
                    <button 
                        disabled
                        className="flex-1 py-4 font-bold rounded-xl flex items-center justify-center gap-2 bg-green-500/20 text-green-500 border border-green-500/50 cursor-default"
                    >
                        You're Checked In ✓
                    </button>
                    <button 
                        onClick={handleCheckOut}
                        className="px-6 py-4 font-bold rounded-xl flex items-center justify-center gap-2 bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20 transition active:scale-95"
                    >
                        <LogOut size={20} />
                        Leave
                    </button>
                </div>
            )}
        </div>

        {/* User Grid */}
        <div className="border-t border-slate-800 pt-6">
          <UserGrid locationId={id} key={gridRefreshKey} />
        </div>

        <p className="text-slate-400 text-sm leading-relaxed">{location.description}</p>
      </div>
    </div>
  );
};

export default LocationDetails;