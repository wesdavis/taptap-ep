import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Users } from 'lucide-react';

export default function PeopleMetList({ onCountChange }) {
    const { user } = useAuth();
    const [people, setPeople] = useState([]);

    useEffect(() => {
        if (user) {
            fetchPeopleMet();

            // 1. REALTIME LISTENER: Watch for "Yes" clicks
            const channel = supabase
                .channel('people_met_updates')
                .on(
                    'postgres_changes',
                    { 
                        event: 'UPDATE', 
                        schema: 'public', 
                        table: 'pings',
                        filter: `met_confirmed=eq.true` 
                    },
                    () => {
                        fetchPeopleMet(); // Refresh immediately
                    }
                )
                .subscribe();

            return () => supabase.removeChannel(channel);
        }
    }, [user]);

    async function fetchPeopleMet() {
        try {
            const isFemale = user.gender === 'Female';
            // If I am female, I sent the ping (from_user_id), so I want the TO user
            // If I am male, I received the ping (to_user_id), so I want the FROM user
            const myColumn = isFemale ? 'from_user_id' : 'to_user_id';
            const theirColumn = isFemale ? 'to_user_id' : 'from_user_id';

            const { data, error } = await supabase
                .from('pings')
                .select(`
                    other_user:profiles!${theirColumn} ( full_name, avatar_url )
                `)
                .eq(myColumn, user.id)
                .eq('met_confirmed', true);

            if (error) throw error;

            if (data) {
                // Filter out any null profiles to prevent crashes
                const validPeople = data
                    .map(p => p.other_user)
                    .filter(user => user !== null);
                
                setPeople(validPeople);
                
                // 2. SYNC THE TALLY: Tell the parent component the real number
                if (onCountChange) onCountChange(validPeople.length);
            }
        } catch (err) {
            console.error("People Met Error:", err);
        }
    }

    if (people.length === 0) return null;

    return (
        <div className="bg-white/5 border border-white/10 rounded-3xl p-6 mb-6 animate-in fade-in slide-in-from-bottom-2">
            <h3 className="font-semibold mb-4 flex items-center gap-2">
                <Users className="w-4 h-4 text-green-500" /> People I've Met
            </h3>
            
            <div className="flex gap-4 overflow-x-auto pb-2 scrollbar-hide">
                {people.map((person, idx) => (
                    <div key={idx} className="flex flex-col items-center min-w-[64px]">
                        <Avatar className="w-14 h-14 border-2 border-green-500/50 mb-2">
                            <AvatarImage src={person.avatar_url} />
                            <AvatarFallback>{person.full_name?.[0]}</AvatarFallback>
                        </Avatar>
                        <span className="text-xs text-slate-300 truncate w-full text-center">
                            {person.full_name?.split(' ')[0] || 'User'}
                        </span>
                    </div>
                ))}
            </div>
        </div>
    );
}