import { useEffect, useRef, useState } from 'react'; 
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { Toaster, toast } from 'sonner';
import OneSignal from 'react-onesignal'; 

// Components & Pages
import GlobalNotificationLayer from './components/GlobalNotificationLayer'; 
import Splash from './components/ui/Splash'; 
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
import AdminDashboard from './pages/AdminDashboard';
import UpdatePassword from '@/pages/UpdatePassword'; 

const queryClient = new QueryClient();

// 🟢 CONFIG: How long before auto-logout? (60 Minutes)
const IDLE_TIMEOUT_MS = 60 * 60 * 1000; 

const PageNotFound = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
    <h1 className="text-xl font-bold text-slate-500">404 - Page Not Found</h1>
  </div>
);

const AuthenticatedApp = () => {
  const { user, loading, profileMissing, logout } = useAuth();
  const [splashDone, setSplashDone] = useState(false); 
  const timerRef = useRef(null);

  // 🟢 1. SPLASH SCREEN TIMER
  useEffect(() => {
    const timer = setTimeout(() => {
      setSplashDone(true);
    }, 2500);
    return () => clearTimeout(timer);
  }, []);

  // 🟢 2. GHOSTBUSTER IDLE TIMER
  useEffect(() => {
    if (!user) return;

    const handleIdleLogout = async () => {
      console.log("💤 User idle. Auto-logging out...");
      
      try {
        await supabase
          .from('checkins')
          .update({ is_active: false })
          .eq('user_id', user.id);
      } catch (err) { console.error("Error clearing checkin:", err); }

      if (logout) await logout();
      toast("You were logged out due to inactivity.");
    };

    const resetTimer = () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      timerRef.current = setTimeout(handleIdleLogout, IDLE_TIMEOUT_MS);
    };

    const events = ['mousedown', 'mousemove', 'keypress', 'scroll', 'touchstart'];
    events.forEach(event => document.addEventListener(event, resetTimer));
    
    resetTimer();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
      events.forEach(event => document.removeEventListener(event, resetTimer));
    };
  }, [user, logout]);


  // 🟢 3. ONESIGNAL INIT LOGIC (FIXED)
  useEffect(() => {
    if (user && !window.OneSignalInitialized) {
      window.OneSignalInitialized = true; 

      const setupOneSignal = async () => {
        try {
          // 1. Wait for init to completely finish
          await OneSignal.init({
            appId: "d973eb4b-43b6-4608-aa45-70723fdd18c4", 
            allowLocalhostAsSecureOrigin: true,
          });
          console.log("✅ OneSignal Initialized");

          // 2. Login the user
          await OneSignal.login(user.id);

          // 3. Ensure the object exists before reading it!
          if (OneSignal.User && OneSignal.User.PushSubscription) {
              const currentId = OneSignal.User.PushSubscription.id;
              
              if (currentId) {
                  console.log("Found existing OneSignal ID:", currentId);
                  await supabase
                      .from('profiles')
                      .update({ onesignal_id: currentId })
                      .eq('id', user.id);
              }

              // 4. Safely attach listener AFTER everything is loaded
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

          // 5. Prompt for push
          if (OneSignal.Slidedown) {
              OneSignal.Slidedown.promptPush();
          }

        } catch (error) {
          console.error("❌ OneSignal Setup Error:", error);
        }
      };

      setupOneSignal();
    }
  }, [user]);

  // 🟢 4. LOADING STATE -> SHOW SPLASH SCREEN
  if (loading || !splashDone) {
    return <Splash />;
  }

  return (
    <Routes>
      <Route path="/landing" element={user ? <Navigate to="/" replace /> : <Landing />} />
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />
      
      {/* 🟢 Protected Route Logic */}
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
      <Route path="/admin" element={user ? <AdminDashboard /> : <Navigate to="/landing" />} />
      <Route path="/update-password" element={<UpdatePassword />} />
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