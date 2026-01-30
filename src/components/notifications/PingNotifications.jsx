import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
// REMOVED: import { Textarea } from "@/components/ui/textarea"; <--- This was likely crashing it
import { Check, Clock, X, Users, MessageSquareWarning } from 'lucide-react';
import { toast } from 'sonner';

export default function PingNotifications() {
    const { user } = useAuth();
    const [pings, setPings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [userGender, setUserGender] = useState(null);
    const [feedbackMode, setFeedbackMode] = useState(null);
    const [feedbackText, setFeedbackText] = useState("");

    useEffect(() => {
        if (user) {
            fetchUserGender().then(() => fetchActivity());

            const channel = supabase
                .channel('activity_updates')
                .on('postgres_changes', { event: '*', schema: 'public', table: 'pings', filter: `from_user_id=eq.${user.id}` }, () => fetchActivity())
                .on('postgres_changes', { event: '*', schema: 'public', table: 'pings', filter: `to_user_id=eq.${user.id}` }, () => fetchActivity())
                .subscribe();

            return () => supabase.removeChannel(channel);
        }
    }, [user]);

    async function fetchUserGender() {
        const { data } = await supabase.from('profiles').select('gender').eq('id', user.id).single();
        if (data) setUserGender(data.gender);
    }

    async function fetchActivity() {
        try {
            if (!userGender) {
                const { data } = await supabase.from('profiles').select('gender').eq('id', user.id).single();
                if (data) setUserGender(data.gender);
            }

            const currentIsFemale = (userGender || '').toLowerCase() === 'female';
            const querySelect = `id, created_at, status, met_confirmed, other_user:profiles!${currentIsFemale ? 'to_user_id' : 'from_user_id'} ( id, full_name, avatar_url )`;
            const queryColumn = currentIsFemale ? 'from_user_id' : 'to_user_id';

            const { data, error } = await supabase
                .from('pings')
                .select(querySelect)
                .eq(queryColumn, user.id)
                .order('created_at', { ascending: false });

            if (error) throw error;

            const uniquePingsMap = new Map();
            (data || []).forEach(ping => {
                if (ping.other_user?.id && !uniquePingsMap.has(ping.other_user.id)) {
                    uniquePingsMap.set(ping.other_user.id, ping);
                }
            });
            setPings(Array.from(uniquePingsMap.values()));

        } catch (err) {
            console.error("Activity Error:", err);
            setPings([]);
        } finally {
            setLoading(false);
        }
    }

    const handleConfirmMet = async (pingId) => {
        setPings(current => current.map(p => p.id === pingId ? { ...p, met_confirmed: true } : p));
        toast.success("Awesome! Added to your connections.");
        await supabase.from('pings').update({ met_confirmed: true }).eq('id', pingId);
    };

    const startFeedback = (pingId) => {
        setFeedbackMode(pingId);
        setFeedbackText("");
    };

    const submitFeedback = async (pingId) => {
        setPings(current => current.map(p => p.id === pingId ? { ...p, met_confirmed: false } : p));
        setFeedbackMode(null);
        toast.info("Thanks for the feedback.");
        await supabase.from('pings').update({ met_confirmed: false, feedback: feedbackText }).eq('id', pingId);
    };

    const timeAgo = (dateString) => {
        if (!dateString) return '';
        const seconds = Math.floor((new Date() - new Date(dateString)) / 1000);
        if (seconds < 60) return "just now";
        const m = Math.floor(seconds / 60);
        if (m < 60) return `${m}m ago`;
        const h = Math.floor(m / 60);
        if (h < 24) return `${h}h ago`;
        return `${Math.floor(h / 24)}d ago`;
    };

    if (!user) return null;
    if (loading) return <div className="text-slate-500 text-sm">Loading activity...</div>;

    const isFemale = (userGender || '').toLowerCase() === 'female';

    return (
        <div className="space-y-4">
            {pings.length === 0 && <div className="text-slate-500 text-sm italic py-2">No activity yet.</div>}

            {pings.map((ping) => (
                <div key={ping.id} className="bg-black/20 p-4 rounded-2xl border border-white/5 transition-all">
                    <div className="flex items-center gap-3 mb-3">
                        <Avatar className="w-10 h-10 border border-white/10">
                            <AvatarImage src={ping.other_user?.avatar_url} />
                            <AvatarFallback>{ping.other_user?.full_name?.[0] || '?'}</AvatarFallback>
                        </Avatar>

                        <div className="flex-1 min-w-0">
                            {ping.met_confirmed === true ? (
                                <div>
                                    <p className="text-sm text-green-400 font-bold truncate flex items-center gap-1">
                                        You met with {ping.other_user?.full_name?.split(' ')[0]}!
                                    </p>
                                    <p className="text-[10px] text-slate-500">Connection confirmed</p>
                                </div>
                            ) : isFemale ? (
                                <div>
                                    <p className="text-sm text-slate-200 font-medium truncate">
                                        Did you meet {ping.other_user?.full_name?.split(' ')[0]}?
                                    </p>
                                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                        <Check className="w-3 h-3 text-green-500" /> Tap sent {timeAgo(ping.created_at)}
                                    </p>
                                </div>
                            ) : (
                                <div>
                                    <p className="text-sm text-amber-400 font-bold truncate">
                                        {ping.other_user?.full_name} tapped you!
                                    </p>
                                    <p className="text-[10px] text-slate-500 flex items-center gap-1">
                                        <Clock className="w-3 h-3" /> {timeAgo(ping.created_at)}
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    {isFemale && ping.met_confirmed === null && (
                        <div className="pl-[52px]">
                            {feedbackMode !== ping.id ? (
                                <div className="flex gap-2 animate-in fade-in">
                                    <Button size="sm" className="h-8 bg-green-500/20 text-green-400 border border-green-500/50 hover:bg-green-500/30 text-xs px-4" onClick={() => handleConfirmMet(ping.id)}>
                                        <Check className="w-3 h-3 mr-1" /> Yes
                                    </Button>
                                    <Button size="sm" variant="ghost" className="h-8 text-slate-400 hover:text-white hover:bg-white/10 text-xs px-4" onClick={() => startFeedback(ping.id)}>
                                        <X className="w-3 h-3 mr-1" /> No
                                    </Button>
                                </div>
                            ) : (
                                <div className="bg-white/5 rounded-xl p-3 border border-white/10 animate-in zoom-in-95 duration-200">
                                    <p className="text-xs text-slate-300 mb-2 font-medium flex items-center gap-2">
                                        <MessageSquareWarning className="w-3 h-3 text-amber-500" />
                                        What happened?
                                    </p>
                                    {/* FIX: Standard HTML Textarea to prevent crashes */}
                                    <textarea 
                                        className="w-full bg-black/50 border border-white/10 rounded-md p-2 text-xs text-white min-h-[60px] mb-2 focus:outline-none focus:border-amber-500/50"
                                        placeholder="Did they ghost? Was it awkward?"
                                        value={feedbackText}
                                        onChange={(e) => setFeedbackText(e.target.value)}
                                    />
                                    <div className="flex justify-end gap-2">
                                        <Button size="sm" variant="ghost" className="h-6 text-[10px] text-slate-400" onClick={() => setFeedbackMode(null)}>Cancel</Button>
                                        <Button size="sm" className="h-6 text-[10px] bg-slate-700 hover:bg-slate-600 text-white" onClick={() => submitFeedback(ping.id)}>Submit</Button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {ping.met_confirmed === true && (
                        <div className="pl-[52px] mt-1">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-[10px] font-medium bg-green-500/10 text-green-400 border border-green-500/20">
                                <Users className="w-3 h-3 mr-1" /> Met in person
                            </span>
                        </div>
                    )}
                    
                    {ping.met_confirmed === false && (
                        <div className="pl-[52px] mt-1">
                            <span className="text-xs text-slate-600 italic">Marked as not met.</span>
                        </div>
                    )}
                </div>
            ))}
        </div>
    );
}