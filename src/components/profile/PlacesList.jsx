import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { MapPin, Calendar, ChevronRight, Loader2 } from 'lucide-react';

export default function PlacesList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
        if (!user) return;
        const { data } = await supabase
            .from('checkins')
            .select('created_at, locations(*)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (data) {
            const unique = [];
            const seen = new Set();
            data.forEach(item => {
                if (!seen.has(item.locations.id)) {
                    seen.add(item.locations.id);
                    unique.push(item);
                }
            });
            setPlaces(unique);
        }
        setLoading(false);
    }
    fetchHistory();
  }, [user]);

  if (loading) return <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-amber-500" /></div>;

  return (
    <div className="space-y-3 mt-4 animate-in slide-in-from-top-4 fade-in duration-300">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest px-1">Your Map</h3>
        {places.map((visit) => (
            <div 
                key={visit.locations.id} 
                onClick={() => navigate(`/location/${visit.locations.id}`)}
                className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex items-center justify-between active:bg-slate-800 transition cursor-pointer"
            >
                <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-full bg-slate-800 flex items-center justify-center border border-slate-700">
                        <MapPin className="w-5 h-5 text-amber-500" />
                    </div>
                    <div>
                        <h3 className="font-bold text-white text-sm">{visit.locations.name}</h3>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> 
                            {new Date(visit.created_at).toLocaleDateString()}
                        </p>
                    </div>
                </div>
                <ChevronRight className="w-4 h-4 text-slate-600" />
            </div>
        ))}
        {places.length === 0 && <p className="text-center text-slate-500 py-4 text-sm">No places visited yet.</p>}
    </div>
  );
}