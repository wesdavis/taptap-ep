import React, { useState, useEffect } from 'react';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/lib/AuthContext';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Sparkles, ArrowLeft } from 'lucide-react';
import { toast } from 'sonner';
import { useNavigate } from 'react-router-dom';

export default function ProfileSetup() {
    const { user } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(false);
    
    const [formData, setFormData] = useState({
        full_name: '',
        gender: '',
        looking_for: '',
        bio: ''
    });

    // LOAD EXISTING DATA
    useEffect(() => {
        const loadData = async () => {
            if (!user) return;
            const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single();
            if (data) {
                setFormData({
                    full_name: data.full_name || '',
                    gender: data.gender || '',
                    looking_for: data.looking_for || '',
                    bio: data.bio || ''
                });
            }
        };
        loadData();
    }, [user]);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setLoading(true);

        try {
            const { error } = await supabase
                .from('profiles')
                .upsert({
                    id: user.id,
                    email: user.email,
                    full_name: formData.full_name,
                    gender: formData.gender,
                    looking_for: formData.looking_for,
                    bio: formData.bio,
                    updated_at: new Date().toISOString()
                });

            if (error) throw error;
            toast.success('Profile updated!');
            navigate('/profile'); // Go back to profile after save

        } catch (error) {
            console.error(error);
            toast.error(error.message);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-950 flex items-center justify-center p-4">
            <div className="max-w-md w-full backdrop-blur-xl bg-white/5 rounded-3xl border border-white/10 p-8">
                
                {/* Back Button */}
                <Button variant="ghost" className="mb-4 pl-0 text-slate-400 hover:text-white" onClick={() => navigate(-1)}>
                    <ArrowLeft className="w-4 h-4 mr-2" /> Back
                </Button>

                <div className="text-center mb-8">
                    <div className="w-12 h-12 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="w-6 h-6 text-amber-400" />
                    </div>
                    <h1 className="text-2xl font-bold text-white">Edit Profile</h1>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <Label className="text-slate-300 mb-2 block">Full Name</Label>
                        <Input
                            value={formData.full_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                            className="bg-white/5 border-white/10 text-white rounded-xl"
                        />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-slate-300 mb-2 block">I am...</Label>
                            <Select value={formData.gender} onValueChange={(v) => setFormData(prev => ({ ...prev, gender: v }))}>
                                <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl">
                                    <SelectValue placeholder="Gender" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Female">Female</SelectItem>
                                    <SelectItem value="Male">Male</SelectItem>
                                    <SelectItem value="Non-binary">Non-binary</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div>
                            <Label className="text-slate-300 mb-2 block">Looking for...</Label>
                            <Select value={formData.looking_for} onValueChange={(v) => setFormData(prev => ({ ...prev, looking_for: v }))}>
                                <SelectTrigger className="bg-white/5 border-white/10 text-white rounded-xl">
                                    <SelectValue placeholder="Interest" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="Male">Men</SelectItem>
                                    <SelectItem value="Female">Women</SelectItem>
                                    <SelectItem value="Everyone">Everyone</SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    <div>
                        <Label className="text-slate-300 mb-2 block">Bio</Label>
                        <Textarea
                            value={formData.bio}
                            onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                            className="bg-white/5 border-white/10 text-white rounded-xl"
                        />
                    </div>

                    <Button type="submit" disabled={loading} className="w-full bg-amber-500 hover:bg-amber-600 text-black font-bold rounded-xl">
                        {loading ? 'Saving...' : 'Save Changes'}
                    </Button>
                </form>
            </div>
        </div>
    );
}