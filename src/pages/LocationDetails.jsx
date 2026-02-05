import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { ArrowLeft, MapPin, Clock, Loader2, Star, LogOut, Phone, Globe, Navigation, ChevronRight, Camera } from 'lucide-react';
import UserGrid from '../components/location/UserGrid'; 
import { toast } from 'sonner';

// 🟢 API Key for Photos & Map
const GOOGLE_MAPS_API_KEY = "AIzaSyD6a6NR3DDmw15x2RgQcpV3NaBunD2ZYxk";

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
        // Fetch Location (Includes google_photos, price_level, etc.)
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

    try {
      // Check out of everywhere else first
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
      toast.error("Could not check in.");
    }
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

  // 🟢 Helper: Get Today's Hours
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

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      
      {/* 🟢 HERO IMAGE */}
      <div className="relative h-72 w-full">
        <img 
            src={location.image_url || "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800"} 
            alt={location.name} 
            className="w-full h-full object-cover" 
        />
        <button onClick={() => navigate('/')} className="absolute top-4 left-4 p-3 bg-black/60 backdrop-blur-md rounded-full text-white z-50">
          <ArrowLeft size={24} />
        </button>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent pointer-events-none" />
        
        <div className="absolute bottom-0 left-0 p-6 w-full z-20">
          <h1 className="text-3xl font-bold text-white mb-1">{location.name}</h1>
          <div className="flex items-center gap-2 mb-2">
             <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
             <span className="text-white font-bold">{location.google_rating || location.rating || 4.5}</span>
             <span className="text-slate-400 text-sm">({location.google_user_ratings_total || 100} reviews)</span>
          </div>
          
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-amber-500 text-black text-xs font-bold rounded-full uppercase">{location.type}</span>
            {/* 🟢 PRICE LEVEL */}
            <span className="text-green-400 text-sm font-bold tracking-widest">{location.price_level || '$$'}</span>
             
             {/* Live Activity Badge */}
            <div className="flex items-center gap-1.5 text-green-400 bg-green-500/10 px-3 py-1 rounded-full border border-green-500/20 ml-auto">
              <span className={`w-2 h-2 rounded-full bg-green-500 ${activeCount > 0 ? 'animate-pulse' : ''}`}></span>
              <span className="text-xs font-medium">{activeCount === 0 ? "Be the first here" : `${activeCount} checked in`}</span>
            </div>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-6">
        
        {/* 🟢 RICH INFO CARD */}
        <div className="bg-slate-900/50 p-5 rounded-2xl border border-slate-800 space-y-4 shadow-xl">
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
          
          {/* Action Buttons */}
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

        {/* 🟢 GOOGLE PHOTOS CAROUSEL */}
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

        {/* CHECK IN BUTTONS */}
        <div className="w-full">
            {!checkedIn ? (
                <button 
                    onClick={handleCheckIn}
                    className="w-full py-4 font-bold rounded-xl transition shadow-lg flex items-center justify-center gap-2 bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20 active:scale-95"
                >
                    <Navigation size={20} className="fill-black" />
                    Check In Here
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

        {/* 🟢 MAP EMBED */}
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
      </div>
    </div>
  );
};

export default LocationDetails;