import { HelpCircle, X } from 'lucide-react';

export default function MysteryCard({ ping, onCancel }) {
  return (
    <div className="bg-purple-500/10 border border-purple-500/50 p-4 rounded-xl relative animate-in fade-in slide-in-from-bottom-2 duration-500">
      
      {/* 🔴 DISMISS BUTTON */}
      <button 
        onClick={onCancel}
        className="absolute top-2 right-2 p-1 text-purple-400/50 hover:text-purple-400 hover:bg-purple-500/10 rounded-full transition"
      >
        <X size={16} />
      </button>

      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-full border-2 border-purple-500 bg-slate-900 flex items-center justify-center">
            <HelpCircle className="w-6 h-6 text-purple-500" />
        </div>
        <div>
           <p className="text-xs text-purple-400 font-bold uppercase tracking-wider">Mystery Signal</p>
           <p className="text-white font-bold text-sm">Someone is looking for you...</p>
        </div>
      </div>
      
      <div className="mt-3">
         <p className="text-xs text-slate-400 italic">
            Go to the location to reveal their identity.
         </p>
      </div>
    </div>
  );
}