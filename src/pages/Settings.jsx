import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Button } from "@/components/ui/button";
import { ArrowLeft, Trash2, MessageSquare, LogOut, Shield, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

export default function Settings() {
    const { user, logout } = useAuth();
    const navigate = useNavigate();
    const [feedback, setFeedback] = useState("");
    const [sending, setSending] = useState(false);

    const handleFeedback = async (e) => {
        e.preventDefault();
        setSending(true);
        // In the future, you can save this to a 'feedback' table in Supabase
        console.log("Feedback:", feedback);
        
        // Simulate a network delay for effect
        setTimeout(() => {
            toast.success("Feedback sent! Thank you.");
            setFeedback("");
            setSending(false);
        }, 1000);
    };

    const handleDeleteAccount = async () => {
        if (!confirm("Are you sure? This will delete all your photos, pings, and history permanently.")) return;
        
        const confirmText = prompt("Type DELETE to confirm:");
        if (confirmText !== "DELETE") {
            toast.error("Deletion cancelled.");
            return;
        }

        try {
            // Delete Profile Data (Cascading delete usually handles the rest)
            const { error } = await supabase.from('profiles').delete().eq('id', user.id);
            if (error) throw error;

            await logout();
            toast.error("Account deleted.");
            navigate('/landing');
        } catch (e) {
            console.error(e);
            toast.error("Error deleting account. Please contact support.");
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 pb-24">
            {/* Header */}
            <div className="flex items-center gap-4 mb-8">
                <Button variant="ghost" size="icon" onClick={() => navigate(-1)} className="text-slate-400 hover:text-white">
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <h1 className="text-xl font-bold">Settings</h1>
            </div>

            <div className="space-y-8 max-w-md mx-auto animate-in slide-in-from-bottom-4 duration-500">
                
                {/* ACCOUNT SECTION */}
                <div className="space-y-2">
                    <h3 className="text-xs font-bold text-slate-500 uppercase tracking-widest px-1">Account</h3>
                    <div className="bg-slate-900 border border-slate-800 rounded-xl overflow-hidden">
                        <div 
                            onClick={() => navigate('/profile-setup')}
                            className="p-4 flex items-center justify-between hover:bg-slate-800 transition cursor-pointer border-b border-slate-800"
                        >
                            <span className="text-sm font-medium">Edit Profile</span>
                            <ChevronRight className="w-4 h-4 text-slate-500" />
                        </div>
                        <div 
                            onClick={logout}
                            className="p-4 flex items-center justify-between hover:bg-slate-800 transition cursor-pointer text-slate-300"
                        >
                            <span className="text-sm font-medium flex items-center gap-2"><LogOut className="w-4 h-4" /> Log Out</span>
                        </div>
                    </div>
                </div>

                {/* FEEDBACK SECTION */}
                <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
                    <div className="flex items-center gap-2 mb-4">
                        <MessageSquare className="w-5 h-5 text-amber-500" />
                        <h2 className="font-bold text-lg">Send Feedback</h2>
                    </div>
                    <form onSubmit={handleFeedback} className="space-y-4">
                        <textarea 
                            value={feedback}
                            onChange={e => setFeedback(e.target.value)}
                            placeholder="Found a bug? Have an idea? Let us know."
                            className="w-full h-32 bg-slate-950 border border-slate-800 rounded-lg p-3 text-sm focus:border-amber-500 focus:ring-1 focus:ring-amber-500 outline-none transition-all resize-none"
                            required
                        />
                        <Button type="submit" disabled={sending} className="w-full bg-amber-500 text-black font-bold hover:bg-amber-400 transition-colors">
                            {sending ? "Sending..." : "Submit Feedback"}
                        </Button>
                    </form>
                </div>

                {/* DANGER ZONE */}
                <div className="space-y-2 pt-4">
                    <h3 className="text-xs font-bold text-red-900 uppercase tracking-widest px-1">Danger Zone</h3>
                    <Button 
                        variant="outline" 
                        onClick={handleDeleteAccount} 
                        className="w-full justify-start border-red-900/30 text-red-500 hover:bg-red-900/10 hover:text-red-400 hover:border-red-900/50 h-12"
                    >
                        <Trash2 className="w-4 h-4 mr-2" /> Delete Account
                    </Button>
                    <p className="text-[10px] text-slate-600 px-1">
                        This action cannot be undone. All data will be wiped.
                    </p>
                </div>

                {/* Footer Info */}
                <div className="text-center text-xs text-slate-700 mt-12 space-y-1">
                    <p className="font-mono">HiRL v1.0.4 (Alpha)</p>
                    <p>Built with ⚡️ in El Paso, TX</p>
                </div>

            </div>
        </div>
    );
}