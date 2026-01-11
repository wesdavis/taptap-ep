import React from 'react';
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import { Zap, MapPin, Shield, Sparkles, Heart, Users } from 'lucide-react';
import { base44 } from '@/api/base44Client';

export default function Landing() {
    const handleGetStarted = async () => {
        await base44.auth.redirectToLogin('/');
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 overflow-hidden">
            {/* Animated background orbs */}
            <div className="fixed inset-0 overflow-hidden pointer-events-none">
                <motion.div
                    animate={{
                        scale: [1, 1.2, 1],
                        opacity: [0.3, 0.5, 0.3],
                    }}
                    transition={{ duration: 8, repeat: Infinity }}
                    className="absolute -top-1/2 -right-1/4 w-[800px] h-[800px] bg-purple-600/20 rounded-full blur-3xl"
                />
                <motion.div
                    animate={{
                        scale: [1.2, 1, 1.2],
                        opacity: [0.2, 0.4, 0.2],
                    }}
                    transition={{ duration: 10, repeat: Infinity }}
                    className="absolute -bottom-1/2 -left-1/4 w-[800px] h-[800px] bg-amber-600/20 rounded-full blur-3xl"
                />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto px-4 py-12">
                {/* Hero Section */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.8 }}
                    className="text-center mb-20"
                >
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-6">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span className="text-amber-300 text-sm font-medium">Female-First Dating</span>
                    </div>
                    
                    <h1 className="text-6xl md:text-7xl font-bold text-white mb-6 leading-tight">
                        Meet IRL,
                        <br />
                        <span className="bg-gradient-to-r from-amber-400 to-orange-500 bg-clip-text text-transparent">
                            Make It Real
                        </span>
                    </h1>
                    
                    <p className="text-xl text-slate-300 mb-10 max-w-2xl mx-auto leading-relaxed">
                        The only dating app where women are in control. Check into real venues, 
                        discover people nearby, and connect face-to-face—safely and authentically.
                    </p>

                    <motion.div
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ delay: 0.3 }}
                    >
                        <Button
                            onClick={handleGetStarted}
                            className="h-14 px-10 text-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-semibold rounded-2xl shadow-2xl shadow-amber-500/25"
                        >
                            <Zap className="w-5 h-5 mr-2" />
                            Get Started
                        </Button>
                    </motion.div>
                </motion.div>

                {/* Features Grid */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.8 }}
                    className="grid md:grid-cols-3 gap-6 mb-20"
                >
                    <div className="backdrop-blur-xl bg-white/5 rounded-3xl border border-white/10 p-8">
                        <div className="w-14 h-14 rounded-2xl bg-purple-500/20 flex items-center justify-center mb-4">
                            <MapPin className="w-7 h-7 text-purple-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Real Locations</h3>
                        <p className="text-slate-400 leading-relaxed">
                            Check into actual bars, cafes, and venues. See who's really there, right now.
                        </p>
                    </div>

                    <div className="backdrop-blur-xl bg-white/5 rounded-3xl border border-white/10 p-8">
                        <div className="w-14 h-14 rounded-2xl bg-amber-500/20 flex items-center justify-center mb-4">
                            <Shield className="w-7 h-7 text-amber-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Women Lead</h3>
                        <p className="text-slate-400 leading-relaxed">
                            Women see everyone. Men can only be discovered. Your safety, your rules.
                        </p>
                    </div>

                    <div className="backdrop-blur-xl bg-white/5 rounded-3xl border border-white/10 p-8">
                        <div className="w-14 h-14 rounded-2xl bg-pink-500/20 flex items-center justify-center mb-4">
                            <Heart className="w-7 h-7 text-pink-400" />
                        </div>
                        <h3 className="text-xl font-bold text-white mb-3">Instant Sparks</h3>
                        <p className="text-slate-400 leading-relaxed">
                            Ping someone you like. If they ping back, it's a match—meet immediately.
                        </p>
                    </div>
                </motion.div>

                {/* How It Works */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.7, duration: 0.8 }}
                    className="backdrop-blur-xl bg-gradient-to-r from-purple-500/10 to-amber-500/10 rounded-3xl border border-white/10 p-12 mb-20"
                >
                    <div className="text-center mb-12">
                        <h2 className="text-4xl font-bold text-white mb-4">How It Works</h2>
                        <p className="text-slate-300 text-lg">Three simple steps to real connections</p>
                    </div>

                    <div className="grid md:grid-cols-3 gap-8">
                        <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-amber-500/20 border-4 border-amber-500/40 flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl font-bold text-amber-400">1</span>
                            </div>
                            <h4 className="text-lg font-semibold text-white mb-2">Check In</h4>
                            <p className="text-slate-400">Open the app when you arrive at a venue</p>
                        </div>

                        <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-purple-500/20 border-4 border-purple-500/40 flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl font-bold text-purple-400">2</span>
                            </div>
                            <h4 className="text-lg font-semibold text-white mb-2">Discover</h4>
                            <p className="text-slate-400">See who else is there and ping them</p>
                        </div>

                        <div className="text-center">
                            <div className="w-16 h-16 rounded-full bg-pink-500/20 border-4 border-pink-500/40 flex items-center justify-center mx-auto mb-4">
                                <span className="text-2xl font-bold text-pink-400">3</span>
                            </div>
                            <h4 className="text-lg font-semibold text-white mb-2">Connect</h4>
                            <p className="text-slate-400">Match and meet face-to-face, instantly</p>
                        </div>
                    </div>
                </motion.div>

                {/* Social Proof */}
                <motion.div
                    initial={{ opacity: 0, y: 30 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.9, duration: 0.8 }}
                    className="text-center"
                >
                    <div className="inline-flex items-center gap-2 px-6 py-3 rounded-full bg-white/5 border border-white/10 mb-8">
                        <Users className="w-5 h-5 text-amber-400" />
                        <span className="text-slate-300">Join thousands making real connections</span>
                    </div>

                    <Button
                        onClick={handleGetStarted}
                        className="h-14 px-10 text-lg bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-semibold rounded-2xl shadow-2xl shadow-amber-500/25"
                    >
                        <Zap className="w-5 h-5 mr-2" />
                        Get Started Free
                    </Button>
                </motion.div>
            </div>

            {/* Footer */}
            <div className="relative z-10 text-center py-8 text-slate-500 text-sm">
                <p>© 2026 HiRL. Where real connections happen.</p>
            </div>
        </div>
    );
}