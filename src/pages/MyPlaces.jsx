import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { ArrowLeft, MapPin, Calendar, ChevronRight, Loader2 } from 'lucide-react';

export default function MyPlaces() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [places, setPlaces] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchHistory() {
        if (!user) return;
        // Get all my checkins, ordered by most recent
        const { data } = await supabase
            .from('checkins')
            .select('created_at, locations(*)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

        if (data) {
            // Deduplicate: Keep only the most recent visit for the list
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

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-500"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <div className="flex items-center gap-4 mb-6">
        <ButtonBack onClick={() => navigate(-1)} />
        <h1 className="text-xl font-bold">Places Visited</h1>
      </div>

      <div className="space-y-3">
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
                        <h3 className="font-bold text-white">{visit.locations.name}</h3>
                        <p className="text-xs text-slate-400 flex items-center gap-1">
                            <Calendar className="w-3 h-3" /> 
                            Last: {new Date(visit.created_at).toLocaleDateString()}
                        </p>
                    </div>
                </div>
                <ChevronRight className="w-5 h-5 text-slate-600" />
            </div>
        ))}
        {places.length === 0 && <p className="text-center text-slate-500 mt-10">No places visited yet.</p>}
      </div>
    </div>
  );
}

const ButtonBack = ({ onClick }) => (
    <button onClick={onClick} className="p-2 bg-slate-900 rounded-full text-slate-400 hover:text-white"><ArrowLeft className="w-5 h-5" /></button>
);