import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { motion } from 'framer-motion';

export default function ProfileSetup() {
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        full_name: '',
        gender: '',
        seeking: '',
        bio: ''
    });

    const handleSubmit = async (e) => {
        e.preventDefault();
        
        if (!formData.full_name || !formData.gender || !formData.seeking) {
            toast.error('Please fill in all required fields');
            return;
        }

        setLoading(true);
        try {
            await base44.auth.updateMe(formData);
            toast.success('Profile created!');
            window.location.href = '/';
        } catch (error) {
            toast.error('Failed to save profile');
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="max-w-md w-full backdrop-blur-xl bg-white/5 rounded-3xl border border-white/10 p-8"
            >
                <div className="text-center mb-8">
                    <div className="w-16 h-16 rounded-full bg-amber-500/20 flex items-center justify-center mx-auto mb-4">
                        <Sparkles className="w-8 h-8 text-amber-400" />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Complete Your Profile</h1>
                    <p className="text-slate-400">Let's get you set up to start connecting</p>
                </div>

                <form onSubmit={handleSubmit} className="space-y-5">
                    <div>
                        <Label className="text-slate-300 mb-2 block">Full Name *</Label>
                        <Input
                            value={formData.full_name}
                            onChange={(e) => setFormData(prev => ({ ...prev, full_name: e.target.value }))}
                            placeholder="Your full name"
                            className="bg-white/5 border-white/10 text-white h-12 rounded-xl"
                            required
                        />
                    </div>

                    <div>
                        <Label className="text-slate-300 mb-2 block">Gender *</Label>
                        <Select
                            value={formData.gender}
                            onValueChange={(v) => setFormData(prev => ({ ...prev, gender: v }))}
                            required
                        >
                            <SelectTrigger className="bg-white/5 border-white/10 text-white h-12 rounded-xl">
                                <SelectValue placeholder="Select your gender" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="other">Other</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label className="text-slate-300 mb-2 block">Seeking *</Label>
                        <Select
                            value={formData.seeking}
                            onValueChange={(v) => setFormData(prev => ({ ...prev, seeking: v }))}
                            required
                        >
                            <SelectTrigger className="bg-white/5 border-white/10 text-white h-12 rounded-xl">
                                <SelectValue placeholder="Who are you seeking?" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="male">Male</SelectItem>
                                <SelectItem value="female">Female</SelectItem>
                                <SelectItem value="everyone">Everyone</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div>
                        <Label className="text-slate-300 mb-2 block">Bio (Optional)</Label>
                        <Textarea
                            value={formData.bio}
                            onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                            placeholder="Tell others about yourself..."
                            className="bg-white/5 border-white/10 text-white rounded-xl resize-none"
                            rows={4}
                        />
                    </div>

                    <Button
                        type="submit"
                        disabled={loading}
                        className="w-full h-12 bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-semibold rounded-xl"
                    >
                        {loading ? 'Saving...' : 'Complete Profile'}
                    </Button>
                </form>
            </motion.div>
        </div>
    );
}