import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Zap, Shield } from 'lucide-react';
import { motion } from 'framer-motion';

export default function Landing() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-slate-950 text-white overflow-hidden relative">
            
            {/* Background Gradients */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden z-0">
                <div className="absolute top-[-10%] right-[-5%] w-[500px] h-[500px] bg-purple-600/20 rounded-full blur-[100px]" />
                <div className="absolute bottom-[-10%] left-[-5%] w-[500px] h-[500px] bg-amber-600/20 rounded-full blur-[100px]" />
            </div>

            <div className="relative z-10 max-w-6xl mx-auto px-4 py-8 flex flex-col min-h-screen">
                
                {/* Header */}
                <header className="flex justify-between items-center mb-16">
                    <div className="flex items-center gap-2">
                        <div className="w-10 h-10 bg-gradient-to-tr from-amber-500 to-orange-600 rounded-xl flex items-center justify-center">
                            <Zap className="text-black w-6 h-6 fill-black" />
                        </div>
                        <span className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-white to-slate-400">
                            HiRL
                        </span>
                    </div>
                    <Button 
                        variant="ghost" 
                        className="text-slate-300 hover:text-white hover:bg-white/10"
                        onClick={() => navigate('/auth')}
                    >
                        Sign In
                    </Button>
                </header>

                {/* Hero Section */}
                <main className="flex-1 flex flex-col items-center justify-center text-center max-w-3xl mx-auto">
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                    >
                        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 mb-8">
                            <span className="relative flex h-2 w-2">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                                <span className="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
                            </span>
                            <span className="text-xs font-medium text-slate-300">Live Location Matching</span>
                        </div>

                        <h1 className="text-5xl md:text-7xl font-bold mb-6 tracking-tight">
                            Connect with people <br />
                            <span className="text-transparent bg-clip-text bg-gradient-to-r from-amber-400 to-orange-500">
                                right here, right now.
                            </span>
                        </h1>

                        <p className="text-xl text-slate-400 mb-10 max-w-2xl mx-auto leading-relaxed">
                            Stop swiping on people miles away. HiRL helps you discover and connect with 
                            people at the same event, cafe, or venue as you.
                        </p>

                        <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
                            <Button 
                                size="lg"
                                onClick={() => navigate('/auth')} // <--- THE FIX
                                className="h-14 px-8 text-lg bg-gradient-to-r from-amber-500 to-orange-600 hover:from-amber-600 hover:to-orange-700 text-black font-semibold rounded-full"
                            >
                                Get Started
                                <ArrowRight className="ml-2 w-5 h-5" />
                            </Button>
                        </div>
                    </motion.div>

                    {/* Features Grid */}
                    <motion.div 
                        initial={{ opacity: 0, y: 40 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-20 w-full"
                    >
                        {[
                            { icon: MapPin, title: "Location Based", desc: "Only see people actually at your current venue." },
                            { icon: Zap, title: "Instant Pings", desc: "Break the ice with a quick ping notification." },
                            { icon: Shield, title: "Private & Safe", desc: "Your location is only shared when you check in." }
                        ].map((feature, i) => (
                            <div key={i} className="p-6 rounded-2xl bg-white/5 border border-white/10 text-left hover:bg-white/10 transition-colors">
                                <feature.icon className="w-8 h-8 text-amber-500 mb-4" />
                                <h3 className="text-lg font-semibold text-white mb-2">{feature.title}</h3>
                                <p className="text-slate-400 text-sm">{feature.desc}</p>
                            </div>
                        ))}
                    </motion.div>
                </main>

                <footer className="py-8 text-center text-slate-600 text-sm">
                    © {new Date().getFullYear()} HiRL Independent. All rights reserved.
                </footer>
            </div>
        </div>
    );
}