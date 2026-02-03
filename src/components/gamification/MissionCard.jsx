import { useState } from 'react';
import { motion } from 'framer-motion';
import { Check, ShieldCheck, Loader2, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti'; // We'll install this: npm install canvas-confetti
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export default function MissionCard({ ping, onComplete }) {
  const [loading, setLoading] = useState(false);

  const handleMet = async () => {
    setLoading(true);
    try {
      // 1. Update DB
      const { error } = await supabase.from('pings').update({ met_confirmed: true }).eq('id', ping.id);
      if (error) throw error;

      // 2. Add XP (Simple increment for now)
      await supabase.rpc('increment_xp', { user_id: ping.from_user_id, amount: 50 });

      // 3. CONFETTI TIME 🎉
      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#F59E0B', '#FCD34D', '#FFFFFF']
      });

      toast.success("Mission Complete! +50 XP");
      if(onComplete) onComplete();

    } catch (err) {
      toast.error("Error updating mission");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-full bg-slate-900 border border-amber-500/30 rounded-2xl p-4 relative overflow-hidden">
       {/* Background Pulse */}
       <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2"></div>

       <div className="flex items-start gap-4 relative z-10">
          <div className="relative">
             <img src={ping.receiver.avatar_url} className="w-14 h-14 rounded-full border-2 border-amber-500 object-cover" />
             <div className="absolute -bottom-1 -right-1 bg-amber-500 text-black text-[10px] font-bold px-1.5 py-0.5 rounded-full">
               TARGET
             </div>
          </div>
          
          <div className="flex-1">
             <h3 className="text-white font-bold text-lg">Mission: Meet {ping.receiver.display_name}</h3>
             <p className="text-slate-400 text-xs mb-3 flex items-center gap-1">
               <ShieldCheck className="w-3 h-3 text-green-500" />
               Stay comfortable. Let him find you.
             </p>

             <button 
               onClick={handleMet}
               disabled={loading}
               className="w-full bg-green-600 hover:bg-green-500 text-white font-bold py-2 rounded-lg text-sm flex items-center justify-center gap-2 transition-all active:scale-95"
             >
               {loading ? <Loader2 className="animate-spin w-4 h-4" /> : (
                 <>
                   <Sparkles className="w-4 h-4" />
                   We Met! (Complete Mission)
                 </>
               )}
             </button>
          </div>
       </div>
    </div>
  );
}