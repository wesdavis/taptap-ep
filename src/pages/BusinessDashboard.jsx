import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate } from 'react-router-dom';
import VenueAnalytics from '@/components/business/VenueAnalytics';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Store, MapPin, Save, ArrowLeft, TrendingUp } from 'lucide-react';
import { toast } from 'sonner';

export default function BusinessDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    
    const [venue, setVenue] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [activeTab, setActiveTab] = useState('overview'); // 'overview' | 'manage'

    // Form State
    const [formData, setFormData] = useState({
        description: '',
        hours: '',
        website: '',
        phone: ''
    });

    useEffect(() => {
        async function fetchMyVenue() {
            if (!user) return;
            // Find the venue owned by this user
            const { data, error } = await supabase
                .from('locations')
                .select('*')
                .eq('owner_id', user.id)
                .single();

            if (data) {
                setVenue(data);
                setFormData({
                    description: data.description || '',
                    hours: data.hours || '',
                    website: data.website || '',
                    phone: data.phone || ''
                });
            }
            setLoading(false);
        }
        fetchMyVenue();
    }, [user]);

    const handleUpdate = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            const { error } = await supabase
                .from('locations')
                .update({
                    description: formData.description,
                    hours: formData.hours,
                    website: formData.website,
                    phone: formData.phone
                })
                .eq('id', venue.id);

            if (error) throw error;
            toast.success("Venue updated successfully!");
        } catch (error) {
            toast.error("Update failed.");
            console.error(error);
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-500"><Loader2 className="animate-spin" /></div>;

    // 1. STATE: NO VENUE FOUND
    if (!venue) {
        return (
            <div className="min-h-screen bg-slate-950 text-white p-6 flex flex-col items-center justify-center text-center">
                <Store className="w-16 h-16 text-slate-700 mb-4" />
                <h1 className="text-2xl font-bold mb-2">No Venue Found</h1>
                <p className="text-slate-400 mb-8 max-w-xs">
                    This account is not linked to a business. Please contact HiRL support to claim your venue.
                </p>
                <Button variant="outline" onClick={() => navigate('/')}>Return Home</Button>
            </div>
        );
    }

    // 2. STATE: DASHBOARD
    return (
        <div className="min-h-screen bg-slate-950 text-white p-6 pb-24">
            {/* Header */}
            <div className="flex items-center justify-between mb-8">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/')} className="text-slate-400">
                        <ArrowLeft className="w-6 h-6" />
                    </Button>
                    <div>
                        <h1 className="text-xl font-bold flex items-center gap-2">
                            {venue.name}
                        </h1>
                        <p className="text-xs text-green-500 font-bold uppercase tracking-wider flex items-center gap-1">
                            <span className="w-2 h-2 rounded-full bg-green-500 animate-pulse" /> Live Dashboard
                        </p>
                    </div>
                </div>
            </div>

            {/* TABS */}
            <div className="flex bg-slate-900 p-1 rounded-xl mb-6">
                <button 
                    onClick={() => setActiveTab('overview')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${activeTab === 'overview' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Overview
                </button>
                <button 
                    onClick={() => setActiveTab('manage')}
                    className={`flex-1 py-2 text-sm font-bold rounded-lg transition ${activeTab === 'manage' ? 'bg-slate-800 text-white shadow' : 'text-slate-500 hover:text-slate-300'}`}
                >
                    Manage Venue
                </button>
            </div>

            {/* CONTENT AREA */}
            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                
                {/* TAB 1: OVERVIEW (ANALYTICS) */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <VenueAnalytics locationId={venue.id} />
                        
                        {/* Promotion Teaser */}
                        <div className="bg-gradient-to-br from-amber-900/40 to-slate-900 border border-amber-500/30 rounded-xl p-5">
                            <div className="flex items-center gap-3 mb-2">
                                <TrendingUp className="w-5 h-5 text-amber-500" />
                                <h3 className="font-bold text-white">Boost Traffic</h3>
                            </div>
                            <p className="text-sm text-slate-400 mb-4">
                                Get featured on the home page map to attract more customers tonight.
                            </p>
                            <Button className="w-full bg-amber-500 text-black font-bold hover:bg-amber-400">
                                Promote for $29
                            </Button>
                        </div>
                    </div>
                )}

                {/* TAB 2: MANAGE (EDIT FORM) */}
                {activeTab === 'manage' && (
                    <form onSubmit={handleUpdate} className="space-y-5">
                        <div className="space-y-2">
                            <Label>Description</Label>
                            <Textarea 
                                value={formData.description} 
                                onChange={e => setFormData({...formData, description: e.target.value})}
                                className="bg-slate-900 border-slate-800 min-h-[100px]" 
                                placeholder="What's the vibe tonight?"
                            />
                        </div>

                        <div className="space-y-2">
                            <Label>Hours</Label>
                            <Input 
                                value={formData.hours} 
                                onChange={e => setFormData({...formData, hours: e.target.value})}
                                className="bg-slate-900 border-slate-800" 
                                placeholder="e.g. 5PM - 2AM"
                            />
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label>Website</Label>
                                <Input 
                                    value={formData.website} 
                                    onChange={e => setFormData({...formData, website: e.target.value})}
                                    className="bg-slate-900 border-slate-800" 
                                    placeholder="https://..."
                                />
                            </div>
                            <div className="space-y-2">
                                <Label>Phone</Label>
                                <Input 
                                    value={formData.phone} 
                                    onChange={e => setFormData({...formData, phone: e.target.value})}
                                    className="bg-slate-900 border-slate-800" 
                                    placeholder="(915)..."
                                />
                            </div>
                        </div>

                        <Button type="submit" disabled={saving} className="w-full bg-slate-800 text-white font-bold border border-slate-700 hover:bg-slate-700">
                            {saving ? <Loader2 className="animate-spin" /> : <><Save className="w-4 h-4 mr-2" /> Save Changes</>}
                        </Button>
                    </form>
                )}
            </div>
        </div>
    );
}