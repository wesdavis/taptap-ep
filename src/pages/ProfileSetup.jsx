import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { Camera, User, Loader2, AtSign, Calendar, ArrowLeft, LogOut } from 'lucide-react';

export default function ProfileSetup() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false); // New state for image upload
  
  // Form State
  const [displayName, setDisplayName] = useState('');
  const [handle, setHandle] = useState('');
  const [birthdate, setBirthdate] = useState('');
  const [bio, setBio] = useState('');
  const [gender, setGender] = useState('');      
  const [lookingFor, setLookingFor] = useState(''); 
  const [avatarUrl, setAvatarUrl] = useState('');

  // Load existing data
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .single();

      if (data && !error) {
        setDisplayName(data.display_name || '');
        setHandle(data.handle || '');
        setBirthdate(data.birthdate || '');
        setBio(data.bio || '');
        setGender(data.gender || '');          
        setLookingFor(data.looking_for || ''); 
        setAvatarUrl(data.avatar_url || '');
      }
    };
    loadProfile();
  }, [user]);

  // Handle Avatar Upload
  const handleImageUpload = async (event) => {
    try {
      setUploading(true);

      if (!event.target.files || event.target.files.length === 0) {
        throw new Error('You must select an image to upload.');
      }

      const file = event.target.files[0];
      const fileExt = file.name.split('.').pop();
      const fileName = `${user.id}-${Math.random()}.${fileExt}`;
      const filePath = `${fileName}`;

      // 1. Upload to Supabase Storage ('avatars' bucket)
      const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file);

      if (uploadError) {
        throw uploadError;
      }

      // 2. Get Public URL
      const { data } = supabase.storage.from('avatars').getPublicUrl(filePath);
      
      // 3. Set State (This will be saved to DB on form submit)
      setAvatarUrl(data.publicUrl);

    } catch (error) {
      alert('Error uploading avatar: ' + error.message);
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);

      const cleanHandle = handle.replace('@', '').toLowerCase().replace(/\s/g, '');

      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          display_name: displayName,
          handle: cleanHandle,
          birthdate: birthdate,
          bio: bio,
          gender: gender,             
          looking_for: lookingFor,    
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;
      navigate('/'); 

    } catch (error) {
      console.error('Error updating profile:', error.message);
      alert('Error saving profile. ' + error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout(); 
    navigate('/auth');
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center p-4">
      
      {/* HEADER WITH NAVIGATION */}
      <div className="w-full max-w-md flex justify-between items-center mb-6 mt-2">
        <button onClick={() => navigate('/')} className="p-2 bg-slate-900 rounded-full text-white hover:bg-slate-800 transition">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <span className="text-white font-bold text-lg">Edit Profile</span>
        <button onClick={handleLogout} className="p-2 bg-red-500/10 text-red-500 rounded-full hover:bg-red-500/20 transition">
          <LogOut className="w-5 h-5" />
        </button>
      </div>

      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl mb-10">
        <div className="text-center mb-6">
          <h1 className="text-2xl font-bold text-white">Your Name Tag</h1>
          <p className="text-slate-400 text-sm">This is how people see you.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          
          {/* Avatar Upload */}
          <div className="flex justify-center">
            <div className="relative group cursor-pointer">
              <label htmlFor="avatar-upload" className="cursor-pointer block relative">
                <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-amber-500 flex items-center justify-center overflow-hidden">
                  {avatarUrl ? (
                    <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                  ) : (
                    <User className="w-10 h-10 text-slate-500" />
                  )}
                  
                  {/* Upload Spinner Overlay */}
                  {uploading && (
                    <div className="absolute inset-0 bg-black/60 flex items-center justify-center z-20">
                      <Loader2 className="w-8 h-8 text-amber-500 animate-spin" />
                    </div>
                  )}
                </div>

                {/* Hover Camera Icon */}
                <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity z-10">
                  <Camera className="w-6 h-6 text-white" />
                </div>
              </label>
              
              {/* Hidden File Input */}
              <input 
                type="file" 
                id="avatar-upload"
                accept="image/*"
                onChange={handleImageUpload}
                disabled={uploading}
                className="hidden"
              />
            </div>
          </div>

          {/* Identity Section */}
          <div className="space-y-4 bg-slate-800/50 p-4 rounded-xl border border-slate-700">
            <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">Identity</h3>
            
            {/* Display Name */}
            <div>
              <label className="text-xs text-slate-300 mb-1 block">Display Name</label>
              <input
                type="text"
                required
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 text-white focus:border-amber-500 focus:outline-none"
                placeholder="e.g. Wes Davis" 
              />
            </div>

            {/* Handle */}
            <div>
              <label className="text-xs text-slate-300 mb-1 block">Handle</label>
              <div className="relative">
                <AtSign className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  required
                  value={handle}
                  onChange={(e) => setHandle(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 pl-10 text-amber-500 font-medium focus:border-amber-500 focus:outline-none"
                  placeholder="wesdavis" 
                />
              </div>
            </div>

             {/* Birthday */}
             <div>
              <label className="text-xs text-slate-300 mb-1 block">Birthday</label>
              <div className="relative">
                <Calendar className="absolute left-3 top-3.5 w-4 h-4 text-slate-500" />
                <input
                  type="date"
                  required
                  value={birthdate}
                  onChange={(e) => setBirthdate(e.target.value)}
                  className="w-full bg-slate-950 border border-slate-700 rounded-lg p-3 pl-10 text-white focus:border-amber-500 focus:outline-none [color-scheme:dark]"
                />
              </div>
            </div>
          </div>

          {/* The Basics */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">I am...</label>
              <select
                value={gender}
                onChange={(e) => setGender(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-amber-500 focus:outline-none appearance-none"
              >
                <option value="">Select</option>
                <option value="Male">Male</option>
                <option value="Female">Female</option>
                <option value="Non-binary">Non-binary</option>
              </select>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Seeking...</label>
              <select
                value={lookingFor}
                onChange={(e) => setLookingFor(e.target.value)}
                className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-amber-500 focus:outline-none appearance-none"
              >
                <option value="">Select</option>
                <option value="Men">Men</option>
                <option value="Women">Women</option>
                <option value="Everyone">Everyone</option>
              </select>
            </div>
          </div>

          {/* Bio (Short) */}
          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Quick Intro</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={2}
              maxLength={100} // Keep it short!
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:border-amber-500 focus:outline-none"
              placeholder="e.g. New in town, love craft beer."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Save Name Tag'}
          </button>
        </form>
      </div>
    </div>
  );
}