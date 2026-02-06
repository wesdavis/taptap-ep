import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { ArrowLeft, User, ChevronRight, Loader2, Zap } from 'lucide-react';

export default function MyConnections() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchConnections() {
        if (!user) return;
        
        // Find pings where I was sender OR receiver, and status is accepted
        const { data } = await supabase
            .from('pings')
            .select(`
                created_at,
                sender:profiles!from_user_id(id, display_name, avatar_url, handle),
                receiver:profiles!to_user_id(id, display_name, avatar_url, handle)
            `)
            .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
            .eq('status', 'accepted')
            .order('created_at', { ascending: false });

        if (data) {
            // Map to just the "Other Person"
            const connections = data.map(ping => {
                const other = ping.sender.id === user.id ? ping.receiver : ping.sender;
                return { ...other, met_at: ping.created_at };
            });

            // Deduplicate (in case you met multiple times)
            const unique = [];
            const seen = new Set();
            connections.forEach(p => {
                if (!seen.has(p.id)) {
                    seen.add(p.id);
                    unique.push(p);
                }
            });
            setPeople(unique);
        }
        setLoading(false);
    }
    fetchConnections();
  }, [user]);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-500"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-4">
      <div className="flex items-center gap-4 mb-6">
        <button onClick={() => navigate(-1)} className="p-2 bg-slate-900 rounded-full text-slate-400"><ArrowLeft className="w-5 h-5" /></button>
        <h1 className="text-xl font-bold">People Met</h1>
      </div>

      <div className="space-y-3">
        {people.map((person) => (
            <div 
                key={person.id} 
                onClick={() => navigate(`/user/${person.id}`)}
                className="bg-slate-900/50 border border-slate-800 p-3 rounded-xl flex items-center justify-between active:bg-slate-800 transition cursor-pointer"
            >
                <div className="flex items-center gap-4">
                    <img src={person.avatar_url} className="w-12 h-12 rounded-full object-cover border border-slate-700" />
                    <div>
                        <h3 className="font-bold text-white">{person.display_name}</h3>
                        <p className="text-xs text-amber-500">@{person.handle}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{new Date(person.met_at).toLocaleDateString()}</span>
                    <ChevronRight className="w-4 h-4" />
                </div>
            </div>
        ))}
        {people.length === 0 && <p className="text-center text-slate-500 mt-10">Go out and meet someone!</p>}
      </div>
    </div>
  );
}