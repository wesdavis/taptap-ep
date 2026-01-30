import React from 'react';
import { MapPin, Users, Navigation } from 'lucide-react';
import { motion } from 'framer-motion';

const categoryIcons = {
    bar: '🍸',
    restaurant: '🍽️',
    cafe: '☕',
    club: '🎵',
    lounge: '🛋️',
    event_space: '✨'
};

export default function LocationCard({ location, activeCount, onClick, isCheckedIn, isNearby, distance }) {
    return (
        <motion.div
            whileHover={{ scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            className={`relative overflow-hidden rounded-2xl cursor-pointer transition-all ${
                isCheckedIn ? 'ring-2 ring-amber-500' : isNearby ? 'ring-2 ring-green-500' : ''
            }`}
        >
            <div className="aspect-[4/3] relative">
                <img
                    src={location.image_url || `https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800`}
                    alt={location.name}
                    className="w-full h-full object-cover"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent" />
                
                {isCheckedIn && (
                    <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-amber-500 text-black text-xs font-semibold flex items-center gap-1">
                        <span className="w-2 h-2 rounded-full bg-black animate-pulse" />
                        You're Here
                    </div>
                )}

                {!isCheckedIn && isNearby && (
                    <div className="absolute top-3 right-3 px-3 py-1 rounded-full bg-green-500 text-black text-xs font-semibold flex items-center gap-1">
                        <Navigation className="w-3 h-3" />
                        Nearby
                    </div>
                )}

                <div className="absolute bottom-0 left-0 right-0 p-4">
                    <div className="flex items-center gap-2 text-amber-400 text-sm mb-1">
                        <span>{categoryIcons[location.category]}</span>
                        <span className="capitalize">{location.category?.replace('_', ' ')}</span>
                    </div>
                    <h3 className="text-white font-bold text-lg mb-1">{location.name}</h3>
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-1 text-slate-300 text-sm">
                            <MapPin className="w-3 h-3" />
                            <span className="truncate max-w-[140px]">{location.address}</span>
                        </div>
                        <div className="flex items-center gap-3">
                            {distance !== null && distance !== undefined && (
                                <span className="text-slate-400 text-xs">
                                    {distance < 1000 ? `${Math.round(distance)}m` : `${(distance / 1000).toFixed(1)}km`}
                                </span>
                            )}
                            <div className="flex items-center gap-1 text-amber-400 text-sm font-medium">
                                <Users className="w-4 h-4" />
                                <span>{activeCount}</span>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </motion.div>
    );
}