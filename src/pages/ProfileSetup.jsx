import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { Camera, User, Loader2, AtSign, Calendar } from 'lucide-react';

export default function ProfileSetup() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!user) return;

    try {
      setLoading(true);

      // Clean the handle (remove @, lowercase, no spaces)
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

  return (
    <div className="min-h-screen bg-slate-950 flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-xl my-10">
        <div className="text-center mb-8">
          <h1 className="text-2xl font-bold text-white">Create Your Name Tag</h1>
          <p className="text-slate-400 text-sm">Minimal info to help you connect.</p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Avatar (Placeholder) */}
          <div className="flex justify-center">
            <div className="relative group cursor-pointer">
              <div className="w-24 h-24 rounded-full bg-slate-800 border-2 border-amber-500 flex items-center justify-center overflow-hidden">
                {avatarUrl ? (
                  <img src={avatarUrl} alt="Avatar" className="w-full h-full object-cover" />
                ) : (
                  <User className="w-10 h-10 text-slate-500" />
                )}
              </div>
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