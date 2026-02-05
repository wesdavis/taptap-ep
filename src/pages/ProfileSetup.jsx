import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Camera, ArrowLeft, Zap } from 'lucide-react';
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

  // 🟢 NEW "UNIVERSAL BUCKET" ADMIN FUNCTION
  const runEnrichment = async () => {
    if (!confirm("Start Enrichment? This will dump raw Google Data into your database.")) return;
    
    setEnriching(true);
    setStatusMsg("Starting...");
    setProgress(0);

    try {
        // 1. Get all locations
        const { data: locs } = await supabase.from('locations').select('*');
        if (!locs || locs.length === 0) {
            toast.error("No locations found in database.");
            setEnriching(false);
            return;
        }

        let count = 0;

        for (const loc of locs) {
            try {
                // ---------------------------------------------------------
                // A. SEARCH (If we don't have an ID)
                // ---------------------------------------------------------
                let placeId = loc.google_place_id;
                
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
                        // Save the ID immediately
                        await supabase.from('locations').update({ 
                            google_place_id: placeId,
                            address: sData.places[0].formattedAddress
                        }).eq('id', loc.id);
                    }
                }

                // ---------------------------------------------------------
                // B. FETCH DETAILS & DUMP TO 'google_data'
                // ---------------------------------------------------------
                if (placeId) {
                    setStatusMsg(`📥 Dumping data for: ${loc.name}`);
                    
                    const details = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
                        headers: {
                            'Content-Type': 'application/json',
                            'X-Goog-Api-Key': GOOGLE_KEY,
                            // Request EVERYTHING relevant
                            'X-Goog-FieldMask': 'rating,userRatingCount,priceLevel,nationalPhoneNumber,websiteUri,regularOpeningHours,editorialSummary,formattedAddress'
                        }
                    });

                    const dData = await details.json();

                    if (dData.error) {
                        console.error("Google API Error:", dData.error);
                        throw new Error(dData.error.message);
                    }

                    // 🟢 THE MAGIC: Save the whole object to 'google_data'
                    const { error: dbError } = await supabase.from('locations').update({
                        google_data: dData,  // <--- Dump it all here (Requires 'google_data' column type JSONB)
                        
                        // We also update these standard columns for convenience
                        phone: dData.nationalPhoneNumber,
                        website: dData.websiteUri,
                        description: dData.editorialSummary?.text || loc.description
                    }).eq('id', loc.id);

                    if (dbError) throw dbError;
                    count++;
                }

                // Update Progress Bar
                setProgress(Math.round(((count + 1) / locs.length) * 100));
                
                // Rate limit pause (very important for Google API)
                await new Promise(r => setTimeout(r, 200));

            } catch (err) {
                console.error(`❌ Error on ${loc.name}:`, err);
                // Don't crash the whole loop, just log it
                setStatusMsg(`Error on ${loc.name}: ${err.message}`);
            }
        }
        
        setStatusMsg("Done!");
        toast.success(`Enrichment Complete! Updated ${count} locations.`);

    } catch (err) {
        toast.error("Critical Failure: " + err.message);
        setStatusMsg("Failed.");
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
                <Input 
                    required 
                    value={formData.full_name} 
                    onChange={e => setFormData({...formData, full_name: e.target.value})} 
                    className="bg-slate-900 border-slate-800" 
                />
            </div>

            <div className="space-y-2">
                <Label>Handle (@username)</Label>
                <Input 
                    required 
                    value={formData.handle} 
                    onChange={e => setFormData({...formData, handle: e.target.value.toLowerCase().replace(/\s/g, '')})} 
                    className="bg-slate-900 border-slate-800" 
                />
            </div>

            <div className="space-y-2">
                <Label>Gender</Label>
                <Select 
                    value={formData.gender} 
                    onValueChange={val => setFormData({...formData, gender: val})}
                >
                    <SelectTrigger className="bg-slate-900 border-slate-800">
                        <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Non-binary">Non-binary</SelectItem>
                    </SelectContent>
                </Select>
            </div>

            <div className="space-y-2">
                <Label>Bio</Label>
                <Textarea 
                    value={formData.bio} 
                    onChange={e => setFormData({...formData, bio: e.target.value})} 
                    className="bg-slate-900 border-slate-800" 
                    placeholder="Tell us about yourself..."
                />
            </div>

            <Button type="submit" disabled={saving} className="w-full bg-amber-500 text-black font-bold hover:bg-amber-400">
                {saving ? <Loader2 className="animate-spin" /> : "Save Changes"}
            </Button>
        </form>

        {/* 🟢 ADMIN ZONE */}
        <div className="mt-12 pt-8 border-t border-slate-800/50">
            <h3 className="text-[10px] font-bold text-slate-600 uppercase tracking-widest mb-4 text-center">Admin Controls</h3>
            
            <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4">
                <Button 
                    variant="outline" 
                    onClick={runEnrichment}
                    disabled={enriching}
                    className="w-full border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 hover:text-indigo-300 transition-all"
                >
                    {enriching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                    {enriching ? "Running..." : "Run Database Enrichment"}
                </Button>
                
                {/* 🟢 LIVE STATUS LOG */}
                {statusMsg && (
                    <div className="mt-3 text-center">
                        <p className="text-[10px] font-mono text-slate-400 animate-pulse mb-1">
                            {statusMsg}
                        </p>
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