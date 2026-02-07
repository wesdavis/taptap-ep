import { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { Check, X, User } from 'lucide-react';
import { toast } from 'sonner';

export default function DidWeMeet({ ping, onConfirm }) {
  const [answering, setAnswering] = useState(false);

  const handleResponse = async (met) => {
    setAnswering(true);
    try {
      if (met) {
        // Update to 'accepted' -> Triggers stats update
        await supabase.from('pings').update({ status: 'accepted' }).eq('id', ping.id);
        toast.success("Connection confirmed! Stats updated.");
      } else {
        // Just dismiss it or mark as rejected
        await supabase.from('pings').delete().eq('id', ping.id);
        toast.info("Maybe next time.");
      }
      onConfirm(ping.id);
    } catch (e) {
      toast.error("Error updating status");
    } finally {
      setAnswering(false);
    }
  };

  return (
    <div className="bg-gradient-to-br from-slate-900 to-slate-800 border border-slate-700 rounded-2xl p-4 shadow-lg mb-4 animate-in slide-in-from-left-2">
      <div className="flex items-center gap-4 mb-4">
        <div className="w-12 h-12 rounded-full overflow-hidden border border-slate-600 bg-slate-800">
          <img src={ping.receiver?.avatar_url} className="w-full h-full object-cover" />
        </div>
        <div>
            <h3 className="font-bold text-white text-sm">Did you meet {ping.receiver?.display_name?.split(' ')[0]}?</h3>
            <p className="text-xs text-slate-400">You tapped him recently.</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3">
        <button 
            disabled={answering}
            onClick={() => handleResponse(false)}
            className="flex items-center justify-center gap-2 py-2 rounded-lg bg-slate-800 text-slate-400 text-xs font-bold border border-slate-700 active:scale-95 transition"
        >
            <X className="w-3 h-3" /> No
        </button>
        <button 
            disabled={answering}
            onClick={() => handleResponse(true)}
            className="flex items-center justify-center gap-2 py-2 rounded-lg bg-green-500 text-black text-xs font-bold shadow-lg shadow-green-900/20 active:scale-95 transition"
        >
            <Check className="w-3 h-3" /> Yes, we met!
        </button>
      </div>
    </div>
  );
}