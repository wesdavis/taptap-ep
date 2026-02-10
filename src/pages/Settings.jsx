import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase'; 
import { Button } from "@/components/ui/button";
import { LogOut, ChevronLeft, User, Shield, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  const { signOut, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // 🟢 1. CLEANUP: checkout of any active location
      if (user) {
          const { error } = await supabase
            .from('checkins')
            .update({ is_active: false })
            .eq('user_id', user.id);
            
          if (error) console.error("Error clearing check-in:", error);
      }

      // 2. Sign Out
      await signOut();
      navigate('/landing');
      toast.success("Logged out successfully");
      
    } catch (error) {
      console.error("Logout error:", error);
      await signOut(); 
      navigate('/landing');
    }
  };

  const handleDeleteAccount = async () => {
      if (!window.confirm("Are you sure? This cannot be undone.")) return;
      
      try {
          // 1. Delete user data (Profile, etc cascades usually)
          const { error } = await supabase.from('profiles').delete().eq('id', user.id);
          if (error) throw error;
          
          // 2. Sign out
          await signOut();
          navigate('/landing');
          toast.success("Account deleted.");
      } catch (error) {
          console.error(error);
          toast.error("Could not delete account. Contact support.");
      }
  };

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 pb-24">
      <div className="flex items-center gap-4 mb-8">
        <Button 
            variant="ghost" 
            size="icon" 
            onClick={() => navigate(-1)}
            className="hover:bg-slate-800 text-slate-400 hover:text-white"
        >
          <ChevronLeft className="w-6 h-6" />
        </Button>
        <h1 className="text-2xl font-black tracking-tight">Settings</h1>
      </div>

      <div className="space-y-6">
        
        {/* Account Section */}
        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl">
          <div className="flex items-center gap-2 mb-4 text-amber-500">
            <User className="w-4 h-4" />
            <h2 className="font-bold text-xs uppercase tracking-wider">Account</h2>
          </div>
          
          <div className="space-y-1">
            <Button 
                variant="ghost" 
                className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800 px-2"
                onClick={() => navigate('/profile-setup')}
            >
                Edit Profile
            </Button>
            <Button 
                variant="ghost" 
                className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800 px-2"
                onClick={() => navigate('/achievements')}
            >
                My Achievements
            </Button>
          </div>
        </div>

        {/* General Section */}
        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl">
          <div className="flex items-center gap-2 mb-4 text-slate-400">
            <Shield className="w-4 h-4" />
            <h2 className="font-bold text-xs uppercase tracking-wider">General</h2>
          </div>
          
          <div className="space-y-1">
             <div className="px-2 py-2 flex justify-between items-center text-sm text-slate-500">
                <span>App Version</span>
                <span className="font-mono text-xs">v1.2.0 (Beta)</span>
             </div>
             <Button 
                variant="ghost" 
                className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800 px-2"
                onClick={() => window.location.href = 'mailto:support@taptap.com'}
            >
                Contact Support
            </Button>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-500/5 rounded-2xl p-5 border border-red-500/20 space-y-3">
          <h2 className="font-bold text-xs uppercase tracking-wider text-red-500 mb-2">Danger Zone</h2>
          
          <Button 
            onClick={handleLogout} 
            variant="outline" 
            className="w-full justify-start gap-2 font-bold border-red-900/30 text-red-400 hover:bg-red-900/20 hover:text-red-300"
          >
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>

          {/* 🟢 RESTORED: Delete Button */}
          <Button 
            onClick={handleDeleteAccount} 
            variant="ghost" 
            className="w-full justify-start gap-2 text-xs text-red-500/50 hover:text-red-500 hover:bg-red-900/10"
          >
            <Trash2 className="w-3 h-3" /> Delete Account
          </Button>
        </div>

      </div>
    </div>
  );
}