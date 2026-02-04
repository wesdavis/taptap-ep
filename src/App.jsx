import { Toaster } from "@/components/ui/toaster"
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { BrowserRouter as Router, Route, Routes, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from '@/lib/AuthContext';

// Components
import PingListener from '@/components/PingListener';

// Pages
import Home from './pages/Home';
import Landing from './pages/Landing';
import Auth from './pages/Auth';
import ProfileSetup from './pages/ProfileSetup';
import PublicProfile from './pages/PublicProfile';
import LocationDetails from './pages/LocationDetails'; 
import Achievements from './pages/Achievements'; // <--- 1. NEW IMPORT

// Create a client
const queryClient = new QueryClient();

const PageNotFound = () => (
  <div className="min-h-screen bg-slate-950 flex items-center justify-center text-white">
    404 - Page Not Found
  </div>
);

const AuthenticatedApp = () => {
  const { user, loading, profileMissing } = useAuth();

  if (loading) {
    return (
      <div className="fixed inset-0 flex items-center justify-center bg-slate-950">
        <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin"></div>
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/landing" element={user ? <Navigate to="/" replace /> : <Landing />} />
      <Route path="/auth" element={user ? <Navigate to="/" replace /> : <Auth />} />

      {/* Main App */}
      <Route path="/" element={
        !user ? <Navigate to="/landing" replace /> : 
        (profileMissing ? <Navigate to="/profile-setup" replace /> : <Home />)
      } />

      {/* 👇 2. NEW ROUTE FOR LOCATIONS 👇 */}
      <Route path="/location/:id" element={
        !user ? <Navigate to="/landing" replace /> : <LocationDetails />
      } />

      <Route path="/user/:userid" element={
        !user ? <Navigate to="/landing" replace /> : <PublicProfile />
      } />

      <Route path="/profile-setup" element={
        !user ? <Navigate to="/landing" replace /> : <ProfileSetup />
      } />

      <Route path="*" element={<PageNotFound />} />

      <Route path="/achievements" element={<Achievements />} />
    
    </Routes>
  );
};

function App() {
  return (
    <AuthProvider>
      <QueryClientProvider client={queryClient}>
        <Router>
          <PingListener />
          <div className="min-h-screen bg-slate-950"> 
             <AuthenticatedApp />
          </div>
        </Router>
        <Toaster />
      </QueryClientProvider>
    </AuthProvider>
  )
}

export default App;