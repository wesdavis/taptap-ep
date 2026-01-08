import React, { useState, useEffect, useCallback, useRef } from 'react';
import { base44 } from '@/api/base44Client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { motion, AnimatePresence } from 'framer-motion';
import { MapPin, Zap, ArrowLeft, Eye, EyeOff, RefreshCw, Search, Navigation, Loader2 } from 'lucide-react';
import { Button } from "@/components/ui/button";
import { toast } from 'sonner';

import ProfileSetup from '@/components/profile/ProfileSetup';
import LocationCard from '@/components/location/LocationCard';
import UserGrid from '@/components/location/UserGrid';
import CheckInStatus from '@/components/location/CheckInStatus';
import PingNotifications from '@/components/notifications/PingNotifications';
import MatchNotifications from '@/components/notifications/MatchNotifications';

const CHECKIN_RADIUS_METERS = 50;

// Calculate distance between two coordinates in meters (Haversine formula)
const calculateDistance = (lat1, lon1, lat2, lon2) => {
    if (!lat1 || !lon1 || !lat2 || !lon2) return null;
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
};

export default function Home() {
    const [user, setUser] = useState(null);
    const [loading, setLoading] = useState(true);
    const [selectedLocation, setSelectedLocation] = useState(null);
    const [checkingIn, setCheckingIn] = useState(false);
    const [checkingOut, setCheckingOut] = useState(false);
    const [userLocation, setUserLocation] = useState(null);
    const [geoError, setGeoError] = useState(null);
    const [loadingGeo, setLoadingGeo] = useState(true);
    const checkInIdRef = useRef(null);
    const queryClient = useQueryClient();

    // Get user's current location
    useEffect(() => {
        if (!navigator.geolocation) {
            setGeoError('Geolocation not supported');
            setLoadingGeo(false);
            return;
        }

        const watchId = navigator.geolocation.watchPosition(
            (position) => {
                setUserLocation({
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude
                });
                setLoadingGeo(false);
                setGeoError(null);
            },
            (error) => {
                setGeoError('Location access denied');
                setLoadingGeo(false);
            },
            { enableHighAccuracy: true, maximumAge: 10000, timeout: 10000 }
        );

        return () => navigator.geolocation.clearWatch(watchId);
    }, []);

    useEffect(() => {
        const loadUser = async () => {
            const userData = await base44.auth.me();
            setUser(userData);
            setLoading(false);
        };
        loadUser();
    }, []);

    const { data: locations = [] } = useQuery({
        queryKey: ['locations'],
        queryFn: () => base44.entities.Location.filter({ is_active: true }),
        enabled: !!user
    });

    const { data: allCheckIns = [], refetch: refetchCheckIns } = useQuery({
        queryKey: ['checkins'],
        queryFn: () => base44.entities.CheckIn.filter({ is_active: true }),
        enabled: !!user,
        refetchInterval: 5000
    });

    const { data: myPings = [], refetch: refetchPings } = useQuery({
        queryKey: ['my-pings', user?.email],
        queryFn: () => base44.entities.Ping.filter({ to_user_email: user.email, status: 'pending' }),
        enabled: !!user?.email,
        refetchInterval: 3000 // Poll more frequently for real-time feel
    });

    const { data: sentPings = [], refetch: refetchSentPings } = useQuery({
        queryKey: ['sent-pings', user?.email],
        queryFn: () => base44.entities.Ping.filter({ from_user_email: user.email }),
        enabled: !!user?.email
    });

    // Fetch blocks (both directions)
    const { data: myBlocks = [] } = useQuery({
        queryKey: ['my-blocks', user?.email],
        queryFn: () => base44.entities.Block.filter({ blocker_email: user.email }),
        enabled: !!user?.email
    });

    const { data: blockedByOthers = [] } = useQuery({
        queryKey: ['blocked-by-others', user?.email],
        queryFn: () => base44.entities.Block.filter({ blocked_email: user.email }),
        enabled: !!user?.email
    });

    // Fetch matched pings for notifications
    const { data: matchedPings = [], refetch: refetchMatches } = useQuery({
        queryKey: ['matched-pings', user?.email],
        queryFn: () => base44.entities.Ping.filter({ from_user_email: user.email, status: 'matched' }),
        enabled: !!user?.email,
        refetchInterval: 3000
    });

    // Build blocked users set (both directions)
    const blockedUsers = new Set([
        ...myBlocks.map(b => b.blocked_email),
        ...blockedByOthers.map(b => b.blocker_email)
    ]);

    const myActiveCheckIn = allCheckIns.find(c => c.user_email === user?.email && c.is_active);
    
    // Store check-in ID in ref for cleanup
    useEffect(() => {
        checkInIdRef.current = myActiveCheckIn?.id || null;
    }, [myActiveCheckIn?.id]);

    // Auto-checkout on page unload/close
    useEffect(() => {
        const handleBeforeUnload = () => {
            if (checkInIdRef.current) {
                // Use sendBeacon for reliable delivery on page close
                const data = JSON.stringify({
                    is_active: false,
                    checked_out_at: new Date().toISOString()
                });
                // Note: This is a best-effort approach
                navigator.sendBeacon && navigator.sendBeacon('/api/checkout', data);
            }
        };

        const handleVisibilityChange = async () => {
            if (document.visibilityState === 'hidden' && checkInIdRef.current) {
                // When app goes to background, mark as inactive
                await base44.entities.CheckIn.update(checkInIdRef.current, {
                    is_active: false,
                    checked_out_at: new Date().toISOString()
                });
            }
        };

        window.addEventListener('beforeunload', handleBeforeUnload);
        document.addEventListener('visibilitychange', handleVisibilityChange);

        return () => {
            window.removeEventListener('beforeunload', handleBeforeUnload);
            document.removeEventListener('visibilitychange', handleVisibilityChange);
        };
    }, []);

    // Calculate distance to each location
    const getDistanceToLocation = (location) => {
        if (!userLocation || !location.latitude || !location.longitude) return null;
        return calculateDistance(
            userLocation.latitude,
            userLocation.longitude,
            location.latitude,
            location.longitude
        );
    };

    const isNearLocation = (location) => {
        const distance = getDistanceToLocation(location);
        return distance !== null && distance <= CHECKIN_RADIUS_METERS;
    };
    
    const getCheckInsForLocation = (locationId, applyFilters = false) => {
        return allCheckIns.filter(c => {
            // Basic filters
            if (c.location_id !== locationId || !c.is_active || c.user_email === user?.email) {
                return false;
            }
            
            // If not applying filters, return all (for count display)
            if (!applyFilters) return true;
            
            // Filter out blocked users (both directions)
            if (blockedUsers.has(c.user_email)) return false;
            
            // Filter out users with private mode ON
            if (c.user_private_mode) return false;
            
            // Filter by seeking preference
            const userSeeking = user?.seeking;
            if (userSeeking === 'everyone') return true;
            return c.user_gender === userSeeking;
        });
    };

    const handleCheckIn = async (location) => {
        if (!user) {
            toast.error('Please log in to check in');
            return;
        }

        setCheckingIn(true);
        
        if (myActiveCheckIn) {
            await base44.entities.CheckIn.update(myActiveCheckIn.id, {
                is_active: false,
                checked_out_at: new Date().toISOString()
            });
        }

        await base44.entities.CheckIn.create({
            user_email: user.email,
            user_name: user.full_name,
            user_photo: user.photo_url,
            user_gender: user.gender,
            user_bio: user.bio,
            user_private_mode: user.private_mode || false,
            location_id: location.id,
            location_name: location.name,
            is_active: true
        });

        await refetchCheckIns();
        setCheckingIn(false);
        toast.success(`Checked in at ${location.name}`);
    };

    const handleCheckOut = async () => {
        if (!myActiveCheckIn) return;
        setCheckingOut(true);
        
        await base44.entities.CheckIn.update(myActiveCheckIn.id, {
            is_active: false,
            checked_out_at: new Date().toISOString()
        });

        await refetchCheckIns();
        setSelectedLocation(null);
        setCheckingOut(false);
        toast.success('Checked out successfully');
    };

    const handleDismissPing = async (pingId) => {
        await refetchPings();
    };

    const profileComplete = user?.gender && user?.photo_url && user?.seeking;

    // Show loading spinner if user data is still loading or user is null
    if (loading || !user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!profileComplete) {
        return (
            <ProfileSetup
                user={user}
                onComplete={async () => {
                    const updatedUser = await base44.auth.me();
                    setUser(updatedUser);
                }}
            />
        );
    }

    const isFemale = user.gender === 'female';
    // For display grid, apply seeking/private filters; for count, show all
    const locationCheckIns = selectedLocation ? getCheckInsForLocation(selectedLocation.id, true) : [];
    const locationCheckInsCount = selectedLocation ? getCheckInsForLocation(selectedLocation.id, false).length : 0;

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
            <div className="max-w-lg mx-auto px-4 py-6 pb-24">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                    {selectedLocation ? (
                        <Button
                            variant="ghost"
                            onClick={() => setSelectedLocation(null)}
                            className="text-white hover:bg-white/10"
                        >
                            <ArrowLeft className="w-5 h-5 mr-2" />
                            Back
                        </Button>
                    ) : (
                        <div>
                            <h1 className="text-2xl font-bold text-white">Discover</h1>
                            <p className="text-slate-400 text-sm">Find your vibe</p>
                        </div>
                    )}
                    <Button
                        size="icon"
                        variant="ghost"
                        onClick={() => {
                            refetchCheckIns();
                            refetchPings();
                        }}
                        className="text-slate-400 hover:text-white hover:bg-white/10"
                    >
                        <RefreshCw className="w-5 h-5" />
                    </Button>
                </div>

                {/* Match Notifications */}
                {matchedPings.length > 0 && !selectedLocation && (
                    <div className="mb-6">
                        <MatchNotifications matches={matchedPings} onDismiss={() => refetchMatches()} />
                    </div>
                )}

                {/* Ping Notifications */}
                {myPings.length > 0 && !selectedLocation && (
                    <div className="mb-6">
                        <PingNotifications pings={myPings} onDismiss={handleDismissPing} />
                    </div>
                )}

                {/* Current Check-in Status */}
                {myActiveCheckIn && !selectedLocation && (
                    <div className="mb-6">
                        <CheckInStatus
                            checkIn={myActiveCheckIn}
                            onCheckOut={handleCheckOut}
                            loading={checkingOut}
                        />
                    </div>
                )}

                {/* Gender Info Banner */}
                {!selectedLocation && (
                    <motion.div
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        className={`mb-6 p-4 rounded-xl border ${
                            isFemale 
                                ? 'bg-purple-500/10 border-purple-500/20' 
                                : 'bg-blue-500/10 border-blue-500/20'
                        }`}
                    >
                        <div className="flex items-center gap-3">
                            {isFemale ? (
                                <>
                                    <Search className="w-5 h-5 text-purple-400" />
                                    <div>
                                        <p className="text-purple-300 font-medium">Browse & Connect</p>
                                        <p className="text-slate-400 text-sm">
                                            Seeking: <span className="text-purple-300 capitalize">{user?.seeking || 'everyone'}</span>
                                        </p>
                                    </div>
                                </>
                            ) : (
                                <>
                                    <EyeOff className="w-5 h-5 text-blue-400" />
                                    <div>
                                        <p className="text-blue-300 font-medium">Discoverable Mode</p>
                                        <p className="text-slate-400 text-sm">Your profile is visible when checked in, but you can't browse others</p>
                                    </div>
                                </>
                            )}
                        </div>
                    </motion.div>
                )}

                <AnimatePresence mode="wait">
                    {!selectedLocation ? (
                        /* Location List */
                        <motion.div
                            key="locations"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-4"
                        >
                            <h2 className="text-lg font-semibold text-white flex items-center gap-2">
                                <MapPin className="w-5 h-5 text-amber-400" />
                                Authorized Locations
                            </h2>
                            {loadingGeo && (
                                <div className="flex items-center gap-2 text-slate-400 text-sm mb-4 p-3 rounded-lg bg-white/5">
                                    <Loader2 className="w-4 h-4 animate-spin" />
                                    <span>Getting your location...</span>
                                </div>
                            )}
                            {geoError && (
                                <div className="flex items-center gap-2 text-amber-400 text-sm mb-4 p-3 rounded-lg bg-amber-500/10 border border-amber-500/20">
                                    <Navigation className="w-4 h-4" />
                                    <span>Enable location to check in nearby venues</span>
                                </div>
                            )}
                            <div className="grid gap-4">
                                {locations.map((location) => {
                                    const distance = getDistanceToLocation(location);
                                    const nearby = isNearLocation(location);
                                    
                                    return (
                                        <LocationCard
                                            key={location.id}
                                            location={location}
                                            activeCount={getCheckInsForLocation(location.id).length}
                                            isCheckedIn={myActiveCheckIn?.location_id === location.id}
                                            isNearby={nearby}
                                            distance={distance}
                                            onClick={() => {
                                                setSelectedLocation(location);
                                            }}
                                        />
                                    );
                                })}
                            </div>
                            {locations.length === 0 && (
                                <div className="text-center py-12">
                                    <MapPin className="w-12 h-12 text-slate-600 mx-auto mb-3" />
                                    <p className="text-slate-400">No locations available yet</p>
                                </div>
                            )}
                        </motion.div>
                    ) : (
                        /* Location Detail */
                        <motion.div
                            key="detail"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="space-y-6"
                        >
                            {/* Location Header */}
                            <div className="relative rounded-2xl overflow-hidden">
                                <img
                                    src={selectedLocation.image_url || 'https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800'}
                                    alt={selectedLocation.name}
                                    className="w-full h-48 object-cover"
                                />
                                <div className="absolute inset-0 bg-gradient-to-t from-black/80 to-transparent" />
                                <div className="absolute bottom-0 left-0 right-0 p-4">
                                    <h2 className="text-2xl font-bold text-white">{selectedLocation.name}</h2>
                                    <p className="text-slate-300 text-sm">{selectedLocation.address}</p>
                                </div>
                            </div>

                            {/* Check In / Check Out Button */}
                            {myActiveCheckIn?.location_id !== selectedLocation.id ? (
                                <>
                                    {isNearLocation(selectedLocation) ? (
                                        <Button
                                            onClick={() => handleCheckIn(selectedLocation)}
                                            disabled={checkingIn}
                                            className="w-full h-14 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-bold text-lg rounded-xl"
                                        >
                                            {checkingIn ? 'Checking in...' : 'Check In Here'}
                                        </Button>
                                    ) : (
                                        <div className="w-full p-4 rounded-xl bg-slate-800/50 border border-slate-700 text-center">
                                            <Navigation className="w-6 h-6 text-slate-500 mx-auto mb-2" />
                                            <p className="text-slate-400 font-medium">You're not close enough</p>
                                            <p className="text-slate-500 text-sm mt-1">
                                                Get within {CHECKIN_RADIUS_METERS}m to check in
                                                {getDistanceToLocation(selectedLocation) && (
                                                    <span className="block mt-1 text-amber-400">
                                                        Currently {Math.round(getDistanceToLocation(selectedLocation))}m away
                                                    </span>
                                                )}
                                            </p>
                                        </div>
                                    )}
                                </>
                            ) : (
                                <Button
                                    onClick={handleCheckOut}
                                    disabled={checkingOut}
                                    variant="outline"
                                    className="w-full h-14 border-red-500/30 text-red-400 hover:bg-red-500/10 font-bold text-lg rounded-xl"
                                >
                                    {checkingOut ? 'Leaving...' : 'Leave Location'}
                                </Button>
                            )}

                            {/* User Grid - Only for females */}
                            {isFemale ? (
                                <div className="space-y-4">
                                    <div className="flex items-center justify-between">
                                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                                            <Zap className="w-5 h-5 text-amber-400" />
                                            People Here
                                        </h3>
                                        <span className="px-3 py-1 rounded-full bg-white/10 text-slate-300 text-sm">
                                            {locationCheckIns.length} match{locationCheckIns.length !== 1 ? 'es' : ''}
                                        </span>
                                    </div>
                                    {user?.seeking && user?.seeking !== 'everyone' && (
                                        <p className="text-slate-500 text-sm">
                                            Showing {user?.seeking} profiles based on your preferences
                                        </p>
                                    )}
                                    <UserGrid
                                        users={locationCheckIns}
                                        currentUser={user}
                                        locationId={selectedLocation.id}
                                        locationName={selectedLocation.name}
                                        existingPings={sentPings}
                                        onPingSent={() => {
                                            refetchSentPings();
                                            refetchMatches();
                                        }}
                                    />
                                </div>
                            ) : (
                                <div className="text-center py-12">
                                    <div className="w-20 h-20 rounded-full bg-green-500/10 flex items-center justify-center mx-auto mb-4">
                                        <Eye className="w-10 h-10 text-green-400" />
                                    </div>
                                    <p className="text-white text-lg font-semibold mb-2">
                                        You are now discoverable to others at
                                    </p>
                                    <p className="text-amber-400 font-bold text-xl">
                                        {selectedLocation.name}
                                    </p>
                                    <p className="text-slate-500 text-sm mt-3">
                                        Others who match their preferences can see your profile and ping you
                                    </p>
                                </div>
                            )}
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    );
}