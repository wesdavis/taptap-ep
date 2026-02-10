import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { Check, Trophy } from 'lucide-react';
import confetti from 'canvas-confetti'; 

export default function GlobalNotificationLayer() {
  const { user } = useAuth();
  
  // { type: 'success' | 'level', data: ... }
  const [activePopup, setActivePopup] = useState(null); 

  useEffect(() => {
    if (!user) return;

    const channel = supabase
      .channel('global-events')

      // 🟢 REMOVED: The "INSERT" listener that was causing the Double Card.
      // Now we let Home.jsx handle the "Mystery Popup" exclusively.

      // B. CONFIRMED MATCHES (The Payoff)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'pings', filter: `from_user_id=eq.${user.id}` },
        async (payload) => {
          // If status changed to 'accepted', show celebration
          if (payload.new.status === 'accepted' && payload.old.status !== 'accepted') {
             const { data: receiver } = await supabase.from('profiles').select('*').eq('id', payload.new.to_user_id).single();
             
             setActivePopup({ type: 'success', data: { ...payload.new, otherUser: receiver } });
             triggerConfetti();
             playVibration();
          }
        }
      )
      
      // C. LEVEL UPS (XP Changes)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'profiles', filter: `id=eq.${user.id}` },
        (payload) => {
           if (payload.new.xp > payload.old.xp) {
               toast(`+${payload.new.xp - payload.old.xp} XP Gained!`);
           }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [user]);

  const closePopup = () => setActivePopup(null);

  const playVibration = () => {
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  };
  
  const triggerConfetti = () => {
      if (typeof confetti === 'function') {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
  };

  if (!activePopup) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      
      {/* SUCCESS POPUP (Match Confirmed) */}
      {activePopup.type === 'success' && (
        <div className="w-full max-w-sm bg-gradient-to-br from-green-900 to-slate-900 border-2 border-green-500/50 rounded-3xl p-6 relative overflow-hidden shadow-2xl text-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-green-500/20 blur-[50px] rounded-full pointer-events-none" />
            
            <div className="w-20 h-20 bg-green-500/10 rounded-full flex items-center justify-center mb-6 mx-auto animate-bounce border border-green-500/30">
                <Check className="w-10 h-10 text-green-500" />
            </div>
            
            <h2 className="text-2xl font-black text-white mb-2 uppercase tracking-wider">
                Connection Verified!
            </h2>
            <p className="text-slate-300 mb-6">
                You met <strong>{activePopup.data.otherUser?.display_name}</strong>.
            </p>
            
            <div className="flex justify-center gap-2 mb-8">
                <div className="px-4 py-2 bg-black/40 rounded-lg border border-white/10 flex items-center gap-2">
                    <Trophy className="w-4 h-4 text-yellow-400" />
                    <span className="text-yellow-400 font-bold">+50 XP</span>
                </div>
            </div>

            <button 
                onClick={closePopup}
                className="w-full py-4 text-lg font-bold bg-green-500 hover:bg-green-400 text-black rounded-xl shadow-[0_0_20px_rgba(34,197,94,0.4)] transition-transform active:scale-95"
            >
                AWESOME
            </button>
        </div>
      )}

    </div>
  );
}