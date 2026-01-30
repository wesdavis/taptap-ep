import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Sparkles, ArrowRight } from 'lucide-react';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';

export default function Login() {
    const { login } = useAuth();
    const navigate = useNavigate();
    const [email, setEmail] = useState('');
    const [password, setPassword] = useState('');
    const [loading, setLoading] = useState(false);

    const handleLogin = (e) => {
        e.preventDefault();
        setLoading(true);
        
        // SIMULATE API CALL
        setTimeout(() => {
            // Log in as a "Mock User" with perfect profile data
            login({
                email: email || 'statafarion@example.com',
                full_name: 'Statafarion',
                gender: 'male',
                seeking: 'female',
                bio: 'Just a local dev testing the app.',
                photo_url: 'https://images.unsplash.com/photo-1599566150163-29194dcaad36?w=800'
            });
            navigate('/');
        }, 1000);
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
            <div className="max-w-md w-full backdrop-blur-xl bg-white/5 rounded-3xl border border-white/10 p-8">
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="w-8 h-8 text-amber-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white mb-2">Welcome Back</h1>
                    <p className="text-slate-400">Enter any details to test the app.</p>
                </div>

                <form onSubmit={handleLogin} className="space-y-4">
                    <div className="space-y-2">
                        <Label className="text-slate-300">Email</Label>
                        <Input 
                            type="email" 
                            placeholder="user@example.com"
                            value={email}
                            onChange={(e) => setEmail(e.target.value)}
                            className="bg-white/5 border-white/10 text-white h-12 rounded-xl"
                        />
                    </div>
                    <div className="space-y-2">
                        <Label className="text-slate-300">Password</Label>
                        <Input 
                            type="password" 
                            placeholder="••••••••"
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="bg-white/5 border-white/10 text-white h-12 rounded-xl"
                        />
                    </div>

                    <Button 
                        type="submit" 
                        disabled={loading}
                        className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold rounded-xl mt-4"
                    >
                        {loading ? 'Logging In...' : 'Sign In'} <ArrowRight className="w-4 h-4 ml-2" />
                    </Button>
                </form>
            </div>
        </div>
    );
}