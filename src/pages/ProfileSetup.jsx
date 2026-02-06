import { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../lib/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Loader2, Camera, ArrowLeft, Zap, Image as ImageIcon, LogOut, MapPin, X, Plus } from 'lucide-react';
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
  const [statusMsg, setStatusMsg] = useState("");
  const [progress, setProgress] = useState(0);
  
  const [formData, setFormData] = useState({
    full_name: '',
    handle: '',
    gender: '',
    bio: '',
    avatar_url: '',
    photos: [] // 🟢 New Photos Array
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
            avatar_url: data.avatar_url || '',
            photos: data.photos || [] 
        });
      }
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  }

  // 🟢 NEW: HANDLE PHOTO UPLOAD
  async function handlePhotoUpload(e) {
    const file = e.target.files[0];
    if (!file) return;

    setUploading(true);
    try {
        const fileExt = file.name.split('.').pop();
        const fileName = `${user.id}/${Date.now()}.${fileExt}`;
        const filePath = `${fileName}`;

        // Upload to 'profile_photos' bucket
        const { error: uploadError } = await supabase.storage
            .from('profile_photos')
            .upload(filePath, file);

        if (uploadError) throw uploadError;

        // Get Public URL
        const { data: { publicUrl } } = supabase.storage
            .from('profile_photos')
            .getPublicUrl(filePath);

        // Add to state
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

  // 🟢 NEW: REMOVE PHOTO
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
        
        let finalAvatar = formData.avatar_url;
        // If they have photos but no avatar, use the first photo
        if (!finalAvatar && formData.photos.length > 0) {
            finalAvatar = formData.photos[0];
        }
        // If still no avatar, use generic
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
            photos: formData.photos, // Save the array
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

  // ADMIN TOOLS (Kept for your use)
  const runEnrichment = async () => { /* ... Keep your existing Admin code here ... */ };
  const runPhotoFetch = async () => { /* ... Keep your existing Admin code here ... */ };

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
            
            {/* 🟢 NEW: PHOTO GALLERY UPLOADER */}
            <div className="space-y-3">
                <Label>Your Photos</Label>
                <div className="grid grid-cols-3 gap-3">
                    {/* Upload Button */}
                    <label className="aspect-square rounded-xl bg-slate-800 border-2 border-dashed border-slate-600 flex flex-col items-center justify-center cursor-pointer hover:bg-slate-700/50 hover:border-amber-500 transition-colors">
                        {uploading ? <Loader2 className="w-6 h-6 animate-spin text-amber-500" /> : <Plus className="w-8 h-8 text-slate-400" />}
                        <span className="text-[10px] uppercase font-bold text-slate-500 mt-1">Add Photo</span>
                        <input type="file" accept="image/*" className="hidden" onChange={handlePhotoUpload} disabled={uploading} />
                    </label>

                    {/* Existing Photos */}
                    {formData.photos.map((url, index) => (
                        <div key={index} className="aspect-square rounded-xl overflow-hidden relative group">
                            <img src={url} className="w-full h-full object-cover" alt="Profile" />
                            <button 
                                type="button"
                                onClick={() => removePhoto(index)}
                                className="absolute top-1 right-1 p-1 bg-black/50 rounded-full text-white opacity-0 group-hover:opacity-100 transition-opacity"
                            >
                                <X className="w-4 h-4" />
                            </button>
                            {index === 0 && <div className="absolute bottom-0 left-0 right-0 bg-black/60 text-[8px] text-center py-0.5 text-white font-bold uppercase">Main</div>}
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

        {/* Admin Controls Area (Can remain as previous) */}
      </div>
    </div>
  );
}