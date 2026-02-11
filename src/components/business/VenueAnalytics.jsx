import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  BarChart, Bar, XAxis, YAxis, Tooltip as RechartsTooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Legend, CartesianGrid 
} from 'recharts';
import { Users, TrendingUp, Heart, Activity, Calendar, Clock, ArrowLeftRight, Repeat } from 'lucide-react';
import { motion } from 'framer-motion'; // 🟢 NEW: Animations

const COLORS = ['#f59e0b', '#3b82f6', '#ec4899', '#10b981']; 

export default function VenueAnalytics({ locationId }) {
    const [loading, setLoading] = useState(true);
    const [view, setView] = useState('today'); 
    
    // KPI State
    const [stats, setStats] = useState({ 
        liveCount: 0, 
        todayTotal: 0,
        weekTotal: 0,
        busiestDay: 'N/A',
        peakHour: 'N/A',
        malePct: 0,
        femalePct: 0,
        newCustomers: 0,      // 🟢 NEW
        returningCustomers: 0 // 🟢 NEW
    });
    
    const [chartData, setChartData] = useState([]); 
    const [demographics, setDemographics] = useState({ age: [], status: [], loyalty: [] }); // 🟢 ADDED LOYALTY

    useEffect(() => {
        fetchData();
        const sub = supabase.channel('analytics-realtime')
            .on('postgres_changes', { event: '*', schema: 'public', table: 'checkins', filter: `location_id=eq.${locationId}` }, 
            () => fetchData())
            .subscribe();
        return () => supabase.removeChannel(sub);
    }, [locationId, view]);

    const fetchData = async () => {
        if (!locationId) return;
        
        // 1. Fetch THIS WEEK'S Checkins
        const sinceDate = new Date();
        sinceDate.setDate(sinceDate.getDate() - 7);

        const { data: recentCheckins } = await supabase
            .from('checkins')
            .select(`*, profiles(birth_date, relationship_status, gender)`)
            .eq('location_id', locationId)
            .gte('created_at', sinceDate.toISOString());

        // 2. 🟢 FETCH HISTORICAL DATA (To check for returning customers)
        // We need to know if these users have EVER been here before
        const userIds = recentCheckins?.map(c => c.user_id) || [];
        const uniqueUserIds = [...new Set(userIds)];
        
        let loyaltyMap = {}; // { userId: true/false } (true = returning)

        if (uniqueUserIds.length > 0) {
            // Ask DB: "Find checkins for these users at this location BEFORE 7 days ago"
            const { data: history } = await supabase
                .from('checkins')
                .select('user_id')
                .eq('location_id', locationId)
                .in('user_id', uniqueUserIds)
                .lt('created_at', sinceDate.toISOString()); // Older than this week

            const returningSet = new Set(history?.map(h => h.user_id));
            uniqueUserIds.forEach(id => {
                loyaltyMap[id] = returningSet.has(id);
            });
        }

        if (recentCheckins) processData(recentCheckins, loyaltyMap);
        setLoading(false);
    };

    const processData = (data, loyaltyMap) => {
        const now = new Date();
        const todayStr = now.toDateString();
        
        // KPI CALCULATIONS
        const live = data.filter(c => c.is_active).length;
        const today = data.filter(c => new Date(c.created_at).toDateString() === todayStr).length;
        const weekTotal = data.length;

        // Gender
        let m = 0, f = 0;
        data.forEach(c => {
            if (c.profiles?.gender === 'Male') m++;
            if (c.profiles?.gender === 'Female') f++;
        });
        const totalGen = m + f;

        // 🟢 LOYALTY CALCULATION
        let newCust = 0;
        let retCust = 0;
        data.forEach(c => {
            // If we found them in history, they are returning. If not, they are new.
            if (loyaltyMap[c.user_id]) retCust++;
            else newCust++;
        });

        // VIEW LOGIC (Today vs Week)
        let mainChart = [];
        let peakH = 'N/A';
        let busyDay = 'N/A';

        if (view === 'today') {
            const hours = new Array(24).fill(0);
            data.forEach(c => {
                const d = new Date(c.created_at);
                if (d.toDateString() === todayStr) hours[d.getHours()]++;
            });
            mainChart = hours.map((val, h) => ({
                name: `${h > 12 ? h - 12 : (h === 0 ? 12 : h)}${h >= 12 ? 'pm' : 'am'}`,
                count: val
            }));
            const maxVal = Math.max(...hours);
            if (maxVal > 0) peakH = `${hours.indexOf(maxVal) > 12 ? hours.indexOf(maxVal) - 12 : hours.indexOf(maxVal)} ${hours.indexOf(maxVal)>=12?'PM':'AM'}`;

        } else {
            const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
            const dayCounts = new Array(7).fill(0);
            data.forEach(c => { dayCounts[new Date(c.created_at).getDay()]++; });
            
            const todayIdx = now.getDay();
            for (let i = 6; i >= 0; i--) {
                const dIdx = (todayIdx - i + 7) % 7;
                mainChart.push({ name: days[dIdx], count: dayCounts[dIdx] });
            }
            const maxDayVal = Math.max(...dayCounts);
            if (maxDayVal > 0) busyDay = days[dayCounts.indexOf(maxDayVal)];
        }

        // Demographics
        const ageMap = { '18-24': 0, '25-34': 0, '35-44': 0, '45+': 0 };
        data.forEach(c => {
            if (c.profiles?.birth_date) {
                const age = new Date().getFullYear() - new Date(c.profiles.birth_date).getFullYear();
                if (age < 25) ageMap['18-24']++;
                else if (age < 35) ageMap['25-34']++;
                else if (age < 45) ageMap['35-44']++;
                else ageMap['45+']++;
            }
        });

        const statusMap = { 'Single': 0, 'Taken': 0, 'Complicated': 0 };
        data.forEach(c => {
            const s = c.profiles?.relationship_status;
            if (s && statusMap[s] !== undefined) statusMap[s]++;
        });

        setStats({ 
            liveCount: live, todayTotal: today, weekTotal, 
            peakHour: peakH, busiestDay: busyDay, 
            malePct: totalGen ? Math.round((m/totalGen)*100) : 0, 
            femalePct: totalGen ? Math.round((f/totalGen)*100) : 0,
            newCustomers: newCust, returningCustomers: retCust
        });
        setChartData(mainChart);
        setDemographics({
            age: Object.keys(ageMap).map(k => ({ name: k, count: ageMap[k] })),
            status: Object.keys(statusMap).filter(k => statusMap[k]>0).map(k => ({ name: k, value: statusMap[k] })),
            loyalty: [
                { name: 'New', value: newCust },
                { name: 'Regulars', value: retCust }
            ]
        });
    };

    if (loading) return <div className="h-64 bg-slate-900 rounded-xl animate-pulse"/>;

    return (
        <motion.div 
            initial={{ opacity: 0, y: 20 }} 
            animate={{ opacity: 1, y: 0 }} 
            transition={{ duration: 0.5 }}
            className="space-y-6"
        >
            
            {/* 1. CONTROLS */}
            <div className="flex gap-2 mb-2 bg-slate-900 p-1 rounded-lg w-fit border border-slate-800">
                {['today', 'week'].map(v => (
                    <button 
                        key={v}
                        onClick={() => setView(v)}
                        className={`px-4 py-1.5 text-xs font-bold rounded-md transition capitalize ${view === v ? 'bg-amber-500 text-black' : 'text-slate-400 hover:text-white'}`}
                    >
                        {v === 'week' ? 'Past 7 Days' : v}
                    </button>
                ))}
            </div>

            {/* 2. KPIs with Animation */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                {[
                    { label: 'Active Now', val: stats.liveCount, icon: Activity, color: 'text-emerald-500' },
                    { label: view === 'today' ? 'Total Today' : 'Total Week', val: view === 'today' ? stats.todayTotal : stats.weekTotal, icon: Users, color: 'text-blue-500' },
                    { label: view === 'today' ? 'Peak Hour' : 'Busiest Day', val: view === 'today' ? stats.peakHour : stats.busiestDay, icon: view==='today'?Clock:Calendar, color: 'text-amber-500' },
                    { label: 'New Faces', val: stats.newCustomers, icon: Repeat, color: 'text-purple-500' }
                ].map((kpi, i) => (
                    <motion.div 
                        key={i}
                        whileHover={{ scale: 1.02 }}
                        className="bg-slate-900 border border-slate-800 p-4 rounded-xl"
                    >
                        <div className={`${kpi.color} text-[10px] uppercase font-bold flex items-center gap-1`}>
                            <kpi.icon className="w-3 h-3"/> {kpi.label}
                        </div>
                        <div className="text-2xl font-black text-white">{kpi.val}</div>
                    </motion.div>
                ))}
            </div>

            {/* 3. MAIN CHART */}
            <motion.div 
                layout 
                className="bg-slate-900 border border-slate-800 p-5 rounded-xl"
            >
                <h3 className="text-sm font-bold text-white mb-6 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-500" /> 
                    {view === 'today' ? 'Hourly Traffic' : 'Daily Traffic'}
                </h3>
                <div className="h-64 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        {view === 'today' ? (
                            <AreaChart data={chartData}>
                                <defs>
                                    <linearGradient id="colorCount" x1="0" y1="0" x2="0" y2="1">
                                        <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                        <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                    </linearGradient>
                                </defs>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b'}} interval={3} />
                                <YAxis tick={{fontSize: 10, fill: '#64748b'}} />
                                <RechartsTooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff'}} />
                                <Area type="monotone" dataKey="count" stroke="#f59e0b" strokeWidth={2} fill="url(#colorCount)" />
                            </AreaChart>
                        ) : (
                            <BarChart data={chartData}>
                                <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" vertical={false} />
                                <XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b'}} />
                                <YAxis tick={{fontSize: 10, fill: '#64748b'}} />
                                <RechartsTooltip cursor={{fill: 'rgba(255,255,255,0.05)'}} contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff'}} />
                                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} barSize={30} />
                            </BarChart>
                        )}
                    </ResponsiveContainer>
                </div>
            </motion.div>

            {/* 4. DEMOGRAPHICS & LOYALTY */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* Gender & Age */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl space-y-6">
                    <div>
                        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <ArrowLeftRight className="w-4 h-4 text-purple-500" /> Gender Split
                        </h3>
                        <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden flex mb-2">
                            <motion.div initial={{width: 0}} animate={{width: `${stats.malePct}%`}} className="h-full bg-blue-500" />
                            <motion.div initial={{width: 0}} animate={{width: `${stats.femalePct}%`}} className="h-full bg-pink-500" />
                        </div>
                        <div className="flex justify-between text-xs text-slate-400">
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500"/> {stats.malePct}% Male</span>
                            <span className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-pink-500"/> {stats.femalePct}% Female</span>
                        </div>
                    </div>

                    <div className="pt-4 border-t border-slate-800">
                        <h3 className="text-sm font-bold text-white mb-3 flex items-center gap-2">
                            <Users className="w-4 h-4 text-blue-500" /> Age Distribution
                        </h3>
                        <div className="h-32 w-full">
                            <ResponsiveContainer width="100%" height="100%">
                                <BarChart data={demographics.age} layout="vertical">
                                    <XAxis type="number" hide />
                                    <YAxis dataKey="name" type="category" width={40} tick={{fontSize: 10, fill: '#94a3b8'}} />
                                    <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: '#0f172a'}} />
                                    <Bar dataKey="count" fill="#3b82f6" radius={[0, 4, 4, 0]} barSize={12} />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    </div>
                </div>

                {/* Loyalty (New vs Returning) */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl flex flex-col">
                    <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                        <Repeat className="w-4 h-4 text-emerald-500" /> Customer Loyalty
                    </h3>
                    <div className="flex-1 min-h-[160px] relative">
                        {demographics.loyalty.length > 0 && stats.weekTotal > 0 ? (
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie 
                                        data={demographics.loyalty} 
                                        innerRadius={50} 
                                        outerRadius={70} 
                                        paddingAngle={5} 
                                        dataKey="value"
                                    >
                                        <Cell fill="#a855f7" /> {/* New = Purple */}
                                        <Cell fill="#10b981" /> {/* Regulars = Emerald */}
                                    </Pie>
                                    <Legend verticalAlign="bottom" height={36} iconSize={8} wrapperStyle={{fontSize: '11px'}} />
                                    <RechartsTooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155'}} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-500">
                                Not enough history yet
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </motion.div>
    );
}