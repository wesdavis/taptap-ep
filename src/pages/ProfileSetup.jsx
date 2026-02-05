import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Camera, ArrowLeft, Zap, Image as ImageIcon } from 'lucide-react';
import { toast } from 'sonner';

// 🟢 YOUR API KEY
const GOOGLE_KEY = "AIzaSyD6a6NR3DDmw15x2RgQcpV3NaBunD2ZYxk";

export default function ProfileSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  
  // Admin State
  const [enriching, setEnriching] = useState(false);
  const [statusMsg, setStatusMsg] = useState("");
  const [progress, setProgress] = useState(0);
  
  const [formData, setFormData] = useState({
    full_name: '',
    handle: '',
    gender: '',
    bio: '',
    avatar_url: ''
  });

  useEffect(() => {
    if (user) loadProfile();
  }, [user]);

  async function loadProfile() {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (error && error.code !== 'PGRST116') throw error; 
      if (data) {
        setFormData({
            full_name: data.full_name || '',
            handle: data.handle || '',
            gender: data.gender || '',
            bio: data.bio || '',
            avatar_url: data.avatar_url || ''
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
        const { error } = await supabase.from('profiles').upsert({
            id: user.id,
            ...formData,
            updated_at: new Date()
        });
        if (error) throw error;
        toast.success("Profile updated!");
        navigate('/'); 
    } catch (error) {
        toast.error("Error updating profile");
    } finally {
        setSaving(false);
    }
  }

  // 🟢 1. DATA ENRICHMENT (Ratings, Hours, Price)
  const runEnrichment = async () => {
    if (!confirm("Start Enrichment? This will populate your database columns.")) return;
    
    setEnriching(true);
    setStatusMsg("Starting Data Fetch...");
    setProgress(0);

    try {
        const { data: locs } = await supabase.from('locations').select('*');
        if (!locs || locs.length === 0) {
            toast.error("No locations found.");
            setEnriching(false);
            return;
        }

        let count = 0;

        for (const loc of locs) {
            try {
                let placeId = loc.google_place_id;
                
                // Search for ID if missing
                if (!placeId) {
                    setStatusMsg(`🔎 Finding ID for: ${loc.name}`);
                    const search = await fetch('https://places.googleapis.com/v1/places:searchText', {
                        method: 'POST',
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Goog-Api-Key': GOOGLE_KEY,
                            'X-Goog-FieldMask': 'places.id,places.formattedAddress'
                        },
                        body: JSON.stringify({ 
                            textQuery: `${loc.name} ${loc.address || 'El Paso, TX'}` 
                        })
                    });
                    
                    const sData = await search.json();
                    
                    if (sData.places?.[0]) {
                        placeId = sData.places[0].id;
                        await supabase.from('locations').update({ 
                            google_place_id: placeId,
                            address: sData.places[0].formattedAddress
                        }).eq('id', loc.id);
                    }
                }

                if (placeId) {
                    setStatusMsg(`📥 Saving data for: ${loc.name}`);
                    
                    const details = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Goog-Api-Key': GOOGLE_KEY,
                            'X-Goog-FieldMask': 'rating,userRatingCount,priceLevel,nationalPhoneNumber,websiteUri,regularOpeningHours,editorialSummary,formattedAddress'
                        }
                    });

                    const dData = await details.json();

                    if (dData.error) throw new Error(dData.error.message);

                    const priceMap = { 
                        'PRICE_LEVEL_INEXPENSIVE': '$', 
                        'PRICE_LEVEL_MODERATE': '$$', 
                        'PRICE_LEVEL_EXPENSIVE': '$$$', 
                        'PRICE_LEVEL_VERY_EXPENSIVE': '$$$$' 
                    };

                    let hoursString = null;
                    if (dData.regularOpeningHours?.weekdayDescriptions) {
                        hoursString = dData.regularOpeningHours.weekdayDescriptions.join('\n');
                    }

                    const updates = {
                        google_data: dData,
                        google_rating: dData.rating || null,
                        google_user_ratings_total: dData.userRatingCount || 0,
                        price_level: priceMap[dData.priceLevel] || '$$',
                        hours: hoursString,
                        phone: dData.nationalPhoneNumber,
                        website: dData.websiteUri,
                        description: dData.editorialSummary?.text || loc.description
                    };

                    const { error: dbError } = await supabase.from('locations').update(updates).eq('id', loc.id);
                    if (dbError) throw dbError;
                    count++;
                }

                setProgress(Math.round(((count + 1) / locs.length) * 100));
                await new Promise(r => setTimeout(r, 200));

            } catch (err) {
                console.error(`❌ Error on ${loc.name}:`, err);
                setStatusMsg(`Error on ${loc.name}`);
            }
        }
        
        setStatusMsg("Data Enrichment Done!");
        toast.success(`Updated ${count} locations.`);

    } catch (err) {
        toast.error("Failure: " + err.message);
        setStatusMsg("Failed.");
    } finally {
        setEnriching(false);
    }
  };

  // 🟢 2. PHOTO FETCH (New!)
  const runPhotoFetch = async () => {
    if (!confirm("Fetch Photos? This will download image references for all locations.")) return;
    
    setEnriching(true);
    setStatusMsg("Starting Photo Fetch...");
    setProgress(0);

    try {
        const { data: locs } = await supabase.from('locations').select('id, name, google_place_id');
        let count = 0;

        for (const loc of locs) {
            if (!loc.google_place_id) continue;

            try {
                setStatusMsg(`📸 Getting photos for: ${loc.name}`);
                
                const res = await fetch(`https://places.googleapis.com/v1/places/${loc.google_place_id}`, {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': GOOGLE_KEY,
                        'X-Goog-FieldMask': 'photos'
                    }
                });
                
                const data = await res.json();
                
                if (data.photos && data.photos.length > 0) {
                    // Get top 10 photo references
                    const photoRefs = data.photos.map(p => p.name).slice(0, 10);
                    
                    await supabase.from('locations').update({ 
                        google_photos: photoRefs 
                    }).eq('id', loc.id);
                    
                    count++;
                }

                setProgress(Math.round(((count + 1) / locs.length) * 100));
                await new Promise(r => setTimeout(r, 200));

            } catch (err) {
                console.error(err);
            }
        }
        setStatusMsg("Photos Done!");
        toast.success(`Saved photos for ${count} locations.`);

    } catch (err) {
        toast.error("Photo fetch failed");
    } finally {
        setEnriching(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-500"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 pb-32">
      <div className="max-w-md mx-auto">
        
        {/* Header */}
        <div className="flex items-center gap-4 mb-8">
            <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-slate-400">
                <ArrowLeft className="w-6 h-6" />
            </Button>
            <h1 className="text-2xl font-bold">Edit Profile</h1>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="flex justify-center mb-6">
                <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-dashed border-slate-600 flex items-center justify-center relative overflow-hidden group cursor-pointer">
                    {formData.avatar_url ? (
                        <img src={formData.avatar_url} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                        <Camera className="w-8 h-8 text-slate-500" />
                    )}
                </div>
            </div>

            <div className="space-y-2">
                <Label>Display Name</Label>
                <Input required value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="bg-slate-900 border-slate-800" />
            </div>

            <div className="space-y-2">
                <Label>Handle</Label>
                <Input required value={formData.handle} onChange={e => setFormData({...formData, handle: e.target.value})} className="bg-slate-900 border-slate-800" />
            </div>

            <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} className="bg-slate-900 border-slate-800" />
            </div>

            <Button type="submit" disabled={saving} className="w-full bg-amber-500 text-black font-bold hover:bg-amber-400">
                {saving ? <Loader2 className="animate-spin" /> : "Save Changes"}
            </Button>
        </form>

        {/* 🟢 ADMIN ZONE */}
        <div className="mt-12 pt-8 border-t border-slate-800/50 space-y-3">
            <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-2 text-center">Admin Controls</h3>
            
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3">
                
                {/* Button 1: Data */}
                <Button 
                    variant="outline" 
                    onClick={runEnrichment}
                    disabled={enriching}
                    className="w-full border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
                >
                    {enriching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                    {enriching ? "Working..." : "1. Fetch Data (Ratings/Price)"}
                </Button>

                {/* Button 2: Photos */}
                <Button 
                    variant="outline" 
                    onClick={runPhotoFetch}
                    disabled={enriching}
                    className="w-full border-pink-500/30 text-pink-400 hover:bg-pink-500/10"
                >
                    {enriching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ImageIcon className="w-4 h-4 mr-2" />}
                    {enriching ? "Working..." : "2. Fetch Photos"}
                </Button>
                
                {/* Status Log */}
                {statusMsg && (
                    <div className="mt-3 text-center">
                        <p className="text-[10px] font-mono text-slate-400 animate-pulse mb-1">{statusMsg}</p>
                        {enriching && (
                            <div className="w-full h-1 bg-slate-800 rounded-full overflow-hidden">
                                <div className="h-full bg-indigo-500 transition-all duration-300" style={{ width: `${progress}%` }}></div>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>

      </div>
    </div>
  );
}