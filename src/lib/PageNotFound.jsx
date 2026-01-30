import React from 'react';
import { useNavigate } from "react-router-dom";
import { Button } from "@/components/ui/button";
import { Ghost } from 'lucide-react';

export default function PageNotFound() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center p-4">
            <div className="text-center space-y-6 max-w-md mx-auto">
                <div className="w-24 h-24 bg-white/5 rounded-full flex items-center justify-center mx-auto border border-white/10">
                    <Ghost className="w-12 h-12 text-slate-400" />
                </div>
                
                <div className="space-y-2">
                    <h1 className="text-4xl font-bold text-white">Page Not Found</h1>
                    <p className="text-slate-400">
                        The page you are looking for doesn't exist or has been moved.
                    </p>
                </div>

                <Button 
                    onClick={() => navigate('/')}
                    className="h-12 px-8 bg-amber-500 hover:bg-amber-600 text-black font-semibold rounded-xl"
                >
                    Return Home
                </Button>
            </div>
        </div>
    );
}