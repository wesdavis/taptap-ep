import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { useNavigate, useSearchParams } from 'react-router-dom'; 
import VenueAnalytics from '@/components/business/VenueAnalytics';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Store, MapPin, Save, ArrowLeft, TrendingUp, CheckCircle, XCircle } from 'lucide-react';
import { toast } from 'sonner';

// 🟢 REPLACE THIS WITH YOUR ACTUAL STRIPE PRICE ID FROM THE DASHBOARD
const STRIPE_PRICE_ID = "price_1T02XA2MJxJeVXhRzYogRFho"; 

export default function BusinessDashboard() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [searchParams] = useSearchParams(); 
    
    const [venue, setVenue] = useState(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [promoting, setPromoting] = useState(false); 
    const [activeTab, setActiveTab] = useState('overview');

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
            
            // 🟢 1. Use maybeSingle() to avoid 406 errors if empty
            const { data } = await supabase
                .from('locations')
                .select('*')
                .eq('owner_id', user.id)
                .maybeSingle();

            if (data) {
                setVenue(data);
                setFormData({
                    description: data.description || '',
                    hours: data.hours || '',
                    website: data.website || '',
                    phone: data.phone || ''
                });
                setLoading(false); // Only show page if we found a venue
            } else {
                // 🟢 2. SECURITY KICK: If no venue, leave immediately.
                // We do NOT set loading(false) here, so the user sees the spinner 
                // until the redirect completes. No "No Venue" screen flash.
                toast.error("Access Restricted: Authorized Personnel Only.");
                navigate('/');
            }
        }
        fetchMyVenue();

        if (searchParams.get('session_id')) {
            toast.success("Payment Successful! Your venue is being boosted.");
        }
    }, [user, searchParams, navigate]);

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

    const handlePromote = async () => {
        if (!venue) return;
        setPromoting(true);
        try {
            const { data, error } = await supabase.functions.invoke('create-checkout', {
                body: {
                    price_id: STRIPE_PRICE_ID,
                    location_id: venue.id,
                    user_id: user.id,
                    return_url: window.location.href 
                }
            });

            if (error) throw error;
            if (data?.url) {
                window.location.href = data.url; 
            }
        } catch (error) {
            console.error(error);
            toast.error("Could not start payment.");
        } finally {
            setPromoting(false);
        }
    };

    // While loading (or redirecting), show spinner
    if (loading) return <div className="min-h-screen bg-slate-950 flex items-center justify-center text-amber-500"><Loader2 className="animate-spin" /></div>;

    // This fail-safe render is technically unreachable now due to the redirect, 
    // but good to keep as a fallback.
    if (!venue) return null;

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

            <div className="animate-in fade-in slide-in-from-bottom-2 duration-300">
                
                {/* TAB 1: OVERVIEW (ANALYTICS) */}
                {activeTab === 'overview' && (
                    <div className="space-y-6">
                        <VenueAnalytics locationId={venue.id} />
                        
                        {/* PROMOTION CARD */}
                        <div className="bg-gradient-to-br from-amber-900/40 to-slate-900 border border-amber-500/30 rounded-xl p-5 relative overflow-hidden">
                            {venue.is_promoted && (
                                <div className="absolute top-0 right-0 bg-amber-500 text-black text-[10px] font-bold px-2 py-1 rounded-bl-lg">
                                    ACTIVE
                                </div>
                            )}
                            <div className="flex items-center gap-3 mb-2">
                                <TrendingUp className="w-5 h-5 text-amber-500" />
                                <h3 className="font-bold text-white">Boost Traffic</h3>
                            </div>
                            <p className="text-sm text-slate-400 mb-4">
                                Get featured on the home page map to attract more customers tonight.
                            </p>
                            
                            {venue.is_promoted ? (
                                <Button disabled className="w-full bg-green-500/10 text-green-500 font-bold border border-green-500/20">
                                    <CheckCircle className="w-4 h-4 mr-2" /> Currently Promoted
                                </Button>
                            ) : (
                                <Button 
                                    onClick={handlePromote} 
                                    disabled={promoting}
                                    className="w-full bg-amber-500 text-black font-bold hover:bg-amber-400"
                                >
                                    {promoting ? <Loader2 className="animate-spin w-4 h-4" /> : "Promote for $29"}
                                </Button>
                            )}
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