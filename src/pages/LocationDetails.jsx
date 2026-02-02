import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, MapPin, Clock, Users, Star, MessageSquare } from 'lucide-react'; // Added icons

const LocationDetails = () => {
  const { id } = useParams(); 
  const navigate = useNavigate();
  const [location, setLocation] = useState(null);
  const [activeCount, setActiveCount] = useState(0); 
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLocationData = async () => {
      try {
        setLoading(true);
        // 1. Fetch Location
        const { data: locData, error } = await supabase.from('locations').select('*').eq('id', id).single();
        if (error) throw error;
        setLocation(locData);

        // 2. Fetch Pings Count (Real data)
        const twoHoursAgo = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString();
        const { count } = await supabase.from('pings').select('*', { count: 'exact', head: true }).eq('location_id', id).gte('created_at', twoHoursAgo);
        setActiveCount(count || 0);

      } catch (err) { console.error(err); } 
      finally { setLoading(false); }
    };
    fetchLocationData();
  }, [id]);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-500">Loading...</div>;
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
              <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse"></span>
              <span className="text-xs font-medium">{activeCount === 0 ? "Quiet" : `${activeCount} here`}</span>
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
              <span>{location.address}</span>
            </div>
          </div>
        </div>

        {/* Reviews Preview (Static for now) */}
        <div>
          <h3 className="text-white font-bold mb-3 flex items-center gap-2">
            <MessageSquare className="w-4 h-4 text-amber-500" /> 
            Recent Reviews
          </h3>
          <div className="space-y-3">
             <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                <div className="flex justify-between mb-2">
                   <span className="text-white font-bold text-sm">Sarah J.</span>
                   <div className="flex text-yellow-400"><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /></div>
                </div>
                <p className="text-slate-400 text-sm">"Absolutely love the vibe here. The lighting is perfect!"</p>
             </div>
             <div className="bg-slate-900 p-4 rounded-lg border border-slate-800">
                <div className="flex justify-between mb-2">
                   <span className="text-white font-bold text-sm">Mike T.</span>
                   <div className="flex text-yellow-400"><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /><Star size={12} fill="currentColor" /></div>
                </div>
                <p className="text-slate-400 text-sm">"Great drinks, but it gets super crowded on weekends."</p>
             </div>
          </div>
        </div>

        <button className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl shadow-lg">Check In / Ping</button>
      </div>
    </div>
  );
};

export default LocationDetails;