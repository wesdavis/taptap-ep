import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { Camera, User, Loader2 } from 'lucide-react';

export default function ProfileSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
  // Form State
  const [username, setUsername] = useState('');
  const [bio, setBio] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');

  // Load existing data if it exists
  useEffect(() => {
    const loadProfile = async () => {
      if (!user) return;
      
      const { data, error } = await supabase
        .from('profiles')
        .select('username, bio, avatar_url')
        .eq('id', user.id)
        .single();

      if (data && !error) {
        setUsername(data.username || '');
        setBio(data.bio || '');
        setAvatarUrl(data.avatar_url || '');
      }
    };
    loadProfile();
  }, [user]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);

      // 1. Update Supabase
      const { error } = await supabase
        .from('profiles')
        .upsert({
          id: user.id,
          username: username,
          bio: bio,
          avatar_url: avatarUrl,
          updated_at: new Date().toISOString(),
        });

      if (error) throw error;

      // 2. Redirect to Home (This fixes the 404!)
      navigate('/'); 

    } catch (error) {
      console.error('Error updating profile:', error.message);
      alert('Error saving profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Edit Profile</h1>
          <p className="text-slate-400 text-sm">Update how others see you</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar Placeholder (We can add real upload later) */}
          <div className="flex justify-center">
            <div className="relative group cursor-pointer">
              <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-amber-500 flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-slate-500" />
                )}
              </div>
              <div className="absolute inset-0 bg-black/50 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity">
                <Camera className="w-6 h-6 text-white" />
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Username</label>
            <input
              type="text"
              required
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              placeholder="@username"
            />
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-slate-300">Bio</label>
            <textarea
              value={bio}
              onChange={(e) => setBio(e.target.value)}
              rows={3}
              className="w-full bg-slate-950 border border-slate-800 rounded-lg p-3 text-white focus:ring-2 focus:ring-amber-500 focus:outline-none"
              placeholder="Tell us about yourself..."
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber-500 hover:bg-amber-400 text-black font-bold py-3 rounded-xl transition flex items-center justify-center gap-2"
          >
            {loading ? <Loader2 className="animate-spin w-5 h-5" /> : 'Save Changes'}
          </button>
        </form>
      </div>
    </div>
  );
}