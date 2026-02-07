import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Zap, MapPin } from 'lucide-react';
import { Dialog, DialogContent } from "@/components/ui/dialog"; // Assuming you have shadcn or similar, simplified below for raw React/Tailwind if needed.
import { Button } from "@/components/ui/button";

export default function MysteryPopup({ pings, onDismiss }) {
  const [isOpen, setIsOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [currentPing, setCurrentPing] = useState(null);

  useEffect(() => {
    // Show the most recent pending ping
    if (pings && pings.length > 0) {
      setCurrentPing(pings[0]);
      setIsOpen(true);
    }
  }, [pings]);

  const handleReveal = async () => {
    setRevealed(true);
    // Optional: Mark as 'revealed' in DB so it doesn't pop up again next refresh
    if (currentPing) {
        await supabase.from('pings').update({ status: 'revealed' }).eq('id', currentPing.id);
    }
  };

  if (!currentPing) return null;

  return (
    // Custom Modal Overlay
    isOpen && (
      <div className="fixed inset-0 z-50 flex items-center justify-center px-4 bg-black/80 backdrop-blur-sm animate-in fade-in duration-300">
        <div className="w-full max-w-sm bg-slate-900 border-2 border-amber-500/50 rounded-3xl p-6 relative overflow-hidden shadow-2xl">
          
          {/* Close Button */}
          <button 
            onClick={() => { setIsOpen(false); onDismiss(currentPing.id); }}
            className="absolute top-4 right-4 text-slate-500 hover:text-white"
          >
            <X className="w-6 h-6" />
          </button>

          {/* BACKGROUND GLOW */}
          <div className="absolute top-0 left-1/2 -translate-x-1/2 w-32 h-32 bg-amber-500/20 blur-[50px] rounded-full pointer-events-none" />

          <div className="relative z-10 text-center flex flex-col items-center">
            
            {!revealed ? (
              // STAGE 1: THE HOOK
              <>
                <div className="w-20 h-20 bg-amber-500/10 rounded-full flex items-center justify-center mb-6 animate-pulse border border-amber-500/30">
                  <Zap className="w-10 h-10 text-amber-500 fill-amber-500" />
                </div>
                <h2 className="text-2xl font-black text-white mb-2 uppercase italic tracking-wider">
                  You've Been Tapped!
                </h2>
                <p className="text-slate-400 mb-8">
                  Someone here wants to meet you.
                </p>
                <Button 
                  onClick={handleReveal}
                  className="w-full py-6 text-lg font-bold bg-amber-500 hover:bg-amber-400 text-black rounded-xl shadow-[0_0_20px_rgba(245,158,11,0.4)] transition-transform active:scale-95"
                >
                  REVEAL
                </Button>
              </>
            ) : (
              // STAGE 2: THE REVEAL
              <div className="animate-in zoom-in-95 duration-300 flex flex-col items-center">
                <div className="w-24 h-24 rounded-full border-4 border-amber-500 shadow-xl overflow-hidden mb-4">
                  <img 
                    src={currentPing.sender?.avatar_url || "https://github.com/shadcn.png"} 
                    className="w-full h-full object-cover"
                  />
                </div>
                <h2 className="text-2xl font-bold text-white mb-1">
                  {currentPing.sender?.display_name || "Someone"}
                </h2>
                <p className="text-amber-500 font-bold text-sm mb-6">
                  @{currentPing.sender?.handle}
                </p>
                
                <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 w-full">
                  <p className="text-slate-300 text-sm">
                    "I'm here right now. Come say hi!"
                  </p>
                </div>

                <Button 
                  onClick={() => { setIsOpen(false); onDismiss(currentPing.id); }}
                  className="w-full py-6 text-lg font-bold bg-slate-800 border border-slate-700 text-white rounded-xl"
                >
                  Okay, I'm going!
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    )
  );
}