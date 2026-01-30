import React, { useState, useEffect } from 'react';
import { useAuth } from '@/lib/AuthContext';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Zap, Lock, Mail, User, RotateCcw } from 'lucide-react'; 
import { toast } from 'sonner';

export default function Auth() {
    const { loginWithPassword, signUp } = useAuth();
    const navigate = useNavigate();
    
    const [isLogin, setIsLogin] = useState(true); 
    const [loading, setLoading] = useState(false);
    
    // Form State
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [fullName, setFullName] = useState('');

    // 1. AUTO-CLEANUP: Wipe stale sessions immediately when loading this page
    useEffect(() => {
        const cleanSession = async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                console.log("Stale session found. Cleaning...");
                await supabase.auth.signOut();
                localStorage.removeItem(`sb-${import.meta.env.VITE_SUPABASE_PROJECT_ID}-auth-token`);
            }
        };
        cleanSession();
    }, []);

    // 2. MANUAL RESET BUTTON LOGIC (The "Fix It" Button)
    const handleHardReset = () => {
        if (confirm("This will clear the app cache and reload. Continue?")) {
            localStorage.clear();
            sessionStorage.clear();
            window.location.reload();
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true); // Start "Processing..."

        try {
            if (isLogin) {
                // 3. THE FIX: TIMEOUT PROTECTION
                // If Supabase doesn't answer in 5 seconds, REJECT so the code stops waiting.
                const timeoutPromise = new Promise((_, reject) => 
                    setTimeout(() => reject(new Error("Login timed out. Please click 'Reset App' below.")), 5000)
                );
                
                // Race the Login against the 5-second Timer
                await Promise.race([
                    loginWithPassword(email, password),
                    timeoutPromise
                ]);

                toast.success('Welcome back!');
                navigate('/');
            } else {
                if (!fullName) throw new Error("Please enter your name");
                await signUp(email, password, fullName);
                toast.success('Account created!');
                navigate('/profile-setup'); 
            }
        } catch (error) {
            console.error(error);
            toast.error(error.message || 'Authentication failed');
        } finally {
            // 4. CRITICAL: This ensures the button ALWAYS stops processing
            setLoading(false); 
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="w-full max-w-md backdrop-blur-xl bg-white/5 rounded-3xl border border-white/10 p-8">
                
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-amber-500/20 mb-4">
                        <Zap className="w-8 h-8 text-amber-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">
                        {isLogin ? 'Welcome Back' : 'Create Account'}
                    </h1>
                    <p className="text-slate-400">
                        {isLogin ? 'Enter your details to sign in.' : 'Join the network today.'}
                    </p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <div>
                            <label className="text-slate-300 text-xs font-medium mb-1 block">Full Name</label>
                            <div className="relative">
                                <User className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                                <Input
                                    value={fullName}
                                    onChange={(e) => setFullName(e.target.value)}
                                    placeholder="John Doe"
                                    className="pl-10 bg-white/5 border-white/10 text-white h-12 rounded-xl"
                                />
                            </div>
                        </div>
                    )}

                    <div>
                        <label className="text-slate-300 text-xs font-medium mb-1 block">Email</label>
                        <div className="relative">
                            <Mail className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                            <Input
                                type="email"
                                value={email}
                                onChange={(e) => setEmail(e.target.value)}
                                placeholder="you@example.com"
                                className="pl-10 bg-white/5 border-white/10 text-white h-12 rounded-xl"
                            />
                        </div>
                    </div>

                    <div>
                        <label className="text-slate-300 text-xs font-medium mb-1 block">Password</label>
                        <div className="relative">
                            <Lock className="absolute left-3 top-3 w-5 h-5 text-slate-500" />
                            <Input
                                type="password"
                                value={password}
                                onChange={(e) => setPassword(e.target.value)}
                                placeholder="••••••••"
                                className="pl-10 bg-white/5 border-white/10 text-white h-12 rounded-xl"
                            />
                        </div>
                    </div>

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 mt-2 bg-gradient-to-r from-amber-500 to-orange-500 text-black font-semibold rounded-xl"
                    >
                        {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
                    </Button>
                </form>

                <div className="mt-6 flex flex-col gap-4 text-center">
                    <button 
                        onClick={() => setIsLogin(!isLogin)}
                        className="text-sm text-slate-400 hover:text-white transition-colors"
                    >
                        {isLogin ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
                    </button>

                    {/* NEW: TROUBLESHOOTING BUTTON */}
                    <button 
                        onClick={handleHardReset}
                        className="flex items-center justify-center gap-2 text-xs text-red-400/80 hover:text-red-400 transition-colors py-2"
                    >
                        <RotateCcw className="w-3 h-3" />
                        App stuck? Click here to Reset
                    </button>
                </div>
            </div>
        </div>
    );
}