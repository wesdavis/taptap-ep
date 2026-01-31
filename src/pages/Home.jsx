import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import LocationCard from '../components/location/LocationCard'; // Assuming you have this component

const Home = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Fetch locations from Supabase when the page loads
  useEffect(() => {
    const fetchLocations = async () => {
      try {
        setLoading(true);
        // We select all columns (*) from the 'locations' table
        const { data, error } = await supabase
          .from('locations')
          .select('*')
          .order('name', { ascending: true }); // Alphabetical order

        if (error) throw error;
        setLocations(data);
      } catch (err) {
        console.error('Error fetching locations:', err.message);
        setError('Could not load locations. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    fetchLocations();
  }, []);

  // 1. Loading State (Show a spinner or text while waiting for Supabase)
  if (loading) {
    return (
      <div className="flex items-center justify-center h-screen bg-gray-50">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
          <p className="text-gray-500">Finding spots near you...</p>
        </div>
      </div>
    );
  }

  // 2. Error State (If Supabase fails)
  if (error) {
    return (
      <div className="p-4 text-center text-red-500 bg-red-50 h-screen flex flex-col justify-center">
        <p>{error}</p>
        <button 
          onClick={() => window.location.reload()} 
          className="mt-4 px-4 py-2 bg-red-100 rounded-md text-sm font-medium"
        >
          Retry
        </button>
      </div>
    );
  }

  // 3. The Main UI (The List of Locations)
  return (
    <div className="pb-20 bg-gray-50 min-h-screen"> 
      {/* Header Section */}
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Discover</h1>
        <p className="text-xs text-gray-500">Tap a location to check in</p>
      </div>

      {/* Locations Grid/List */}
      <div className="p-4 space-y-4">
        {locations.length === 0 ? (
          <p className="text-center text-gray-400 mt-10">No locations found.</p>
        ) : (
          locations.map((location) => (
            // We pass the database data into your LocationCard component
            <LocationCard 
              key={location.id} 
              id={location.id}
              name={location.name}
              type={location.type}
              description={location.description}
              image={location.image_url} // Note: Supabase column is image_url
              distance="0.5 mi" // Placeholder - real GPS math comes later
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Home;