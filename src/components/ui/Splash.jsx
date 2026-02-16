import React from 'react';
import { motion } from "framer-motion";

export default function Splash() {
  return (
    <div className="fixed inset-0 z-50 bg-slate-950 flex flex-col items-center justify-center overflow-hidden">
      
      {/* 1. The Background Atmosphere (Desert Sunrise Glow) */}
      {/* This creates a subtle amber vignette that pulses slowly */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(245,158,11,0.15)_0%,rgba(2,6,23,1)_70%)] animate-pulse" />

      <motion.div
        initial={{ scale: 0.8, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="relative z-10 flex flex-col items-center"
      >
        {/* 2. The Logo Container */}
        <div className="relative mb-8 group">
            {/* A deep blur behind the logo to make the colors pop against the black */}
            <div className="absolute inset-0 bg-amber-600/20 blur-3xl rounded-full scale-150" />
            
            {/* THE NEW LOGO */}
            <img 
                src="/logo-desert.png" 
                alt="TapTap Logo" 
                className="relative w-48 h-48 object-contain drop-shadow-[0_0_30px_rgba(245,158,11,0.3)] animate-in fade-in zoom-in duration-1000" 
            />
        </div>

        {/* 3. The App Name */}
        <motion.h1 
          className="text-5xl font-black text-white tracking-tighter mb-4"
          animate={{ opacity: [0.9, 1, 0.9], textShadow: ["0 0 10px rgba(255,255,255,0.1)", "0 0 20px rgba(255,255,255,0.2)", "0 0 10px rgba(255,255,255,0.1)"] }}
          transition={{ repeat: Infinity, duration: 3 }}
        >
          TapTap
        </motion.h1>
        
        {/* 4. The "Cinematic" Location Badge */}
        <div className="flex items-center gap-3 opacity-80">
            <div className="h-[1px] w-12 bg-gradient-to-r from-transparent to-amber-500" />
            <p className="text-amber-500 text-[10px] font-bold tracking-[0.4em] uppercase">
              El Paso, Texas
            </p>
            <div className="h-[1px] w-12 bg-gradient-to-l from-transparent to-amber-500" />
        </div>

      </motion.div>
    </div>
  );
}