import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom'; // 1. Added Navigation
import { supabase } from '../lib/supabase';
import LocationCard from '../components/location/LocationCard'; 

const Home = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // 2. Initialize the navigation hook
  const navigate = useNavigate();

  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('locations')
          .select('*')
          .order('name', { ascending: true });

        if (error) throw error;
        setLocations(data || []);
      } catch (err) {
        console.error('Error fetching locations:', err.message);
        setError('Could not load locations.');
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-500 text-sm">Finding spots...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-10 text-center text-red-500">
        <p>{error}</p>
        <button onClick={() => window.location.reload()} className="mt-4 px-4 py-2 bg-gray-200 rounded">Retry</button>
      </div>
    );
  }

  return (
    <div className="pb-24 bg-gray-900 min-h-screen"> 
      {/* Dark Header to match the card style */}
      <div className="sticky top-0 z-10 bg-gray-900/95 backdrop-blur-sm border-b border-gray-800 px-4 py-4 shadow-sm">
        <h1 className="text-xl font-bold text-white">TapTap El Paso</h1>
        <p className="text-xs text-gray-400">Discover what's happening now</p>
      </div>

      <div className="p-4 grid grid-cols-1 md:grid-cols-2 gap-6">
        {locations.map((loc) => (
          <LocationCard 
            key={loc.id} 
            
            // 3. FIX: Pass the location object, but ensure 'category' exists
            // (Our DB uses 'type', but the Card wants 'category')
            location={{
              ...loc,
              category: loc.type ? loc.type.toLowerCase() : 'bar'
            }}

            // 4. FIX: Add dummy data for visual flair (we can connect real data later)
            activeCount={Math.floor(Math.random() * 50) + 10} 
            distance={null} // GPS comes later
            isCheckedIn={false}
            isNearby={true}

            // 5. FIX: The Click Handler! This makes it interactive.
            onClick={() => navigate(`/location/${loc.id}`)} 
          />
        ))}
      </div>
    </div>
  );
};

export default Home;