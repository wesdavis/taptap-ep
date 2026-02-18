import React, { useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Loader2, ArrowLeft, Mail, Lock, User, Phone, Calendar, AtSign, KeyRound, Heart } from 'lucide-react';
import { toast } from 'sonner';

export default function Auth() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Views: 'sign_in', 'sign_up', 'forgot_password', 'verify_phone'
  const [view, setView] = useState('sign_in'); 
  
  // Form Data
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [handle, setHandle] = useState('');
  const [phone, setPhone] = useState('');
  const [gender, setGender] = useState(''); 
  const [interestedIn, setInterestedIn] = useState(''); // 🟢 NEW STATE
  const [birthdate, setBirthdate] = useState('');
  const [otpCode, setOtpCode] = useState(''); 

  const isValidPassword = (pwd) => pwd.length >= 6;

  // 🟢 Google Login
  const handleGoogleLogin = async () => {
    try {
      setLoading(true);
      const { error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: window.location.origin },
      });
      if (error) throw error;
    } catch (error) {
      toast.error(error.message);
      setLoading(false);
    }
  };

  // 🟢 MAIN AUTH HANDLER
  const handleAuth = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      // 1. FORGOT PASSWORD
      if (view === 'forgot_password') {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: window.location.origin + '/update-password',
        });
        if (error) throw error;
        toast.success("Check your email for the reset link!");
        setView('sign_in');
      } 
      
      // 2. SIGN UP
      else if (view === 'sign_up') {
        // Validation
        if (!isValidPassword(password)) throw new Error("Password must be 6+ chars.");
        if (!gender) throw new Error("Select your gender.");
        if (!interestedIn) throw new Error("Select who you are interested in."); // 🟢 VALIDATION
        if (!birthdate) throw new Error("Enter birthdate.");
        if (!handle) throw new Error("Choose a handle.");
        if (!phone) throw new Error("Phone number is required for verification.");

        const cleanHandle = handle.replace('@', '').toLowerCase();

        // A. Create User
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: fullName,
              display_name: fullName.split(' ')[0], 
              handle: cleanHandle,
              gender: gender, // Already lowercase from select
              interested_in: interestedIn, // 🟢 SAVING PREFERENCE
              birthdate: birthdate,
              avatar_url: `https://api.dicebear.com/7.x/initials/svg?seed=${cleanHandle}`
            },
          },
        });
        if (error) throw error;

        // B. Trigger OTP
        const { error: updateError } = await supabase.auth.updateUser({
           phone: phone
        });
        
        if (updateError) {
            console.error(updateError);
            throw new Error("Account created, but could not send SMS. Check number format.");
        }

        toast.success("Code sent! Check your phone.");
        setView('verify_phone'); 
      } 

      // 3. VERIFY PHONE OTP
      else if (view === 'verify_phone') {
         const { error } = await supabase.auth.verifyOtp({
            phone: phone,
            token: otpCode,
            type: 'sms',
         });
         
         if (error) throw error;
         
         toast.success("Phone verified! Welcome to TapTap.");
         window.location.href = '/'; // Hard reload to ensure profile loads
      }
      
      // 4. SIGN IN
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
       
       <div className="w-full max-w-md relative z-10 my-10">
          <div className="text-center mb-8">
            <div className="relative w-40 h-40 mx-auto mb-2">
                <div className="absolute inset-0 bg-amber-500/20 blur-2xl rounded-full scale-90" />
                <img src="/logo-desert-bigger.png" alt="TapTap" className="relative w-full h-full object-contain drop-shadow-[0_0_15px_rgba(245,158,11,0.4)]" />
            </div>

            <h1 className="text-3xl font-black text-white tracking-tight">
              {view === 'sign_in' && "Welcome Back"}
              {view === 'sign_up' && "Create Profile"}
              {view === 'verify_phone' && "Verify Phone"}
              {view === 'forgot_password' && "Reset Password"}
            </h1>
            <p className="text-slate-400 mt-2 text-sm">
              {view === 'verify_phone' ? `Enter the code sent to ${phone}` : "The only social network for the real world."}
            </p>
          </div>

          <form onSubmit={handleAuth} className="space-y-4">
            
            {/* 🟢 VIEW: SIGN UP FORM */}
            {view === 'sign_up' && (
              <div className="space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                <div className="grid grid-cols-2 gap-4">
                  <div className="relative">
                     <User className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
                     <Input placeholder="Full Name" className="bg-slate-900/50 border-slate-800 h-12 pl-10 text-white" value={fullName} onChange={(e) => setFullName(e.target.value)} required />
                  </div>
                  <div className="relative">
                     <AtSign className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
                     <Input placeholder="Handle" className="bg-slate-900/50 border-slate-800 h-12 pl-10 text-white" value={handle} onChange={(e) => setHandle(e.target.value)} required />
                  </div>
                </div>

                {/* Phone & Birthday */}
                <div className="space-y-1 relative">
                  <Phone className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
                  <Input type="tel" placeholder="+1 (555) 000-0000" className="bg-slate-900/50 border-slate-800 h-12 pl-10 text-white" value={phone} onChange={(e) => setPhone(e.target.value)} required />
                </div>

                <div className="space-y-1 relative">
                    <Calendar className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
                    <Input type="date" className="bg-slate-900/50 border-slate-800 h-12 pl-10 text-white dark:[color-scheme:dark]" value={birthdate} onChange={(e) => setBirthdate(e.target.value)} required />
                </div>

                {/* 🟢 GENDER & INTERESTS ROW */}
                <div className="grid grid-cols-2 gap-4">
                    <div className="relative">
                        <select className="w-full h-12 bg-slate-900/50 border border-slate-800 rounded-md text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none" value={gender} onChange={(e) => setGender(e.target.value)} required>
                            <option value="" disabled>I am a...</option>
                            <option value="male">Male</option>
                            <option value="female">Female</option>
                        </select>
                    </div>
                    <div className="relative">
                        <select className="w-full h-12 bg-slate-900/50 border border-slate-800 rounded-md text-white px-3 text-sm focus:outline-none focus:ring-2 focus:ring-amber-500 appearance-none" value={interestedIn} onChange={(e) => setInterestedIn(e.target.value)} required>
                            <option value="" disabled>Interested in...</option>
                            <option value="male">Men</option>
                            <option value="female">Women</option>
                            
                        </select>
                    </div>
                </div>
              </div>
            )}

            {/* 🟢 VIEW: EMAIL/PASS */}
            {view !== 'verify_phone' && (
             <div className="space-y-4">
                <div className="relative">
                    <Mail className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
                    <Input type="email" placeholder="Email Address" className="bg-slate-900/50 border-slate-800 h-12 pl-10 text-white" value={email} onChange={(e) => setEmail(e.target.value)} required />
                </div>
                {view !== 'forgot_password' && (
                <div className="relative">
                    <Lock className="absolute left-3 top-3.5 w-5 h-5 text-slate-500" />
                    <Input type="password" placeholder="Password (min 6 chars)" className="bg-slate-900/50 border-slate-800 h-12 pl-10 text-white" value={password} onChange={(e) => setPassword(e.target.value)} required />
                </div>
                )}
             </div>
            )}

            {/* 🟢 VIEW: VERIFY OTP */}
            {view === 'verify_phone' && (
               <div className="space-y-4 animate-in fade-in zoom-in duration-300">
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-3.5 w-5 h-5 text-amber-500" />
                    <Input 
                        type="text" 
                        placeholder="Enter 6-digit code" 
                        className="bg-slate-900/50 border-amber-500/50 h-12 pl-10 text-white text-lg tracking-widest" 
                        maxLength={6}
                        value={otpCode} 
                        onChange={(e) => setOtpCode(e.target.value)} 
                        required 
                        autoFocus
                    />
                  </div>
                  <Button type="button" variant="ghost" className="w-full text-slate-500 text-xs" onClick={() => setView('sign_up')}>
                    Wrong number? Go back.
                  </Button>
               </div>
            )}

            <Button disabled={loading} className="w-full h-12 bg-gradient-to-r from-amber-500 to-amber-600 hover:from-amber-400 hover:to-amber-500 text-black font-bold text-base mt-2 shadow-lg shadow-amber-900/20">
              {loading ? <Loader2 className="animate-spin" /> : 
                (view === 'sign_in' ? 'Log In' : view === 'sign_up' ? 'Send Code' : view === 'verify_phone' ? 'Verify & Enter' : 'Send Reset Link')
              }
            </Button>
          </form>

          {/* GOOGLE & TOGGLES */}
          {view !== 'verify_phone' && (
            <>
                {view !== 'forgot_password' && (
                    <div className="mt-6">
                        <div className="relative">
                            <div className="absolute inset-0 flex items-center"><span className="w-full border-t border-slate-800" /></div>
                            <div className="relative flex justify-center text-xs uppercase"><span className="bg-slate-950 px-2 text-slate-500">Or continue with</span></div>
                        </div>
                        <Button type="button" variant="outline" onClick={handleGoogleLogin} disabled={loading} className="w-full h-12 mt-4 bg-slate-900 border-slate-800 hover:bg-slate-800 hover:text-white text-slate-300 font-bold">
                            Google
                        </Button>
                    </div>
                )}

                <div className="mt-6 text-center space-y-3">
                    {view === 'sign_in' && (
                    <>
                        <p className="text-slate-500 text-sm">Need an account? <button onClick={() => setView('sign_up')} className="text-amber-500 font-bold hover:underline">Sign Up</button></p>
                        <button onClick={() => setView('forgot_password')} className="text-xs text-slate-500 hover:text-white transition">Forgot Password?</button>
                    </>
                    )}
                    {view === 'sign_up' && (
                        <p className="text-slate-500 text-sm">Already have one? <button onClick={() => setView('sign_in')} className="text-amber-500 font-bold hover:underline">Log In</button></p>
                    )}
                    {view === 'forgot_password' && (
                        <button onClick={() => setView('sign_in')} className="text-slate-400 text-sm hover:text-white flex items-center gap-2 mx-auto"><ArrowLeft className="w-4 h-4" /> Back to Login</button>
                    )}
                </div>
            </>
          )}
       </div>
    </div>
  );
}