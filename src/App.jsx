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

  // 🟢 ONESIGNAL INIT LOGIC
  useEffect(() => {
    if (user) {
      // 1. Initialize OneSignal
      // You must get this App ID from the OneSignal Dashboard
      OneSignal.init({
        appId: "d973eb4b-43b6-4608-aa45-70723fdd18c4", // ⚠️ REPLACE THIS
        allowLocalhostAsSecureOrigin: true, // For testing
      }).then(() => {
        // 2. Ask for Permission
        OneSignal.Slidedown.promptPush();
      });

      // 3. Save the OneSignal ID to Supabase
      // This runs when the user subscribes or we get their ID
      OneSignal.User.PushSubscription.addEventListener("change", async (event) => {
        if (event.current.id) {
            console.log("OneSignal ID:", event.current.id);
            await supabase
                .from('profiles')
                .update({ onesignal_id: event.current.id })
                .eq('id', user.id);
        }
      });
      
      // Also try to login the user to OneSignal to track them
      OneSignal.login(user.id);
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