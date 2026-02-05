import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { ArrowLeft, MapPin, Clock, Loader2, Star, LogOut, User as UserIcon, Navigation } from 'lucide-react';
import UserGrid from '../components/location/UserGrid'; 
import { toast } from 'sonner';

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

  useEffect(() => {
    const fetchLocationData = async () => {
      try {
        setLoading(true);
        const { data: locData, error } = await supabase.from('locations').select('*').eq('id', id).single();
        if (error) throw error;
        setLocation(locData);

        const { count } = await supabase.from('checkins')
          .select('*', { count: 'exact', head: true })
          .eq('location_id', id)
          .eq('is_active', true);
        setActiveCount(count || 0);

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

    if (!("geolocation" in navigator)) {
      toast.error("Geolocation not supported");
      setCheckingLocation(false);
      return;
    }

    navigator.geolocation.getCurrentPosition(async (position) => {
      const dist = getDistanceFromLatLonInKm(position.coords.latitude, position.coords.longitude, location.latitude, location.longitude);
      
      if (dist > 0.5) {
        toast.error(`Too far away! You are ${dist.toFixed(1)}km from ${location.name}.`);
        setCheckingLocation(false);
        return;
      }

      try {
        await supabase.from('checkins').update({ is_active: false }).eq('user_id', user.id);
        const { error } = await supabase.from('checkins').insert({ user_id: user.id, location_id: id, is_active: true });
        if (error) throw error;
        
        setCheckedIn(true);
        setActiveCount(prev => prev + 1);
        setGridRefreshKey(prev => prev + 1);
        toast.success(`Checked in to ${location.name}!`);
      } catch (error) {
        toast.error("Check-in failed.");
      } finally {
        setCheckingLocation(false);
      }
    }, () => {
      setCheckingLocation(false);
      toast.error("Please enable location services.");
    });
  };

  const handleCheckOut = async () => {
    try {
        await supabase.from('checkins').update({ is_active: false }).eq('user_id', user.id).eq('location_id', id);
        setCheckedIn(false);
        setActiveCount(prev => Math.max(0, prev - 1));
        setGridRefreshKey(prev => prev + 1);
    } catch (error) { console.error(error); }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-500"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      <div className="relative h-72 w-full">
        <img src={location.image_url} alt={location.name} className="w-full h-full object-cover" />
        <button onClick={() => navigate('/')} className="absolute top-4 left-4 p-3 bg-black/60 backdrop-blur-md rounded-full text-white z-50"><ArrowLeft size={24} /></button>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent pointer-events-none" />
        <div className="absolute bottom-0 left-0 p-6 w-full z-20">
          <h1 className="text-3xl font-bold text-white mb-1">{location.name}</h1>
          <div className="flex items-center gap-2 mb-2">
            <Star className="w-5 h-5 text-yellow-400 fill-yellow-400" />
            <span className="text-white font-bold">{location.rating || 4.5}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="px-3 py-1 bg-amber-500 text-black text-xs font-bold rounded-full uppercase">{location.type}</span>
          </div>
        </div>
      </div>

      <div className="p-6 space-y-8">
        <div className="w-full">
            {!checkedIn ? (
                <button 
                    disabled={checkingLocation}
                    onClick={handleCheckIn}
                    className="w-full py-4 font-bold rounded-xl transition bg-amber-500 hover:bg-amber-400 text-black flex items-center justify-center gap-2"
                >
                    {checkingLocation ? <Loader2 className="animate-spin" /> : <Navigation size={20} />}
                    {checkingLocation ? "Verifying Location..." : "Check In to See Who's Here"}
                </button>
            ) : (
                <div className="flex gap-3">
                    <button disabled className="flex-1 py-4 font-bold rounded-xl bg-green-500/20 text-green-500 border border-green-500/50">Checked In ✓</button>
                    <button onClick={handleCheckOut} className="px-6 py-4 font-bold rounded-xl bg-red-500/10 text-red-500 border border-red-500/30">Leave</button>
                </div>
            )}
        </div>

        {/* 🟢 PARTY METER / USER GRID LOGIC */}
        <div className="border-t border-slate-800 pt-6">
          {checkedIn ? (
            <UserGrid locationId={id} key={gridRefreshKey} />
          ) : (
            <div className="bg-slate-900/80 border border-slate-800 rounded-2xl p-8 text-center backdrop-blur-sm shadow-xl">
              <div className="mb-4 flex justify-center">
                <div className="relative">
                  <div className="w-16 h-16 bg-amber-500/20 rounded-full animate-ping absolute" />
                  <div className="w-16 h-16 bg-amber-500/20 rounded-full flex items-center justify-center relative z-10"><UserIcon className="text-amber-500 w-8 h-8" /></div>
                </div>
              </div>
              <h3 className="text-xl font-bold mb-4">Location Vibe</h3>
              <div className="w-full bg-slate-800 h-3 rounded-full mb-3 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-amber-500 to-orange-500" style={{ width: `${Math.min((activeCount / 15) * 100, 100)}%` }} />
              </div>
              <p className="text-slate-400 text-sm italic">
                {activeCount === 0 ? "Be the first to arrive!" : `${activeCount} people currently checked in. Get here to see who!`}
              </p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
export default LocationDetails;