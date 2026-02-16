import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Zap, Loader2, ArrowLeft, Mail, Lock } from 'lucide-react';
import { toast } from 'sonner';

export default function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [view, setView] = useState('sign_in'); // 'sign_in', 'sign_up', 'forgot_password'
  
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');

  // 🟢 1. THE "LAZY" PASSWORD POLICY
  const isValidPassword = (pwd) => {
    return pwd.length >= 6; // That's it. Simple.
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      if (view === 'forgot_password') {
        // 🟢 HANDLE PASSWORD RESET
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/update-password', // We will build this page next
        });
        if (error) throw error;
        toast.success("Check your email for the reset link!");
        setView('sign_in');
      } 
      else if (view === 'sign_up') {
        // CHECK POLICY
        if (!isValidPassword(password)) {
          throw new Error("Password is too short (min 6 characters).");
        }

        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              display_name: fullName.split(' ')[0], // Simple default handle
            },
          },
        });
        if (error) throw error;
        toast.success("Account created! You can now log in.");
        // Auto-login behavior varies by config, usually requires email confirmation or auto-signs in.
        // If email confirm is off, they are logged in.
      } 
      else {
        // SIGN IN
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
       <div className="absolute top-[-10%] right-[-5%] w-[300px] h-[300px] bg-amber-500/20 rounded-full blur-[100px]" />
       
       <div className="w-full max-w-md relative z-10">
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-br from-amber-400 to-orange-600 rounded-2xl flex items-center justify-center shadow-lg shadow-amber-900/20 mx-auto mb-4">
               <Zap className="text-black w-8 h-8 fill-black" />
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

            <Button disabled={loading} className="w-full h-12 bg-white text-black font-bold hover:bg-slate-200 text-base mt-2">
              {loading ? <Loader2 className="animate-spin" /> : 
                (view === 'sign_in' ? 'Log In' : view === 'sign_up' ? 'Create Account' : 'Send Reset Link')
              }
            </Button>
          </form>

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