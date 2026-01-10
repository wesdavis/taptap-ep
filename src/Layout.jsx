import React from 'react';
import { Link } from 'react-router-dom';
import { createPageUrl } from '@/utils';
import { Home, User } from 'lucide-react';

export default function Layout({ children, currentPageName }) {
    // 1. Define the pages where the bottom nav should BE HIDDEN
    const isPublicPage = currentPageName === 'Landing';

    const navItems = [
        { name: 'Home', icon: Home, page: 'Home' },
        { name: 'Profile', icon: User, page: 'Profile' }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
            {children}
            
            {/* 2. ONLY show the nav if we are NOT on the Landing page */}
            {!isPublicPage && (
                <nav className="fixed bottom-0 left-0 right-0 z-50">
                    <div className="max-w-lg mx-auto px-4 pb-4">
                        <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/10 p-2">
                            <div className="flex justify-around">
                                {navItems.map((item) => {
                                    const isActive = currentPageName === item.page;
                                    const Icon = item.icon;
                                    
                                    return (
                                        <Link
                                            key={item.name}
                                            to={createPageUrl(item.page)}
                                            className={`flex flex-col items-center gap-1 px-6 py-2 rounded-xl transition-all ${
                                                isActive 
                                                    ? 'bg-amber-500/20 text-amber-400' 
                                                    : 'text-slate-400 hover:text-white'
                                            }`}
                                        >
                                            <Icon className="w-5 h-5" />
                                            <span className="text-xs font-medium">{item.name}</span>
                                        </Link>
                                    );
                                })}
                            </div>
                        </div>
                    </div>
                </nav>
            )}
        </div>
    );
}