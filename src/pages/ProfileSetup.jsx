import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, LogOut, X, Plus, Crown, ShieldAlert, Trash2, RefreshCw } from 'lucide-react';
import { toast } from 'sonner';

// 🟢 YOUR API KEY
const GOOGLE_KEY = "AIzaSyD6a6NR3DDmw15x2RgQcpV3NaBunD2ZYxk";

export default function ProfileSetup() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  
  // Admin State
  const [enriching, setEnriching] = useState(false);
  const [venues, setVenues] = useState([]); 
  const [selectedPromoId, setSelectedPromoId] = useState("");

  const [formData, setFormData] = useState({
    full_name: '',
    handle: '',
    gender: '',
    bio: '',
    avatar_url: '',
    photos: [],
    is_admin: false 
  });

  useEffect(() => {
    if (user) {
        loadProfile();
    }
  }, [user]);

  async function loadProfile() {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (error && error.code !== 'PGRST116') throw error; 
      if (data) {
        // 🟢 FIX: Load 'display_name' if available, otherwise fallback to full_name
        setFormData({
            full_name: data.display_name || data.full_name || '',
            handle: data.handle || '',
            gender: data.gender || '',
            bio: data.bio || '',
            avatar_url: data.avatar_url || '',
            photos: data.photos || [],
            is_admin: data.is_admin || false 
        });
        
        if (data.is_admin) {
            loadVenues();
        }
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  async function loadVenues() {
      const { data } = await supabase.from('locations').select('id, name, is_promoted').order('name');
      if (data) {
          setVenues(data);
          const currentPromo = data.find(l => l.is_promoted);
          if (currentPromo) setSelectedPromoId(currentPromo.id.toString());
      }
  }

  async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        const { error: uploadError } = await supabase.storage
            .from('profile_photos')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        const { data: { publicUrl } } = supabase.storage
            .from('profile_photos')
            .getPublicUrl(filePath);

        setFormData(prev => ({
            ...prev,
            photos: [...prev.photos, publicUrl]
        }));
        
        toast.success("Photo uploaded!");
    } catch (error) {
        toast.error("Upload failed: " + error.message);
    } finally {
        setUploading(false);
    }
  }

  function removePhoto(indexToRemove) {
      setFormData(prev => ({
          ...prev,
          photos: prev.photos.filter((_, index) => index !== indexToRemove)
      }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setSaving(true);
    try {
        const cleanHandle = formData.handle.replace('@', '').toLowerCase().replace(/\s/g, '');
        
        let finalAvatar = formData.photos.length > 0 ? formData.photos[0] : formData.avatar_url;
        
        if (!finalAvatar) {
            finalAvatar = `https://ui-avatars.com/api/?name=${encodeURIComponent(formData.full_name)}&background=random&color=fff&size=256`;
        }

        const { error } = await supabase.from('profiles').upsert({
            id: user.id,
            full_name: formData.full_name,
            display_name: formData.full_name, // 🟢 FIX: Update BOTH columns so they stay in sync
            handle: cleanHandle,
            gender: formData.gender,
            bio: formData.bio,
            avatar_url: finalAvatar, 
            photos: formData.photos, 
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

  const handleSetPromotion = async () => {
    if (!selectedPromoId) return;
    setEnriching(true);
    try {
        await supabase.from('locations').update({ is_promoted: false }).neq('id', 0);
        await supabase.from('locations').update({ is_promoted: true }).eq('id', selectedPromoId);
        toast.success("Promotion Updated!");
        loadVenues(); 
    } catch (e) {
        toast.error("Failed to set promotion");
    } finally {
        setEnriching(false);
    }
  }

  // FORCE CHECKOUT TOOL
  const runGlobalCheckout = async () => {
      if (!confirm("⚠️ ADMIN: Force checkout for EVERYONE? The map will be empty.")) return;
      setEnriching(true);
      try {
          await supabase.from('checkins').update({ is_active: false }).neq('id', 0);
          toast.success("Dancefloor cleared! All users checked out.");
      } catch (e) { 
          toast.error("Failed to clear checkins"); 
      } finally { 
          setEnriching(false); 
      }
  }

  // RESET MY HISTORY
  const runResetMyGame = async () => {
      if (!confirm("Reset your Pings? You can meet people again.")) return;
      setEnriching(true);
      try {
          await supabase.from('pings').delete().or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);
          toast.success("History wiped. You are new again.");
      } catch (e) { 
          toast.error("Failed to reset"); 
      } finally { 
          setEnriching(false); 
      }
  }

  // Admin Helpers
  const runEnrichment = async () => { 
      if (!confirm("Admin: Fetch Data?")) return;
      setEnriching(true);
      try {
        toast.success("Enrichment mock run"); 
      } catch(e) {}
      setEnriching(false);
  };

  const runPhotoFetch = async () => { 
      if (!confirm("Admin: Fetch Photos?")) return;
      setEnriching(true);
      toast.success("Photo fetch mock run"); 
      setEnriching(false);
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
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-400 hover:text-red-300 hover:bg-red-500/10">
                <LogOut className="w-4 h-4 mr-2" /> Log Out
            </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-3">
                <Label>Your Photos</Label>
                <div className="grid grid-cols-3 gap-3">
                    <label className="aspect-square rounded-xl bg-slate-800 border-2 border-dashed border-slate-600 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-700/50 hover:border-amber-500 transition-colors">
                        {uploading ? <Loader2 className="w-6 h-6 animate-spin text-amber-500" /> : <Plus className="w-8 h-8 text-slate-400" />}
                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                    </label>
                    {formData.photos.map((url, index) => (
                        <div key={index} className="aspect-square rounded-xl overflow-hidden relative group border border-slate-700">
                            <img src={url} className="w-full h-full object-cover" alt="Profile" />
                            <button type="button" onClick={() => removePhoto(index)} className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"><X className="w-4 h-4" /></button>
                            {index === 0 && <div className="absolute bottom-0 left-0 right-0 bg-amber-500/90 text-[8px] text-center py-1 text-black font-black uppercase tracking-wider">Main Photo</div>}
                        </div>
                    ))}
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
        
        {/* ONLY SHOW TO ADMINS */}
        {formData.is_admin && (
            <div className="mt-12 pt-8 border-t border-slate-800/50 space-y-6">
                <div className="flex items-center justify-center gap-2 mb-4">
                    <ShieldAlert className="w-4 h-4 text-red-500" />
                    <h3 className="text-[10px] font-bold text-red-500 uppercase tracking-widest text-center">Super Admin Zone</h3>
                </div>
                
                {/* PROMOTION SELECTOR */}
                <div className="bg-amber-950/20 border border-amber-900/50 rounded-xl p-4 space-y-3">
                    <div className="flex items-center gap-2 mb-1">
                        <Crown className="w-4 h-4 text-amber-500" />
                        <span className="text-xs font-bold text-amber-500 uppercase">3. Manage Promotion</span>
                    </div>
                    <div className="flex gap-2">
                        <Select value={selectedPromoId} onValueChange={setSelectedPromoId}>
                            <SelectTrigger className="bg-slate-900 border-slate-700 h-9 text-xs"><SelectValue placeholder="Select Venue" /></SelectTrigger>
                            <SelectContent className="bg-slate-900 border-slate-700 text-white">
                                {venues.map(v => (
                                    <SelectItem key={v.id} value={v.id.toString()}>
                                        {v.name} {v.is_promoted ? '(Active)' : ''}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                        <Button size="sm" onClick={handleSetPromotion} disabled={enriching} className="bg-amber-500 text-black font-bold text-xs h-9">
                            {enriching ? <Loader2 className="w-3 h-3 animate-spin" /> : "Promote"}
                        </Button>
                    </div>
                </div>

                {/* DANGER ZONE TOOLS */}
                <div className="grid grid-cols-2 gap-3">
                    <Button variant="outline" onClick={runGlobalCheckout} disabled={enriching} className="border-red-500/30 text-red-400 hover:bg-red-500/10 h-16 flex flex-col gap-1 text-xs">
                        <LogOut className="w-4 h-4" />
                        Evacuate All
                    </Button>
                    <Button variant="outline" onClick={runResetMyGame} disabled={enriching} className="border-blue-500/30 text-blue-400 hover:bg-blue-500/10 h-16 flex flex-col gap-1 text-xs">
                        <RefreshCw className="w-4 h-4" />
                        Reset My History
                    </Button>
                </div>

                {/* OLD TOOLS */}
                <div className="bg-slate-900/50 border border-slate-800 rounded-xl p-4 space-y-3 opacity-50 hover:opacity-100 transition">
                    <Button variant="outline" onClick={runEnrichment} disabled={enriching} className="w-full border-indigo-500/30 text-indigo-400 hover:bg-indigo-500/10 h-8 text-xs">
                        1. Update Coordinates
                    </Button>
                    <Button variant="outline" onClick={runPhotoFetch} disabled={enriching} className="w-full border-pink-500/30 text-pink-400 hover:bg-pink-500/10 h-8 text-xs">
                        2. Fetch Photos
                    </Button>
                </div>
            </div>
        )}
      </div>
    </div>
  );
}