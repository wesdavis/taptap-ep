import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, LogOut, X, Plus, ShieldAlert, Crown, Trash2, RefreshCw, Camera, Lock } from 'lucide-react';
import { toast } from 'sonner';

import * as tf from '@tensorflow/tfjs';
import * as nsfwjs from 'nsfwjs';

export default function ProfileSetup() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false); 

  // AI SECURITY STATE
  const [model, setModel] = useState(null);
  const [modelLoading, setModelLoading] = useState(true);

  const [enriching, setEnriching] = useState(false);
  const [venues, setVenues] = useState([]); 
  const [selectedPromoId, setSelectedPromoId] = useState("");

  const [formData, setFormData] = useState({
    full_name: '',
    handle: '',
    gender: '',
    birth_date: '',
    relationship_status: '',
    bio: '',
    avatar_url: '',
    photos: [],
    interested_in: '', 
    is_admin: false 
  });

  useEffect(() => {
    async function init() {
        // 1. Load AI Model FIRST (Fail Closed Logic)
        try {
            console.log("🛡️ Initializing Safety AI...");
            const _model = await nsfwjs.load();
            setModel(_model);
            setModelLoading(false); // Only allow uploads after this is false
            console.log("✅ Safety AI Ready");
        } catch (err) {
            console.error("Failed to load safety model", err);
            toast.error("Security System failed to load. Please refresh.");
        }
        
        if (user) loadProfile();
    }
    init();
  }, [user]);

  async function loadProfile() {
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single();
      if (error && error.code !== 'PGRST116') throw error; 
      if (data) {
        setFormData({
            full_name: data.display_name || data.full_name || '',
            handle: data.handle || '',
            gender: data.gender || '',
            birth_date: data.birth_date || '', 
            relationship_status: data.relationship_status || '', 
            bio: data.bio || '',
            avatar_url: data.avatar_url || '',
            photos: data.photos || [],
            interested_in: data.interested_in || '',
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

  // 🟢 SMART FILTER: The "Purity Check"
  const checkSafety = async (file) => {
      if (!model) {
          toast.error("Security scanner not ready. Please wait.");
          return false;
      }
      
      return new Promise((resolve) => {
          const img = document.createElement('img');
          const objectUrl = URL.createObjectURL(file);
          img.src = objectUrl;
          
          img.onload = async () => {
              try {
                  const predictions = await model.classify(img);
                  URL.revokeObjectURL(objectUrl); 

                  // Categories: Neutral, Drawing, Sexy, Porn, Hentai
                  const porn = predictions.find(p => p.className === 'Porn');
                  const hentai = predictions.find(p => p.className === 'Hentai');
                  const sexy = predictions.find(p => p.className === 'Sexy');
                  
                  const pornScore = porn ? porn.probability : 0;
                  const hentaiScore = hentai ? hentai.probability : 0;
                  const sexyScore = sexy ? sexy.probability : 0;

                  console.log(`🛡️ AI Analysis: Porn=${(pornScore*100).toFixed(0)}% Sexy=${(sexyScore*100).toFixed(0)}%`);

                  // RULE 1: Hard Block on Obvious Porn/Hentai (> 25%)
                  if (pornScore > 0.25 || hentaiScore > 0.25) {
                      console.error("🚨 BLOCKED: Explicit content detected.");
                      resolve(false); 
                      return;
                  }

                  // RULE 2: The "Suspiciously Sexy" Rule (Catches Topless)
                  // If it is significantly "Sexy" (> 40%) AND has a "Porn" shadow (> 5%), block it.
                  // (Pure bikinis usually have Porn < 2%)
                  if (sexyScore > 0.40 && pornScore > 0.05) {
                      console.error("🚨 BLOCKED: Nudity detected (High Sexy + Trace Porn)");
                      resolve(false);
                      return;
                  }

                  // If we pass both checks, it is safe.
                  resolve(true); 

              } catch (err) {
                  console.error("Scan error", err);
                  resolve(false); 
              }
          };
      });
  };

  async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    if (modelLoading) {
        toast.warning("Security scanner is warming up. One moment...");
        return;
    }

    setScanning(true);
    setUploading(true);

    try {
        // A. Run Safety Check
        const isSafe = await checkSafety(file);
        if (!isSafe) {
            toast.error("Image Rejected", { 
                description: "Our AI detected nudity or explicit content.",
                duration: 5000
            });
            e.target.value = null; 
            setScanning(false);
            setUploading(false);
            return; // 🛑 STOP UPLOAD
        }

        // B. Upload to Supabase
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
        
        toast.success("Photo verified & uploaded!");

    } catch (error) {
        toast.error("Upload failed: " + error.message);
    } finally {
        setScanning(false);
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

        const safeBirthDate = formData.birth_date ? formData.birth_date : null;
        const safeRelationship = formData.relationship_status ? formData.relationship_status : null;
        const safeInterest = formData.interested_in ? formData.interested_in : null;

        const { error } = await supabase.from('profiles').upsert({
            id: user.id,
            full_name: formData.full_name,
            display_name: formData.full_name, 
            handle: cleanHandle,
            gender: formData.gender,
            birth_date: safeBirthDate, 
            relationship_status: safeRelationship, 
            interested_in: safeInterest,
            bio: formData.bio,
            avatar_url: finalAvatar, 
            photos: formData.photos, 
            updated_at: new Date()
        });

        if (error) {
            console.error("Supabase Error:", error); 
            throw error;
        }

        toast.success("Profile updated!");
        navigate('/'); 
    } catch (error) {
        toast.error(`Error: ${error.message || "Could not save"}`);
    } finally {
        setSaving(false);
    }
  }

  const handleLogout = async () => {
    try {
      if (user) {
          await supabase
            .from('checkins')
            .update({ is_active: false })
            .eq('user_id', user.id);
      }
      
      if (logout) await logout();
      navigate('/landing');
      toast.success("Logged out successfully");
    } catch (error) {
      console.error("Logout error:", error);
      if (logout) await logout();
      navigate('/landing');
    }
  };

  // --- ADMIN TOOLS ---
  const handleSetPromotion = async () => {
    if (!selectedPromoId) return;
    setEnriching(true);
    try {
        await supabase.from('locations').update({ is_promoted: false }).neq('id', 0);
        await supabase.from('locations').update({ is_promoted: true }).eq('id', selectedPromoId);
        toast.success("Promotion Updated!");
        loadVenues(); 
    } catch (e) { toast.error("Failed to set promotion"); } finally { setEnriching(false); }
  }

  const runGlobalCheckout = async () => {
      if (!confirm("⚠️ ADMIN: Force checkout for EVERYONE? The map will be empty.")) return;
      setEnriching(true);
      try {
          await supabase.from('checkins').update({ is_active: false }).neq('id', 0);
          toast.success("Dancefloor cleared! All users checked out.");
      } catch (e) { toast.error("Failed to clear checkins"); } finally { setEnriching(false); }
  }

  const runResetMyGame = async () => {
      if (!confirm("Reset your Pings? You can meet people again.")) return;
      setEnriching(true);
      try {
          await supabase.from('pings').delete().or(`from_user_id.eq.${user.id},to_user_id.eq.${user.id}`);
          toast.success("History wiped. You are new again.");
      } catch (e) { toast.error("Failed to reset"); } finally { setEnriching(false); }
  }

  const runEnrichment = async () => { 
      if (!confirm("Admin: Fetch Data?")) return;
      setEnriching(true);
      toast.success("Enrichment mock run"); 
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
                <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-slate-400"><ArrowLeft className="w-6 h-6" /></Button>
                <h1 className="text-2xl font-bold">Edit Profile</h1>
            </div>
            <Button variant="ghost" size="sm" onClick={handleLogout} className="text-red-500 hover:text-red-400 hover:bg-red-900/20">
                <LogOut className="w-4 h-4" />
            </Button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
            
            {/* PHOTOS SECTION */}
            <div className="space-y-3">
                <div className="flex justify-between items-center">
                    <Label>Your Photos</Label>
                    {/* Visual Security Status */}
                    {modelLoading ? (
                        <span className="text-[10px] text-amber-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Security Loading...</span>
                    ) : (
                        <span className="text-[10px] text-green-500 flex items-center gap-1"><ShieldAlert className="w-3 h-3"/> Active</span>
                    )}
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                    <label className={`aspect-square rounded-xl bg-slate-800 border-2 border-dashed border-slate-600 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-700/50 hover:border-amber-500 transition-colors ${scanning || modelLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                        {scanning ? (
                            <div className="flex flex-col items-center gap-1 text-amber-500">
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <span className="text-[9px] font-bold uppercase tracking-wider">Scanning...</span>
                            </div>
                        ) : (
                            uploading ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : <Plus className="w-8 h-8 text-slate-400" />
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading || modelLoading} />
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

            {/* BASIC INFO */}
            <div className="space-y-2"><Label>Display Name</Label><Input required value={formData.full_name} onChange={e => setFormData({...formData, full_name: e.target.value})} className="bg-slate-900 border-slate-800" /></div>
            <div className="space-y-2"><Label>Handle (@)</Label><Input required value={formData.handle} onChange={e => setFormData({...formData, handle: e.target.value})} className="bg-slate-900 border-slate-800" /></div>
            
            {/* STRICT BINARY GENDERS & INTERESTS */}
            <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                    <Label>I am a...</Label>
                    <Select value={formData.gender} onValueChange={val => setFormData({...formData, gender: val})}>
                        <SelectTrigger className="bg-slate-900 border-slate-800"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                            <SelectItem value="Male">Male</SelectItem>
                            <SelectItem value="Female">Female</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Interested In...</Label>
                    <Select value={formData.interested_in} onValueChange={val => setFormData({...formData, interested_in: val})}>
                        <SelectTrigger className="bg-slate-900 border-slate-800"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                            <SelectItem value="Male">Men</SelectItem>
                            <SelectItem value="Female">Women</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            {/* DEMOGRAPHICS */}
            <div className="grid grid-cols-1 gap-4">
                <div className="space-y-2">
                    <Label>Birthday</Label>
                    <Input 
                        type="date" 
                        required
                        value={formData.birth_date} 
                        onChange={e => setFormData({...formData, birth_date: e.target.value})}
                        className="bg-slate-900 border-slate-800 w-full p-3" 
                    />
                </div>
                <div className="space-y-2">
                    <Label>Status</Label>
                    <Select value={formData.relationship_status} onValueChange={val => setFormData({...formData, relationship_status: val})}>
                        <SelectTrigger className="bg-slate-900 border-slate-800 w-full p-3 h-auto"><SelectValue placeholder="Select Status" /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                            <SelectItem value="Single">Single</SelectItem>
                            <SelectItem value="Taken">Taken</SelectItem>
                            <SelectItem value="Complicated">It's Complicated</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
            </div>

            <div className="space-y-2"><Label>Bio</Label><Textarea value={formData.bio} onChange={e => setFormData({...formData, bio: e.target.value})} className="bg-slate-900 border-slate-800" /></div>
            <Button type="submit" disabled={saving} className="w-full bg-amber-500 text-black font-bold hover:bg-amber-400">{saving ? <Loader2 className="animate-spin" /> : "Save Changes"}</Button>
        </form>
        
        {/* ADMIN ZONE */}
        {formData.is_admin && (
            <div className="mt-12 pt-8 border-t border-slate-800/50 space-y-6">
                <div className="flex items-center justify-center gap-2 mb-4">
                    <ShieldAlert className="w-4 h-4 text-red-500" />
                    <h3 className="text-[10px] font-bold text-red-500 uppercase tracking-widest text-center">Super Admin Zone</h3>
                </div>
                
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