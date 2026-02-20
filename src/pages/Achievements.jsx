import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { Trophy, Medal, Star, ArrowLeft, Lock, HelpCircle, Zap, Handshake, Moon, Crown, Flame } from 'lucide-react';

// Map database string to actual Lucide component
const IconMap = {
  'zap': Zap,
  'handshake': Handshake,
  'moon': Moon,
};

export default function Achievements() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myAchievements, setMyAchievements] = useState(new Set());
  const [allAchievements, setAllAchievements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        setLoading(true);

        // 1. My Profile & XP
        const { data: me } = await supabase.from('profiles').select('*').eq('id', user.id).single();
        setProfile(me);

        // 2. Leaderboard (Top 10 by XP)
        const { data: leaders } = await supabase
          .from('profiles')
          .select('id, display_name, avatar_url, xp, handle')
          .order('xp', { ascending: false })
          .limit(10);
        setLeaderboard(leaders || []);

        // 3. All Achievements (Definitions)
        const { data: all } = await supabase.from('achievements').select('*');
        setAllAchievements(all || []);

        // 4. My Unlocked Achievements
        const { data: mine } = await supabase
          .from('user_achievements')
          .select('achievement_id')
          .eq('user_id', user.id);
        
        const myIds = new Set(mine?.map(m => m.achievement_id));
        setMyAchievements(myIds);

      } catch (error) {
        console.error("Error loading achievements:", error);
      } finally {
        setLoading(false);
      }
    };
    
    if (user) fetchData();
  }, [user]);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center"><Flame className="w-8 h-8 text-amber-500 animate-bounce" /></div>;

  // Leveling Math (e.g., Level 1 = 0-99 XP, Level 2 = 100-199 XP)
  const currentXP = profile?.xp || 0;
  const currentLevel = Math.floor(currentXP / 100) + 1;
  const xpForNextLevel = currentLevel * 100;
  const xpProgress = currentXP % 100;
  const progressPercentage = (xpProgress / 100) * 100;

  return (
    <div className="min-h-screen bg-slate-950 pb-20 text-white relative">
      {/* Background glow */}
      <div className="absolute top-[-10%] left-[-10%] w-[300px] h-[300px] bg-amber-600/10 rounded-full blur-[100px] pointer-events-none" />

      {/* Header */}
      <div className="sticky top-0 z-20 bg-slate-950/80 backdrop-blur-md border-b border-slate-800 p-4 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="p-2 bg-slate-900 border border-slate-800 rounded-full hover:bg-slate-800 transition active:scale-95">
          <ArrowLeft className="w-5 h-5 text-slate-300" />
        </button>
        <h1 className="text-lg font-black tracking-wide">Rankings & Badges</h1>
      </div>

      {/* Level & XP Card */}
      <div className="p-1 m-4 rounded-3xl bg-gradient-to-b from-amber-500 to-amber-900 shadow-xl shadow-amber-900/20 relative">
        <div className="bg-slate-950 rounded-[22px] p-6 text-center relative overflow-hidden">
            <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/10 rounded-full blur-2xl -translate-y-1/2 translate-x-1/2"></div>
            
            <p className="text-amber-500 font-black tracking-widest text-xs uppercase mb-1">Level {currentLevel}</p>
            <h2 className="text-5xl font-black text-white drop-shadow-md flex items-center justify-center gap-3">
               {currentXP} <span className="text-2xl text-slate-500 font-bold mt-2">XP</span>
            </h2>
            
            {/* Progress Bar */}
            <div className="mt-6 space-y-2">
                <div className="flex justify-between text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    <span>{xpProgress} XP</span>
                    <span>{xpForNextLevel} XP</span>
                </div>
                <div className="w-full h-3 bg-slate-900 rounded-full overflow-hidden border border-slate-800">
                    <div 
                        className="h-full bg-gradient-to-r from-amber-400 to-amber-600 rounded-full transition-all duration-1000 ease-out" 
                        style={{ width: `${progressPercentage}%` }}
                    />
                </div>
                <p className="text-[10px] text-slate-500 mt-1">{100 - xpProgress} XP until Level {currentLevel + 1}</p>
            </div>
        </div>
      </div>

      {/* Badges Grid */}
      <div className="px-4 mb-10 mt-8 relative z-10">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Medal className="w-4 h-4 text-amber-500" /> Unlockable Badges
        </h3>
        <div className="grid grid-cols-3 gap-3">
            {allAchievements.map(badge => {
                const isUnlocked = myAchievements.has(badge.id);
                const IconComponent = IconMap[badge.icon] || Trophy; 

                return (
                    <div key={badge.id} className={`aspect-square rounded-2xl p-3 flex flex-col items-center justify-center text-center border transition-all ${isUnlocked ? 'bg-amber-500/10 border-amber-500/50 shadow-[0_0_15px_rgba(245,158,11,0.15)]' : 'bg-slate-900/50 border-slate-800/80 grayscale opacity-60'}`}>
                        <div className={`mb-2 p-2 rounded-full ${isUnlocked ? 'bg-amber-500/20' : 'bg-slate-800'}`}>
                            {isUnlocked ? <IconComponent className="w-6 h-6 text-amber-500" /> : <Lock className="w-6 h-6 text-slate-600" />}
                        </div>
                        <span className={`text-[10px] font-bold leading-tight ${isUnlocked ? 'text-amber-100' : 'text-slate-500'}`}>{badge.name}</span>
                        <span className="text-[9px] font-black text-amber-600 mt-1">+{badge.xp_reward} XP</span>
                    </div>
                );
            })}
        </div>
      </div>

      {/* Global Leaderboard */}
      <div className="px-4 relative z-10">
        <h3 className="text-xs font-black text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <Star className="w-4 h-4 text-amber-500" /> Top Tappers (Global)
        </h3>
        <div className="space-y-3">
            {leaderboard.map((player, index) => {
                const isMe = player.id === user.id;
                const isFirst = index === 0;

                return (
                    <div key={player.id} className={`flex items-center gap-4 p-3 rounded-2xl border transition-all ${isMe ? 'bg-slate-800 border-amber-500/50 shadow-lg' : 'bg-slate-900/40 border-slate-800/60'}`}>
                        <div className={`font-black w-6 text-center ${isFirst ? 'text-yellow-400 text-lg' : 'text-slate-600 text-sm'}`}>
                            {isFirst ? <Crown className="w-5 h-5 mx-auto fill-yellow-400" /> : index + 1}
                        </div>
                        <div className={`w-12 h-12 rounded-full overflow-hidden border-2 ${isMe ? 'border-amber-500' : isFirst ? 'border-yellow-400' : 'border-slate-700'}`}>
                            <img src={player.avatar_url || `https://api.dicebear.com/7.x/initials/svg?seed=${player.handle}`} className="w-full h-full object-cover" />
                        </div>
                        <div className="flex-1 min-w-0">
                            <h4 className="font-bold text-sm text-white truncate flex items-center gap-2">
                                {player.display_name} {isMe && <span className="text-[9px] bg-amber-500 text-black px-1.5 py-0.5 rounded uppercase tracking-wider">You</span>}
                            </h4>
                            <p className="text-xs text-slate-500 truncate">@{player.handle}</p>
                        </div>
                        <div className="font-black text-amber-500 text-sm whitespace-nowrap bg-amber-500/10 px-3 py-1 rounded-full border border-amber-500/20">
                            {player.xp || 0} XP
                        </div>
                    </div>
                )
            })}
        </div>
      </div>

      {/* How it Works Footer */}
      <div className="m-4 mt-8 p-6 bg-slate-900 rounded-2xl border border-slate-800 relative z-10">
         <h3 className="text-white font-bold flex items-center gap-2 mb-3">
            <HelpCircle className="w-5 h-5 text-amber-500" /> How to earn XP
         </h3>
         <div className="space-y-4">
             <div className="flex gap-3 items-start">
                 <div className="bg-slate-800 p-2 rounded-lg text-slate-400"><Zap className="w-4 h-4" /></div>
                 <div><p className="text-sm font-bold text-slate-200">Send Taps</p><p className="text-xs text-slate-500">Initiate a connection at a live venue.</p></div>
             </div>
             <div className="flex gap-3 items-start">
                 <div className="bg-slate-800 p-2 rounded-lg text-slate-400"><Handshake className="w-4 h-4" /></div>
                 <div><p className="text-sm font-bold text-slate-200">Meet in Real Life</p><p className="text-xs text-slate-500">Confirm you met face-to-face for massive XP.</p></div>
             </div>
         </div>
      </div>
    </div>
  );
}