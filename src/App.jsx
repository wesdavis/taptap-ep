import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './lib/AuthContext'; // Check if path is ./lib or @/lib depending on your setup
import { Toaster } from 'sonner'; // Using Sonner for the toasts we added earlier

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

const queryClient = new QueryClient();

// 🟢 Helper for 404s
const PageNotFound = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
    <h1 className="text-xl font-bold text-slate-500">404 - Page Not Found</h1>
  </div>
);

// 🟢 The Main Routing Logic
const AuthenticatedApp = () => {
  const { user, loading, profileMissing } = useAuth();

  // 1. Show Loading Spinner while checking auth
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  // 2. Define Routes based on Auth State
  return (
    <Routes>
      {/* PUBLIC ROUTES */}
      <Route path="/landing" element={user ? <Navigate to="/" replace /> : <Landing />} />
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />

      {/* PROTECTED ROUTES */}
      {/* If logged in but no profile, force Profile Setup */}
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

      {/* Catch-all */}
      <Route path="*" element={<PageNotFound />} />
    </Routes>
  );
};

// 🟢 The Root Component
function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AuthProvider>
            
            {/* 1. The Global Game HUD (Popups & Notifications) */}
            <GlobalNotificationLayer />
            
            {/* 2. The Toast Manager (Alerts) */}
            <Toaster position="top-center" />

            {/* 3. The Pages */}
            <AuthenticatedApp />

        </AuthProvider>
      </BrowserRouter>
    </QueryClientProvider>
  );
}

export default App;