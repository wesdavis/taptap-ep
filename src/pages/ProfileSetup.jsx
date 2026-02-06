import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Camera, ArrowLeft, Zap, Image as ImageIcon, LogOut } from 'lucide-react';
import { toast } from 'sonner';

// 🟢 YOUR API KEY
const GOOGLE_KEY = "AIzaSyD6a6NR3DDmw15x2RgQcpV3NaBunD2ZYxk";

export default function ProfileSetup() {
  const { user, logout } = useAuth();
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
        const cleanHandle = formData.handle.replace('@', '').toLowerCase().replace(/\s/g, '');
        
        // 🟢 AUTO-GENERATE AVATAR if missing
        let finalAvatar = formData.avatar_url;
        if (!finalAvatar) {
            finalAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.full_name)}&background=random&color=fff&size=256`;
        }

        const { error } = await supabase.from('profiles').upsert({
            id: user.id,
            full_name: formData.full_name,
            handle: cleanHandle,
            gender: formData.gender,
            bio: formData.bio,
            avatar_url: finalAvatar,
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

  const handleLogout = async () => {
    await logout();
    navigate('/auth');
  };

  // 🟢 1. DATA ENRICHMENT
  const runEnrichment = async () => {
    if (!confirm("Admin: Fetch Ratings/Prices for ALL locations?")) return;
    setEnriching(true);
    setStatusMsg("Starting Data Fetch...");
    setProgress(0);
    try {
        const { data: locs } = await supabase.from('locations').select('*');
        let count = 0;
        for (const loc of locs) {
            try {
                let placeId = loc.google_place_id;
                if (!placeId) {
                    const search = await fetch('https://places.googleapis.com/v1/places:searchText', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': GOOGLE_KEY, 'X-Goog-FieldMask': 'places.id' },
                        body: JSON.stringify({ textQuery: `${loc.name} ${loc.address || 'El Paso, TX'}` })
                    });
                    const sData = await search.json();
                    if (sData.places?.[0]) placeId = sData.places[0].id;
                }
                if (placeId) {
                    const details = await fetch(`https://places.googleapis.com/v1/places/${placeId}`, {
                        headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': GOOGLE_KEY, 'X-Goog-FieldMask': 'rating,userRatingCount,priceLevel,nationalPhoneNumber,websiteUri,regularOpeningHours,editorialSummary' }
                    });
                    const dData = await details.json();
                    const priceMap = { 'PRICE_LEVEL_INEXPENSIVE': '$', 'PRICE_LEVEL_MODERATE': '$$', 'PRICE_LEVEL_EXPENSIVE': '$$$' };
                    
                    await supabase.from('locations').update({
                        google_place_id: placeId,
                        google_rating: dData.rating,
                        google_user_ratings_total: dData.userRatingCount,
                        price_level: priceMap[dData.priceLevel] || '$$',
                        phone: dData.nationalPhoneNumber,
                        website: dData.websiteUri,
                        description: dData.editorialSummary?.text || loc.description
                    }).eq('id', loc.id);
                    count++;
                }
                setProgress(Math.round(((count + 1) / locs.length) * 100));
                await new Promise(r => setTimeout(r, 200));
            } catch (err) {}
        }
        toast.success(`Updated ${count} locations.`);
    } catch (err) { toast.error("Failed."); } finally { setEnriching(false); }
  };

  // 🟢 2. PHOTO FETCH
  const runPhotoFetch = async () => {
    if (!confirm("Admin: Download new photos from Google?")) return;
    setEnriching(true);
    setStatusMsg("Fetching Photos...");
    setProgress(0);
    try {
        const { data: locs } = await supabase.from('locations').select('id, google_place_id');
        let count = 0;
        for (const loc of locs) {
            if (!loc.google_place_id) continue;
            try {
                const res = await fetch(`https://places.googleapis.com/v1/places/${loc.google_place_id}`, {
                    headers: { 'Content-Type': 'application/json', 'X-Goog-Api-Key': GOOGLE_KEY, 'X-Goog-FieldMask': 'photos' }
                });
                const data = await res.json();
                if (data.photos) {
                    await supabase.from('locations').update({ google_photos: data.photos.map(p => p.name).slice(0, 10) }).eq('id', loc.id);
                    count++;
                }
                setProgress(Math.round(((count + 1) / locs.length) * 100));
                await new Promise(r => setTimeout(r, 200));
            } catch (err) {}
        }
        toast.success(`Got photos for ${count} spots.`);
    } catch (err) { toast.error("Photo fetch failed"); } finally { setEnriching(false); }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-500"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6 pb-32">
      <div className="max-w-md mx-auto">
        <div className="flex items-center justify-between mb-8">
            <div className="flex items-center gap-4">
                <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-slate-400">
                    <ArrowLeft className="w-6 h-6" />
                </Button>
                <h1 className="text-2xl font-bold">Edit Profile</h1>
            </div>
            {/* 🟢 LOGOUT BUTTON RESTORED */}
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                <LogOut className="w-4 h-4 mr-2" /> Log Out
            </Button>
        </div>

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
                <Label>Handle (@)</Label>
                <Input required value={formData.handle} onChange={e => setFormData({...formData, handle: e.target.value})} className="bg-slate-900 border-slate-800" />
            </div>
            <div className="space-y-2">
                <Label>Gender</Label>
                <Select value={formData.gender} onValueChange={val => setFormData({...formData, gender: val})}>
                    <SelectTrigger className="bg-slate-900 border-slate-800"><SelectValue placeholder="Select" /></SelectTrigger>
                    <SelectContent className="bg-slate-900 border-slate-800 text-white">
                        <SelectItem value="Male">Male</SelectItem>
                        <SelectItem value="Female">Female</SelectItem>
                        <SelectItem value="Non-binary">Non-binary</SelectItem>
                    </SelectContent>
                </Select>
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
                <Button variant="outline" onClick={runEnrichment} disabled={enriching} className="w-full border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10">
                    {enriching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />} 1. Fetch Data
                </Button>
                <Button variant="outline" onClick={runPhotoFetch} disabled={enriching} className="w-full border-pink-500/30 text-pink-400 hover:bg-pink-500/10">
                    {enriching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <ImageIcon className="w-4 h-4 mr-2" />} 2. Fetch Photos
                </Button>
                {statusMsg && <p className="text-[10px] text-center text-slate-400 animate-pulse">{statusMsg}</p>}
            </div>
        </div>
      </div>
    </div>
  );
}