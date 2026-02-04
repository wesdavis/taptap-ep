import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../lib/AuthContext';
import { Trophy, Medal, Star, ArrowLeft, Lock, HelpCircle } from 'lucide-react';

export default function Achievements() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [profile, setProfile] = useState(null);
  const [leaderboard, setLeaderboard] = useState([]);
  const [myAchievements, setMyAchievements] = useState([]);
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
    fetchData();
  }, [user]);

  if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-500">Loading...</div>;

  return (
    <div className="min-h-screen bg-slate-950 pb-20 text-white">
      {/* Header */}
      <div className="sticky top-0 z-10 bg-slate-900/95 backdrop-blur-sm border-b border-slate-800 p-4 flex items-center gap-3">
        <button onClick={() => navigate('/')} className="p-2 bg-slate-800 rounded-full hover:bg-slate-700">
          <ArrowLeft className="w-5 h-5" />
        </button>
        <h1 className="text-lg font-bold">Most Popular</h1>
      </div>

      {/* My Stats Card */}
      <div className="p-6 bg-gradient-to-br from-amber-600 to-amber-800 m-4 rounded-2xl shadow-xl text-center relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/cubes.png')] opacity-20"></div>
        <div className="relative z-10">
            <div className="w-20 h-20 mx-auto bg-black/20 rounded-full flex items-center justify-center mb-3 border-4 border-amber-300/30">
               <Trophy className="w-10 h-10 text-amber-100" />
            </div>
            <h2 className="text-3xl font-black text-white">{profile?.xp || 0} XP</h2>
            <p className="text-amber-200 text-sm font-medium uppercase tracking-widest">Current Score</p>
        </div>
      </div>

      {/* Achievements Grid */}
      <div className="px-4 mb-8">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Medal className="w-4 h-4" /> Badges
        </h3>
        <div className="grid grid-cols-3 gap-3">
            {allAchievements.map(badge => {
                const isUnlocked = myAchievements.has(badge.id);
                return (
                    <div key={badge.id} className={`aspect-square rounded-xl p-2 flex flex-col items-center justify-center text-center border ${isUnlocked ? 'bg-slate-900 border-amber-500/50' : 'bg-slate-900/50 border-slate-800 opacity-50'}`}>
                        <div className="text-2xl mb-1">
                            {isUnlocked ? badge.icon : <Lock className="w-6 h-6 text-slate-600 mx-auto" />}
                        </div>
                        <span className="text-[10px] font-bold leading-tight">{badge.name}</span>
                        {isUnlocked && <span className="text-[9px] text-amber-500">+{badge.xp_reward} XP</span>}
                    </div>
                );
            })}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="px-4">
        <h3 className="text-xs font-bold text-slate-500 uppercase tracking-wider mb-4 flex items-center gap-2">
            <Star className="w-4 h-4" /> Top Tappers
        </h3>
        <div className="space-y-3">
            {leaderboard.map((player, index) => (
                <div key={player.id} className="flex items-center gap-4 bg-slate-900/50 p-3 rounded-xl border border-slate-800">
                    <div className="font-black text-slate-600 w-4 text-center">{index + 1}</div>
                    <div className="w-10 h-10 rounded-full bg-slate-800 overflow-hidden">
                        <img src={player.avatar_url} className="w-full h-full object-cover" />
                    </div>
                    <div className="flex-1">
                        <h4 className="font-bold text-sm text-white">{player.display_name}</h4>
                        <p className="text-xs text-slate-500">@{player.handle}</p>
                    </div>
                    <div className="font-bold text-amber-500 text-sm">{player.xp} XP</div>
                </div>
            ))}
        </div>
      </div>

      {/* How it Works */}
      <div className="p-6 mt-8 bg-slate-900 border-t border-slate-800">
         <h3 className="text-white font-bold flex items-center gap-2 mb-2">
            <HelpCircle className="w-4 h-4 text-amber-500" /> TAP TAP How It Works
         </h3>
         <ul className="text-slate-400 text-sm space-y-2 list-disc pl-4">
            <li><strong>Tap someone</strong> at a location to start a mission.</li>
            <li>If they accept, <strong>find them</strong> in real life.</li>
            <li>Confirm the meeting in the app to earn <strong>XP</strong>.</li>
            <li>Unlock badges by meeting new people!</li>
         </ul>
      </div>
    </div>
  );
}