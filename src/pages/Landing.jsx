import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { ArrowRight, MapPin, Zap, Coffee } from 'lucide-react'; // Removed unused icons
import { motion } from 'framer-motion';

export default function Landing() {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-slate-950 to-rose-950/10 text-white overflow-hidden relative selection:bg-rose-500/20">

      {/* Softer, asymmetric warm accents – unique & fun instead of symmetric blobs */}
      <div className="absolute inset-0 overflow-hidden z-0 pointer-events-none">
        <div className="absolute -top-40 -right-20 w-[700px] h-[900px] bg-gradient-to-br from-rose-600/15 via-amber-500/10 to-transparent rounded-full blur-3xl animate-slow-pulse" />
        <div className="absolute -bottom-60 -left-32 w-[900px] h-[700px] bg-gradient-to-tr from-amber-500/12 to-rose-400/8 rounded-[60%] blur-3xl" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-6 sm:px-10 lg:px-16 py-10 lg:py-16 flex flex-col min-h-screen">

        {/* Header – classier logo, elegant buttons */}
        <header className="flex justify-between items-center mb-20 lg:mb-28">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-gradient-to-br from-rose-400 to-amber-500 rounded-2xl flex items-center justify-center shadow-xl shadow-rose-900/30">
              <Zap className="text-white w-7 h-7 fill-white" />
            </div>
            <span className="text-3xl font-extrabold tracking-tight bg-gradient-to-r from-rose-200 to-amber-200 bg-clip-text text-transparent">
              TapTap
            </span>
          </div>
          <div className="flex gap-6">
            <Button 
              variant="ghost" 
              className="hidden sm:inline-flex text-slate-300 hover:text-rose-300 hover:bg-rose-950/40 rounded-full px-6 transition-all"
              onClick={() => navigate('/auth')}
            >
              Log In
            </Button>
            <Button 
              className="bg-gradient-to-r from-rose-400 to-amber-500 hover:brightness-110 text-black font-semibold rounded-full px-8 shadow-lg shadow-rose-600/30 hover:shadow-rose-500/50 transition-all"
              onClick={() => navigate('/auth')}
            >
              Join Now
            </Button>
          </div>
        </header>

        {/* Hero – more whitespace, warmer headline, elegant live badge */}
        <main className="flex-1 flex flex-col lg:flex-row items-center gap-16 lg:gap-24">

          <div className="flex-1 text-center lg:text-left max-w-3xl">
            <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.8 }}>
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-full bg-slate-900/60 border border-rose-800/30 backdrop-blur-xl mb-10 shadow-inner">
                <span className="relative flex h-3 w-3">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-70"></span>
                  <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
                </span>
                <span className="text-sm font-semibold text-emerald-300 uppercase tracking-widest">Live in El Paso</span>
              </div>

              <h1 className="text-5xl sm:text-6xl lg:text-7xl font-black mb-8 leading-tight tracking-tight">
                No More Swiping<br />
                <span className="bg-gradient-to-r from-rose-400 via-amber-400 to-orange-400 bg-clip-text text-transparent">
                  Meet People IRL
                </span>
              </h1>

              <p className="text-xl text-slate-300 mb-12 leading-relaxed max-w-2xl mx-auto lg:mx-0">
                The first social network that only comes alive when you step out.<br />
                Check in to real venues, spot who's there right now, and spark genuine connections on the spot.
              </p>

              <div className="flex flex-col sm:flex-row gap-6 justify-center lg:justify-start">
                <Button 
                  size="lg"
                  onClick={() => navigate('/auth')} 
                  className="h-16 px-10 text-xl bg-gradient-to-r from-amber-400 to-rose-500 hover:from-amber-300 hover:to-rose-400 text-black font-bold rounded-full shadow-2xl shadow-amber-600/40 hover:shadow-amber-500/60 hover:scale-105 transition-all duration-300"
                >
                  Start Exploring
                  <ArrowRight className="ml-3 w-6 h-6" />
                </Button>
                <Button 
                  size="lg"
                  variant="outline"
                  className="h-16 px-10 text-xl border-2 border-rose-800/50 text-rose-200 hover:bg-rose-950/40 hover:border-rose-600 rounded-full backdrop-blur-md transition-all"
                >
                  Only Women have the power to tap. Always.
                </Button>
              </div>
            </motion.div>

            {/* Social proof – warmer, slightly larger avatars for fun/human feel */}
            <div className="mt-16 flex items-center justify-center lg:justify-start gap-6 text-base text-slate-400">
              <div className="flex -space-x-4">
                {[1,2,3,4,5].map(i => (
                  <div key={i} className="w-14 h-14 rounded-2xl border-4 border-slate-950 bg-slate-800 overflow-hidden shadow-md ring-2 ring-rose-400/20">
                    <img src={`https://i.pravatar.cc/100?img=${i + 15}`} alt="Local explorer" className="object-cover" />
                  </div>
                ))}
              </div>
              <p>Join <strong className="text-amber-300">500+ locals</strong> stepping out today.</p>
            </div>
          </div>

          {/* Phone mockup – softer edges, playful glow, keep content */}
          <div className="flex-1 max-w-sm lg:max-w-md relative">
            <motion.div 
              initial={{ opacity: 0, scale: 0.92, rotate: -1.5 }}
              animate={{ opacity: 1, scale: 1, rotate: 0 }}
              transition={{ delay: 0.4, duration: 1, type: "spring", stiffness: 100 }}
              className="relative aspect-[9/19] bg-gradient-to-b from-slate-900 to-slate-950 border-[14px] border-slate-800/80 rounded-[3.5rem] shadow-2xl overflow-hidden ring-1 ring-rose-400/10"
            >
              {/* Keep your mockup UI exactly as-is – it's great for showing the IRL check-in fun */}
              <div className="absolute inset-0 bg-slate-950 flex flex-col">
                <div className="h-1/2 bg-slate-900 relative p-6 flex flex-col justify-end">
                  <div className="absolute inset-0 bg-gradient-to-b from-rose-900/10 to-slate-950"></div>
                  {/* Floating avatars – add subtle fun bounce if desired */}
                  <motion.div animate={{ y: [0, -8, 0] }} transition={{ repeat: Infinity, duration: 4, ease: "easeInOut" }} className="absolute top-24 left-12 w-12 h-12 rounded-full border-2 border-rose-400 bg-slate-800 z-10 overflow-hidden">
                    <img src="https://i.pravatar.cc/100?img=32" alt="User" />
                  </motion.div>
                  {/* ... rest unchanged */}
                </div>
                <div className="flex-1 p-4 space-y-3">
                  {/* Your venue list – unchanged, it's solid */}
                  {[
                    { name: "Coffee Box", type: "CAFE", dist: "0.1 mi", active: true },
                    { name: "Union Draft House", type: "BAR", dist: "0.3 mi", active: false },
                    { name: "San Jacinto Plaza", type: "PARK", dist: "0.5 mi", active: false },
                  ].map((item, i) => (
                    <div key={i} className={`p-4 rounded-2xl border flex items-center justify-between ${item.active ? 'bg-rose-500/10 border-rose-500/40' : 'bg-slate-900 border-slate-800'}`}>
                      <div>
                        <div className="font-bold text-white">{item.name}</div>
                        <div className="text-xs text-slate-400 flex gap-2 mt-1">
                          <span className={item.active ? "text-rose-400" : "text-slate-600"}>{item.type}</span>
                          <span>• {item.dist}</span>
                        </div>
                      </div>
                      {item.active && <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse" />}
                    </div>
                  ))}
                </div>
              </div>
            </motion.div>
            {/* Softer, warmer glow for fun premium vibe */}
            <div className="absolute inset-0 bg-gradient-to-br from-amber-400/25 via-rose-400/15 to-transparent blur-3xl -z-10 rounded-[4rem]" />
          </div>

        </main>

        {/* Features – glassmorphic cards, hover lift for fun */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 mt-24 lg:mt-32 mb-16">
          {[
            { icon: MapPin, title: "Proximity First", desc: "Real check-ins only — must be within 0.5 miles. No virtual tricks." },
            { icon: Zap, title: "Tap to Connect", desc: "Women lead with the tap. Men set the vibe by showing up." },
            { icon: Coffee, title: "Real Venues", desc: "Curated bars, cafes, parks, and hidden gems in your city." }
          ].map((feature, i) => (
            <motion.div
              key={i}
              whileHover={{ y: -6, scale: 1.03 }}
              className="p-8 rounded-3xl bg-white/5 backdrop-blur-2xl border border-white/10 hover:border-rose-400/30 hover:bg-white/8 transition-all group shadow-xl shadow-black/30"
            >
              <feature.icon className="w-10 h-10 text-rose-400/80 group-hover:text-rose-300 transition-colors mb-6" />
              <h3 className="text-xl font-bold text-white mb-3">{feature.title}</h3>
              <p className="text-slate-300 leading-relaxed">{feature.desc}</p>
            </motion.div>
          ))}
        </div>

        <footer className="py-12 border-t border-slate-800/50 text-center text-slate-500 text-base">
          © {new Date().getFullYear()} TapTap. Real moments, built in El Paso.
        </footer>
      </div>
    </div>
  );
}