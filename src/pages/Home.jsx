import { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import LocationCard from '../components/location/LocationCard'; 

const Home = () => {
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

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
        <p className="text-gray-500">Finding spots near you...</p>
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
    <div className="pb-20 bg-gray-50 min-h-screen"> 
      <div className="sticky top-0 z-10 bg-white border-b px-4 py-3 shadow-sm">
        <h1 className="text-xl font-bold text-gray-900">Discover</h1>
        <p className="text-xs text-gray-500">Tap a location to check in</p>
      </div>

      <div className="p-4 space-y-4">
        {locations.length === 0 ? (
          <p className="text-center text-gray-400 mt-10">No locations found.</p>
        ) : (
          locations.map((location) => (
            <LocationCard 
              key={location.id} 
              
              /* 👇 THIS IS THE CRITICAL FIX 👇 */
              location={location} 
              /* 👆 WITHOUT THIS LINE, THE APP CRASHES 👆 */

              id={location.id}
              name={location.name}
              type={location.type}
              description={location.description}
              image={location.image_url} 
              distance="0.5 mi" 
            />
          ))
        )}
      </div>
    </div>
  );
};

export default Home;