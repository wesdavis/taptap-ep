import { useEffect, useRef } from 'react'; // 🟢 Added useRef
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { Toaster, toast } from 'sonner';
import OneSignal from 'react-onesignal'; 

// Components & Pages
import GlobalNotificationLayer from './components/GlobalNotificationLayer'; 
import Home from './pages/Home';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import ProfileSetup from './pages/ProfileSetup';
import PublicProfile from './pages/PublicProfile';
import LocationDetails from './pages/LocationDetails'; 
import Achievements from './pages/Achievements';
import Settings from './pages/Settings';
import BusinessDashboard from './pages/BusinessDashboard';
import { supabase } from '@/lib/supabase'; 

const queryClient = new QueryClient();

// 🟢 CONFIG: How long before auto-logout? (30 Minutes)
const IDLE_TIMEOUT_MS = 30 * 60 * 1000; 

const PageNotFound = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
    <h1 className="text-xl font-bold text-slate-500">404 - Page Not Found</h1>
  </div>
);

const AuthenticatedApp = () => {
  // 🟢 Added 'logout' to destructuring
  const { user, loading, profileMissing, logout } = useAuth();
  const timerRef = useRef(null);

  // 🟢 1. GHOSTBUSTER IDLE TIMER
  useEffect(() => {
    if (!user) return;

    const handleIdleLogout = async () => {
      console.log("💤 User idle. Auto-logging out...");
      
      // A. Ghostbuster: Check out of location
      try {
        await supabase
          .from('checkins')
          .update({ is_active: false })
          .eq('user_id', user.id);
      } catch (err) { console.error("Error clearing checkin:", err); }

      // B. Sign Out
      if (logout) await logout();
      toast("You were logged out due to inactivity.");
    };

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(handleIdleLogout, IDLE_TIMEOUT_MS);
    };

    // Events to watch for activity
    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    
    // Attach listeners
    events.forEach(event => document.addEventListener(event, resetTimer));
    
    // Start the timer immediately
    resetTimer();

    // Cleanup listeners on unmount
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [user, logout]);


  // 🟢 2. ONESIGNAL INIT LOGIC
  useEffect(() => {
    if (user) {
      OneSignal.init({
        appId: "d973eb4b-43b6-4608-aa45-70723fdd18c4", 
        allowLocalhostAsSecureOrigin: true,
      }).then(async () => {
        console.log("OneSignal Initialized");

        // Login the user
        await OneSignal.login(user.id);

        // Force Save ID
        const currentId = OneSignal.User.PushSubscription.id;
        if (currentId) {
            console.log("Found existing OneSignal ID:", currentId);
            const { error } = await supabase
                .from('profiles')
                .update({ onesignal_id: currentId })
                .eq('id', user.id);
            if (error) console.error("Error saving ID:", error);
        }

        OneSignal.Slidedown.promptPush();
      });

      // Listen for future changes
      OneSignal.User.PushSubscription.addEventListener("change", async (event) => {
        if (event.current.id) {
            console.log("New OneSignal ID detected:", event.current.id);
            await supabase
                .from('profiles')
                .update({ onesignal_id: event.current.id })
                .eq('id', user.id);
        }
      });
    }
  }, [user]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/landing" element={user ? <Navigate to="/" replace /> : <Landing />} />
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
      <Route path="/" element={
        !user ? <Navigate to="/landing" replace /> 
        : profileMissing ? <Navigate to="/profile-setup" replace /> 
        : <Home />
      } />
      <Route path="/location/:id" element={!user ? <Navigate to="/landing" replace /> : <LocationDetails />} />
      <Route path="/user/:userId" element={!user ? <Navigate to="/landing" replace /> : <PublicProfile />} />
      <Route path="/profile-setup" element={!user ? <Navigate to="/landing" replace /> : <ProfileSetup />} />
      <Route path="/achievements" element={!user ? <Navigate to="/landing" replace /> : <Achievements />} />
      <Route path="/settings" element={!user ? <Navigate to="/landing" replace /> : <Settings />} />
      <Route path="/business" element={!user ? <Navigate to="/landing" replace /> : <BusinessDashboard />} />
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
            <GlobalNotificationLayer />
            <Toaster position="top-center" />
            <AuthenticatedApp />
        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;