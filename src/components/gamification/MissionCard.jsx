import { X, Check } from 'lucide-react';
import { supabase } from '../../lib/supabase';
import { toast } from 'sonner';
import { useState } from 'react';

export default function MissionCard({ ping, onComplete, onCancel }) {
  const [loading, setLoading] = useState(false);

  const handleConfirmMeet = async () => {
  setLoading(true);
  navigator.geolocation.getCurrentPosition(async (position) => {
    // Distance check (Assume ping.location_id metadata or fetch from pings)
    // For now, check if user is at the venue stored in the ping record
    const { data: loc } = await supabase.from('locations').select('latitude, longitude').eq('id', ping.location_id).single();
    
    if (loc) {
      const dist = getDistanceFromLatLonInKm(position.coords.latitude, position.coords.longitude, loc.latitude, loc.longitude);
      if (dist > 0.5) {
        toast.error("You need to be at the venue to confirm!");
        setLoading(false);
        return;
      }
    }

    const { error } = await supabase.from('pings').update({ met_confirmed: true }).eq('id', ping.id);
    if (!error) toast.success("Mission Accomplished!");
    if (onComplete) onComplete();
    setLoading(false);
  });
};

  return (
    <div className="bg-amber-500/10 border border-amber-500/50 p-4 rounded-xl relative animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* 🔴 CANCEL BUTTON */}
      <button 
        onClick={onCancel}
        className="absolute top-2 right-2 p-1 text-amber-500/50 hover:text-amber-500 hover:bg-amber-500/10 rounded-full transition"
      >
        <X size={16} />
      </button>

      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full border-2 border-amber-500 p-0.5">
           <img 
             src={ping.receiver?.avatar_url} 
             className="w-full h-full object-cover rounded-full bg-slate-800" 
           />
        </div>
        <div>
           <p className="text-xs text-amber-500 font-bold uppercase tracking-wider">Active Mission</p>
           <p className="text-white font-bold">Find {ping.receiver?.display_name || "Agent"}</p>
        </div>
      </div>
      
      <div className="mt-3 flex gap-2">
         <button 
            disabled={loading}
            onClick={handleConfirmMeet}
            className="flex-1 bg-amber-500 hover:bg-amber-400 text-black text-xs font-bold py-2 rounded-lg flex items-center justify-center gap-1 transition"
         >
            <Check size={14} /> Found Them
         </button>
      </div>
    </div>
  );
}