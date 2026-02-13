import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from 'react-router-dom';
import { User, ChevronRight } from 'lucide-react'; // 🟢 Swapped MessageCircle for ChevronRight

export default function ConnectionsList() {
    const { user } = useAuth();
    const [connections, setConnections] = useState([]);
    const navigate = useNavigate();

    useEffect(() => {
        if (user) fetchConnections();
    }, [user]);

    const fetchConnections = async () => {
        // 🟢 Fetch ALL confirmed pings where I am sender OR receiver
        const { data } = await supabase
            .from('pings')
            .select(`
                id, 
                created_at,
                updated_at,
                sender:profiles!from_user_id(id, display_name, avatar_url, handle, bio),
                receiver:profiles!to_user_id(id, display_name, avatar_url, handle, bio)
            `)
            .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
            .eq('met_confirmed', true) 
            .order('updated_at', { ascending: false });

        if (data) {
            // 🟢 DEDUPLICATION LOGIC (Ensures Unique Humans)
            const uniqueMap = new Map();

            data.forEach(ping => {
                const isMeSender = ping.sender.id === user.id;
                const otherUser = isMeSender ? ping.receiver : ping.sender;

                // Only add if we haven't seen this user ID yet
                if (!uniqueMap.has(otherUser.id)) {
                    uniqueMap.set(otherUser.id, {
                        id: ping.id,
                        metAt: ping.updated_at || ping.created_at,
                        user: otherUser
                    });
                }
            });

            setConnections(Array.from(uniqueMap.values()));
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
        <div className="space-y-3">
            {connections.map((item) => (
                <div 
                    key={item.id} 
                    onClick={() => navigate(`/user/${item.user.id}`)}
                    className="flex items-center justify-between bg-slate-900 border border-slate-800 p-3 rounded-xl hover:bg-slate-800 transition cursor-pointer group active:scale-95"
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
                    <div className="text-right flex flex-col items-end">
                        <span className="text-[10px] text-slate-500 block mb-1">
                            {new Date(item.metAt).toLocaleDateString()}
                        </span>
                        {/* 🟢 Swapped Chat Icon for "Go To Profile" Chevron */}
                        <div className="p-1 rounded-full text-slate-600 group-hover:text-amber-500 transition">
                            <ChevronRight className="w-5 h-5" />
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}