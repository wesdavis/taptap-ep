import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { ArrowLeft, MapPin, Clock, Loader2, Star, LogOut, Phone, Globe, Navigation, ChevronRight, Camera, Crown, Calendar } from 'lucide-react';
import UserGrid from '../components/location/UserGrid'; 
import VenueAnalytics from '../components/business/VenueAnalytics';
import { toast } from 'sonner';

// 🟢 Replaced hardcoded key with secure environment variable
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

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
  
  const [isAdmin, setIsAdmin] = useState(false);

  useEffect(() => {
    const fetchLocationData = async () => {
      try {
        setLoading(true);
        // 1. Get Location Info
        const { data: locData, error } = await supabase.from('locations').select('*').eq('id', id).single();
        if (error) throw error;
        setLocation(locData);

        // 2. Get Check-in Count
        const { count } = await supabase.from('checkins')
          .select('*', { count: 'exact', head: true })
          .eq('location_id', id)
          .eq('is_active', true);
        setActiveCount(count || 0);

        // 3. Check if I am checked in AND if I am an Admin
        if (user) {
           const { data: myCheckin } = await supabase.from('checkins')
             .select('*')
             .eq('user_id', user.id)
             .eq('location_id', id)
             .eq('is_active', true)
             .maybeSingle();
           if (myCheckin) setCheckedIn(true);

           const { data: profile } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
           if (profile?.is_admin) setIsAdmin(true);
        }
      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
    };
    fetchLocationData();
  }, [id, user]);

  // STRICT DISTANCE CALCULATOR
  const getDistanceFromLatLonInKm = (lat1, lon1, lat2, lon2) => {
    const R = 6371; 
    const dLat = (lat2-lat1) * (Math.PI/180);
    const dLon = (lon2-lon1) * (Math.PI/180);
    const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
              Math.cos(lat1 * (Math.PI/180)) * Math.cos(lat2 * (Math.PI/180)) * Math.sin(dLon/2) * Math.sin(dLon/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
    return R * c; 
  };

  const handleCheckIn = async () => {
    if (!user) return navigate('/auth');
    if (checkedIn) return;

    setCheckingLocation(true);

    if (!navigator.geolocation) {
        toast.error("Geolocation is not supported by your browser");
        setCheckingLocation(false);
        return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
        const userLat = position.coords.latitude;
        const userLon = position.coords.longitude;
        
        const distKm = getDistanceFromLatLonInKm(userLat, userLon, location.latitude, location.longitude);
        const distMiles = distKm * 0.621371;

        if (distMiles > 0.5) {
            toast.error(`Too far! You are ${distMiles.toFixed(1)} miles away.`);
            setCheckingLocation(false);
            return; 
        }

        try {
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
            toast.success("You are checked in!");
        } catch (error) {
            toast.error("Check-in failed. Try again.");
        } finally {
            setCheckingLocation(false);
        }
    }, (error) => {
        toast.error("Could not get your location. Enable GPS.");
        setCheckingLocation(false);
    });
  };

  const handleCheckOut = async () => {
    if (!user) return;
    try {
        await supabase.from('checkins').update({ is_active: false }).eq('user_id', user.id).eq('location_id', id);
        setCheckedIn(false);
        setActiveCount(prev => Math.max(0, prev - 1));
        setGridRefreshKey(prev => prev + 1);
        toast.success("Checked out.");
    } catch (error) {
        toast.error("Could not check out.");
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-500"><Loader2 className="animate-spin" /></div>;
  if (!location) return <div>Location not found</div>;

  let todayHours = "Open Daily";
  if (location.hours) {
    if (location.hours.includes('\n')) {
        const days = ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"];
        const todayName = days[new Date().getDay()];
        const match = location.hours.split('\n').find(line => line.includes(todayName));
        if (match) todayHours = match.split(': ').slice(1).join(': ');
    } else {
        todayHours = location.hours;
    }
  }

  const heroImage = (location.google_photos && location.google_photos.length > 0)
    ? `https://places.googleapis.com/v1/${location.google_photos[0]}/media?key=${GOOGLE_MAPS_API_KEY}&maxHeightPx=800&maxWidthPx=1200`
    : (location.image_url || "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800");

  const isPromoted = location.is_promoted;

  return (
    <div className={`min-h-screen bg-slate-950 pb-20 ${isPromoted ? 'bg-amber-950/10' : ''}`}>
      
      {/* Hero Image */}
      <div className={`relative h-72 w-full ${isPromoted ? 'border-b-4 border-amber-500 shadow-[0_0_50px_rgba(245,158,11,0.3)]' : ''}`}>
        <img src={heroImage} alt={location.name} className="w-full h-full object-cover" />
        <button onClick={() => navigate('/')} className="absolute top-4 left-4 p-3 bg-black/60 backdrop-blur-md rounded-full text-white z-50">
          <ArrowLeft size={24} />
        </button>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/40 to-transparent pointer-events-none" />
        
        <div className="absolute bottom-0 left-0 p-6 w-full z-20">
          
          {isPromoted && (
              <div className="inline-flex items-center gap-1.5 bg-amber-500 text-black px-3 py-1 rounded-full text-xs font-black uppercase tracking-widest mb-2 shadow-lg animate-in slide-in-from-left-4">
                  <Crown className="w-4 h-4 fill-black" />
                  Official Partner
              </div>
          )}

          <h1 className={`text-3xl font-bold mb-1 ${isPromoted ? 'text-white drop-shadow-[0_2px_4px_rgba(245,158,11,0.5)]' : 'text-white'}`}>{location.name}</h1>
          <div className="flex items-center gap-2 mb-2">
             <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
             <span className="text-white font-bold">{location.google_rating || location.rating || 4.5}</span>
             <span className="text-slate-400 text-sm">({location.google_user_ratings_total || 100} reviews)</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-slate-800/80 backdrop-blur-md text-amber-500 text-xs font-bold rounded-full uppercase border border-slate-700">{location.type}</span>
            <span className="text-green-400 text-sm font-bold tracking-widest">{location.price_level || '$$'}</span>
            <div className="flex items-center gap-1.5 text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20 ml-auto">
              <span className={`w-2 h-2 rounded-full bg-green-500 ${activeCount > 0 ? 'animate-pulse' : ''}`}></span>
              <span className="text-xs font-medium">{activeCount === 0 ? "Be the first here" : `${activeCount} checked in`}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        {/* Info Card */}
        <div className={`bg-slate-900/50 p-5 rounded-2xl border space-y-4 shadow-xl ${isPromoted ? 'border-amber-500/50 shadow-amber-500/10' : 'border-slate-800'}`}>
          <div className="flex items-center justify-between">
             <div className="flex items-center gap-3 text-slate-300">
                <Clock className="text-amber-500 w-5 h-5 shrink-0" />
                <div>
                    <p className="text-xs text-slate-500 uppercase font-bold">Today</p>
                    <p className="text-sm font-medium text-white">{todayHours}</p>
                </div>
             </div>
             {location.hours && <ChevronRight className="w-5 h-5 text-slate-600" />}
          </div>
          
          <div className="h-px bg-slate-800 w-full" />

          <div className="flex items-start gap-3 text-slate-300">
            <MapPin className="text-amber-500 w-5 h-5 shrink-0 mt-0.5" />
            <span className="text-sm">{location.address || "Address loading..."}</span>
          </div>
          
          <div className="grid grid-cols-2 gap-3 pt-2">
            {location.website && (
                <a href={location.website} target="_blank" rel="noreferrer" className="flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700">
                    <Globe size={14} className="text-amber-500" /> Website
                </a>
            )}
            {location.phone && (
                <a href={`tel:${location.phone}`} className="flex items-center justify-center gap-2 py-2.5 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold border border-slate-700">
                    <Phone size={14} className="text-amber-500" /> Call
                </a>
            )}
          </div>
        </div>

        {/* Photos */}
        {location.google_photos && location.google_photos.length > 0 && (
          <div>
            <h3 className="text-white font-bold mb-3 flex items-center gap-2">
                <Camera className="w-4 h-4 text-amber-500" /> Vibe Check
            </h3>
            <div className="flex gap-3 overflow-x-auto pb-4 snap-x scrollbar-hide">
                {location.google_photos.map((photoName, index) => (
                    <div key={index} className="snap-center shrink-0 w-48 h-32 rounded-xl overflow-hidden border border-slate-800 relative">
                        <img 
                            src={`https://places.googleapis.com/v1/${photoName}/media?key=${GOOGLE_MAPS_API_KEY}&maxHeightPx=400&maxWidthPx=400`}
                            alt="Venue Vibe"
                            className="w-full h-full object-cover"
                            loading="lazy"
                        />
                    </div>
                ))}
            </div>
          </div>
        )}

        {/* Check In Button */}
        <div className="w-full">
            {!checkedIn ? (
                <button 
                    onClick={handleCheckIn}
                    disabled={checkingLocation}
                    className={`w-full py-4 font-bold rounded-xl transition shadow-lg flex items-center justify-center gap-2 text-black active:scale-95 disabled:opacity-50 ${
                        isPromoted 
                        ? "bg-gradient-to-r from-amber-400 to-amber-600 hover:from-amber-300 hover:to-amber-500 shadow-amber-500/20"
                        : "bg-amber-500 hover:bg-amber-400 shadow-amber-500/20"
                    }`}
                >
                    {checkingLocation ? <Loader2 className="animate-spin w-5 h-5" /> : <Navigation size={20} className="fill-black" />}
                    {checkingLocation ? "Verifying GPS..." : "Check In Here"}
                </button>
            ) : (
                <div className="flex gap-3">
                    <div className="flex-1 py-4 font-bold rounded-xl flex items-center justify-center gap-2 bg-green-500/10 text-green-500 border border-green-500/30">
                        You're Here ✓
                    </div>
                    <button 
                        onClick={handleCheckOut}
                        className="px-6 py-4 font-bold rounded-xl flex items-center justify-center gap-2 bg-red-500/10 text-red-500 border border-red-500/30 hover:bg-red-500/20 active:scale-95"
                    >
                        <LogOut size={20} />
                    </button>
                </div>
            )}
        </div>

        {/* 🟢 FIXED: Map Iframe URL */}
        {location.google_place_id && (
          <div className="rounded-xl overflow-hidden border border-slate-800 h-40 w-full opacity-80 hover:opacity-100 transition">
            <iframe
              width="100%" height="100%" style={{ border: 0 }} loading="lazy"
              src={`https://www.google.com/maps/embed/v1/place?key=${GOOGLE_MAPS_API_KEY}&q=place_id:${location.google_place_id}`}
            ></iframe>
          </div>
        )}

        <div className="border-t border-slate-800 pt-6">
          <UserGrid locationId={id} key={gridRefreshKey} />
        </div>

        <p className="text-slate-400 text-sm leading-relaxed text-center px-4 pb-4">
            {location.description || "Join the local scene at this venue."}
        </p>

        {/* YOUR HISTORY AT THIS LOCATION */}
        <div className="mt-8 border-t border-slate-800 pt-6 px-4">
            <h3 className="text-sm font-bold text-slate-400 uppercase tracking-widest mb-4">Your History Here</h3>
            <LocationHistory locationId={id} />
        </div>

        {/* SHOW ANALYTICS IF ADMIN */}
        {isAdmin && (
            <div className="mt-8 animate-in slide-in-from-bottom-10 fade-in duration-500">
                <VenueAnalytics locationId={id} />
            </div>
        )}

      </div>
    </div>
  );
};

// Sub-Component: Location History
function LocationHistory({ locationId }) {
    const { user } = useAuth();
    const [history, setHistory] = useState([]);

    useEffect(() => {
        async function load() {
            // Get dates I visited
            const { data: visits } = await supabase.from('checkins')
                .select('created_at')
                .eq('user_id', user.id).eq('location_id', locationId)
                .order('created_at', { ascending: false });
            
            setHistory(visits || []);
        }
        if (user) load();
    }, [user, locationId]);

    if (history.length === 0) return <p className="text-xs text-slate-600 italic">First time here!</p>;

    return (
        <div className="space-y-3">
            {history.map((h, i) => (
                <div key={i} className="flex items-center gap-3 text-sm text-slate-400 bg-slate-900/50 p-3 rounded-lg border border-slate-800">
                    <Calendar className="w-4 h-4 text-amber-500" />
                    <span>Visited on {new Date(h.created_at).toLocaleDateString()}</span>
                </div>
            ))}
        </div>
    );
}

export default LocationDetails;