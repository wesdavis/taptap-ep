import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { BarChart, Users, Clock, Calendar } from 'lucide-react';

export default function VenueAnalytics({ locationId }) {
    const [stats, setStats] = useState({
        total: 0,
        male: 0,
        female: 0,
        today: 0
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        async function fetchStats() {
            // 1. Get all checkins for this location
            const { data: checkins } = await supabase
                .from('checkins')
                .select(`
                    created_at,
                    profiles ( gender )
                `)
                .eq('location_id', locationId);

            if (checkins) {
                // 2. Process Data
                let male = 0;
                let female = 0;
                let todayCount = 0;
                const todayStr = new Date().toDateString();

                checkins.forEach(c => {
                    // Count Gender
                    if (c.profiles?.gender === 'Male') male++;
                    if (c.profiles?.gender === 'Female') female++;

                    // Count Today
                    if (new Date(c.created_at).toDateString() === todayStr) todayCount++;
                });

                setStats({
                    total: checkins.length,
                    male,
                    female,
                    today: todayCount
                });
            }
            setLoading(false);
        }
        fetchStats();
    }, [locationId]);

    if (loading) return <div className="text-xs text-slate-500">Loading analytics...</div>;

    // Calculate Percentages
    const malePct = stats.total > 0 ? Math.round((stats.male / stats.total) * 100) : 0;
    const femalePct = stats.total > 0 ? Math.round((stats.female / stats.total) * 100) : 0;

    return (
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-6 mt-8">
            <div className="flex items-center gap-2 mb-6">
                <BarChart className="w-5 h-5 text-amber-500" />
                <h2 className="text-lg font-bold text-white">Owner Analytics</h2>
            </div>

            {/* HEADLINE STATS */}
            <div className="grid grid-cols-2 gap-4 mb-6">
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-center">
                    <div className="text-slate-400 text-xs uppercase font-bold mb-1">Total Traffic</div>
                    <div className="text-2xl font-black text-white">{stats.total}</div>
                </div>
                <div className="bg-slate-950 p-4 rounded-lg border border-slate-800 text-center">
                    <div className="text-green-500 text-xs uppercase font-bold mb-1">Visits Today</div>
                    <div className="text-2xl font-black text-white">{stats.today}</div>
                </div>
            </div>

            {/* DEMOGRAPHICS BAR */}
            <div className="space-y-2">
                <div className="flex justify-between text-xs font-bold text-slate-400 uppercase">
                    <span>Male ({malePct}%)</span>
                    <span>Female ({femalePct}%)</span>
                </div>
                <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden flex">
                    <div style={{ width: `${malePct}%` }} className="h-full bg-blue-500" />
                    <div style={{ width: `${femalePct}%` }} className="h-full bg-pink-500" />
                </div>
                <p className="text-[10px] text-slate-500 text-center pt-1">
                    *Based on verified check-ins
                </p>
            </div>
        </div>
    );
}