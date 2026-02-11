import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase'; 
import { Button } from "@/components/ui/button";
import { LogOut, ChevronLeft, User, Shield, Trash2, Store, ChevronRight } from 'lucide-react'; // Added Store/ChevronRight
import { toast } from 'sonner';

export default function Settings() {
  const { logout, user } = useAuth();
  const navigate = useNavigate();

  // 🟢 NEW: State for Business Logic
  const [isOwner, setIsOwner] = useState(false);

  // 🟢 NEW: Check if user owns a venue
  useEffect(() => {
    async function checkOwnerStatus() {
        if (!user) return;
        
        const { data } = await supabase
            .from('locations')
            .select('id')
            .eq('owner_id', user.id)
            .maybeSingle();
            
        if (data) setIsOwner(true);
    }
    checkOwnerStatus();
  }, [user]);

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

      // 2. Sign Out
      if (logout) await logout();
      
      navigate('/landing');
      toast.success("Logged out successfully");
      
    } catch (error) {
      console.error("Logout error:", error);
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

        {/* 🟢 NEW: BUSINESS OWNER SECTION (Only shows if owner) */}
        {isOwner && (
            <div className="bg-gradient-to-r from-amber-950/40 to-slate-900 border border-amber-500/30 rounded-2xl p-2 shadow-xl animate-in slide-in-from-right-8 duration-500">
                <div 
                    onClick={() => navigate('/business')}
                    className="flex items-center justify-between p-3 cursor-pointer hover:bg-white/5 rounded-xl transition-all group"
                >
                    <div className="flex items-center gap-4">
                        <div className="p-3 bg-amber-500/20 rounded-full group-hover:bg-amber-500/30 transition-colors">
                            <Store className="w-6 h-6 text-amber-500" />
                        </div>
                        <div>
                            <div className="font-bold text-white text-lg">Owner Dashboard</div>
                            <div className="text-xs text-amber-500/80 uppercase tracking-wide font-bold">Manage Venue & Analytics</div>
                        </div>
                    </div>
                    <ChevronRight className="w-5 h-5 text-slate-500 group-hover:text-white transition-colors" />
                </div>
            </div>
        )}
        
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

        {/* Danger Zone */}
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