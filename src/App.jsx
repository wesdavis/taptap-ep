import { useEffect } from 'react'; // 🟢 Added useEffect
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext';
import { Toaster } from 'sonner';
import OneSignal from 'react-onesignal'; // 🟢 Import OneSignal

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
import { supabase } from '@/lib/supabase'; // 🟢 Needed for saving the ID

const queryClient = new QueryClient();

const PageNotFound = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
    <h1 className="text-xl font-bold text-slate-500">404 - Page Not Found</h1>
  </div>
);

const AuthenticatedApp = () => {
  const { user, loading, profileMissing } = useAuth();

  useEffect(() => {
    if (user) {
      // 1. Initialize OneSignal
      OneSignal.init({
        appId: "d973eb4b-43b6-4608-aa45-70723fdd18c4", // ⚠️ MAKE SURE THIS IS FILLED IN
        allowLocalhostAsSecureOrigin: true,
      }).then(async () => {
        console.log("OneSignal Initialized");

        // 2. Login the user (Links Supabase ID to OneSignal)
        await OneSignal.login(user.id);

        // 3. FORCE GET ID (Don't just wait for changes)
        // This fixes the bug where "Already Subscribed" users never save their ID
        const currentId = OneSignal.User.PushSubscription.id;
        if (currentId) {
            console.log("Found existing OneSignal ID:", currentId);
            const { error } = await supabase
                .from('profiles')
                .update({ onesignal_id: currentId })
                .eq('id', user.id);
            if (error) console.error("Error saving ID:", error);
        }

        // 4. Prompt for Push (If not already granted)
        OneSignal.Slidedown.promptPush();
      });

      // 5. Listen for future changes (e.g. they enable it later)
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