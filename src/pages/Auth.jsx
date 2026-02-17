import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('sign_in'); // 'sign_in', 'sign_up', 'forgot_password'
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  const isValidPassword = (pwd) => pwd.length >= 6;

  // 🟢 1. RESTORED: Google Login Handler
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: window.location.origin,
        },
      });
      if (error) throw error;
      // Note: No need to navigate() or setLoading(false) here because 
      // OAuth redirects the browser away immediately.
    } catch (error) {
      toast.error(error.message);
      setLoading(false);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (view === 'forgot_password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/update-password',
        });
        if (error) throw error;
        toast.success("Check your email for the reset link!");
        setView('sign_in');
      } 
      else if (view === 'sign_up') {
        if (!isValidPassword(password)) throw new Error("Password is too short (min 6 characters).");

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              display_name: fullName.split(' ')[0], 
            },
          },
        });
        if (error) throw error;
        toast.success("Account created! You can now log in.");
      } 
      else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
        navigate('/');
      }
    } catch (error) {
      toast.error(error.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-6 relative overflow-hidden">
       {/* Background Glow */}
       <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-amber-600/10 rounded-full blur-[120px] pointer-events-none" />
       <div className="absolute bottom-[-10%] left-[-10%] w-[400px] h-[400px] bg-amber-900/10 rounded-full blur-[100px] pointer-events-none" />
       
       <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            
            {/* Logo */}
            <div className="relative w-48 h-48 mx-auto mb-6">
                <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-full scale-90" />
                <img 
                    src="/logo-desert-bigger.png" 
                    alt="TapTap" 
                    className="relative w-full h-full object-contain drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]"
                />
            </div>

            <h1 className="text-3xl font-black text-white tracking-tight">
              {view === 'sign_in' && "Welcome Back"}
              {view === 'sign_up' && "Join the Action"}
              {view === 'forgot_password' && "Reset Password"}
            </h1>
            <p className="text-slate-400 mt-2">
              {view === 'forgot_password' 
                ? "Enter your email and we'll send you a link." 
                : "The only social network for the real world."}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            
            {view === 'sign_up' && (
              <div className="space-y-1">
                <Input 
                  type="text" 
                  placeholder="Full Name" 
                  className="bg-slate-900/50 border-slate-800 h-12 text-white"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
            )}

            <div className="space-y-1 relative">
              <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
              <Input 
                type="email" 
                placeholder="Email Address" 
                className="bg-slate-900/50 border-slate-800 h-12 pl-10 text-white"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {view !== 'forgot_password' && (
              <div className="space-y-1 relative">
                <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
                <Input 
                  type="password" 
                  placeholder="Password (min 6 chars)" 
                  className="bg-slate-900/50 border-slate-800 h-12 pl-10 text-white"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
            )}

            <Button disabled={loading} className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-base mt-2 shadow-lg shadow-amber-900/20">
              {loading ? <Loader2 className="animate-spin" /> : 
                (view === 'sign_in' ? 'Log In' : view === 'sign_up' ? 'Create Account' : 'Send Reset Link')
              }
            </Button>
          </form>

          {/* 🟢 2. RESTORED: Google Button & Divider */}
          {view !== 'forgot_password' && (
            <div className="mt-6">
                <div className="relative">
                    <div className="absolute inset-0 flex items-center">
                        <span className="w-full border-t border-slate-800" />
                    </div>
                    <div className="relative flex justify-center text-xs uppercase">
                        <span className="bg-slate-950 px-2 text-slate-500">Or continue with</span>
                    </div>
                </div>

                <Button 
                    type="button" 
                    variant="outline" 
                    onClick={handleGoogleLogin}
                    disabled={loading}
                    className="w-full h-12 mt-4 bg-slate-900 border-slate-800 hover:bg-slate-800 hover:text-white text-slate-300 font-bold"
                >
                    {/* Google 'G' Icon SVG */}
                    <svg className="mr-2 h-5 w-5" aria-hidden="true" focusable="false" data-prefix="fab" data-icon="google" role="img" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 488 512">
                        <path fill="currentColor" d="M488 261.8C488 403.3 391.1 504 248 504 110.8 504 0 393.2 0 256S110.8 8 248 8c66.8 0 123 24.5 166.3 64.9l-67.5 64.9C258.5 52.6 94.3 116.6 94.3 256c0 86.5 69.1 156.6 153.7 156.6 98.2 0 135-70.4 140.8-106.9H248v-85.3h236.1c2.3 12.7 3.9 24.9 3.9 41.4z"></path>
                    </svg>
                    Google
                </Button>
            </div>
          )}

          {/* TOGGLES */}
          <div className="mt-6 text-center space-y-3">
             {view === 'sign_in' && (
               <>
                 <p className="text-slate-500 text-sm">
                   Need an account? <button onClick={() => setView('sign_up')} className="text-amber-500 font-bold hover:underline">Sign Up</button>
                 </p>
                 <button onClick={() => setView('forgot_password')} className="text-xs text-slate-500 hover:text-white transition">
                   Forgot Password?
                 </button>
               </>
             )}

             {view === 'sign_up' && (
               <p className="text-slate-500 text-sm">
                 Already have one? <button onClick={() => setView('sign_in')} className="text-amber-500 font-bold hover:underline">Log In</button>
               </p>
             )}

             {view === 'forgot_password' && (
               <button onClick={() => setView('sign_in')} className="text-slate-400 text-sm hover:text-white flex items-center gap-2 mx-auto">
                 <ArrowLeft className="w-4 h-4" /> Back to Login
               </button>
             )}
          </div>
       </div>
    </div>
  );
}