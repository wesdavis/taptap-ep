import React from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase'; 
import { Button } from "@/components/ui/button";
import { LogOut, ChevronLeft, User, Shield, Trash2 } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
  // 🟢 FIX: extracting 'logout' instead of 'signOut'
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    try {
      // 1. CLEANUP: Check out of database
      if (user) {
          const { error } = await supabase
            .from('checkins')
            .update({ is_active: false })
            .eq('user_id', user.id);
            
          if (error) console.error("Error clearing check-in:", error);
      }

      // 2. Sign Out (Using the correct name now)
      if (logout) await logout();
      
      navigate('/landing');
      toast.success("Logged out successfully");
      
    } catch (error) {
      console.error("Logout error:", error);
      // Fallback
      if (logout) await logout(); 
      navigate('/landing');
    }
  };

  const handleDeleteAccount = async () => {
      if (!window.confirm("Are you sure? This cannot be undone.")) return;
      
      try {
          const { error } = await supabase.from('profiles').delete().eq('id', user.id);
          if (error) throw error;
          
          if (logout) await logout();
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
            <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800 px-2" onClick={() => navigate('/profile-setup')}>Edit Profile</Button>
            <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800 px-2" onClick={() => navigate('/achievements')}>My Achievements</Button>
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
                <span>App Version</span><span className="font-mono text-xs">v1.2.0 (Beta)</span>
             </div>
             <Button variant="ghost" className="w-full justify-start text-slate-300 hover:text-white hover:bg-slate-800 px-2" onClick={() => window.location.href = 'mailto:support@taptap.com'}>Contact Support</Button>
          </div>
        </div>

        {/* 🟢 YOUR NEW DANGER ZONE LAYOUT */}
        <div className="bg-slate-900 rounded-2xl p-5 border border-slate-800 shadow-xl space-y-3">
          <h2 className="font-bold text-xs uppercase tracking-wider text-slate-400 mb-2">Sign Out & Delete Account</h2>
          
          <Button onClick={handleLogout} variant="ghost" className="w-full justify-start gap-2 text-slate-300 hover:text-white hover:bg-slate-800">
            <LogOut className="w-4 h-4" /> Sign Out
          </Button>

          <Button onClick={handleDeleteAccount} variant="ghost" className="w-full justify-start gap-2 text-slate-300 hover:text-white hover:bg-slate-800">
            <Trash2 className="w-3 h-3" /> Delete Account
          </Button>
        </div>

      </div>
    </div>
  );
}