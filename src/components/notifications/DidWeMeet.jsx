import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Button } from "@/components/ui/button";
import { ThumbsUp, ThumbsDown, User, Loader2, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function DidWeMeet({ ping, onConfirm }) {
    const { user } = useAuth();
    const [status, setStatus] = useState(null); 
    const [loading, setLoading] = useState(false);

    // 🔴 SAFETY CHECK: If I am the Sender (Male), do not show this card.
    if (user?.id === ping.from_user_id) return null;

    // The person to show is ALWAYS the Sender (The Guy)
    const otherUser = ping.sender;

    const handleConfirm = async (confirmed) => {
        setLoading(true);
        setStatus(confirmed ? 'confirming' : 'denying');

        try {
            console.log(`Updating Ping ${ping.id} to ${confirmed}`);

            const { error: updateError } = await supabase
                .from('pings')
                .update({ 
                    met_confirmed: confirmed,
                    updated_at: new Date()
                })
                .eq('id', ping.id);

            if (updateError) throw updateError;

            if (confirmed) {
                try {
                    await supabase.rpc('increment_xp', { user_id: ping.from_user_id, amount: 10 });
                    // Also give the receiver XP for completing the loop!
                    await supabase.rpc('increment_xp', { user_id: ping.to_user_id, amount: 10 });
                    toast.success("Connection confirmed! +10 XP");
                } catch (e) { console.log("XP Update skipped"); }
            } else {
                toast.info("No worries. Mission cleared.");
            }

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

    return (
        // 🟢 FULL SCREEN OVERLAY
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-slate-950/80 backdrop-blur-md p-4 animate-in fade-in duration-300">
            
            {/* 🟢 MODAL CARD */}
            <div className="bg-slate-900 border border-slate-800 rounded-3xl p-6 shadow-[0_0_50px_rgba(0,0,0,0.5)] w-full max-w-sm animate-in zoom-in-95 duration-300 relative overflow-hidden">
                
                {/* Subtle background glow */}
                <div className="absolute -top-10 -right-10 w-32 h-32 bg-amber-500/10 blur-3xl rounded-full pointer-events-none"></div>

                <div className="flex items-center justify-between mb-5 relative z-10">
                    <h3 className="text-white font-black text-lg flex items-center gap-2">
                        <Sparkles className="w-5 h-5 text-amber-500" />
                        Mission Update
                    </h3>
                    <span className="text-[10px] bg-slate-800 text-slate-400 px-2 py-1 rounded-full uppercase font-bold tracking-wider border border-slate-700">
                        Action Required
                    </span>
                </div>
                
                <div className="flex items-center gap-4 mb-6 relative z-10 bg-slate-950/50 p-4 rounded-2xl border border-slate-800/50">
                    <div className="w-14 h-14 rounded-full bg-slate-800 overflow-hidden shrink-0 border-2 border-slate-700 shadow-lg">
                        {otherUser?.avatar_url ? (
                            <img src={otherUser.avatar_url} className="w-full h-full object-cover" alt="Sender" />
                        ) : (
                            <div className="flex items-center justify-center w-full h-full"><User className="w-6 h-6 text-slate-500" /></div>
                        )}
                    </div>
                    <div>
                        <p className="text-sm text-slate-400 mb-0.5">
                            Did you meet face-to-face?
                        </p>
                        <p className="text-base text-white font-black">
                            @{otherUser?.handle || 'User'}
                        </p>
                        {ping.locations?.name && (
                            <p className="text-[10px] text-amber-500/80 font-bold uppercase tracking-wider mt-1">
                                📍 {ping.locations.name}
                            </p>
                        )}
                    </div>
                </div>

                <div className="grid grid-cols-2 gap-3 relative z-10">
                    <Button 
                        variant="outline" 
                        onClick={() => handleConfirm(false)}
                        disabled={loading}
                        className="border-slate-700 bg-slate-900/50 text-slate-400 hover:text-red-400 hover:bg-red-500/10 hover:border-red-500/50 py-6 rounded-xl transition-all"
                    >
                        {status === 'denying' ? <Loader2 className="w-5 h-5 animate-spin" /> : <ThumbsDown className="w-5 h-5 mr-2" />}
                        No
                    </Button>
                    
                    <Button 
                        onClick={() => handleConfirm(true)}
                        disabled={loading}
                        className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-400 hover:to-green-500 text-black font-black py-6 rounded-xl border-none shadow-[0_0_15px_rgba(34,197,94,0.3)] transition-all"
                    >
                        {status === 'confirming' ? <Loader2 className="w-5 h-5 animate-spin" /> : <ThumbsUp className="w-5 h-5 mr-2" />}
                        Yes
                    </Button>
                </div>
            </div>
        </div>
    );
}