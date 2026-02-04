import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { ArrowLeft, MapPin, Zap, Check, Loader2, User, Trophy, Calendar } from 'lucide-react';
import { toast } from 'sonner';

export default function PublicProfile() {
  const { id } = useParams(); // The ID of the person you are looking at
  const { user } = useAuth();
  const navigate = useNavigate();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [pingStatus, setPingStatus] = useState('idle'); // 'idle' | 'sending' | 'sent' | 'error'
  const [mutualLocation, setMutualLocation] = useState(null);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 1. Fetch Their Profile
        const { data: profileData, error } = await supabase
          .from('profiles')
          .select('*')
          .eq('id', id)
          .single();
        
        if (error) throw error;
        setProfile(profileData);

        // 2. Check if we are both at the same location
        if (user) {
          // Get my active location
          const { data: myCheckIn } = await supabase
            .from('checkins')
            .select('location_id')
            .eq('user_id', user.id)
            .eq('is_active', true)
            .maybeSingle();

          // Get their active location
          const { data: theirCheckIn } = await supabase
            .from('checkins')
            .select('location_id, locations(name)')
            .eq('user_id', id)
            .eq('is_active', true)
            .maybeSingle();

          // If match, store it
          if (myCheckIn && theirCheckIn && myCheckIn.location_id === theirCheckIn.location_id) {
            setMutualLocation(theirCheckIn.locations?.name);
          }

          // 3. Check if I already tapped them
          const { data: existingPing } = await supabase
            .from('pings')
            .select('*')
            .eq('from_user_id', user.id)
            .eq('to_user_id', id)
            .is('met_confirmed', null) // Only check active, unmet pings
            .maybeSingle();

          if (existingPing) setPingStatus('sent');
        }

      } catch (err) {
        console.error('Error loading profile:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [id, user]);

  const handleTap = async () => {
    if (!user) return navigate('/auth');
    if (!mutualLocation) {
        toast.error("You must be at the same location to tap!");
        return;
    }

    try {
      setPingStatus('sending');

      // 1. Get Location ID
      const { data: checkIn } = await supabase
        .from('checkins')
        .select('location_id')
        .eq('user_id', user.id)
        .eq('is_active', true)
        .single();

      if (!checkIn) throw new Error("You are not checked in anywhere.");

      // 2. Insert Ping
      const { error } = await supabase.from('pings').insert({
        from_user_id: user.id,
        to_user_id: id,
        location_id: checkIn.location_id,
        status: 'pending'
      });

      if (error) throw error;

      // 3. Success State
      setPingStatus('sent');
      toast.success(`You tapped ${profile.display_name}!`);

    } catch (err) {
      console.error(err);
      toast.error("Could not send tap. Try again.");
      setPingStatus('idle');
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-500"><Loader2 className="animate-spin" /></div>;
  if (!profile) return <div className="min-h-screen bg-slate-950 p-10 text-white text-center">User not found <br/><button onClick={()=>navigate(-1)} className="mt-4 text-amber-500">Go Back</button></div>;

  // Calculate Age
  const getAge = (dateString) => {
    if (!dateString) return null;
    const today = new Date();
    const birthDate = new Date(dateString);
    let age = today.getFullYear() - birthDate.getFullYear();
    const m = today.getMonth() - birthDate.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < birthDate.getDate())) age--;
    return age;
  };

  const age = getAge(profile.birthdate);

  return (
    <div className="min-h-screen bg-slate-950 pb-10">
      
      {/* Header Image / Pattern */}
      <div className="h-40 bg-gradient-to-br from-slate-900 to-slate-800 relative">
        <button 
          onClick={() => navigate('/')}
          className="absolute top-4 left-4 p-2 bg-black/30 backdrop-blur-md rounded-full text-white hover:bg-black/50 transition z-10"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="absolute inset-0 opacity-20 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')]"></div>
      </div>

      {/* Profile Content */}
      <div className="px-4 -mt-16 relative z-10">
        
        {/* Avatar */}
        <div className="w-32 h-32 rounded-full border-4 border-slate-950 bg-slate-800 mx-auto overflow-hidden shadow-2xl relative">
          {profile.avatar_url ? (
            <img src={profile.avatar_url} className="w-full h-full object-cover" />
          ) : (
            <User className="w-12 h-12 text-slate-500 m-auto mt-8" />
          )}
        </div>

        {/* Identity */}
        <div className="text-center mt-4">
          <h1 className="text-2xl font-bold text-white flex items-center justify-center gap-2">
            {profile.display_name} 
            {age && <span className="text-lg font-normal text-slate-400">, {age}</span>}
          </h1>
          <p className="text-amber-500 font-medium">@{profile.handle}</p>
          
          {/* XP Badge */}
          <div className="inline-flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-full px-3 py-1 mt-3">
            <Trophy className="w-3 h-3 text-yellow-500" />
            <span className="text-xs text-slate-300 font-bold">{profile.xp || 0} XP</span>
          </div>
        </div>

        {/* Bio Card */}
        <div className="bg-slate-900/50 border border-slate-800 rounded-2xl p-6 mt-6 shadow-lg">
           <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-2">About</h3>
           <p className="text-slate-300 leading-relaxed text-sm">
             {profile.bio || "No bio yet."}
           </p>

           <div className="mt-6 flex flex-wrap gap-2">
              {profile.gender && (
                 <span className="px-3 py-1 bg-slate-800 rounded-lg text-xs text-slate-400 border border-slate-700">
                    {profile.gender}
                 </span>
              )}
              {profile.looking_for && (
                 <span className="px-3 py-1 bg-slate-800 rounded-lg text-xs text-slate-400 border border-slate-700">
                    Looking for: {profile.looking_for}
                 </span>
              )}
           </div>
        </div>

        {/* Action Area */}
        <div className="fixed bottom-0 left-0 w-full p-4 bg-slate-950/80 backdrop-blur-lg border-t border-slate-900">
            {mutualLocation ? (
                <button
                    onClick={handleTap}
                    disabled={pingStatus === 'sent' || pingStatus === 'sending'}
                    className={`w-full py-4 rounded-xl font-bold flex items-center justify-center gap-2 transition-all active:scale-95 shadow-lg ${
                        pingStatus === 'sent' 
                        ? 'bg-slate-800 text-slate-400 cursor-default'
                        : 'bg-amber-500 hover:bg-amber-400 text-black shadow-amber-500/20'
                    }`}
                >
                    {pingStatus === 'sending' ? (
                        <Loader2 className="animate-spin w-5 h-5" />
                    ) : pingStatus === 'sent' ? (
                        <>
                           <Check className="w-5 h-5" />
                           Sent!
                        </>
                    ) : (
                        <>
                           <Zap className="w-5 h-5 fill-black" />
                           Tap to Connect
                        </>
                    )}
                </button>
            ) : (
                <div className="w-full py-3 bg-slate-900 rounded-xl border border-slate-800 text-center">
                    <p className="text-slate-500 text-sm flex items-center justify-center gap-2">
                        <MapPin className="w-4 h-4" />
                        You must be at the same location to tap.
                    </p>
                </div>
            )}
        </div>

      </div>
    </div>
  );
}