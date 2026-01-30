import React, { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group";
import { base44 } from '@/api/base44Client';
import { Upload, Sparkles, ArrowRight } from 'lucide-react';
import { motion } from 'framer-motion';

export default function ProfileSetup({ user, onComplete }) {
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [uploading, setUploading] = useState(false);
    const [formData, setFormData] = useState({
        gender: user?.gender || '',
        seeking: user?.seeking || '',
        bio: user?.bio || '',
        photo_url: user?.photo_url || '',
        age: user?.age || '',
        private_mode: user?.private_mode || false
    });

    const handlePhotoUpload = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;
        
        setUploading(true);
        const { file_url } = await base44.integrations.Core.UploadFile({ file });
        setFormData(prev => ({ ...prev, photo_url: file_url }));
        setUploading(false);
    };

    const handleSubmit = async () => {
        setLoading(true);
        await base44.auth.updateMe(formData);
        setLoading(false);
        onComplete();
    };

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
            <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="w-full max-w-md"
            >
                <div className="text-center mb-8">
                    <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/20 mb-4">
                        <Sparkles className="w-4 h-4 text-amber-400" />
                        <span className="text-amber-300 text-sm font-medium">Complete Your Profile</span>
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">Welcome</h1>
                    <p className="text-slate-400">Let's set up your profile to get started</p>
                </div>

                <div className="backdrop-blur-xl bg-white/5 rounded-3xl border border-white/10 p-8">
                    {step === 1 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-6"
                        >
                            <div className="text-center">
                                <p className="text-slate-300 mb-4">How do you identify?</p>
                                <RadioGroup
                                    value={formData.gender}
                                    onValueChange={(v) => setFormData(prev => ({ ...prev, gender: v }))}
                                    className="flex justify-center gap-4"
                                >
                                    {['female', 'male', 'other'].map((g) => (
                                        <div key={g}>
                                            <RadioGroupItem
                                                value={g}
                                                id={g}
                                                className="peer sr-only"
                                            />
                                            <Label
                                                htmlFor={g}
                                                className="flex items-center justify-center px-6 py-3 rounded-xl border border-white/10 bg-white/5 cursor-pointer transition-all peer-data-[state=checked]:border-amber-500 peer-data-[state=checked]:bg-amber-500/10 hover:bg-white/10 text-slate-300 peer-data-[state=checked]:text-amber-300 capitalize"
                                            >
                                                {g}
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            </div>
                            <Button
                                onClick={() => setStep(2)}
                                disabled={!formData.gender}
                                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-semibold h-12 rounded-xl"
                            >
                                Continue <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </motion.div>
                    )}

                    {step === 2 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-6"
                        >
                            <div className="text-center">
                                <p className="text-slate-300 mb-4">Who are you interested in meeting?</p>
                                <RadioGroup
                                    value={formData.seeking}
                                    onValueChange={(v) => setFormData(prev => ({ ...prev, seeking: v }))}
                                    className="flex flex-wrap justify-center gap-3"
                                >
                                    {['female', 'male', 'other', 'everyone'].map((s) => (
                                        <div key={s}>
                                            <RadioGroupItem
                                                value={s}
                                                id={`seeking-${s}`}
                                                className="peer sr-only"
                                            />
                                            <Label
                                                htmlFor={`seeking-${s}`}
                                                className="flex items-center justify-center px-5 py-2.5 rounded-xl border border-white/10 bg-white/5 cursor-pointer transition-all peer-data-[state=checked]:border-amber-500 peer-data-[state=checked]:bg-amber-500/10 hover:bg-white/10 text-slate-300 peer-data-[state=checked]:text-amber-300 capitalize"
                                            >
                                                {s}
                                            </Label>
                                        </div>
                                    ))}
                                </RadioGroup>
                            </div>
                            <Button
                                onClick={() => setStep(3)}
                                disabled={!formData.seeking}
                                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-semibold h-12 rounded-xl"
                            >
                                Continue <ArrowRight className="w-4 h-4 ml-2" />
                            </Button>
                        </motion.div>
                    )}

                    {step === 3 && (
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            className="space-y-6"
                        >
                            <div className="flex flex-col items-center">
                                <div className="relative mb-4">
                                    {formData.photo_url ? (
                                        <img
                                            src={formData.photo_url}
                                            alt="Profile"
                                            className="w-32 h-32 rounded-full object-cover border-4 border-amber-500/30"
                                        />
                                    ) : (
                                        <div className="w-32 h-32 rounded-full bg-white/10 border-2 border-dashed border-white/20 flex items-center justify-center">
                                            <Upload className="w-8 h-8 text-slate-500" />
                                        </div>
                                    )}
                                    <input
                                        type="file"
                                        accept="image/*"
                                        onChange={handlePhotoUpload}
                                        className="absolute inset-0 opacity-0 cursor-pointer"
                                    />
                                </div>
                                {uploading && <p className="text-amber-400 text-sm">Uploading...</p>}
                                <p className="text-slate-400 text-sm">Tap to upload photo</p>
                            </div>

                            <div className="space-y-4">
                                <div>
                                    <Label className="text-slate-300 mb-2 block">Age</Label>
                                    <Input
                                        type="number"
                                        placeholder="Your age"
                                        value={formData.age}
                                        onChange={(e) => setFormData(prev => ({ ...prev, age: parseInt(e.target.value) || '' }))}
                                        className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 h-12 rounded-xl"
                                    />
                                </div>
                                <div>
                                    <Label className="text-slate-300 mb-2 block">Bio</Label>
                                    <Textarea
                                        placeholder="Tell others about yourself..."
                                        value={formData.bio}
                                        onChange={(e) => setFormData(prev => ({ ...prev, bio: e.target.value }))}
                                        className="bg-white/5 border-white/10 text-white placeholder:text-slate-500 rounded-xl resize-none"
                                        rows={3}
                                    />
                                </div>
                            </div>

                            <Button
                                onClick={handleSubmit}
                                disabled={loading || !formData.photo_url}
                                className="w-full bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-600 hover:to-orange-600 text-black font-semibold h-12 rounded-xl"
                            >
                                {loading ? 'Saving...' : 'Complete Setup'}
                            </Button>
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </div>
    );
}