import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from 'sonner';
import { Loader2, Lock } from 'lucide-react';

export default function UpdatePassword() {
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleUpdate = async (e) => {
    e.preventDefault();
    if (password.length < 6) {
        toast.error("Password is too short.");
        return;
    }

    setLoading(true);
    const { error } = await supabase.auth.updateUser({ password: password });

    if (error) {
        toast.error("Error updating password.");
    } else {
        toast.success("Password updated successfully!");
        navigate('/'); // Send them to the home page
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6">
      <div className="w-full max-w-md bg-slate-900/50 p-8 rounded-2xl border border-slate-800">
        <h1 className="text-2xl font-bold text-white mb-2">Set New Password</h1>
        <p className="text-slate-400 mb-6 text-sm">Enter your new password below.</p>
        
        <form onSubmit={handleUpdate} className="space-y-4">
            <div className="relative">
                <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                <Input 
                    type="password" 
                    placeholder="New Password (min 6 chars)" 
                    className="pl-10 bg-slate-950 border-slate-700 text-white"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </div>
            <Button className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold">
                {loading ? <Loader2 className="animate-spin" /> : "Update Password"}
            </Button>
        </form>
      </div>
    </div>
  );
}