import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { ArrowLeft, MapPin, Clock, Loader2, Star } from 'lucide-react';
import UserGrid from '../components/location/UserGrid'; // Import the grid

const LocationDetails = () => {
  const { id } = useParams(); 
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [location, setLocation] = useState(null);
  const [activeUsers, setActiveUsers] = useState([]); // List of actual people
  const [checkedIn, setCheckedIn] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLocationData = async () => {
      try {
        setLoading(true);
        // 1. Fetch Location Info
        const { data: locData, error } = await supabase.from('locations').select('*').eq('id', id).single();
        if (error) throw error;
        setLocation(locData);

        // 2. Fetch People (Check-ins + Profile Data)
        // We join the 'profiles' table to get names and photos
        const { data: peopleData, error: peopleError } = await supabase
          .from('checkins')
          .select(`
            id,
            user_id,
            profiles (
              id,
              display_name,
              full_name,
              avatar_url,
              handle
            )
          `)
          .eq('location_id', id)
          .eq('is_active', true); // Only show people currently here

        if (!peopleError) {
          setActiveUsers(peopleData || []);
        }

        // 3. Am I checked in?
        if (user) {
           const amIHere = peopleData?.some(p => p.user_id === user.id);
           if (amIHere) setCheckedIn(true);
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
      // Create check-in
      const { error } = await supabase.from('checkins').insert({
        user_id: user.id,
        location_id: id,
        is_active: true
      });

      if (error) throw error;
      
      // Update local state immediately so you appear in the grid
      setCheckedIn(true);
      
      // Fetch your own profile to add to the list locally (avoids a reload)
      const { data: myProfile } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      
      setActiveUsers(prev => [
        ...prev, 
        { id: 'temp-id', user_id: user.id, profiles: myProfile }
      ]);

    } catch (error) {
      console.error("Check-in failed:", error);
      alert("Could not check in.");
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-500"><Loader2 className="animate-spin" /></div>;
  if (!location) return <div className="min-h-screen bg-slate-950 p-10 text-white">Location not found. <button onClick={() => navigate('/')}>Back</button></div>;

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      
      {/* Hero Image */}
      <div className="relative h-72">
        <img src={location.image_url} alt={location.name} className="w-full h-full object-cover" />
        
        {/* FIX: Added z-10 so the gradient doesn't block clicks */}
        <button 
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 p-2 bg-black/50 backdrop-blur-md rounded-full text-white z-10 hover:bg-black/70 transition"
        >
          <ArrowLeft size={24} />
        </button>

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
              <span className={`w-2 h-2 rounded-full bg-green-500 ${activeUsers.length > 0 ? 'animate-pulse' : ''}`}></span>
              <span className="text-xs font-medium">
                {activeUsers.length === 0 ? "Be the first here" : `${activeUsers.length} checked in`}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6 space-y-8">
        {/* Info Box */}
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

        {/* Check In Action */}
        <button 
          onClick={handleCheckIn}
          disabled={checkedIn}
          className={`w-full py-4 font-bold rounded-xl transition shadow-lg flex items-center justify-center gap-2
            ${checkedIn 
              ? 'bg-green-500/20 text-green-500 cursor-default border border-green-500/50' 
              : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20 active:scale-95'
            }`}
        >
          {checkedIn ? "You are checked in! ✓" : "Check In Here"}
        </button>

        {/* RESTORED: Who's Here Grid */}
        <div className="border-t border-slate-800 pt-6">
          <UserGrid users={activeUsers} />
        </div>

        <p className="text-slate-400 text-sm leading-relaxed">{location.description}</p>
      </div>
    </div>
  );
};

export default LocationDetails;