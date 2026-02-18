import { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/lib/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, ArrowLeft, LogOut, X, Plus, ShieldAlert, UserCheck } from 'lucide-react';
import { toast } from 'sonner';

import * as nsfwjs from 'nsfwjs';
import * as cocoSsd from '@tensorflow-models/coco-ssd';

export default function ProfileSetup() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [scanning, setScanning] = useState(false); 

  // AI SECURITY STATE
  const [nsfwModel, setNsfwModel] = useState(null);
  const [objectModel, setObjectModel] = useState(null);
  const [modelsLoading, setModelsLoading] = useState(true);

  const [enriching, setEnriching] = useState(false);
  const [venues, setVenues] = useState([]); 
  const [selectedPromoId, setSelectedPromoId] = useState("");

  const [formData, setFormData] = useState({
    full_name: '',
    handle: '',
    gender: '',
    birthdate: '',
    relationship_status: '',
    bio: '',
    avatar_url: '',
    photos: [],
    interested_in: '', 
    is_admin: false 
  });

  useEffect(() => {
    async function init() {
        // 1. Load BOTH AI Models (Fail Closed Logic)
        try {
            console.log("🛡️ Initializing Safety Systems...");
            
            // Load them in parallel for speed
            const [_nsfw, _coco] = await Promise.all([
                nsfwjs.load(),
                cocoSsd.load()
            ]);

            setNsfwModel(_nsfw);
            setObjectModel(_coco);
            setModelsLoading(false); 
            console.log("✅ All Systems Ready: NSFW + Human Detection active.");
        } catch (err) {
            console.error("Failed to load safety models", err);
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
            // 🟢 FORCE LOWERCASE to match Auth.jsx values
            gender: (data.gender || '').toLowerCase(),
            birthdate: data.birthdate || '', 
            relationship_status: data.relationship_status || '', 
            bio: data.bio || '',
            avatar_url: data.avatar_url || '',
            photos: data.photos || [],
            // 🟢 FORCE LOWERCASE
            interested_in: (data.interested_in || '').toLowerCase(),
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

  // 🟢 DOUBLE CHECK: Human + Safe
  const checkSafety = async (file) => {
      if (!nsfwModel || !objectModel) {
          toast.error("Security scanner not ready. Please wait.");
          return false;
      }
      
      return new Promise((resolve) => {
          const img = document.createElement('img');
          const objectUrl = URL.createObjectURL(file);
          img.src = objectUrl;
          
          img.onload = async () => {
              try {
                  // --- STEP 1: IS IT A PERSON? ---
                  const objects = await objectModel.detect(img);
                  const person = objects.find(o => o.class === 'person');

                  if (!person) {
                      console.error("🚨 BLOCKED: No human detected.");
                      toast.error("Photo Rejected", { description: "Please upload a photo of yourself (Face or Body)." });
                      resolve(false);
                      return;
                  }

                  // --- STEP 2: IS IT SAFE? ---
                  const predictions = await nsfwModel.classify(img);
                  URL.revokeObjectURL(objectUrl); 

                  // Categories: Neutral, Drawing, Sexy, Porn, Hentai
                  const porn = predictions.find(p => p.className === 'Porn');
                  const hentai = predictions.find(p => p.className === 'Hentai');
                  const sexy = predictions.find(p => p.className === 'Sexy');
                  
                  const pornScore = porn ? porn.probability : 0;
                  const hentaiScore = hentai ? hentai.probability : 0;
                  const sexyScore = sexy ? sexy.probability : 0;
                  
                  // Calculate Total Badness
                  const combinedExplicit = pornScore + hentaiScore;

                  if (combinedExplicit > 0.25) {
                      console.error(`🚨 BLOCKED: Explicit content detected`);
                      toast.error("Photo Rejected", { description: "Explicit content detected." });
                      resolve(false); 
                      return;
                  }

                  if (sexyScore > 0.40 && pornScore > 0.05) {
                      console.error("🚨 BLOCKED: Nudity detected");
                      toast.error("Photo Rejected", { description: "Nudity detected." });
                      resolve(false);
                      return;
                  }

                  // Safe
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

    if (modelsLoading) {
        toast.warning("Security scanner is warming up. One moment...");
        return;
    }

    setScanning(true);
    setUploading(true);

    try {
        const isSafe = await checkSafety(file);
        if (!isSafe) {
            e.target.value = null; 
            setScanning(false);
            setUploading(false);
            return; 
        }

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

        const safeBirthDate = formData.birthdate ? formData.birthdate : null;
        const safeRelationship = formData.relationship_status ? formData.relationship_status : null;
        const safeInterest = formData.interested_in ? formData.interested_in : null;

        const { error } = await supabase.from('profiles').upsert({
            id: user.id,
            full_name: formData.full_name,
            display_name: formData.full_name, 
            handle: cleanHandle,
            gender: formData.gender, // Now verified lowercase
            birthdate: safeBirthDate, 
            relationship_status: safeRelationship, 
            interested_in: safeInterest, // Now verified lowercase
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
        
        // 🟢 Force Reload to update AuthContext state
        window.location.href = '/'; 

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
                    {modelsLoading ? (
                        <span className="text-[10px] text-amber-500 flex items-center gap-1"><Loader2 className="w-3 h-3 animate-spin"/> Security Loading...</span>
                    ) : (
                        <span className="text-[10px] text-green-500 flex items-center gap-1"><UserCheck className="w-3 h-3"/> Active</span>
                    )}
                </div>
                
                <div className="grid grid-cols-3 gap-3">
                    <label className={`aspect-square rounded-xl bg-slate-800 border-2 border-dashed border-slate-600 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-700/50 hover:border-amber-500 transition-colors ${scanning || modelsLoading ? 'opacity-50 pointer-events-none' : ''}`}>
                        {scanning ? (
                            <div className="flex flex-col items-center gap-1 text-amber-500">
                                <Loader2 className="w-6 h-6 animate-spin" />
                                <span className="text-[9px] font-bold uppercase tracking-wider">Scanning...</span>
                            </div>
                        ) : (
                            uploading ? <Loader2 className="w-6 h-6 animate-spin text-slate-400" /> : <Plus className="w-8 h-8 text-slate-400" />
                        )}
                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading || modelsLoading} />
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
                            {/* 🟢 CHANGED VALUES TO LOWERCASE */}
                            <SelectItem value="male">Male</SelectItem>
                            <SelectItem value="female">Female</SelectItem>
                        </SelectContent>
                    </Select>
                </div>
                <div className="space-y-2">
                    <Label>Interested In...</Label>
                    <Select value={formData.interested_in} onValueChange={val => setFormData({...formData, interested_in: val})}>
                        <SelectTrigger className="bg-slate-900 border-slate-800"><SelectValue placeholder="Select" /></SelectTrigger>
                        <SelectContent className="bg-slate-900 border-slate-800 text-white">
                            {/* 🟢 CHANGED VALUES TO LOWERCASE */}
                            <SelectItem value="male">Men</SelectItem>
                            <SelectItem value="female">Women</SelectItem>
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
                        value={formData.birthdate} 
                        onChange={e => setFormData({...formData, birthdate: e.target.value})}
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
            <div className="mt-8 pt-8 border-t border-slate-800/50">
                <Button 
                    type="button" 
                    onClick={() => navigate('/admin')}
                    className="w-full h-12 bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500 hover:text-white font-bold flex items-center justify-center gap-2 transition-all"
                >
                    <ShieldAlert className="w-5 h-5" />
                    OPEN SHERIFF'S OFFICE
                </Button>
                <p className="text-[10px] text-red-500/40 text-center mt-2 font-mono uppercase tracking-widest">
                    Authorized Personnel Only
                </p>
            </div>
        )}
      </div>
    </div>
  );
}