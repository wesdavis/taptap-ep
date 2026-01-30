import { useEffect } from 'react';
import { useLocation } from 'react-router-dom';

export default function NavigationTracker() {
    const location = useLocation();

    useEffect(() => {
        // Just log navigation to the local console for debugging
        console.log(`📱 Navigated to: ${location.pathname}`);
    }, [location]);

    return null;
}