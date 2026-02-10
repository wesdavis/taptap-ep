import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, User, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

export default function DidWeMeet({ ping, onConfirm }) {
    const [status, setStatus] = useState(null); // 'confirming' | 'denying'
    const [loading, setLoading] = useState(false);

    const handleConfirm = async (confirmed) => {
        setLoading(true);
        setStatus(confirmed ? 'confirming' : 'denying');

        try {
            // 1. Update the database
            const { error } = await supabase
                .from('pings')
                .update({ 
                    met_confirmed: confirmed,
                    updated_at: new Date()
                })
                .eq('id', ping.id);

            if (error) throw error;

            if (confirmed) {
                // If confirmed, update XP
                await supabase.rpc('increment_xp', { user_id: ping.from_user_id, amount: 10 });
                toast.success("Connection confirmed! +10 XP");
            } else {
                toast.info("No worries, maybe next time.");
            }

            // 2. 🟢 Tell the Parent (Home.jsx) to remove this card
            setTimeout(() => {
                onConfirm(ping.id);
            }, 500);

        } catch (err) {
            console.error(err);
            toast.error("Error updating status");
            setLoading(false);
            setStatus(null);
        }
    };

    if (!ping) return null;

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-4 shadow-lg animate-in slide-in-from-top-2">
            <div className="flex items-center justify-between mb-3">
                <h3 className="text-white font-bold flex items-center gap-2">
                    Did you meet?
                </h3>
                <span className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">
                    {new Date(ping.created_at).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                </span>
            </div>
            
            <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden shrink-0 border border-slate-700">
                    {ping.receiver?.avatar_url ? (
                        <img src={ping.receiver.avatar_url} className="w-full h-full object-cover" alt="Receiver" />
                    ) : (
                        <div className="flex items-center justify-center w-full h-full"><User className="w-5 h-5 text-slate-500" /></div>
                    )}
                </div>
                <div>
                    <p className="text-sm text-slate-300">
                        You tapped <span className="text-white font-bold">@{ping.receiver?.handle || 'User'}</span>
                    </p>
                    <p className="text-xs text-slate-500 italic">
                        {ping.locations?.name || "Unknown Location"}
                    </p>
                </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
                <Button 
                    variant="outline" 
                    onClick={() => handleConfirm(false)}
                    disabled={loading}
                    className="border-slate-700 text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/50"
                >
                    {status === 'denying' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsDown className="w-4 h-4 mr-2" />}
                    No
                </Button>
                
                <Button 
                    onClick={() => handleConfirm(true)}
                    disabled={loading}
                    className="bg-green-600 hover:bg-green-500 text-white font-bold"
                >
                    {status === 'confirming' ? <Loader2 className="w-4 h-4 animate-spin" /> : <ThumbsUp className="w-4 h-4 mr-2" />}
                    Yes, we met!
                </Button>
            </div>
        </div>
    );
}