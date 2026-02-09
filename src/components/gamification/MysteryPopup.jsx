import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { X, Zap, MapPin, Crown } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function MysteryPopup({ pings, onDismiss }) {
  const [isOpen, setIsOpen] = useState(false);
  const [revealed, setRevealed] = useState(false);
  const [currentPing, setCurrentPing] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);

  useEffect(() => {
    if (pings && pings.length > 0) {
      setCurrentPing(pings[0]);
      setIsOpen(true);
      // Trigger the "Slam" animation
      setIsAnimating(true);
    }
  }, [pings]);

  const handleReveal = async () => {
    // 1. Flip Animation
    setIsAnimating(false);
    setTimeout(() => {
        setRevealed(true);
        setIsAnimating(true); // Trigger "Reveal" entrance
    }, 200);

    // 2. Mark as read in DB
    if (currentPing) {
        await supabase.from('pings').update({ status: 'revealed' }).eq('id', currentPing.id);
    }
  };

  const handleClose = () => {
      setIsOpen(false);
      setTimeout(() => {
          setRevealed(false);
          onDismiss(currentPing.id);
      }, 300);
  };

  if (!currentPing) return null;
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center px-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-300">
      
      {/* 🟢 THE CARD CONTAINER */}
      <div 
        className={`
            w-full max-w-sm relative transition-all duration-500 transform
            ${isAnimating ? 'scale-100 opacity-100 translate-y-0' : 'scale-90 opacity-0 translate-y-10'}
        `}
      >
        {/* Glowing Background Effect */}
        <div className="absolute -inset-1 bg-gradient-to-r from-amber-500 via-yellow-400 to-amber-600 rounded-[2rem] blur opacity-75 animate-pulse" />
        
        <div className="relative bg-slate-900 rounded-[1.9rem] p-1 overflow-hidden">
            
            {/* Inner Content Wrapper */}
            <div className="bg-gradient-to-br from-slate-900 to-slate-950 rounded-[1.7rem] px-6 py-8 relative overflow-hidden border border-white/10 shadow-2xl">
                
                {/* Decorative Elements */}
                <div className="absolute top-0 left-0 w-full h-32 bg-gradient-to-b from-amber-500/10 to-transparent pointer-events-none" />
                <button 
                    onClick={handleClose}
                    className="absolute top-4 right-4 p-2 bg-black/40 hover:bg-black/60 rounded-full text-slate-400 hover:text-white transition z-20 backdrop-blur-sm"
                >
                    <X className="w-5 h-5" />
                </button>

                {/* --- STAGE 1: THE MYSTERY --- */}
                {!revealed ? (
                    <div className="flex flex-col items-center text-center relative z-10">
                        <div className="w-24 h-24 mb-6 relative">
                            <div className="absolute inset-0 bg-amber-500 rounded-full blur-[20px] animate-pulse opacity-50"></div>
                            <div className="relative bg-slate-800 w-full h-full rounded-full flex items-center justify-center border-4 border-amber-500/30 shadow-[0_0_30px_rgba(245,158,11,0.3)]">
                                <Zap className="w-10 h-10 text-amber-500 fill-amber-500 animate-[bounce_1s_infinite]" />
                            </div>
                        </div>

                        <h2 className="text-3xl font-black text-white mb-2 uppercase italic tracking-wider drop-shadow-lg">
                            Tap Tap!
                        </h2>
                        <p className="text-slate-400 text-sm mb-8 px-4 leading-relaxed">
                            Someone at <span className="text-amber-400 font-bold">{currentPing.locations?.name || "this venue"}</span> just noticed you.
                        </p>

                        <Button 
                            onClick={handleReveal}
                            className="w-full py-7 text-lg font-black tracking-widest bg-gradient-to-r from-amber-500 to-yellow-500 hover:from-amber-400 hover:to-yellow-400 text-black rounded-2xl shadow-[0_0_20px_rgba(245,158,11,0.5)] transition-all active:scale-95 active:shadow-none border border-yellow-300/50"
                        >
                            REVEAL WHO
                        </Button>
                    </div>
                ) : (
                    
                // --- STAGE 2: THE REVEAL ---
                    <div className="flex flex-col items-center text-center relative z-10 animate-in zoom-in-90 duration-300">
                        <div className="w-28 h-28 rounded-full p-1 bg-gradient-to-br from-amber-400 to-amber-600 shadow-2xl mb-4 relative">
                             <div className="absolute -bottom-2 -right-2 bg-black rounded-full p-1.5 border border-slate-700 z-20">
                                 <Zap className="w-4 h-4 text-amber-500 fill-amber-500" />
                             </div>
                             <img 
                                src={currentPing.sender?.avatar_url || "https://github.com/shadcn.png"} 
                                className="w-full h-full rounded-full object-cover border-4 border-slate-900 bg-slate-800"
                                alt="Sender"
                             />
                        </div>

                        <h2 className="text-2xl font-black text-white mb-1 tracking-tight">
                            {currentPing.sender?.display_name || "Mystery User"}
                        </h2>
                        <p className="text-amber-500 font-bold text-sm mb-6 bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                            @{currentPing.sender?.handle}
                        </p>
                        
                        <div className="bg-white/5 border border-white/10 rounded-xl p-4 mb-6 w-full relative">
                            <div className="absolute -top-3 left-1/2 -translate-x-1/2 w-6 h-6 bg-slate-800 border border-slate-700 rotate-45 z-0"></div>
                            <p className="text-slate-300 text-sm relative z-10 italic">
                                "{currentPing.sender?.bio || "I'm here right now. Come say hi!"}"
                            </p>
                        </div>

                        <div className="grid grid-cols-2 gap-3 w-full">
                            <Button 
                                onClick={handleClose}
                                className="w-full py-6 font-bold bg-slate-800 border border-slate-700 text-slate-400 hover:text-white rounded-xl"
                            >
                                Later
                            </Button>
                            <Button 
                                onClick={() => {
                                    // Navigate to their profile
                                    window.location.href = `/user/${currentPing.sender?.id}`;
                                }}
                                className="w-full py-6 font-bold bg-amber-500 hover:bg-amber-400 text-black rounded-xl shadow-lg shadow-amber-900/20"
                            >
                                View Profile
                            </Button>
                        </div>
                    </div>
                )}
            </div>
        </div>
      </div>
    </div>
  );
}