import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Avatar, AvatarImage, AvatarFallback } from "@/components/ui/avatar";
import { useNavigate } from 'react-router-dom';

export default function PeopleMetList() {
    const { user } = useAuth();
    const [people, setPeople] = useState([]);
    const navigate = useNavigate();

    const fetchPeople = async () => {
        if (!user) return;
        
        // 🟢 Fetch larger batch (50) to allow for deduplication
        const { data } = await supabase
            .from('pings')
            .select(`
                id, 
                created_at,
                updated_at,
                sender:profiles!from_user_id(id, display_name, avatar_url, handle),
                receiver:profiles!to_user_id(id, display_name, avatar_url, handle)
            `)
            .or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`)
            .eq('met_confirmed', true)
            .order('updated_at', { ascending: false })
            .limit(50); // Grab 50 so we can filter down to 10 unique ones

        if (data) {
            // 🟢 DEDUPLICATION LOGIC
            const uniqueMap = new Map();

            data.forEach(ping => {
                const isMeSender = ping.sender.id === user.id;
                const otherUser = isMeSender ? ping.receiver : ping.sender;

                // If we haven't added this user yet, add them now
                if (!uniqueMap.has(otherUser.id)) {
                    uniqueMap.set(otherUser.id, {
                        id: ping.id,
                        metAt: ping.updated_at || ping.created_at, // Prefer updated_at
                        user: otherUser
                    });
                }
            });

            // Convert Map to Array and take only the top 10
            const uniqueList = Array.from(uniqueMap.values()).slice(0, 10);
            setPeople(uniqueList);
        }
    };

    useEffect(() => {
        fetchPeople();

        const channel = supabase
            .channel('people-met-list')
            .on('postgres_changes', { 
                event: 'UPDATE', 
                schema: 'public', 
                table: 'pings', 
                filter: `met_confirmed=eq.true`
            }, () => {
                fetchPeople(); 
            })
            .subscribe();

        return () => { supabase.removeChannel(channel); };
    }, [user]);

    if (people.length === 0) return <div className="text-slate-500 text-xs italic text-center py-4">No connections yet. Tap someone!</div>;

    return (
        <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
            {people.map((p) => (
                <div key={p.id} onClick={() => navigate(`/user/${p.user.id}`)} className="flex flex-col items-center gap-1 min-w-[64px] cursor-pointer group">
                    <div className="relative">
                        <Avatar className="w-14 h-14 border-2 border-slate-800 group-hover:border-amber-500 transition">
                            <AvatarImage src={p.user.avatar_url} />
                            <AvatarFallback>{p.user.display_name?.[0]}</AvatarFallback>
                        </Avatar>
                        {/* Green dot for 'Connected' */}
                        <div className="absolute bottom-0 right-0 w-3 h-3 bg-green-500 border-2 border-slate-900 rounded-full"></div>
                    </div>
                    <span className="text-[10px] text-slate-300 font-medium truncate w-full text-center">
                        {p.user.display_name.split(' ')[0]}
                    </span>
                </div>
            ))}
        </div>
    );
}