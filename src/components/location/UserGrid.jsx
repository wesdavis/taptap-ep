import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { motion, AnimatePresence } from 'framer-motion';
import { Zap, Check, User } from 'lucide-react';
import { base44 } from '@/api/base44Client';
import { toast } from 'sonner';

export default function UserGrid({ users, currentUser, locationId, locationName, existingPings, onPingSent }) {
    const [sentPings, setSentPings] = useState(new Set());
    const [sendingPing, setSendingPing] = useState(null);

    const hasAlreadyPinged = (userEmail) => {
        return existingPings?.some(p => 
            p.from_user_email === currentUser?.email && 
            p.to_user_email === userEmail &&
            p.location_id === locationId
        ) || sentPings.has(userEmail);
    };

    const handlePing = async (targetUser) => {
        if (!currentUser) return;
        
        setSendingPing(targetUser.user_email);
        
        // Check if target has already pinged current user at this location (mutual match)
        const existingReversePings = await base44.entities.Ping.filter({
            from_user_email: targetUser.user_email,
            to_user_email: currentUser?.email,
            location_id: locationId
        });

        const reversePing = existingReversePings.find(p => p.status === 'pending');
        const isMatch = !!reversePing;

        // Create the ping
        const newPing = await base44.entities.Ping.create({
            from_user_email: currentUser?.email,
            from_user_name: currentUser?.full_name,
            from_user_photo: currentUser?.photo_url,
            to_user_email: targetUser.user_email,
            to_user_name: targetUser.user_name,
            to_user_photo: targetUser.user_photo,
            location_id: locationId,
            location_name: locationName,
            status: isMatch ? 'matched' : 'pending'
        });

        // If mutual match, update the reverse ping too
        if (isMatch && reversePing) {
            await base44.entities.Ping.update(reversePing.id, { 
                status: 'matched',
                to_user_name: currentUser?.full_name,
                to_user_photo: currentUser?.photo_url
            });
            toast.success(`🎉 It's a match with ${targetUser.user_name || 'user'}!`, {
                duration: 5000
            });
        } else {
            toast.success(`Ping sent to ${targetUser.user_name || 'user'}!`);
        }

        setSentPings(prev => new Set([...prev, targetUser.user_email]));
        setSendingPing(null);
        onPingSent?.();
    };

    if (users.length === 0) {
        return (
            <div className="text-center py-16">
                <div className="w-20 h-20 rounded-full bg-white/5 flex items-center justify-center mx-auto mb-4">
                    <User className="w-10 h-10 text-slate-600" />
                </div>
                <p className="text-slate-400">No one else here yet</p>
                <p className="text-slate-500 text-sm mt-1">Be the first to check in!</p>
            </div>
        );
    }

    return (
        <div className="grid grid-cols-2 gap-4">
            <AnimatePresence>
                {users.map((user, index) => {
                    const alreadyPinged = hasAlreadyPinged(user.user_email);
                    const isSending = sendingPing === user.user_email;
                    
                    return (
                        <motion.div
                            key={user.id}
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9, transition: { duration: 0.2 } }}
                            transition={{ delay: index * 0.05 }}
                            className="backdrop-blur-xl bg-white/5 rounded-2xl border border-white/10 overflow-hidden"
                        >
                            <div className="aspect-square relative">
                                {user.user_photo ? (
                                    <img
                                        src={user.user_photo}
                                        alt={user.user_name}
                                        className="w-full h-full object-cover"
                                    />
                                ) : (
                                    <div className="w-full h-full bg-gradient-to-br from-purple-600/20 to-amber-600/20 flex items-center justify-center">
                                        <User className="w-16 h-16 text-slate-500" />
                                    </div>
                                )}
                                <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
                            </div>
                            <div className="p-3">
                                <h4 className="text-white font-semibold truncate">{user.user_name || 'Anonymous'}</h4>
                                {user.user_bio && (
                                    <p className="text-slate-400 text-xs mt-1 line-clamp-2">{user.user_bio}</p>
                                )}
                                <Button
                                    onClick={() => handlePing(user)}
                                    disabled={alreadyPinged || isSending}
                                    className={`w-full mt-3 h-9 rounded-xl font-medium transition-all ${
                                        alreadyPinged
                                            ? 'bg-green-500/20 text-green-400 border border-green-500/30'
                                            : 'bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black'
                                    }`}
                                >
                                    {alreadyPinged ? (
                                        <>
                                            <Check className="w-4 h-4 mr-1" />
                                            Pinged
                                        </>
                                    ) : isSending ? (
                                        'Sending...'
                                    ) : (
                                        <>
                                            <Zap className="w-4 h-4 mr-1" />
                                            Ping
                                        </>
                                    )}
                                </Button>
                            </div>
                        </motion.div>
                    );
                })}
            </AnimatePresence>
        </div>
    );
}