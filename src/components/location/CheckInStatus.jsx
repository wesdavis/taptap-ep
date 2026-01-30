import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Button } from "@/components/ui/button";
import { Loader2, MapPin, Navigation, LogOut } from 'lucide-react';
import { toast } from 'sonner';

// ADDED: refreshTrigger prop
export default function CheckInStatus({ locationId, locationName, lat, lng, onStatusChange, refreshTrigger }) {
    const { user } = useAuth();
    const [isCheckedIn, setIsCheckedIn] = useState(false);
    const [loading, setLoading] = useState(false);
    const [checkingLocation, setCheckingLocation] = useState(false);

    // 1. Check DB: Am I already here?
    // FIX: Added 'refreshTrigger' to dependencies so it re-runs automatically
    useEffect(() => {
        if (user && locationId) {
            checkStatus();
        }
    }, [user, locationId, refreshTrigger]);

    async function checkStatus() {
        try {
            const { data } = await supabase
                .from('checkins')
                .select('*')
                .eq('user_id', user.id)
                .eq('location_id', locationId)
                .eq('is_active', true)
                .maybeSingle();

            setIsCheckedIn(!!data);
        } catch (error) {
            console.error('Status check error:', error);
        }
    }

    function getDistanceFromLatLonInKm(lat1, lon1, lat2, lon2) {
        var R = 6371; 
        var dLat = deg2rad(lat2-lat1);  
        var dLon = deg2rad(lon2-lon1); 
        var a = 
            Math.sin(dLat/2) * Math.sin(dLat/2) +
            Math.cos(deg2rad(lat1)) * Math.cos(deg2rad(lat1)) * Math.sin(dLon/2) * Math.sin(dLon/2); 
        var c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a)); 
        var d = R * c; 
        return d;
    }

    function deg2rad(deg) {
        return deg * (Math.PI/180);
    }

    const handleCheckIn = async () => {
        if (!user) return;
        setCheckingLocation(true);

        if ("geolocation" in navigator) {
            navigator.geolocation.getCurrentPosition(async (position) => {
                const userLat = position.coords.latitude;
                const userLng = position.coords.longitude;

                let allowed = true;
                if (lat && lng) {
                    const dist = getDistanceFromLatLonInKm(userLat, userLng, lat, lng);
                    console.log(`User is ${dist.toFixed(2)}km away from ${locationName}`);
                    
                    if (dist > 0.5) {
                        allowed = false;
                        toast.error(`Too far away! You are ${dist.toFixed(1)}km from ${locationName}.`);
                    }
                }

                setCheckingLocation(false);
                if (!allowed) return; 

                setLoading(true);
                try {
                    await supabase.from('checkins').update({ is_active: false }).eq('user_id', user.id);
                    const { error } = await supabase.from('checkins').insert({ user_id: user.id, location_id: locationId, is_active: true });
                    if (error) throw error;
                    
                    setIsCheckedIn(true);
                    toast.success(`Checked in to ${locationName}!`);
                    if (onStatusChange) onStatusChange();
                    
                } catch (error) {
                    toast.error("Check-in failed. Try again.");
                } finally {
                    setLoading(false);
                }

            }, (error) => {
                setCheckingLocation(false);
                toast.error("Please enable location services to check in.");
            });
        } else {
            setCheckingLocation(false);
            toast.error("Geolocation not supported.");
        }
    };

    const handleLeave = async () => {
        setLoading(true);
        try {
            const { error } = await supabase
                .from('checkins')
                .update({ is_active: false })
                .eq('user_id', user.id)
                .eq('location_id', locationId);

            if (error) throw error;

            setIsCheckedIn(false);
            toast.success(`Left ${locationName}.`);
            if (onStatusChange) onStatusChange();
        } catch (error) {
            toast.error("Could not check out.");
        } finally {
            setLoading(false);
        }
    };

    if (checkingLocation) return <Button disabled className="w-full bg-slate-800 text-slate-400 border border-slate-700"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Verifying...</Button>;
    if (loading) return <Button disabled className="w-full bg-slate-800 text-slate-400 border border-slate-700"><Loader2 className="w-4 h-4 mr-2 animate-spin" /> Updating...</Button>;

    if (isCheckedIn) {
        return (
            <div className="flex gap-2">
                <Button className="flex-1 bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30 cursor-default">
                    <MapPin className="w-4 h-4 mr-2" /> Here Now
                </Button>
                <Button onClick={handleLeave} className="bg-red-500/10 text-red-400 border border-red-500/30 hover:bg-red-500/20">
                    <LogOut className="w-4 h-4 mr-1" /> Leave
                </Button>
            </div>
        );
    }

    return (
        <Button onClick={handleCheckIn} className="w-full bg-white text-black hover:bg-slate-200 font-bold shadow-lg shadow-white/10">
            <Navigation className="w-4 h-4 mr-2 fill-black" /> Check In
        </Button>
    );
}