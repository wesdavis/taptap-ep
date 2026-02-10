import { useState } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Loader2, Mail, Chrome, ArrowRight, Sparkles } from 'lucide-react';
import { toast } from 'sonner';

export default function Auth() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const navigate = useNavigate();

  // 🟢 1. The Google Login Function
  const handleGoogleLogin = async () => {
    try {
        const { error } = await supabase.auth.signInWithOAuth({
            provider: 'google',
            options: {
                redirectTo: window.location.origin // Returns them to localhost or vercel
            }
        });
        if (error) throw error;
    } catch (error) {
        toast.error("Google Login failed");
        console.error(error);
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ 
            email, 
            password,
            options: {
                data: {
                    full_name: email.split('@')[0],
                    avatar_url: `https://ui-avatars.com/api/?name=${email}&background=random`
                }
            }
        });
        if (error) throw error;
        toast.success("Account created! Check your email to confirm.");
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
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
      
      {/* Background Ambience */}
      <div className="absolute top-[-10%] right-[-10%] w-96 h-96 bg-amber-500/10 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-96 h-96 bg-blue-500/10 rounded-full blur-3xl pointer-events-none" />

      <div className="w-full max-w-md space-y-8 relative z-10">
        
        {/* Logo Section */}
        <div className="text-center space-y-2">
            <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-amber-400 to-amber-600 shadow-xl shadow-amber-500/20 mb-4 animate-in zoom-in duration-500">
                <Sparkles className="w-8 h-8 text-black fill-white" />
            </div>
            <h1 className="text-4xl font-black text-white tracking-tight">Tap Tap</h1>
            <p className="text-slate-400">The social compass for your night out.</p>
        </div>

        {/* 🟢 2. The Social Buttons */}
        <div className="space-y-3">
            <Button 
                onClick={handleGoogleLogin}
                variant="outline" 
                className="w-full h-12 bg-white text-black font-bold hover:bg-slate-100 border-0 flex items-center gap-3 text-base shadow-lg transition-transform active:scale-95"
            >
                <Chrome className="w-5 h-5 text-blue-600" />
                Continue with Google
            </Button>
            
            {/* Divider */}
            <div className="relative py-2">
                <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-800"></span></div>
                <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-950 px-2 text-slate-500 font-bold">Or use email</span></div>
            </div>
        </div>

        {/* Email Form */}
        <form onSubmit={handleAuth} className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-700">
          <div className="space-y-2">
            <Label className="text-slate-300 ml-1">Email</Label>
            <div className="relative">
                <Mail className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                <Input 
                    type="email" 
                    placeholder="hello@example.com" 
                    required 
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 h-12 bg-slate-900 border-slate-800 focus:border-amber-500 focus:ring-amber-500/20 transition-all"
                />
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-slate-300 ml-1">Password</Label>
            <Input 
                type="password" 
                placeholder="••••••••" 
                required 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-12 bg-slate-900 border-slate-800 focus:border-amber-500 focus:ring-amber-500/20 transition-all"
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full h-12 bg-slate-800 hover:bg-slate-700 text-white font-bold border border-slate-700 shadow-lg">
            {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : (isSignUp ? 'Create Account' : 'Sign In')}
            {!loading && <ArrowRight className="ml-2 w-4 h-4" />}
          </Button>
        </form>

        <p className="text-center text-sm text-slate-500">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}
          <button onClick={() => setIsSignUp(!isSignUp)} className="ml-2 text-amber-500 font-bold hover:underline">
            {isSignUp ? 'Sign In' : 'Sign Up'}
          </button>
        </p>
      </div>
    </div>
  );
}