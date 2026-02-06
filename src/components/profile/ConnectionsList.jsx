import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { ChevronRight, Loader2 } from 'lucide-react';

export default function ConnectionsList() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [people, setPeople] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function fetchConnections() {
        if (!user) return;
        
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
            const connections = data.map(ping => {
                const other = ping.sender.id === user.id ? ping.receiver : ping.sender;
                return { ...other, met_at: ping.created_at };
            });

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

  if (loading) return <div className="py-8 flex justify-center"><Loader2 className="animate-spin text-amber-500" /></div>;

  return (
    <div className="space-y-3 mt-4 animate-in slide-in-from-top-4 fade-in duration-300">
        <h3 className="text-sm font-bold text-slate-500 uppercase tracking-widest px-1">Your Circle</h3>
        {people.map((person) => (
            <div 
                key={person.id} 
                onClick={() => navigate(`/user/${person.id}`)}
                className="bg-slate-900/50 border border-slate-800 p-3 rounded-xl flex items-center justify-between active:bg-slate-800 transition cursor-pointer"
            >
                <div className="flex items-center gap-4">
                    <img src={person.avatar_url} className="w-10 h-10 rounded-full object-cover border border-slate-700" />
                    <div>
                        <h3 className="font-bold text-white text-sm">{person.display_name}</h3>
                        <p className="text-xs text-amber-500">@{person.handle}</p>
                    </div>
                </div>
                <div className="flex items-center gap-2 text-xs text-slate-500">
                    <span>{new Date(person.met_at).toLocaleDateString()}</span>
                    <ChevronRight className="w-4 h-4" />
                </div>
            </div>
        ))}
        {people.length === 0 && <p className="text-center text-slate-500 py-4 text-sm">No connections yet.</p>}
    </div>
  );
}