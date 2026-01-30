import React from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Home, User, MapPin } from 'lucide-react';
import { cn } from "@/lib/utils";

export default function BottomNav() {
    const navigate = useNavigate();
    const location = useLocation();

    // Don't show nav on these pages
    const hiddenRoutes = ['/auth', '/landing', '/profile-setup'];
    if (hiddenRoutes.includes(location.pathname)) return null;

    const navItems = [
        { icon: Home, label: 'Home', path: '/' },
        { icon: User, label: 'Profile', path: '/profile' },
    ];

    return (
        <div className="fixed bottom-0 left-0 w-full bg-slate-950/90 backdrop-blur-lg border-t border-white/10 p-4 pb-6 z-50">
            <div className="flex justify-around items-center max-w-md mx-auto">
                {navItems.map((item) => {
                    const isActive = location.pathname === item.path;
                    return (
                        <button
                            key={item.path}
                            onClick={() => navigate(item.path)}
                            className={cn(
                                "flex flex-col items-center gap-1 transition-colors",
                                isActive ? "text-amber-500" : "text-slate-500 hover:text-slate-300"
                            )}
                        >
                            <item.icon className={cn("w-6 h-6", isActive && "fill-current")} />
                            <span className="text-xs font-medium">{item.label}</span>
                        </button>
                    );
                })}
            </div>
        </div>
    );
}