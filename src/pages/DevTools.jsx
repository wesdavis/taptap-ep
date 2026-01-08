import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from "@/components/ui/button";
import { motion } from 'framer-motion';
import { Users, Loader2, CheckCircle, AlertCircle, Wrench, Shield } from 'lucide-react';
import { toast } from 'sonner';

export default function DevTools() {
    const [user, setUser] = useState(null);
    const [authLoading, setAuthLoading] = useState(true);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState(null);
    const [error, setError] = useState(null);

    useEffect(() => {
        const loadUser = async () => {
            try {
                const userData = await base44.auth.me();
                setUser(userData);
            } catch (err) {
                console.error('Auth error:', err);
            } finally {
                setAuthLoading(false);
            }
        };
        loadUser();
    }, []);

    const handleGenerateSquad = async () => {
        if (!user) {
            toast.error('Please log in first');
            return;
        }

        setLoading(true);
        setResult(null);
        setError(null);

        try {
            const response = await base44.functions.invoke('seedTestData', {});
            
            if (response.data.success) {
                setResult(response.data);
                toast.success('Test squad generated successfully!');
            } else {
                setError(response.data.error || 'Failed to generate squad');
                toast.error(response.data.error || 'Failed to generate squad');
            }
        } catch (err) {
            const errorMsg = err.response?.data?.error || err.message || 'Unknown error';
            setError(errorMsg);
            toast.error(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    if (authLoading) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
                <div className="w-8 h-8 border-2 border-amber-500 border-t-transparent rounded-full animate-spin" />
            </div>
        );
    }

    if (!user) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
                <div className="text-center">
                    <Shield className="w-16 h-16 text-slate-600 mx-auto mb-4" />
                    <h2 className="text-xl font-bold text-white mb-2">Authentication Required</h2>
                    <p className="text-slate-400">Please log in to access developer tools</p>
                </div>
            </div>
        );
    }

    // if (user.role !== 'admin') {
    //     return (
    //         <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
    //             <div className="text-center">
    //                 <Shield className="w-16 h-16 text-red-600 mx-auto mb-4" />
    //                 <h2 className="text-xl font-bold text-white mb-2">Admin Access Required</h2>
    //                 <p className="text-slate-400">This page is only accessible to administrators</p>
    //             </div>
    //         </div>
    //     );
    // }

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
            <div className="max-w-2xl mx-auto px-4 py-8">
                {/* Header */}
                <div className="flex items-center gap-3 mb-8">
                    <div className="w-12 h-12 rounded-xl bg-amber-500/10 flex items-center justify-center">
                        <Wrench className="w-6 h-6 text-amber-400" />
                    </div>
                    <div>
                        <h1 className="text-2xl font-bold text-white">Developer Tools</h1>
                        <p className="text-slate-400 text-sm">Testing & data seeding utilities</p>
                    </div>
                </div>

                {/* Generate Squad Card */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="backdrop-blur-xl bg-white/5 rounded-3xl border border-white/10 p-6 mb-6"
                >
                    <div className="flex items-start gap-4 mb-4">
                        <div className="w-12 h-12 rounded-xl bg-purple-500/10 flex items-center justify-center flex-shrink-0">
                            <Users className="w-6 h-6 text-purple-400" />
                        </div>
                        <div className="flex-1">
                            <h2 className="text-lg font-bold text-white mb-2">Generate Test Squad</h2>
                            <p className="text-slate-400 text-sm mb-4">
                                Creates 3 test users (Sarah, Jessica, Mike) and checks them into the first available location.
                                Perfect for testing the discovery grid and ping functionality.
                            </p>
                            <div className="bg-slate-800/50 rounded-lg p-3 mb-4">
                                <p className="text-slate-300 text-xs font-mono mb-2">Test Users:</p>
                                <ul className="space-y-1 text-slate-400 text-xs font-mono">
                                    <li>• sarah_test@hirl.com (Female, Seeking: Male)</li>
                                    <li>• jessica_test@hirl.com (Female, Seeking: Male)</li>
                                    <li>• mike_test@hirl.com (Male, Seeking: Female)</li>
                                </ul>
                            </div>
                        </div>
                    </div>

                    <Button
                        onClick={handleGenerateSquad}
                        disabled={loading}
                        className="w-full h-12 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white font-semibold rounded-xl"
                    >
                        {loading ? (
                            <>
                                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                                Generating Squad...
                            </>
                        ) : (
                            <>
                                <Users className="w-4 h-4 mr-2" />
                                Generate Test Squad
                            </>
                        )}
                    </Button>
                </motion.div>

                {/* Success Result */}
                {result && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="backdrop-blur-xl bg-green-500/10 rounded-2xl border border-green-500/20 p-6"
                    >
                        <div className="flex items-start gap-3 mb-4">
                            <CheckCircle className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" />
                            <div className="flex-1">
                                <h3 className="text-white font-semibold mb-1">Success!</h3>
                                <p className="text-green-300 text-sm mb-3">{result.message}</p>
                                
                                <div className="space-y-2">
                                    {result.users?.map((user, idx) => (
                                        <div key={idx} className="flex items-center gap-2 text-sm">
                                            <span className="text-slate-400">•</span>
                                            <span className="text-white">{user.full_name}</span>
                                            <span className="text-slate-500">({user.email})</span>
                                            <span className={`px-2 py-0.5 rounded text-xs ${
                                                user.status === 'created' 
                                                    ? 'bg-green-500/20 text-green-400' 
                                                    : 'bg-blue-500/20 text-blue-400'
                                            }`}>
                                                {user.status}
                                            </span>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </motion.div>
                )}

                {/* Error Result */}
                {error && (
                    <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        className="backdrop-blur-xl bg-red-500/10 rounded-2xl border border-red-500/20 p-6"
                    >
                        <div className="flex items-start gap-3">
                            <AlertCircle className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" />
                            <div>
                                <h3 className="text-white font-semibold mb-1">Error</h3>
                                <p className="text-red-300 text-sm">{error}</p>
                            </div>
                        </div>
                    </motion.div>
                )}
            </div>
        </div>
    );
}