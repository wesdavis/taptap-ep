import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { createPageUrl } from './utils'; 
import { Home, User } from 'lucide-react';
import { AuthProvider, useAuth } from '@/lib/AuthContext';

function LayoutContent({ children }) {
    const location = useLocation();
    const { user } = useAuth();

    const isDevTools = location.pathname === '/dev-tools';
    const isAuth = location.pathname === '/auth';
    
    // Show Nav if logged in AND not on special pages (auth/devtools)
    const showNav = user && !isDevTools && !isAuth;

    const navItems = [
        { name: 'Home', icon: Home, page: 'Home' },
        { name: 'Profile', icon: User, page: 'Profile' }
    ];

    return (
        <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950">
            <main className={showNav ? "pb-20" : ""}>{children}</main>
            
            {showNav && (
                <nav className="fixed bottom-0 left-0 right-0 z-50">
                    <div className="max-w-lg mx-auto px-4 pb-4">
                        <div className="backdrop-blur-xl bg-white/10 rounded-2xl border border-white/10 p-2">
                            <div className="flex justify-around">
                                {navItems.map((item) => (
                                    <Link
                                        key={item.name}
                                        to={createPageUrl(item.page)}
                                        className="flex flex-col items-center gap-1 px-6 py-2 rounded-xl text-slate-400 hover:text-white hover:bg-white/5 transition-all"
                                    >
                                        <item.icon className="w-5 h-5" />
                                        <span className="text-xs font-medium">{item.name}</span>
                                    </Link>
                                ))}
                            </div>
                        </div>
                    </div>
                </nav>
            )}
        </div>
    );
}

export default function Layout({ children }) {
    return (
        <AuthProvider>
            <LayoutContent>{children}</LayoutContent>
        </AuthProvider>
    );
}