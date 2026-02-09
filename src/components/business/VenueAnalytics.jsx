import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart, ArrowUp, Users, Clock } from 'lucide-react';

export default function VenueAnalytics({ locationId }) {
    const [stats, setStats] = useState({
        total: 0,
        male: 0,
        female: 0,
        today: 0,
        activeNow: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        if (!locationId) return;

        async function fetchStats() {
            // 1. Get History (All time checkins)
            const { data: checkins } = await supabase
                .from('checkins')
                .select(`created_at, is_active, profiles ( gender )`)
                .eq('location_id', locationId);

            if (checkins) {
                let male = 0;
                let female = 0;
                let todayCount = 0;
                let active = 0;
                const todayStr = new Date().toDateString();

                checkins.forEach(c => {
                    // Demographics
                    const g = c.profiles?.gender;
                    if (g === 'Male') male++;
                    if (g === 'Female') female++;

                    // Timing
                    if (new Date(c.created_at).toDateString() === todayStr) todayCount++;
                    if (c.is_active) active++;
                });

                setStats({
                    total: checkins.length,
                    male,
                    female,
                    today: todayCount,
                    activeNow: active
                });
            }
            setLoading(false);
        }
        fetchStats();
    }, [locationId]);

    if (loading) return <div className="animate-pulse h-32 bg-slate-900 rounded-xl"></div>;

    const malePct = stats.total > 0 ? Math.round((stats.male / stats.total) * 100) : 0;
    const femalePct = stats.total > 0 ? Math.round((stats.female / stats.total) * 100) : 0;

    return (
        <div className="space-y-4">
            {/* LIVE PULSE */}
            <div className="bg-gradient-to-r from-emerald-900/50 to-slate-900 border border-emerald-500/30 p-4 rounded-xl flex items-center justify-between">
                <div className="flex items-center gap-3">
                    <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse" />
                    <div>
                        <div className="text-xs font-bold text-emerald-400 uppercase tracking-wider">Live Now</div>
                        <div className="text-white font-medium text-sm">{stats.activeNow} Customers Active</div>
                    </div>
                </div>
                <Users className="text-emerald-500 w-5 h-5" />
            </div>

            {/* BIG STATS */}
            <div className="grid grid-cols-2 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                    <div className="text-slate-500 text-xs uppercase font-bold mb-1">Visits Today</div>
                    <div className="text-3xl font-black text-white">{stats.today}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                    <div className="text-slate-500 text-xs uppercase font-bold mb-1">Total History</div>
                    <div className="text-3xl font-black text-white">{stats.total}</div>
                </div>
            </div>

            {/* GENDER SPLIT */}
            <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl">
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase mb-2">
                    <span>Male ({malePct}%)</span>
                    <span>Female ({femalePct}%)</span>
                </div>
                <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden flex">
                    <div style={{ width: `${malePct}%` }} className="h-full bg-blue-500" />
                    <div style={{ width: `${femalePct}%` }} className="h-full bg-pink-500" />
                </div>
            </div>
        </div>
    );
}