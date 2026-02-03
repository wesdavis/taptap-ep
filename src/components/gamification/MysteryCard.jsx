import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { HelpCircle, MapPin } from 'lucide-react';

export default function MysteryCard({ ping }) {
  const [isRevealed, setIsRevealed] = useState(false);

  return (
    <div className="w-full h-40 relative cursor-pointer group" onClick={() => setIsRevealed(true)}>
      <AnimatePresence>
        {!isRevealed ? (
          /* LOCKED STATE (The Mystery) */
          <motion.div 
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0, scale: 0.9, rotateY: 90 }}
            className="absolute inset-0 bg-gradient-to-br from-amber-600 to-amber-800 rounded-2xl shadow-xl flex flex-col items-center justify-center border-2 border-amber-400/30 overflow-hidden"
          >
            {/* Animated pulsing rings */}
            <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
            <div className="w-16 h-16 rounded-full bg-black/20 flex items-center justify-center mb-2 animate-pulse">
               <HelpCircle className="w-8 h-8 text-amber-200" />
            </div>
            <h3 className="text-white font-bold text-lg">Someone is interested...</h3>
            <p className="text-amber-200 text-xs uppercase tracking-widest font-bold">Tap to Reveal</p>
          </motion.div>
        ) : (
          /* REVEALED STATE (The Hook) */
          <motion.div 
            initial={{ opacity: 0, scale: 0.9, rotateY: -90 }}
            animate={{ opacity: 1, scale: 1, rotateY: 0 }}
            className="absolute inset-0 bg-slate-900 rounded-2xl border border-slate-700 flex overflow-hidden shadow-2xl"
          >
            <div className="w-1/3 h-full relative">
               <img src={ping.sender.avatar_url} className="w-full h-full object-cover" />
            </div>
            <div className="w-2/3 p-4 flex flex-col justify-center">
               <span className="text-amber-500 text-xs font-bold uppercase mb-1">It's {ping.sender.display_name}!</span>
               <h3 className="text-white font-bold text-lg leading-tight mb-2">She tapped you.</h3>
               <div className="flex items-center gap-2 text-slate-400 text-xs">
                 <MapPin className="w-3 h-3" />
                 <span>Look around the bar...</span>
               </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}