import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { toast } from 'sonner';
import { Check, X, Zap, Trophy, MapPin } from 'lucide-react';
import confetti from 'canvas-confetti'; // (Optional: run 'npm install canvas-confetti' for this to work, or remove the confetti calls)

export default function GlobalNotificationLayer() {
  const { user } = useAuth();
  
  // QUEUE SYSTEM: Allows multiple events to happen without breaking
  const [activePopup, setActivePopup] = useState(null); // { type: 'mystery' | 'success' | 'level', data: ... }

  useEffect(() => {
    if (!user) return;

    // 1. LISTEN FOR REALTIME EVENTS
    const channel = supabase
      .channel('global-events')
      
      // A. NEW PINGS (The Hook)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'pings', filter: `to_user_id=eq.${user.id}` },
        async (payload) => {
          // Fetch sender details
          const { data: sender } = await supabase.from('profiles').select('*').eq('id', payload.new.from_user_id).single();
          
          // Trigger Popup
          setActivePopup({ type: 'mystery', data: { ...payload.new, sender } });
          playVibration();
        }
      )

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
           // If XP went up significantly or level changed (simplified logic here)
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

  // HELPER: Close Popup
  const closePopup = () => setActivePopup(null);

  // HELPER: Effects
  const playVibration = () => {
      if (navigator.vibrate) navigator.vibrate([200, 100, 200]);
  };
  
  const triggerConfetti = () => {
      if (typeof confetti === 'function') {
          confetti({ particleCount: 100, spread: 70, origin: { y: 0.6 } });
      }
  };

  // --- RENDER LOGIC --- //
  if (!activePopup) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
      
      {/* 1. MYSTERY POPUP (Received a Tap) */}
      {activePopup.type === 'mystery' && (
        <div className="w-full max-w-sm bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 relative overflow-hidden shadow-2xl text-center">
            <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-amber-500/20 blur-[50px] rounded-full pointer-events-none" />
            
            <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 mx-auto animate-pulse border border-amber-500/30">
                <Zap className="w-10 h-10 text-amber-500 fill-amber-500" />
            </div>
            
            <h2 className="text-2xl font-black text-white mb-2 uppercase italic tracking-wider">
                You've Been Tapped!
            </h2>
            <p className="text-slate-400 mb-8">
                {activePopup.data.sender?.display_name || "Someone"} is here and wants to meet.
            </p>

            <button 
                onClick={() => {
                    // In a real app, you might route them to the profile here
                    window.location.href = `/user/${activePopup.data.sender?.id}`;
                    closePopup();
                }}
                className="w-full py-4 text-lg font-bold bg-amber-500 hover:bg-amber-400 text-black rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-transform active:scale-95 mb-3"
            >
                REVEAL WHO
            </button>
            <button onClick={closePopup} className="text-slate-500 text-sm hover:text-white">Dismiss</button>
        </div>
      )}

      {/* 2. SUCCESS POPUP (Match Confirmed) */}
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