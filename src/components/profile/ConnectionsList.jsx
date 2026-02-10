import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from 'react-router-dom';
import { MessageCircle, User } from 'lucide-react';

export default function ConnectionsList() {
    const { user } = useAuth();
    const [connections, setConnections] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        if (user) fetchConnections();
    }, [user]);

    const fetchConnections = async () => {
        // 🟢 SAME LOGIC AS PEOPLE MET ICONS
        const { data } = await supabase
            .from('pings')
            .select(`
                id, 
                created_at,
                sender:profiles!from_user_id(id, display_name, avatar_url, handle, bio),
                receiver:profiles!to_user_id(id, display_name, avatar_url, handle, bio)
            `)
            .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
            .eq('met_confirmed', true) 
            .order('updated_at', { ascending: false });

        if (data) {
            const formatted = data.map(ping => {
                const isMeSender = ping.sender.id === user.id;
                return {
                    id: ping.id,
                    metAt: ping.created_at,
                    user: isMeSender ? ping.receiver : ping.sender
                };
            });
            setConnections(formatted);
        }
    };

    if (connections.length === 0) {
        return (
            <div className="text-center py-8 text-slate-500">
                <User className="w-12 h-12 mx-auto mb-2 opacity-20" />
                <p className="text-sm">Your circle is empty.</p>
                <p className="text-xs">Go out and tap someone!</p>
            </div>
        );
    }

    return (
        <div className="space-y-4">
            {connections.map((item) => (
                <div 
                    key={item.id} 
                    onClick={() => navigate(`/user/${item.user.id}`)}
                    className="flex items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-xl hover:bg-slate-800 transition cursor-pointer group"
                >
                    <div className="flex items-center gap-3">
                        <Avatar className="w-12 h-12 border-2 border-slate-700 group-hover:border-amber-500 transition">
                            <AvatarImage src={item.user.avatar_url} />
                            <AvatarFallback>{item.user.display_name?.[0]}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h4 className="font-bold text-white text-sm">{item.user.display_name}</h4>
                            <p className="text-amber-500 text-xs">@{item.user.handle}</p>
                        </div>
                    </div>
                    <div className="text-right">
                        <span className="text-[10px] text-slate-500 block">
                            {new Date(item.metAt).toLocaleDateString()}
                        </span>
                        <div className="bg-slate-800 p-2 rounded-full text-slate-400 group-hover:bg-amber-500 group-hover:text-black transition inline-flex mt-1">
                            <MessageCircle className="w-4 h-4" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}