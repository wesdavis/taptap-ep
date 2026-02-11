import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { 
  BarChart, Bar, XAxis, Tooltip as RechartsTooltip, ResponsiveContainer, 
  AreaChart, Area, PieChart, Pie, Cell, Legend 
} from 'recharts';
import { Users, TrendingUp, Heart, Activity, Calendar } from 'lucide-react';

const COLORS = ['#f59e0b', '#3b82f6', '#ec4899', '#10b981']; // Amber, Blue, Pink, Green

export default function VenueAnalytics({ locationId }) {
    const [loading, setLoading] = useState(true);
    const [summary, setSummary] = useState({ 
        total: 0, 
        activeNow: 0, 
        today: 0,
        maleCount: 0,
        femaleCount: 0,
        malePct: 0,
        femalePct: 0
    });
    
    // Chart Data
    const [hourlyData, setHourlyData] = useState([]);
    const [ageData, setAgeData] = useState([]);
    const [statusData, setStatusData] = useState([]);

    const fetchStats = async () => {
        if (!locationId) return;

        // 1. Get Checkins with Profile Data (Only for THIS venue)
        const { data: checkins } = await supabase
            .from('checkins')
            .select(`
                created_at, 
                is_active, 
                profiles ( birth_date, relationship_status, gender )
            `)
            .eq('location_id', locationId); // 🔒 STRICT FILTER

        if (checkins) {
            processData(checkins);
        }
        setLoading(false);
    };

    // 🟢 REAL-TIME LISTENER
    useEffect(() => {
        fetchStats(); 

        const subscription = supabase
            .channel('venue-analytics')
            .on('postgres_changes', { 
                event: '*', 
                schema: 'public', 
                table: 'checkins', 
                filter: `location_id=eq.${locationId}` // 🔒 Listen ONLY to this venue
            }, (payload) => {
                fetchStats(); 
            })
            .subscribe();

        return () => { supabase.removeChannel(subscription); };
    }, [locationId]);

    const processData = (data) => {
        const todayStr = new Date().toDateString();
        let active = 0;
        let todayCount = 0;
        let mCount = 0;
        let fCount = 0;
        
        // Maps
        const hoursMap = new Array(24).fill(0);
        const ageMap = { '18-24': 0, '25-34': 0, '35-44': 0, '45+': 0 };
        const statusMap = { 'Single': 0, 'Taken': 0, 'Complicated': 0 };

        data.forEach(c => {
            if (c.is_active) active++;
            const date = new Date(c.created_at);
            
            // Is it today?
            if (date.toDateString() === todayStr) {
                todayCount++;
                hoursMap[date.getHours()]++;
            }

            // Demographics (All Time for accurate sampling)
            if (c.profiles) {
                // Gender Count
                if (c.profiles.gender === 'Male') mCount++;
                if (c.profiles.gender === 'Female') fCount++;

                // Status
                const s = c.profiles.relationship_status;
                if (s && statusMap[s] !== undefined) statusMap[s]++;

                // Age
                if (c.profiles.birth_date) {
                    const dob = new Date(c.profiles.birth_date);
                    const ageDiff = Date.now() - dob.getTime();
                    const age = Math.abs(new Date(ageDiff).getUTCFullYear() - 1970);
                    
                    if (age < 25) ageMap['18-24']++;
                    else if (age < 35) ageMap['25-34']++;
                    else if (age < 45) ageMap['35-44']++;
                    else ageMap['45+']++;
                }
            }
        });

        // Calculate Percentages
        const totalGender = mCount + fCount;
        const mPct = totalGender > 0 ? Math.round((mCount / totalGender) * 100) : 0;
        const fPct = totalGender > 0 ? Math.round((fCount / totalGender) * 100) : 0;

        // Set States
        setSummary({ 
            total: data.length, 
            activeNow: active, 
            today: todayCount,
            maleCount: mCount,
            femaleCount: fCount,
            malePct: mPct,
            femalePct: fPct
        });
        
        // Format Charts
        setHourlyData(hoursMap.map((count, hour) => ({
            name: `${hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour)}${hour >= 12 ? 'pm' : 'am'}`,
            visitors: count
        })));

        setAgeData(Object.keys(ageMap).map(key => ({ name: key, count: ageMap[key] })));
        
        setStatusData(Object.keys(statusMap)
            .filter(k => statusMap[k] > 0)
            .map(k => ({ name: k, value: statusMap[k] }))
        );
    };

    if (loading) return <div className="animate-pulse h-64 bg-slate-900 rounded-xl"></div>;

    return (
        <div className="space-y-6 animate-in fade-in duration-500">
            
            {/* 1. HEADLINE CARDS */}
            <div className="grid grid-cols-3 gap-4">
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                    <div className="text-emerald-500 text-xs uppercase font-bold mb-1 flex justify-center items-center gap-1"><Activity className="w-3 h-3" /> Live</div>
                    <div className="text-3xl font-black text-white">{summary.activeNow}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                    <div className="text-blue-500 text-xs uppercase font-bold mb-1 flex justify-center items-center gap-1"><Calendar className="w-3 h-3" /> Today</div>
                    <div className="text-3xl font-black text-white">{summary.today}</div>
                </div>
                <div className="bg-slate-900 border border-slate-800 p-4 rounded-xl text-center">
                    <div className="text-slate-500 text-xs uppercase font-bold mb-1">Total</div>
                    <div className="text-3xl font-black text-white">{summary.total}</div>
                </div>
            </div>

            {/* 🟢 NEW: GENDER RATIO BAR */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <Users className="w-4 h-4 text-purple-500" /> Gender Ratio
                </h3>
                <div className="space-y-3">
                    <div className="flex justify-between text-xs font-bold">
                        <span className="text-blue-400">{summary.malePct}% Men</span>
                        <span className="text-pink-400">{summary.femalePct}% Women</span>
                    </div>
                    {/* The Visual Bar */}
                    <div className="h-4 w-full bg-slate-800 rounded-full overflow-hidden flex">
                        <div 
                            className="h-full bg-blue-500 transition-all duration-1000" 
                            style={{ width: `${summary.malePct}%` }} 
                        />
                        <div 
                            className="h-full bg-pink-500 transition-all duration-1000" 
                            style={{ width: `${summary.femalePct}%` }} 
                        />
                    </div>
                    <div className="flex gap-4 text-[10px] text-slate-500">
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-blue-500" /> {summary.maleCount} Males</div>
                        <div className="flex items-center gap-1"><div className="w-2 h-2 rounded-full bg-pink-500" /> {summary.femaleCount} Females</div>
                    </div>
                </div>
            </div>

            {/* 2. HOURLY TRAFFIC (Area Chart) */}
            <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                <h3 className="text-sm font-bold text-white mb-4 flex items-center gap-2">
                    <TrendingUp className="w-4 h-4 text-amber-500" /> Hourly Traffic (Today)
                </h3>
                <div className="h-48 w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <AreaChart data={hourlyData}>
                            <defs>
                                <linearGradient id="colorVisits" x1="0" y1="0" x2="0" y2="1">
                                    <stop offset="5%" stopColor="#f59e0b" stopOpacity={0.3}/>
                                    <stop offset="95%" stopColor="#f59e0b" stopOpacity={0}/>
                                </linearGradient>
                            </defs>
                            <XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b'}} interval={3} />
                            <RechartsTooltip 
                                contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155', color: '#fff'}} 
                                itemStyle={{color: '#f59e0b'}}
                            />
                            <Area type="monotone" dataKey="visitors" stroke="#f59e0b" fillOpacity={1} fill="url(#colorVisits)" />
                        </AreaChart>
                    </ResponsiveContainer>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                
                {/* 3. RELATIONSHIP STATUS (Donut Chart) */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                    <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                        <Heart className="w-4 h-4 text-pink-500" /> Crowd Vibe
                    </h3>
                    <div className="h-40 w-full relative">
                        {statusData.length > 0 ? (
                            <ResponsiveContainer>
                                <PieChart>
                                    <Pie 
                                        data={statusData} 
                                        innerRadius={40} 
                                        outerRadius={60} 
                                        paddingAngle={5} 
                                        dataKey="value"
                                    >
                                        {statusData.map((entry, index) => (
                                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                        ))}
                                    </Pie>
                                    <RechartsTooltip contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155'}} />
                                    <Legend verticalAlign="middle" align="right" layout="vertical" iconSize={8} wrapperStyle={{fontSize: '10px'}} />
                                </PieChart>
                            </ResponsiveContainer>
                        ) : (
                            <div className="absolute inset-0 flex items-center justify-center text-xs text-slate-600">No data yet</div>
                        )}
                    </div>
                </div>

                {/* 4. AGE GROUPS (Bar Chart) */}
                <div className="bg-slate-900 border border-slate-800 p-5 rounded-xl">
                    <h3 className="text-sm font-bold text-white mb-2 flex items-center gap-2">
                        <Users className="w-4 h-4 text-blue-500" /> Age Groups
                    </h3>
                    <div className="h-40 w-full">
                         <ResponsiveContainer width="100%" height="100%">
                            <BarChart data={ageData}>
                                <XAxis dataKey="name" tick={{fontSize: 10, fill: '#64748b'}} />
                                <RechartsTooltip cursor={{fill: 'transparent'}} contentStyle={{backgroundColor: '#0f172a', borderColor: '#334155'}} />
                                <Bar dataKey="count" fill="#3b82f6" radius={[4, 4, 0, 0]} />
                            </BarChart>
                        </ResponsiveContainer>
                    </div>
                </div>

            </div>
        </div>
    );
}