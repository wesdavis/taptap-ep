import React from 'react';
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import { LogOut, MapPin, Clock } from 'lucide-react';
import moment from 'moment';

export default function CheckInStatus({ checkIn, onCheckOut, loading }) {
    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="backdrop-blur-xl bg-gradient-to-r from-amber-500/10 to-orange-500/10 rounded-2xl border border-amber-500/20 p-4"
        >
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/20 flex items-center justify-center">
                        <MapPin className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                        <p className="text-amber-300 text-sm font-medium">Currently at</p>
                        <h3 className="text-white font-bold">{checkIn?.location_name}</h3>
                        <div className="flex items-center gap-1 text-slate-400 text-xs mt-0.5">
                            <Clock className="w-3 h-3" />
                            <span>Checked in {moment(checkIn?.created_date).fromNow()}</span>
                        </div>
                    </div>
                </div>
                <Button
                    onClick={onCheckOut}
                    disabled={loading}
                    variant="outline"
                    className="border-red-500/30 text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-xl"
                >
                    <LogOut className="w-4 h-4 mr-2" />
                    Leave
                </Button>
            </div>
        </motion.div>
    );
}