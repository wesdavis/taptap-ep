import { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';

// Components
import MysteryPopup from '@/components/gamification/MysteryPopup'; 
import DidWeMeet from '@/components/notifications/DidWeMeet';     
import ConnectionsList from '@/components/profile/ConnectionsList'; 
import UserGrid from '@/components/location/UserGrid'; 

import { User, MapPin, Star, ChevronRight, Trophy, LogOut, Edit3, Crown, Users, Map as MapIcon, Loader2, Navigation, Settings as SettingsIcon } from 'lucide-react';
import { toast } from 'sonner';

// 🟢 SECURE: Replaced hardcoded key with environment variable
const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY;

// Helper: Calculate distance in miles
const calculateDistance = (lat1, lon1, lat2, lon2) => {
  if (!lat1 || !lon1 || !lat2 || !lon2) return Infinity; 
  const R = 6371e3; 
  const φ1 = lat1 * Math.PI / 180;
  const φ2 = lat2 * Math.PI / 180;
  const Δφ = (lat2 - lat1) * Math.PI / 180;
  const Δλ = (lon2 - lon1) * Math.PI / 180;
  const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) + Math.cos(φ1) * Math.cos(φ1) * Math.sin(Δλ/2) * Math.sin(Δλ/2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));
  return R * c * 0.000621371; 
};

const Home = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [profile, setProfile] = useState(null);
  const [locations, setLocations] = useState([]);
  
  // State
  const [receivedPings, setReceivedPings] = useState([]); 
  const [activeMission, setActiveMission] = useState(null); 
  
  const [userCoords, setUserCoords] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sortBy, setSortBy] = useState('distance'); 
  const [currentCity, setCurrentCity] = useState("El Paso"); 
  const [currentCheckIn, setCurrentCheckIn] = useState(null); 
  const [activeUsersAtLocation, setActiveUsersAtLocation] = useState({}); 
  const [stats, setStats] = useState({ peopleMet: 0, placesVisited: 0 });
  const [expandedSection, setExpandedSection] = useState(null); 
  const [visibleCount, setVisibleCount] = useState(5);
  const [visitedPlaces, setVisitedPlaces] = useState([]);
  const [checkingInId, setCheckingInId] = useState(null);

  // 1. Get GPS Position
  useEffect(() => {
    if ('geolocation' in navigator) {
      const watchId = navigator.geolocation.watchPosition((position) => {
        const lat = position.coords.latitude;
        const lng = position.coords.longitude;
        setUserCoords({ latitude: lat, longitude: lng });
      }, (err) => console.error(err), { enableHighAccuracy: true });
      
      return () => navigator.geolocation.clearWatch(watchId);
    }
  }, []);

  // 2. Load Data
  useEffect(() => {
    let channel;
    const fetchData = async () => {
      try {
        setLoading(true);
        if (user) {
          const { data: profileData } = await supabase.from('profiles').select('*').eq('id', user.id).single();
          setProfile(profileData);

          loadPings();
          
          const { data: myCheckIn } = await supabase.from('checkins').select(`*, locations (*)`).eq('user_id', user.id).eq('is_active', true).maybeSingle();
          setCurrentCheckIn(myCheckIn);

          const { data: allCheckins } = await supabase.from('checkins').select('location_id').eq('is_active', true);
          const counts = {};
          allCheckins?.forEach(c => { counts[c.location_id] = (counts[c.location_id] || 0) + 1; });
          setActiveUsersAtLocation(counts);

          // 2a. FETCH UNIQUE PLACES VISITED
          const { data: visitHistory } = await supabase
            .from('checkins')
            .select('location_id, created_at, locations(id, name, image_url, google_photos, address)')
            .eq('user_id', user.id)
            .order('created_at', { ascending: false });

          const uniqueMap = new Map();
          visitHistory?.forEach(v => {
             if (v.locations && !uniqueMap.has(v.location_id)) {
                 uniqueMap.set(v.location_id, v.locations);
             }
          });
          const uniqueList = Array.from(uniqueMap.values());
          setVisitedPlaces(uniqueList);
          
          const { count: metCount } = await supabase.from('pings').select('id', { count: 'exact', head: true }).or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`).eq('met_confirmed', true); 
          
          setStats({ 
              peopleMet: metCount || 0, 
              placesVisited: uniqueList.length 
          });

          // Realtime Listener
          channel = supabase.channel('home-realtime')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'pings', 
                filter: `or(to_user_id.eq.${user.id},from_user_id.eq.${user.id})`
            }, (payload) => {
                loadPings();
            })
            .subscribe();
        }

        const { data: locData } = await supabase.from('locations').select('*');
        setLocations(locData || []);
      } catch (err) { console.error('Error:', err); } finally { setLoading(false); }
    };
    fetchData();
    return () => { if (channel) supabase.removeChannel(channel); };
  }, [user]);

  // 3. GEOFENCE GUARD
  useEffect(() => {
    if (currentCheckIn && userCoords && locations.length > 0) {
        const activeLoc = locations.find(l => l.id === currentCheckIn.location_id);
        
        if (activeLoc) {
            const dist = calculateDistance(
                userCoords.latitude, 
                userCoords.longitude, 
                activeLoc.latitude, 
                activeLoc.longitude
            );
            if (dist > 0.5) {
                console.log(`🚫 User is ${dist.toFixed(2)} miles away. Auto-Checking Out.`);
                handleCheckOut(true); 
            }
        }
    }
  }, [userCoords, currentCheckIn, locations]);


  const loadPings = async () => {
      const { data: receivedData } = await supabase.from('pings')
        .select(`*, sender:profiles!from_user_id(*)`)
        .eq('to_user_id', user.id)
        .eq('status', 'pending') 
        .order('created_at', { ascending: false });
      setReceivedPings(receivedData || []);

      const { data: missionData } = await supabase.from('pings')
        .select(`*, sender:profiles!from_user_id(*), receiver:profiles!to_user_id(*)`)
        .or(`to_user_id.eq.${user.id},from_user_id.eq.${user.id}`) 
        .eq('status', 'revealed') 
        .is('met_confirmed', null) 
        .order('updated_at', { ascending: false })
        .limit(1);
      
      if (missionData && missionData.length > 0) {
          setActiveMission(missionData[0]);
      } else {
          setActiveMission(null);
      }
  };

  const handleCheckOut = async (isAutoEject = false) => {
    const checkinId = currentCheckIn?.id;
    if (!checkinId) return;
    try {
        await supabase.from('checkins').update({ is_active: false }).eq('id', checkinId);
        setCurrentCheckIn(null);
        setActiveMission(null); 
        if (isAutoEject) {
            toast.warning("You left the venue. Automatically checked out.");
        } else {
            toast.success("Checked out successfully.");
        }
    } catch (error) { console.error(error); }
  };

  const handleQuickCheckIn = async (e, loc) => {
      e.stopPropagation(); 
      if (!userCoords) { toast.error("Waiting for GPS..."); return; }
      const dist = calculateDistance(userCoords.latitude, userCoords.longitude, loc.latitude, loc.longitude);
      
      if (dist > 0.5) { toast.error(`Too far! You are ${dist.toFixed(1)} miles away.`); return; }
      
      setCheckingInId(loc.id);
      try {
          await supabase.from('checkins').update({ is_active: false }).eq('user_id', user.id);
          const { data, error } = await supabase.from('checkins').insert({
              user_id: user.id, location_id: loc.id, is_active: true
          }).select(`*, locations (*)`).single();
          if (error) throw error;
          setCurrentCheckIn(data);
          toast.success(`Checked into ${loc.name}!`);
          setActiveUsersAtLocation(prev => ({ ...prev, [loc.id]: (prev[loc.id] || 0) + 1 }));
      } catch(e) { toast.error("Check-in failed. Try again."); } finally { setCheckingInId(null); }
  }

  const getPartyVibe = (count) => {
      if (count >= 10) return { label: "PACKED 🚨", color: "text-red-500 bg-red-500/10 border-red-500/20" };
      if (count >= 6) return { label: "BUSY 🔥", color: "text-orange-500 bg-orange-500/10 border-orange-500/20" };
      if (count >= 3) return { label: "LIVELY 🥂", color: "text-green-500 bg-green-500/10 border-green-500/20" };
      return { label: "CHILL 🌙", color: "text-blue-400 bg-blue-500/10 border-blue-500/20" };
  };

  const sortedLocations = useMemo(() => {
    const mapped = locations.map(loc => {
      const dist = userCoords ? calculateDistance(userCoords.latitude, userCoords.longitude, loc.latitude, loc.longitude) : Infinity;
      return { ...loc, _distance: dist };
    });
    return mapped.sort((a, b) => {
      if (sortBy === 'distance') return a._distance - b._distance;
      if (sortBy === 'rating') return (b.google_rating || b.rating || 0) - (a.google_rating || a.rating || 0); 
      return 0;
    });
  }, [locations, userCoords, sortBy]);

  const promotedLocation = sortedLocations.find(l => l.is_promoted === true);
  const otherLocations = promotedLocation ? sortedLocations.filter(l => l.id !== promotedLocation.id) : sortedLocations;

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-500">Loading...</div>;

  return (
    <div className="pb-24 bg-slate-950 min-h-screen text-white relative"> 
      
      {/* 🟢 FIXED BACKGROUND with VIGNETTE */}
      <div 
        className="fixed inset-0 z-0 pointer-events-none"
        style={{
          // 🟢 REPLACE 'el-paso-star.jpg' with your actual file name in public folder
          backgroundImage: `url('/el-paso-star.jpg')`, 
          backgroundSize: '100% auto',
          backgroundPosition: 'center',
          backgroundAttachment: 'fixed', // This makes it static while you scroll
          opacity: 0.4 // Adjust visibility
        }}
      />
      {/* 🟢 VIGNETTE OVERLAY (Dark edges, clear center) */}
      <div className="fixed inset-0 z-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,#020617_90%)]" />


      {/* CONTENT (Z-Index 10 ensures it sits ON TOP of the background) */}
      <div className="relative z-10">
      
        {receivedPings.length > 0 && (
            <MysteryPopup 
              pings={receivedPings} 
              onDismiss={(idToDismiss) => { 
                  setReceivedPings(current => current.filter(p => p.id !== idToDismiss));
                  loadPings(); 
              }} 
            />
        )}

        {/* HEADER */}
        <div className="relative w-full h-[45vh] min-h-[400px] bg-transparent rounded-b-[3rem] overflow-hidden shadow-2xl mb-8 group">
          {profile?.avatar_url ? (
              <img src={profile.avatar_url} className="absolute inset-0 w-full h-full object-cover transition-transform duration-700 group-hover:scale-105 opacity-80" onClick={() => navigate(`/user/${user?.id}`)} alt="Profile" />
          ) : ( <div className="absolute inset-0 bg-slate-800/50 flex items-center justify-center"><User className="w-24 h-24 text-slate-600" /></div> )}
          
          {/* Gradient Overlay for Text Readability */}
          <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-slate-950/60 to-transparent pointer-events-none" />

          <div className="absolute bottom-0 left-0 right-0 p-8 flex flex-col items-center text-center z-10">
              <h1 onClick={() => navigate(`/user/${user?.id}`)} className="text-4xl font-black text-white tracking-tight drop-shadow-lg cursor-pointer">{profile?.display_name || "Explorer"}</h1>
              <p className="text-amber-400 text-lg font-bold tracking-wide drop-shadow-md mb-4">@{profile?.handle || "user"}</p>
              <div className="flex items-center gap-3">
                  <div className="bg-black/40 backdrop-blur-md border border-white/10 px-4 py-2 rounded-full flex items-center gap-2 shadow-lg"><Trophy className="w-4 h-4 text-yellow-400 fill-yellow-400" /><span className="text-sm font-bold text-white">{profile?.xp || 0} XP</span></div>
                  <button onClick={(e) => { e.stopPropagation(); navigate('/profile-setup'); }} className="bg-white/10 backdrop-blur-md border border-white/20 px-4 py-2 rounded-full flex items-center gap-2 hover:bg-white/20 transition active:scale-95 shadow-lg"><Edit3 className="w-4 h-4 text-white" /><span className="text-sm font-bold text-white">Edit Profile</span></button>
              </div>
          </div>
          <button onClick={(e) => { e.stopPropagation(); navigate('/settings'); }} className="absolute top-6 right-6 p-2 bg-black/40 backdrop-blur-md rounded-full text-slate-300 hover:text-white z-50 transition"><SettingsIcon className="w-5 h-5" /></button> 
        </div>

        {activeMission && (
            <div className="space-y-4 px-4 -mt-4 relative z-20">
               <DidWeMeet 
                  ping={activeMission} 
                  onConfirm={(idToDismiss) => { 
                      setActiveMission(null); 
                  }} 
               /> 
            </div>
        )}

        {/* ACTIVE LOCATION */}
        {currentCheckIn && (
          <div className="px-4 mb-8 mt-6">
              <div className="bg-slate-900/80 backdrop-blur-md border border-amber-500/50 rounded-2xl p-5 shadow-2xl relative overflow-hidden animate-in fade-in zoom-in-95">
                  <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl -translate-y-1/2 translate-x-1/2 pointer-events-none"></div>
                  <div className="flex justify-between items-start mb-6 relative z-10">
                      <div>
                          <span className="flex items-center gap-1.5 text-green-400 text-xs font-bold uppercase tracking-wider mb-1">Live Mode Active</span>
                          <h2 className="text-2xl font-bold text-white leading-none"><MapPin className="inline-block w-5 h-5 mr-1 text-amber-500 animate-pulse" /> {currentCheckIn.locations?.name || "Unknown Location"}</h2>
                      </div>
                      <button onClick={() => handleCheckOut(false)} className="p-2 bg-red-500/10 text-red-500 rounded-lg hover:bg-red-500/20 transition"><LogOut className="w-5 h-5" /></button>
                  </div>
                  <div className="mt-4"><UserGrid locationId={currentCheckIn.location_id} /></div>
              </div>
          </div>
        )}

        {/* LOCATIONS LIST */}
        <div className="px-6 mb-2 flex items-center justify-between">
          <h2 className="text-lg font-bold flex items-center gap-2 drop-shadow-md"><MapPin className="w-5 h-5 text-amber-500" /> Tap Tap - {currentCity}</h2>
          <div className="flex bg-slate-900/80 backdrop-blur-sm rounded-lg p-1 border border-slate-800">
             <button onClick={() => setSortBy('distance')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${sortBy === 'distance' ? 'bg-amber-500 text-black' : 'text-slate-400'}`}>Near</button>
             <button onClick={() => setSortBy('rating')} className={`px-3 py-1 text-[10px] font-bold rounded-md transition ${sortBy === 'rating' ? 'bg-amber-500 text-black' : 'text-slate-400'}`}>Top</button>
          </div>
        </div>
        
        <div className="px-4 space-y-3">
          {promotedLocation && (
              <div key={promotedLocation.id} onClick={() => navigate(`/location/${promotedLocation.id}`)} className="bg-amber-950/40 backdrop-blur-md border-2 border-amber-500/50 p-3 rounded-xl active:scale-[0.98] transition-transform cursor-pointer relative overflow-hidden">
                  <div className="absolute -right-10 -top-10 w-32 h-32 bg-amber-500/20 blur-3xl rounded-full pointer-events-none"></div>
                  <div className="absolute top-2 right-2 flex items-center gap-1 bg-amber-500 text-black text-[9px] font-bold px-1.5 py-0.5 rounded shadow-sm z-10"><Crown className="w-3 h-3 fill-black" /> PROMOTED</div>
                  <div className="flex items-center justify-between relative z-0">
                      <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-2 mb-1"><span className="text-white font-bold truncate text-base">{promotedLocation.name}</span><div className="flex items-center gap-0.5 text-yellow-400 text-xs"><Star className="w-3 h-3 fill-yellow-400" /><span>{promotedLocation.google_rating || promotedLocation.rating || 4.5}</span></div></div>
                          <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
                              {(() => { const count = activeUsersAtLocation[promotedLocation.id] || 0; const vibe = getPartyVibe(count); return (<span className={`px-1.5 py-0.5 rounded border ${vibe.color} font-bold text-[9px] uppercase`}>{vibe.label}</span>); })()}
                              <span className="text-green-400">{promotedLocation.price_level}</span>
                              <span>• {promotedLocation._distance < 100 ? `${promotedLocation._distance.toFixed(1)} mi` : 'Far away'}</span>
                          </div>
                          <p className="text-amber-200/70 text-xs truncate italic">{promotedLocation.address}</p>
                      </div>
                      
                      {/* 🟢 FIXED: REMOVED GOOGLE PLACES API FOR PROMOTED THUMBNAIL */}
                      <div className="relative w-16 h-16 shrink-0"><img src={promotedLocation.image_url || "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400"} alt={promotedLocation.name} className="w-full h-full object-cover rounded-lg border border-amber-500/30" /></div>
                      
                      <ChevronRight className="w-4 h-4 text-amber-500 ml-2" />
                  </div>
                  <button onClick={(e) => handleQuickCheckIn(e, promotedLocation)} disabled={checkingInId === promotedLocation.id} className="mt-3 w-full py-2 bg-amber-500 text-black font-bold text-xs rounded-lg flex items-center justify-center gap-2 shadow-lg active:scale-95 transition hover:bg-amber-400 disabled:opacity-70">
                      {checkingInId === promotedLocation.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3 fill-black" />} {checkingInId === promotedLocation.id ? "Checking In..." : "Check In Here"}
                  </button>
              </div>
          )}

          {otherLocations.slice(0, visibleCount).map((loc) => {
              
              // 🟢 FIXED: REMOVED GOOGLE PLACES API FOR REGULAR THUMBNAILS
              const imageUrl = loc.image_url || "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=400";
              
              const count = activeUsersAtLocation[loc.id] || 0;
              const vibe = getPartyVibe(count);
              return (
                <div key={loc.id} onClick={() => navigate(`/location/${loc.id}`)} className="bg-slate-900/60 backdrop-blur-sm border border-slate-800 p-3 rounded-xl active:scale-[0.98] transition-transform cursor-pointer">
                  <div className="flex items-center justify-between mb-3">
                      <div className="flex-1 min-w-0 pr-4">
                          <div className="flex items-center gap-2 mb-1"><span className="text-white font-bold truncate text-base">{loc.name}</span><div className="flex items-center gap-0.5 text-yellow-400 text-xs"><Star className="w-3 h-3 fill-yellow-400" /><span>{loc.google_rating || loc.rating || 4.5}</span></div></div>
                          <div className="flex items-center gap-2 text-slate-400 text-xs mb-2">
                              <span className={`px-1.5 py-0.5 rounded border ${vibe.color} font-bold text-[9px] uppercase`}>{vibe.label}</span>
                              <span className="px-2 py-0.5 bg-slate-800 rounded text-amber-500 uppercase font-bold text-[10px]">{loc.type}</span>
                              <span>• {loc._distance < 100 ? `${loc._distance.toFixed(1)} mi` : 'Far away'}</span>
                          </div>
                          <p className="text-slate-500 text-xs truncate">{loc.address}</p>
                      </div>
                      <div className="relative w-16 h-16 shrink-0"><img src={imageUrl} alt={loc.name} className="w-full h-full object-cover rounded-lg border border-slate-700" loading="lazy" /></div>
                  </div>
                  <button onClick={(e) => handleQuickCheckIn(e, loc)} disabled={checkingInId === loc.id} className="w-full py-2 bg-slate-800 text-slate-300 font-bold text-xs rounded-lg flex items-center justify-center gap-2 border border-slate-700 hover:bg-slate-700 active:scale-95 transition disabled:opacity-50">
                      {checkingInId === loc.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Navigation className="w-3 h-3" />} {checkingInId === loc.id ? "Checking In..." : "Quick Check In"}
                  </button>
                </div>
              );
          })}

          {visibleCount < otherLocations.length && (
              <button 
                  onClick={() => setVisibleCount(prev => prev + 5)}
                  className="w-full py-3 mt-4 bg-slate-900/80 backdrop-blur-md border border-slate-800 text-slate-400 font-bold text-sm rounded-xl hover:bg-slate-800 transition"
              >
                  Load More Venues
              </button>
          )}
        </div>

        <div className="px-4 py-6"><div className="h-px w-full bg-gradient-to-r from-transparent via-slate-800 to-transparent"></div></div>
        
        {/* RECENT CONNECTIONS LIST */}
        <div className="mt-8 mx-4 bg-slate-900/80 backdrop-blur-md border border-slate-800 rounded-2xl overflow-hidden transition-all duration-300">
            <div className="grid grid-cols-2 p-4 text-center">
                <div onClick={() => setExpandedSection(expandedSection === 'people' ? null : 'people')} className={`space-y-1 cursor-pointer rounded-xl transition py-2 ${expandedSection === 'people' ? 'bg-slate-800' : 'hover:bg-slate-800/50'}`}><div className="flex justify-center text-blue-500 mb-1"><Users className="w-6 h-6" /></div><div className="text-2xl font-black text-white">{stats.peopleMet}</div><div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">People Met</div></div>
                <div onClick={() => setExpandedSection(expandedSection === 'places' ? null : 'places')} className={`space-y-1 border-l border-slate-800 cursor-pointer rounded-xl transition py-2 ${expandedSection === 'places' ? 'bg-slate-800' : 'hover:bg-slate-800/50'}`}><div className="flex justify-center text-green-500 mb-1"><MapIcon className="w-6 h-6" /></div><div className="text-2xl font-black text-white">{stats.placesVisited}</div><div className="text-[10px] text-slate-500 uppercase font-bold tracking-wider">Places Visited</div></div>
            </div>
            
            {expandedSection && (
              <div className="border-t border-slate-800 p-4 bg-slate-950/30 animate-in slide-in-from-top-2 fade-in duration-300">
                {expandedSection === 'people' && <ConnectionsList />}
                
                {expandedSection === 'places' && (
                  <div className="space-y-3">
                     {visitedPlaces.length === 0 ? (
                         <p className="text-center text-xs text-slate-500 italic">No places visited yet. Get out there!</p>
                     ) : (
                         visitedPlaces.map(place => (
                             <div key={place.id} onClick={() => navigate(`/location/${place.id}`)} className="flex items-center gap-3 p-2 rounded-lg bg-slate-900 border border-slate-800 hover:bg-slate-800 transition cursor-pointer">
                                 {/* 🟢 FIXED: REMOVED EXPENSIVE GOOGLE PHOTOS API HERE TOO */}
                                 <img 
                                    src={place.image_url || "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=100"} 
                                    className="w-10 h-10 rounded-md object-cover" 
                                 />
                                 <div className="flex-1 min-w-0">
                                     <p className="text-sm font-bold text-white truncate">{place.name}</p>
                                     <p className="text-[10px] text-slate-500 truncate">{place.address}</p>
                                 </div>
                                 <ChevronRight className="w-4 h-4 text-slate-600" />
                             </div>
                         ))
                     )}
                  </div>
                )}
              </div>
            )}
        </div>
      </div>

    </div>
  );
};

export default Home;