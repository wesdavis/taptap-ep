import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Loader2, ShieldAlert, Users, Zap, Search, Ban, CheckCircle, LogOut, Crown, MapPin, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';

export default function AdminDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [loading, setLoading] = useState(true);
    const [isAdmin, setIsAdmin] = useState(false);
    const [activeTab, setActiveTab] = useState('reports'); // 'reports', 'users', 'tools'

    // Data State
    const [reports, setReports] = useState([]);
    const [allUsers, setAllUsers] = useState([]);
    const [searchQuery, setSearchQuery] = useState("");
    
    // Tools State
    const [venues, setVenues] = useState([]);
    const [processing, setProcessing] = useState(false);

    useEffect(() => {
        checkAdmin();
    }, [user]);

    async function checkAdmin() {
        if (!user) return;
        const { data } = await supabase.from('profiles').select('is_admin').eq('id', user.id).single();
        if (data?.is_admin) {
            setIsAdmin(true);
            loadData();
            loadVenues();
        } else {
            navigate('/'); // Kick out non-admins
        }
        setLoading(false);
    }

    async function loadData() {
        // 1. Fetch Reports
        const { data: reportData } = await supabase
            .from('reports')
            .select(`*, reporter:profiles!reporter_id(*), reported:profiles!reported_id(*)`)
            .order('created_at', { ascending: false });
        setReports(reportData || []);

        // 2. Fetch Users
        const { data: userData } = await supabase
            .from('profiles')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50); // Pagination later
        setAllUsers(userData || []);
    }

    async function loadVenues() {
        const { data } = await supabase.from('locations').select('*').order('name');
        setVenues(data || []);
    }

    // --- ACTIONS ---

    const handleBanUser = async (userId, currentStatus) => {
        if (!confirm(`Are you sure you want to ${currentStatus ? 'UNBAN' : 'BAN'} this user?`)) return;
        
        try {
            await supabase.from('profiles').update({ is_banned: !currentStatus }).eq('id', userId);
            toast.success(currentStatus ? "User Unbanned" : "User Banned & Evicted");
            loadData(); // Refresh list
        } catch (e) { toast.error("Action failed"); }
    };

    const handleDismissReport = async (reportId) => {
        await supabase.from('reports').delete().eq('id', reportId);
        setReports(prev => prev.filter(r => r.id !== reportId));
        toast.success("Report dismissed");
    };

    // --- GOD MODE TOOLS ---
    const runGlobalCheckout = async () => {
        if (!confirm("⚠️ Evacuate the entire map?")) return;
        setProcessing(true);
        await supabase.from('checkins').update({ is_active: false }).neq('id', 0);
        toast.success("Map Cleared.");
        setProcessing(false);
    };

    const setPromotion = async (venueId) => {
        setProcessing(true);
        await supabase.from('locations').update({ is_promoted: false }).neq('id', 0);
        await supabase.from('locations').update({ is_promoted: true }).eq('id', venueId);
        toast.success("New Promo Active!");
        loadVenues(); // Refresh to see update
        setProcessing(false);
    };

    if (loading) return <div className="h-screen bg-slate-950 flex items-center justify-center"><Loader2 className="animate-spin text-amber-500"/></div>;

    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-3">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/')}><ArrowLeft className="text-slate-400"/></Button>
                    <div>
                        <h1 className="text-2xl font-black flex items-center gap-2 text-red-500"><ShieldAlert className="fill-red-500 text-slate-950"/> SHERIFF'S OFFICE</h1>
                        <p className="text-slate-500 text-xs font-mono uppercase tracking-widest">Admin Control Panel</p>
                    </div>
                </div>
            </div>

            {/* Tabs */}
            <div className="flex p-1 bg-slate-900 rounded-xl mb-6 border border-slate-800">
                <button onClick={() => setActiveTab('reports')} className={`flex-1 py-3 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition ${activeTab === 'reports' ? 'bg-red-500 text-black shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                    <ShieldAlert className="w-4 h-4" /> Reports ({reports.length})
                </button>
                <button onClick={() => setActiveTab('users')} className={`flex-1 py-3 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition ${activeTab === 'users' ? 'bg-blue-500 text-black shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                    <Users className="w-4 h-4" /> Users
                </button>
                <button onClick={() => setActiveTab('tools')} className={`flex-1 py-3 text-sm font-bold rounded-lg flex items-center justify-center gap-2 transition ${activeTab === 'tools' ? 'bg-amber-500 text-black shadow-lg' : 'text-slate-400 hover:text-white'}`}>
                    <Zap className="w-4 h-4" /> God Mode
                </button>
            </div>

            {/* --- TAB CONTENT: REPORTS --- */}
            {activeTab === 'reports' && (
                <div className="space-y-4">
                    {reports.length === 0 && <div className="text-center py-12 text-slate-500">No active reports. The town is safe.</div>}
                    {reports.map(report => (
                        <div key={report.id} className="bg-slate-900/50 border border-slate-800 p-4 rounded-xl flex flex-col gap-3">
                            <div className="flex justify-between items-start">
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-10 h-10 border border-red-500/50">
                                        <AvatarImage src={report.reported?.avatar_url} />
                                        <AvatarFallback>?</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="font-bold text-red-400 flex items-center gap-2">
                                            {report.reported?.display_name || "Unknown"}
                                            <Badge variant="outline" className="text-[9px] border-red-500/30 text-red-500">ACCUSED</Badge>
                                        </div>
                                        <div className="text-xs text-slate-500">Reported by {report.reporter?.display_name}</div>
                                    </div>
                                </div>
                                <span className="text-[10px] text-slate-600 font-mono">{new Date(report.created_at).toLocaleDateString()}</span>
                            </div>
                            
                            <div className="bg-black/30 p-3 rounded-lg border border-white/5 text-sm text-slate-300 italic">
                                "{report.reason}"
                            </div>

                            <div className="flex gap-2 mt-2">
                                <Button size="sm" onClick={() => handleBanUser(report.reported_id, report.reported?.is_banned)} className="bg-red-500 hover:bg-red-600 text-white font-bold flex-1">
                                    {report.reported?.is_banned ? "Unban User" : "Ban Hammer 🔨"}
                                </Button>
                                <Button size="sm" variant="outline" onClick={() => handleDismissReport(report.id)} className="border-slate-700 text-slate-400 hover:bg-slate-800 flex-1">
                                    Dismiss
                                </Button>
                            </div>
                        </div>
                    ))}
                </div>
            )}

            {/* --- TAB CONTENT: USERS --- */}
            {activeTab === 'users' && (
                <div className="space-y-4">
                    <div className="relative">
                        <Search className="absolute left-3 top-3 w-4 h-4 text-slate-500" />
                        <Input 
                            placeholder="Search users..." 
                            className="bg-slate-900 border-slate-800 pl-10"
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                        />
                    </div>
                    <div className="grid gap-2">
                        {allUsers
                            .filter(u => u.display_name?.toLowerCase().includes(searchQuery.toLowerCase()) || u.handle?.toLowerCase().includes(searchQuery.toLowerCase()))
                            .map(u => (
                            <div key={u.id} className="flex items-center justify-between bg-slate-900/30 p-3 rounded-lg border border-slate-800/50">
                                <div className="flex items-center gap-3">
                                    <Avatar className="w-8 h-8">
                                        <AvatarImage src={u.avatar_url} />
                                        <AvatarFallback>U</AvatarFallback>
                                    </Avatar>
                                    <div>
                                        <div className="font-bold text-sm flex items-center gap-2">
                                            {u.display_name}
                                            {u.is_banned && <Badge className="bg-red-500/20 text-red-500 text-[9px] border-0">BANNED</Badge>}
                                            {u.is_admin && <Badge className="bg-amber-500/20 text-amber-500 text-[9px] border-0">ADMIN</Badge>}
                                        </div>
                                        <div className="text-xs text-slate-500">@{u.handle}</div>
                                    </div>
                                </div>
                                <Button 
                                    size="sm" 
                                    variant="ghost" 
                                    onClick={() => handleBanUser(u.id, u.is_banned)}
                                    className={u.is_banned ? "text-green-500 hover:bg-green-900/20" : "text-red-500 hover:bg-red-900/20"}
                                >
                                    <Ban className="w-4 h-4" />
                                </Button>
                            </div>
                        ))}
                    </div>
                </div>
            )}

            {/* --- TAB CONTENT: TOOLS (GOD MODE) --- */}
            {activeTab === 'tools' && (
                <div className="space-y-6">
                    <div className="bg-amber-950/10 border border-amber-500/20 p-5 rounded-2xl">
                        <h3 className="text-amber-500 font-bold mb-4 flex items-center gap-2"><Crown className="w-5 h-5"/> Venue Promotion</h3>
                        <div className="grid grid-cols-1 gap-2">
                            {venues.map(v => (
                                <button 
                                    key={v.id} 
                                    onClick={() => setPromotion(v.id)}
                                    disabled={processing}
                                    className={`flex items-center justify-between p-3 rounded-lg border text-sm transition ${v.is_promoted ? 'bg-amber-500 text-black border-amber-500 font-bold' : 'bg-slate-900 border-slate-800 text-slate-400 hover:border-slate-600'}`}
                                >
                                    <span>{v.name}</span>
                                    {v.is_promoted && <CheckCircle className="w-4 h-4" />}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div className="bg-red-950/10 border border-red-500/20 p-5 rounded-2xl">
                        <h3 className="text-red-500 font-bold mb-4 flex items-center gap-2"><LogOut className="w-5 h-5"/> Emergency Controls</h3>
                        <Button 
                            onClick={runGlobalCheckout} 
                            disabled={processing}
                            className="w-full bg-red-500/10 text-red-500 border border-red-500/50 hover:bg-red-500 hover:text-white h-12 font-bold"
                        >
                            {processing ? <Loader2 className="animate-spin" /> : "EVACUATE ALL USERS (CLEAR MAP)"}
                        </Button>
                        <p className="text-xs text-red-400/50 mt-2 text-center">Use this at 2:00 AM to reset the grid.</p>
                    </div>
                </div>
            )}
        </div>
    );
}