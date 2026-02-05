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
  const [enriching, setEnriching] = useState(false);
  
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
      if (error && error.code !== 'PGRST116') throw error; // Ignore "not found" error for new users
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
        navigate('/'); // Go back home after save
    } catch (error) {
        toast.error("Error updating profile");
    } finally {
        setSaving(false);
    }
  }

  // 🟢 ADMIN FUNCTION: Enrich All Locations
  const runEnrichment = async () => {
    if (!confirm("Admin Action: Fetch live data from Google for ALL locations?")) return;
    setEnriching(true);
    toast.info("Starting enrichment... please wait.");

    try {
        // 1. Get locations with a Google Place ID
        const { data: locs } = await supabase
            .from('locations')
            .select('id, name, google_place_id')
            .not('google_place_id', 'is', null);

        let count = 0;
        
        // 2. Loop and Update
        for (const loc of locs || []) {
            try {
                const res = await fetch(`https://places.googleapis.com/v1/places/${loc.google_place_id}`, {
                    headers: {
                        'Content-Type': 'application/json',
                        'X-Goog-Api-Key': GOOGLE_KEY,
                        'X-Goog-FieldMask': 'rating,userRatingCount,priceLevel,nationalPhoneNumber,websiteUri,regularOpeningHours,editorialSummary'
                    }
                });

                const data = await res.json();
                const updates = {};

                if (data.rating) updates.google_rating = data.rating;
                if (data.userRatingCount) updates.google_user_ratings_total = data.userRatingCount;
                if (data.nationalPhoneNumber) updates.phone = data.nationalPhoneNumber;
                if (data.websiteUri) updates.website = data.websiteUri;
                if (data.editorialSummary?.text) updates.description = data.editorialSummary.text;
                
                // Helper for Price
                const priceMap = { 'PRICE_LEVEL_INEXPENSIVE': '$', 'PRICE_LEVEL_MODERATE': '$$', 'PRICE_LEVEL_EXPENSIVE': '$$$' };
                if (data.priceLevel) updates.price_level = priceMap[data.priceLevel] || '$$';

                // Helper for Hours
                if (data.regularOpeningHours?.weekdayDescriptions) {
                    updates.hours = data.regularOpeningHours.weekdayDescriptions.join('\n');
                }

                if (Object.keys(updates).length > 0) {
                    await supabase.from('locations').update(updates).eq('id', loc.id);
                    count++;
                }
                // Rate limit pause
                await new Promise(r => setTimeout(r, 200));

            } catch (err) { console.error(err); }
        }
        toast.success(`Updated ${count} locations!`);
    } catch (err) {
        toast.error("Enrichment failed.");
    } finally {
        setEnriching(false);
    }
  };

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-500"><Loader2 className="animate-spin" /></div>;

  return (
    <div className="min-h-screen bg-slate-950 text-white p-6">
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
                    {/* Note: Real image upload requires Storage setup. For now, text URL is fine. */}
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

        {/* 🟢 ADMIN SECTION (Hidden at bottom) */}
        <div className="mt-12 pt-12 border-t border-slate-800/50">
            <h3 className="text-xs font-bold text-slate-600 uppercase tracking-widest mb-4">Admin Zone</h3>
            <Button 
                variant="outline" 
                onClick={runEnrichment}
                disabled={enriching}
                className="w-full border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10"
            >
                {enriching ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Zap className="w-4 h-4 mr-2" />}
                {enriching ? "Enriching Database..." : "Enrich All Locations"}
            </Button>
            <p className="text-[10px] text-slate-600 mt-2 text-center">
                Fetches Ratings, Prices, and Hours from Google for all venues.
            </p>
        </div>

      </div>
    </div>
  );
}