import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { ArrowLeft, MapPin, Clock, Phone, Globe } from 'lucide-react';

const LocationDetails = () => {
  const { id } = useParams(); // Grabs the ID from the URL (e.g., "1")
  const navigate = useNavigate();
  const [location, setLocation] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchLocation = async () => {
      try {
        const { data, error } = await supabase
          .from('locations') // Make sure this matches your DB table name
          .select('*')
          .eq('id', id)
          .single();

        if (error) throw error;
        setLocation(data);
      } catch (err) {
        console.error('Error:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchLocation();
  }, [id]);

  if (loading) return <div className="p-8 text-white text-center">Loading details...</div>;
  if (!location) return <div className="p-8 text-white text-center">Location not found.</div>;

  return (
    <div className="min-h-screen bg-slate-950 pb-20">
      {/* Hero Image */}
      <div className="relative h-64 md:h-80">
        <img 
          src={location.image_url || "https://images.unsplash.com/photo-1514933651103-005eec06c04b?w=800"} 
          alt={location.name} 
          className="w-full h-full object-cover"
        />
        <button 
          onClick={() => navigate(-1)}
          className="absolute top-4 left-4 p-2 bg-black/50 backdrop-blur-md rounded-full text-white hover:bg-black/70 transition"
        >
          <ArrowLeft size={24} />
        </button>
        <div className="absolute inset-0 bg-gradient-to-t from-slate-950 via-transparent to-transparent" />
        
        <div className="absolute bottom-0 left-0 p-6">
          <h1 className="text-3xl font-bold text-white mb-2">{location.name}</h1>
          <span className="px-3 py-1 bg-amber-500 text-black text-xs font-bold rounded-full uppercase">
            {location.type || "Venue"}
          </span>
        </div>
      </div>

      {/* Details Section */}
      <div className="p-6 space-y-6">
        <p className="text-slate-300 text-lg leading-relaxed">
          {location.description || "No description available yet."}
        </p>

        <div className="space-y-4 bg-slate-900/50 p-4 rounded-xl border border-slate-800">
          <div className="flex items-start gap-3 text-slate-300">
            <MapPin className="text-amber-500 shrink-0" />
            <span>{location.address || "Address not listed"}</span>
          </div>
          <div className="flex items-center gap-3 text-slate-300">
            <Clock className="text-amber-500 shrink-0" />
            <span>Open Now • Closes 2 AM</span> {/* Placeholder data */}
          </div>
        </div>

        <button className="w-full py-4 bg-amber-500 hover:bg-amber-400 text-black font-bold rounded-xl transition shadow-lg shadow-amber-500/20">
          Check In Here
        </button>
      </div>
    </div>
  );
};

export default LocationDetails;