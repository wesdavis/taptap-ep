import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { ArrowLeft, MapPin, Clock, Loader2, Star, LogOut, User as UserIcon, Navigation, Globe, Phone } from 'lucide-react';
import UserGrid from '../components/location/UserGrid'; 
import { toast } from 'sonner';

// 🟢 ADD YOUR KEY HERE
const GOOGLE_MAPS_API_KEY = AIzaSyD6a6NR3DDmw15x2RgQcpV3NaBunD2ZYxk;

const LocationDetails = () => {
  const { id } = useParams(); 
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [location, setLocation] = useState(null);
  const [activeCount, setActiveCount] = useState(0); 
  const [checkedIn, setCheckedIn] = useState(false);
  const [loading, setLoading] = useState(true);
  const [checkingLocation, setCheckingLocation] = useState(false);
  const [gridRefreshKey, setGridRefreshKey] = useState(0);
  
  // State for live Google Data
  const [liveDetails, setLiveDetails] = useState({
    address: '',
    hours: '',
    isOpen: null,
    phone: '',
    website: ''
  });

  useEffect(() => {
    const fetchLocationData = async () => {
      try {
        setLoading(true);
        // Fetch Location from Supabase
        const { data: locData, error } = await supabase.from('locations').select('*').eq('id', id).single();
        if (error) throw error;
        setLocation(locData);

        // Fetch active check-ins count
        const { count } = await supabase.from('checkins')
          .select('*', { count: 'exact', head: true })
          .eq('location_id', id)
          .eq('is_active', true);
        setActiveCount(count || 0);

        // Check if current user is checked in
        if (user) {
           const { data: myCheckin } = await supabase.from('checkins')
             .select('*')
             .eq('user_id', user.id)
             .eq('location_id', id)
             .eq('is_active', true)
             .maybeSingle();
           if (myCheckin) setCheckedIn(true);
        }
      } catch (err) { 
        console.error(err); 
        toast.error("Error loading location data");
      } finally { 
        setLoading(false); 
      }
    };
    fetchLocationData();
  }, [id, user]);

  // 🟢 Fetch Live Google Data (Places API New)
  useEffect(() => {
    if (location?.google_place_id && GOOGLE_MAPS_API_KEY !== "YOUR_GOOGLE_MAPS_API_KEY_HERE") {
      const fetchGoogleDetails = async () => {
        try {
          const response = await fetch(
            `https://places.googleapis.com/v1/places/${location.google_place_id}`, 
            {
              headers: {
                'Content-Type': 'application/json',
                'X-Goog-Api-Key': GOOGLE_MAPS_API_KEY,
                'X-Goog-FieldMask': 'formattedAddress,currentOpeningHours,nationalPhoneNumber,websiteUri'
              }
            }
          );
          const data = await response.json();
          setLiveDetails({
            address: data.formattedAddress,
            hours: data.currentOpeningHours?.weekdayDescriptions?.[(new Date().getDay() + 6) % 7] || "Hours not available",
            isOpen: data.currentOpeningHours?.openNow,
            phone: data.nationalPhoneNumber,
            website: data.websiteUri
          });
        } catch (err) { 
          console.error("Google fetch failed:", err); 
        }
      };
      fetchGoogleDetails();
    }
  }, [location?.google_place_id]);

  const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = (lat2-lat1) * (Math.PI/180);
    const dLon = (lon2-lon1) * (Math.PI/180);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * Math.sin(dLon/2) * Math.sin(dLon/2);
    return R * (2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)));
  };

  const handleCheckIn = async () => {
    if (!user) return navigate('/auth');
    setCheckingLocation(true);

    navigator.geolocation.getCurrentPosition(async (position) => {
      const dist = getDistanceFromLatLonInKm(position.coords.latitude, position.coords.longitude, location.latitude, location.longitude);

      if (dist > 0.5) {
        toast.error(`Too far! You are ${dist.toFixed(1)}km away.`);
        setCheckingLocation(false);
        return;
      }

      try {
        await supabase.from('checkins').update({ is_active: false }).eq('user_id', user.id);
        await supabase.from('checkins').insert({ user_id: user.id, location_id: id, is_active: true });
        setCheckedIn(true);
        setActiveCount(prev => prev + 1);
        setGridRefreshKey(prev => prev + 1);
        toast.success("Checked in!");
      } catch (error) { 
        toast.error("Check-in failed."); 
      } finally { 
        setCheckingLocation(false); 
      }
    }, () => {
      setCheckingLocation(false);
      toast.error("Please enable location to check in.");
    });
  };

  const handleCheckOut = async () => {
    try {
        await supabase.from('checkins').update({ is_active: false }).eq('user_id', user.id).eq('location_id', id);
        setCheckedIn(false);
        setActiveCount(prev => Math.max(0, prev - 1));
        setGridRefreshKey(prev => prev + 1);
        toast.success("Checked out");
    } catch (error) { 
        console.error(error); 
    }
  };

  if (loading) return (
    <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-500">
      <Loader2 className="animate-spin w-8 h-8" />
    </div>
  );

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
          <div className="flex items-center gap-3 mb-2">
             <div className="flex items-center gap-1">
                <Star className="w-4 h-4 text-yellow-400 fill-yellow-400" />
                <span className="text-white font-bold text-sm">{location.rating || 4.5}</span>
             </div>
             <span className="px-2 py-0.5 bg-amber-500 text-black text-[10px] font-black rounded-md uppercase">{location.type}</span>
             {liveDetails.isOpen !== null && (
              <span className={`text-[10px] font-black tracking-tighter ${liveDetails.isOpen ? 'text-green-400' : 'text-red-400'}`}>
                {liveDetails.isOpen ? "● OPEN NOW" : "● CLOSED"}
              </span>
            )}
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        
        {/* Live Info Card */}
        <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
          <div className="flex items-start gap-4 text-slate-300">
            <Clock className="text-amber-500 w-5 h-5 shrink-0 mt-0.5" />
            <span className="text-sm font-medium">{liveDetails.hours || location.hours || "Loading hours..."}</span>
          </div>
          <div className="flex items-start gap-4 text-slate-300">
            <MapPin className="text-amber-500 w-5 h-5 shrink-0 mt-0.5" />
            <span className="text-sm font-medium">{liveDetails.address || location.address || "Loading address..."}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 pt-2">
            <a 
                href={`https://www.google.com/maps/dir/?api=1&destination_place_id=${location.google_place_id}`}
                target="_blank" rel="noopener noreferrer"
                className="flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition border border-slate-700"
            >
                <Navigation size={14} className="text-amber-500" /> Directions
            </a>
            {liveDetails.website && (
                <a 
                    href={liveDetails.website}
                    target="_blank" rel="noopener noreferrer"
                    className="flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition border border-slate-700"
                >
                    <Globe size={14} className="text-amber-500" /> Website
                </a>
            )}
          </div>
        </div>

        {/* 🟢 Mini Map Embed */}
        {location.google_place_id && (
          <div className="rounded-2xl overflow-hidden border border-slate-800 h-44 w-full shadow-2xl">
            <iframe
              width="100%" height="100%" style={{ border: 0 }} loading="lazy"
              src={`https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=place_id:${location.google_place_id}`}
            ></iframe>
          </div>
        )}

        {/* Check-in Actions */}
        <div className="w-full">
            {!checkedIn ? (
                <button 
                    disabled={checkingLocation}
                    onClick={handleCheckIn}
                    className="w-full py-4 font-bold rounded-2xl transition shadow-lg flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20 active:scale-95 disabled:opacity-70"
                >
                    {checkingLocation ? <Loader2 className="animate-spin w-5 h-5" /> : <Navigation size={20} className="fill-black" />}
                    {checkingLocation ? "Verifying..." : "Check In to See Who's Here"}
                </button>
            ) : (
                <div className="flex gap-3">
                    <div className="flex-1 py-4 font-bold rounded-2xl flex items-center justify-center gap-2 bg-green-500/10 text-green-500 border border-green-500/30">
                        You're Here ✓
                    </div>
                    <button 
                        onClick={handleCheckOut}
                        className="px-6 py-4 font-bold rounded-2xl flex items-center justify-center gap-2 bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20 transition active:scale-95"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            )}
        </div>

        {/* 🟢 User Grid or Party Meter Logic */}
        <div className="border-t border-slate-800 pt-6">
          {checkedIn ? (
            <UserGrid locationId={id} key={gridRefreshKey} />
          ) : (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 text-center backdrop-blur-md shadow-inner">
              <div className="mb-4 flex justify-center">
                <div className="relative">
                  <div className="w-16 h-16 bg-amber-500/20 rounded-full animate-ping absolute" />
                  <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center relative z-10">
                    <UserIcon className="text-amber-500 w-8 h-8" />
                  </div>
                </div>
              </div>
              
              <h3 className="text-xl font-bold mb-4">Location Vibe</h3>
              
              <div className="w-full bg-slate-800 h-3 rounded-full mb-3 overflow-hidden border border-slate-700">
                <div 
                  className="h-full bg-gradient-to-r from-amber-500 to-orange-500 transition-all duration-1000 ease-out" 
                  style={{ width: `${Math.min((activeCount / 15) * 100, 100)}%` }}
                />
              </div>
              
              <p className="text-slate-400 text-sm italic">
                {activeCount === 0 ? "Be the first to arrive!" : 
                 activeCount < 5 ? "A quiet vibe right now." : 
                 "Things are heating up! Check in to see who's here."}
              </p>
            </div>
          )}
        </div>

        <p className="text-slate-500 text-xs leading-relaxed px-2 text-center">
          {location.description || "Join the local scene at this venue. Check in to connect with others and earn achievements."}
        </p>
      </div>
    </div>
  );
};

export default LocationDetails;