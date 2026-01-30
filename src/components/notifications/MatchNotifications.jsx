import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Heart, User, X, Sparkles } from 'lucide-react';
import { Button } from "@/components/ui/button";

export default function MatchNotifications({ matches, onDismiss }) {
    const handleDismiss = async (match) => {
        // MOCK: In a real app, you would call Supabase here:
        // await supabase.from('pings').update({ status: 'seen' }).eq('id', match.id);
        
        // For now, just update the UI
        onDismiss();
    };

    // Only show recent matches (not already seen)
    const recentMatches = matches.filter(m => m.status === 'matched');

    if (recentMatches.length === 0) return null;

    return (
        <div className="space-y-3">
            <div className="flex items-center gap-2 text-pink-400">
                <Heart className="w-5 h-5 fill-pink-400" />
                <h3 className="font-semibold">New Matches!</h3>
                <span className="px-2 py-0.5 rounded-full bg-pink-500/20 text-xs">{recentMatches.length}</span>
            </div>
            <AnimatePresence>
                {recentMatches.map((match) => (
                    <motion.div
                        key={match.id}
                        initial={{ opacity: 0, scale: 0.9 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.9 }}
                        className="backdrop-blur-xl bg-gradient-to-r from-pink-500/10 to-purple-500/10 rounded-xl border border-pink-500/20 p-4"
                    >
                        <div className="flex items-center gap-3">
                            <div className="relative">
                                <div className="w-14 h-14 rounded-full bg-gradient-to-br from-pink-500 to-purple-500 p-0.5">
                                    {match.to_user_photo ? (
                                        <img
                                            src={match.to_user_photo}
                                            alt=""
                                            className="w-full h-full rounded-full object-cover"
                                        />
                                    ) : (
                                        <div className="w-full h-full rounded-full bg-slate-800 flex items-center justify-center">
                                            <User className="w-6 h-6 text-slate-500" />
                                        </div>
                                    )}
                                </div>
                                <div className="absolute -bottom-1 -right-1 w-6 h-6 rounded-full bg-pink-500 flex items-center justify-center">
                                    <Sparkles className="w-3 h-3 text-white" />
                                </div>
                            </div>
                            <div className="flex-1">
                                <p className="text-white font-semibold">It's a Match!</p>
                                <p className="text-pink-300 text-sm">
                                    You and {match.to_user_name || 'someone'} pinged each other
                                </p>
                                <p className="text-slate-500 text-xs mt-0.5">
                                    at {match.location_name}
                                </p>
                            </div>
                            <Button
                                size="icon"
                                variant="ghost"
                                onClick={() => handleDismiss(match)}
                                className="text-slate-400 hover:text-white"
                            >
                                <X className="w-4 h-4" />
                            </Button>
                        </div>
                    </motion.div>
                ))}
            </AnimatePresence>
        </div>
    );
}