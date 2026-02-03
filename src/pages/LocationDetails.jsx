import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { ArrowLeft, MapPin, Clock, Loader2, Star, MessageSquare } from 'lucide-react';

const LocationDetails = () => {
  const { id } = useParams(); // Returns string "1", "2" etc.
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [location, setLocation] = useState(null);
  const [activeCount, setActiveCount] = useState(0); 
  const [checkedIn, setCheckedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLocationData = async () => {
      try {
        setLoading(true);
        // 1. Fetch Location
        const { data: locData, error } = await supabase.from('locations').select('*').eq('id', id).single();
        if (error) throw error;
        setLocation(locData);

        // 2. Fetch Active Check-ins (Using your 'is_active' column)
        const { count } = await supabase.from('checkins')
          .select('*', { count: 'exact', head: true })
          .eq('location_id', id)
          .eq('is_active', true); // Only count people currently there
        
        setActiveCount(count || 0);

        // 3. Am I checked in?
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
      // Insert check-in. Note: Postgres handles string "1" -> bigint 1 conversion automatically usually, 
      // but strictly speaking your checkins.location_id is TEXT, so passing string is perfect.
      const { error } = await supabase.from('checkins').insert({
        user_id: user.id,
        location_id: id,
        is_active: true
      });

      if (error) throw error;
      
      setCheckedIn(true);
      setActiveCount(prev => prev + 1);

    } catch (error) {
      console.error("Check-in failed:", error);
      alert("Could not check in.");
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-500"><Loader2 className="animate-spin" /></div>;
  if (!location) return <div className="min-h-screen bg-slate-950 p-10 text-white">Location not found. <button onClick={() => navigate('/')}>Back</button></div>;

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      
      {/* Hero */}
      <div className="relative h-72">
        <img src={location.image_url} alt={location.name} className="w-full h-full object-cover" />
        <button onClick={() => navigate('/')} className="absolute top-4 left-4 p-2 bg-black/50 backdrop-blur-md rounded-full text-white"><ArrowLeft size={24} /></button>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-900/40 to-transparent" />
        
        <div className="absolute bottom-0 left-0 p-6 w-full">
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

      {/* Info Grid */}
      <div className="p-6 space-y-6">
        <p className="text-slate-300 text-lg">{location.description}</p>

        <div className="bg-slate-900/50 p-5 rounded-xl border border-slate-800 space-y-4">
          <div className="flex items-center gap-4 text-slate-300">
            <Clock className="text-amber-500 w-5 h-5 shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 uppercase font-bold">Hours</span>
              <span>{location.hours || "Open Daily"}</span>
            </div>
          </div>

          <div className="flex items-center gap-4 text-slate-300">
            <MapPin className="text-amber-500 w-5 h-5 shrink-0" />
            <div className="flex flex-col">
              <span className="text-xs text-slate-500 uppercase font-bold">Location</span>
              <span>{location.address || "El Paso, TX"}</span>
            </div>
          </div>
        </div>

        <button 
          onClick={handleCheckIn}
          disabled={checkedIn}
          className={`w-full py-4 font-bold rounded-xl transition shadow-lg flex items-center justify-center gap-2
            ${checkedIn 
              ? 'bg-green-500/20 text-green-500 cursor-default border border-green-500/50' 
              : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20 active:scale-95'
            }`}
        >
          {checkedIn ? (
            <>You are checked in! ✓</>
          ) : (
            <>Check In Here</>
          )}
        </button>
      </div>
    </div>
  );
};

export default LocationDetails;