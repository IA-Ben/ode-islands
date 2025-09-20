"use client";

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';

interface VenueDetails {
  section?: string;
  gate?: string;
  doorsOpenTime?: string;
  accessNotes?: string;
  parkingInfo?: string;
  transportInfo?: string;
}

interface VenueInfo {
  eventId: string;
  eventTitle: string;
  venueName?: string;
  venueAddress?: string;
  venueLatitude?: number;
  venueLongitude?: number;
  venueDetails?: VenueDetails;
  startTime: string;
  endTime: string;
  isActive: boolean;
}

interface VenueNavigationProps {
  eventId: string;
  className?: string;
}

export default function VenueNavigation({ eventId, className = "" }: VenueNavigationProps) {
  const [venue, setVenue] = useState<VenueInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchVenueInfo = async () => {
      try {
        setLoading(true);
        const response = await fetch(`/api/events/${eventId}/venue`, {
          credentials: 'include'
        });
        
        if (response.ok) {
          const data = await response.json();
          if (data.success && data.hasVenueInfo) {
            setVenue(data.venue);
          } else {
            setVenue(null);
          }
        } else {
          throw new Error('Failed to fetch venue information');
        }
      } catch (err) {
        console.error('Error fetching venue info:', err);
        setError('Failed to load venue information');
        setVenue(null);
      } finally {
        setLoading(false);
      }
    };

    if (eventId) {
      fetchVenueInfo();
    }
  }, [eventId]);

  const handleOpenMap = () => {
    if (!venue) return;

    // Use browser geolocation to get user's current position
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const userLat = position.coords.latitude;
          const userLng = position.coords.longitude;
          
          // Create Google Maps URL with directions
          let mapUrl = '';
          
          if (venue.venueLatitude && venue.venueLongitude) {
            // Use precise coordinates if available
            mapUrl = `https://www.google.com/maps/dir/${userLat},${userLng}/${venue.venueLatitude},${venue.venueLongitude}`;
          } else if (venue.venueAddress) {
            // Fallback to address search
            const encodedAddress = encodeURIComponent(venue.venueAddress);
            mapUrl = `https://www.google.com/maps/dir/${userLat},${userLng}/${encodedAddress}`;
          } else if (venue.venueName) {
            // Fallback to venue name search
            const encodedVenueName = encodeURIComponent(venue.venueName);
            mapUrl = `https://www.google.com/maps/search/${encodedVenueName}`;
          }
          
          if (mapUrl) {
            window.open(mapUrl, '_blank');
          }
        },
        (error) => {
          console.warn('Geolocation error:', error);
          // Fallback without user location
          let mapUrl = '';
          
          if (venue.venueLatitude && venue.venueLongitude) {
            mapUrl = `https://www.google.com/maps/place/${venue.venueLatitude},${venue.venueLongitude}`;
          } else if (venue.venueAddress) {
            const encodedAddress = encodeURIComponent(venue.venueAddress);
            mapUrl = `https://www.google.com/maps/search/${encodedAddress}`;
          } else if (venue.venueName) {
            const encodedVenueName = encodeURIComponent(venue.venueName);
            mapUrl = `https://www.google.com/maps/search/${encodedVenueName}`;
          }
          
          if (mapUrl) {
            window.open(mapUrl, '_blank');
          }
        },
        {
          enableHighAccuracy: true,
          timeout: 5000,
          maximumAge: 300000 // 5 minutes
        }
      );
    } else {
      // No geolocation support, open map without directions
      let mapUrl = '';
      
      if (venue.venueLatitude && venue.venueLongitude) {
        mapUrl = `https://www.google.com/maps/place/${venue.venueLatitude},${venue.venueLongitude}`;
      } else if (venue.venueAddress) {
        const encodedAddress = encodeURIComponent(venue.venueAddress);
        mapUrl = `https://www.google.com/maps/search/${encodedAddress}`;
      } else if (venue.venueName) {
        const encodedVenueName = encodeURIComponent(venue.venueName);
        mapUrl = `https://www.google.com/maps/search/${encodedVenueName}`;
      }
      
      if (mapUrl) {
        window.open(mapUrl, '_blank');
      }
    }
  };

  const formatTime = (timeString: string) => {
    try {
      const date = new Date(timeString);
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
        hour12: true
      });
    } catch (err) {
      return timeString;
    }
  };

  const formatDoorsOpenTime = (doorsOpenTime: string) => {
    try {
      // Try to parse as ISO date first
      if (doorsOpenTime.includes('T') || doorsOpenTime.includes('Z')) {
        const date = new Date(doorsOpenTime);
        return date.toLocaleTimeString('en-US', {
          hour: 'numeric',
          minute: '2-digit',
          hour12: true
        });
      }
      // Otherwise, assume it's already formatted time
      return doorsOpenTime;
    } catch (err) {
      return doorsOpenTime;
    }
  };

  // Don't render anything if loading or no venue info
  if (loading) return null;
  if (error || !venue) return null;

  return (
    <Card className={`bg-white/5 border-white/10 backdrop-blur-sm ${className}`}>
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="text-white text-lg font-semibold">
            Venue & Navigation
          </CardTitle>
          <Button
            onClick={handleOpenMap}
            className="bg-black hover:bg-black/80 text-white text-sm font-medium px-4 py-2 rounded-full"
          >
            <svg className="w-4 h-4 mr-2" fill="currentColor" viewBox="0 0 24 24">
              <path d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z"/>
            </svg>
            OPEN MAP
          </Button>
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Venue Name */}
        {venue.venueName && (
          <div className="flex items-center text-white">
            <svg className="w-4 h-4 mr-3 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z"/>
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z"/>
            </svg>
            <span className="font-medium">{venue.venueName}</span>
          </div>
        )}

        {/* Section/Gate Info */}
        {(venue.venueDetails?.section || venue.venueDetails?.gate) && (
          <div className="flex items-center text-white/80">
            <svg className="w-4 h-4 mr-3 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 14v3m4-3v3m4-3v3M3 21h18M3 10h18M3 7l9-4 9 4M4 10h16v11H4V10z"/>
            </svg>
            <span>
              {venue.venueDetails.gate && `Gate ${venue.venueDetails.gate}`}
              {venue.venueDetails.gate && venue.venueDetails.section && ' - '}
              {venue.venueDetails.section && `Section ${venue.venueDetails.section}`}
            </span>
          </div>
        )}

        {/* Doors Open Time */}
        {venue.venueDetails?.doorsOpenTime && (
          <div className="flex items-center text-white/80">
            <svg className="w-4 h-4 mr-3 text-white/60" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/>
            </svg>
            <span>Doors open: {formatDoorsOpenTime(venue.venueDetails.doorsOpenTime)}</span>
          </div>
        )}

        {/* Access Notes */}
        {venue.venueDetails?.accessNotes && (
          <div className="bg-green-500/10 border border-green-500/20 rounded-lg p-3 mt-4">
            <div className="flex items-start">
              <svg className="w-4 h-4 mr-2 mt-0.5 text-green-400 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"/>
              </svg>
              <div>
                <p className="text-green-400 font-medium text-sm mb-1">VIP Access Notes</p>
                <p className="text-green-300 text-sm">{venue.venueDetails.accessNotes}</p>
              </div>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}