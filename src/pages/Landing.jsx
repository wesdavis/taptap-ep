import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Zap, Shield, Smartphone, Users, Coffee } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Landing() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-950 text-white overflow-hidden relative selection:bg-amber-500/30">
            
            {/* 🟢 NEW: FIXED BACKGROUND IMAGE (El Paso Star) */}
            <div 
                className="fixed inset-0 z-0 pointer-events-none"
                style={{
                    backgroundImage: `url('/el-paso-star2.jpg')`, 
                    backgroundSize: 'cover',
                    backgroundPosition: 'top center',
                    backgroundAttachment: 'fixed',
                    opacity: 0.5 // Slightly higher opacity for landing to make it pop
                }}
            />
            
            {/* 🟢 NEW: VIGNETTE OVERLAY (Dark edges, clear center) */}
            <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_center,rgba(2,6,23,0.4)_0%,#020617_100%)]" />

            <div className="relative z-10 max-w-7xl mx-auto px-6 py-8 flex flex-col min-h-screen">
                
                {/* Header */}
                <header className="flex justify-between items-center mb-20 animate-in fade-in slide-in-from-top-4 duration-700">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gradient-to-br from-amber-400 to-orange-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-900/20 backdrop-blur-md">
                            <Zap className="text-black w-6 h-6 fill-black" />
                        </div>
                        <span className="text-2xl font-black tracking-tight text-white drop-shadow-md">
                            TapTap
                        </span>
                    </div>
                    <div className="flex gap-4">
                        <Button 
                            variant="ghost" 
                            className="hidden sm:inline-flex text-slate-300 hover:text-white hover:bg-white/10"
                            onClick={() => navigate('/auth')}
                        >
                            Log In
                        </Button>
                        <Button 
                            className="bg-white text-black hover:bg-slate-200 font-bold rounded-full px-6 shadow-lg shadow-white/10"
                            onClick={() => navigate('/auth')}
                        >
                            Join Now
                        </Button>
                    </div>
                </header>

                {/* Main Hero Split */}
                <main className="flex-1 flex flex-col lg:flex-row items-center gap-12 lg:gap-20">
                    
                    {/* Left: Text Content */}
                    <div className="flex-1 text-center lg:text-left">
                        <motion.div
                            initial={{ opacity: 0, y: 30 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: 0.6 }}
                        >
                            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-slate-900/60 border border-slate-700/50 backdrop-blur-md mb-8 shadow-lg">
                                <span className="relative flex h-2.5 w-2.5">
                                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                    <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-green-500"></span>
                                </span>
                                <span className="text-xs font-bold text-green-400 uppercase tracking-wider">Live in El Paso</span>
                            </div>

                            <h1 className="text-5xl md:text-7xl font-black mb-6 tracking-tight leading-[1.1] drop-shadow-xl">
                                No More Swiping <br />
                                <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-orange-500 to-amber-600 drop-shadow-sm">
                                    Meet People IRL
                                </span>
                            </h1>

                            <p className="text-lg md:text-xl text-slate-300 mb-10 max-w-xl mx-auto lg:mx-0 leading-relaxed drop-shadow-md font-medium">
                                The first social network that only works when you leave the house.
                                Check in to venues, see who's actually there, and make connections in the moment. 
                            </p>

                            <div className="flex flex-col sm:flex-row gap-4 justify-center lg:justify-start">
                                <Button 
                                    size="lg"
                                    onClick={() => navigate('/auth')} 
                                    className="h-14 px-8 text-lg bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-2xl shadow-[0_0_40px_-10px_rgba(245,158,11,0.5)] transition-all hover:scale-105"
                                >
                                    Start Exploring
                                    <ArrowRight className="ml-2 w-5 h-5" />
                                </Button>
                                <Button 
                                    size="lg"
                                    variant="outline"
                                    className="h-14 px-8 text-lg border-slate-600/50 bg-slate-900/40 backdrop-blur-md text-slate-200 hover:bg-slate-800/60 hover:text-white rounded-2xl"
                                >
                                    Only Women have the power to tap. Always.
                                </Button>
                            </div>
                        </motion.div>

                        {/* Social Proof */}
                        <div className="mt-12 flex items-center justify-center lg:justify-start gap-4 text-sm text-slate-400">
                            <div className="flex -space-x-3">
                                {[1,2,3,4].map(i => (
                                    <div key={i} className="w-10 h-10 rounded-full border-2 border-slate-900 bg-slate-800 overflow-hidden shadow-lg">
                                        <img src={`https://i.pravatar.cc/100?img=${i + 10}`} alt="User" />
                                    </div>
                                ))}
                            </div>
                            <p className="drop-shadow-md">Join <strong className="text-white">500+ locals</strong> exploring today.</p>
                        </div>
                    </div>

                    {/* Right: Visual Graphic (Abstract Phone) */}
                    <div className="flex-1 w-full max-w-md relative">
                        <motion.div 
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            transition={{ delay: 0.2, duration: 0.8 }}
                            className="relative aspect-[9/16] bg-slate-900/90 backdrop-blur-xl border-8 border-slate-800/80 rounded-[3rem] shadow-2xl overflow-hidden"
                        >
                            {/* Mock App UI */}
                            <div className="absolute inset-0 bg-slate-950/50 flex flex-col">
                                {/* Map Header */}
                                <div className="h-1/2 bg-slate-900/50 relative p-6 flex flex-col justify-end">
                                    <div className="absolute inset-0 bg-gradient-to-b from-indigo-900/20 to-slate-950/80"></div>
                                    
                                    {/* Floating Avatars */}
                                    <motion.div 
                                        animate={{ y: [0, -10, 0] }} 
                                        transition={{ repeat: Infinity, duration: 4 }}
                                        className="absolute top-20 left-10 w-12 h-12 rounded-full border-2 border-amber-500 bg-slate-800 z-10 overflow-hidden shadow-lg shadow-amber-500/20"
                                    >
                                        <img src="https://i.pravatar.cc/100?img=32" alt="User" />
                                    </motion.div>
                                    <motion.div 
                                        animate={{ y: [0, 15, 0] }} 
                                        transition={{ repeat: Infinity, duration: 5 }}
                                        className="absolute top-10 right-16 w-10 h-10 rounded-full border-2 border-green-500 bg-slate-800 z-10 overflow-hidden shadow-lg shadow-green-500/20"
                                    >
                                        <img src="https://i.pravatar.cc/100?img=12" alt="User" />
                                    </motion.div>

                                    <h3 className="text-2xl font-bold text-white relative z-20 drop-shadow-lg">Nearby Spots</h3>
                                </div>

                                {/* List */}
                                <div className="flex-1 p-4 space-y-3">
                                    {[
                                        { name: "Coffee Box", type: "CAFE", dist: "0.1 mi", active: true },
                                        { name: "Union Draft House", type: "BAR", dist: "0.3 mi", active: false },
                                        { name: "San Jacinto Plaza", type: "PARK", dist: "0.5 mi", active: false },
                                    ].map((item, i) => (
                                        <div key={i} className={`p-3 rounded-xl border flex items-center justify-between backdrop-blur-md ${item.active ? 'bg-amber-500/20 border-amber-500/50 shadow-lg shadow-amber-500/10' : 'bg-slate-900/60 border-slate-800/60'}`}>
                                            <div>
                                                <div className="font-bold text-white text-sm">{item.name}</div>
                                                <div className="text-xs text-slate-400 flex gap-2 mt-1">
                                                    <span className={item.active ? "text-amber-400 font-bold" : "text-slate-500"}>{item.type}</span>
                                                    <span>• {item.dist}</span>
                                                </div>
                                            </div>
                                            {item.active && <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(34,197,94,0.5)]"></div>}
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </motion.div>
                        
                        {/* Glow Behind Phone */}
                        <div className="absolute inset-0 bg-amber-500/10 blur-[100px] -z-10 rounded-full pointer-events-none"></div>
                    </div>

                </main>

                {/* Feature Grid (Bottom) */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-24 mb-12">
                    {[
                        { icon: MapPin, title: "Proximity First", desc: "You must be within 0.5 miles to check in. No fakes." },
                        { icon: Zap, title: "Tap to Connect", desc: "Women have the power to tap men. Men check in and set the vibe." },
                        { icon: Coffee, title: "Real Venues", desc: "Curated spots in your city. Bars, cafes, and parks." }
                    ].map((feature, i) => (
                        <div key={i} className="p-6 rounded-2xl bg-slate-900/40 backdrop-blur-md border border-white/10 hover:bg-white/5 transition-colors group cursor-default shadow-lg">
                            <feature.icon className="w-8 h-8 text-slate-400 group-hover:text-amber-500 transition-colors mb-4" />
                            <h3 className="text-lg font-bold text-white mb-2">{feature.title}</h3>
                            <p className="text-slate-400 text-sm leading-relaxed">{feature.desc}</p>
                        </div>
                    ))}
                </div>

                <footer className="py-8 border-t border-slate-800/50 text-center text-slate-500 text-sm backdrop-blur-sm">
                    © {new Date().getFullYear()} TapTap. Built in El Paso.
                </footer>
            </div>
        </div>
    );
}