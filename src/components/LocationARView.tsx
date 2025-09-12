import React, { useEffect, useRef, useState, useCallback } from 'react';
import { CardData } from '../@typings';

// Proper TypeScript interfaces for A-Frame
interface AFrameTypes {
  // A-Frame doesn't have a structured API object in window.AFRAME
  // It extends HTML elements directly, so we just need to verify it exists
  version?: string;
}

declare global {
  interface Window {
    AFRAME: AFrameTypes | undefined;
  }
}

interface LocationARViewProps {
  ar: NonNullable<CardData['ar']>;
  onClose: () => void;
  onError: (error: string) => void;
}

type LocationWithDistance = {
  id: string;
  lat: number;
  lng: number;
  radiusM: number;
  title?: string;
  model: {
    glbUrl: string;
    scale?: string;
    rotation?: { x?: number; y?: number; z?: number };
  };
  headingOffset?: number;
  distance: number;
};

export default function LocationARView({ ar, onClose, onError }: LocationARViewProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [userLocation, setUserLocation] = useState<GeolocationCoordinates | null>(null);
  const [nearbyLocations, setNearbyLocations] = useState<string[]>([]);
  const [permissionGranted, setPermissionGranted] = useState(false);
  const [watchId, setWatchId] = useState<number | null>(null);
  const sceneRef = useRef<HTMLElement | null>(null);
  const entitiesRef = useRef<Map<string, HTMLElement>>(new Map());

  // Calculate distance between two coordinates
  const calculateDistance = useCallback((lat1: number, lon1: number, lat2: number, lon2: number): number => {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;

    const a = Math.sin(Δφ/2) * Math.sin(Δφ/2) +
              Math.cos(φ1) * Math.cos(φ2) *
              Math.sin(Δλ/2) * Math.sin(Δλ/2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a));

    return R * c; // Distance in meters
  }, []);

  // Check which AR locations are nearby
  const checkNearbyLocations = useCallback((userCoords: GeolocationCoordinates) => {
    if (!ar.locations) return;

    const nearby: string[] = [];
    
    ar.locations.forEach(location => {
      const distance = calculateDistance(
        userCoords.latitude,
        userCoords.longitude,
        location.lat,
        location.lng
      );
      
      if (distance <= location.radiusM) {
        nearby.push(location.id);
      }
    });

    setNearbyLocations(nearby);
  }, [ar.locations, calculateDistance]);

  // Initialize location tracking
  useEffect(() => {
    if (!ar.locations || ar.locations.length === 0) {
      onError('No locations defined for AR');
      return;
    }

    if (!navigator.geolocation) {
      onError('Geolocation is not supported by this browser');
      return;
    }

    // Request location permission and start watching
    const watchPosition = () => {
      const options = {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000
      };

      const success = (position: GeolocationPosition) => {
        setUserLocation(position.coords);
        setPermissionGranted(true);
        checkNearbyLocations(position.coords);
      };

      const error = (err: GeolocationPositionError) => {
        console.error('Geolocation error:', err);
        switch (err.code) {
          case err.PERMISSION_DENIED:
            onError('Location permission denied. Please enable location access and try again.');
            break;
          case err.POSITION_UNAVAILABLE:
            onError('Location information is unavailable.');
            break;
          case err.TIMEOUT:
            onError('Location request timed out.');
            break;
          default:
            onError('An unknown location error occurred.');
            break;
        }
      };

      // Get initial position
      navigator.geolocation.getCurrentPosition(success, error, options);
      
      // Watch for position changes
      const id = navigator.geolocation.watchPosition(success, error, options);
      setWatchId(id);
    };

    watchPosition();

    return () => {
      if (watchId !== null) {
        navigator.geolocation.clearWatch(watchId);
      }
    };
  }, [ar.locations, onError, checkNearbyLocations, watchId]);

  // Initialize A-Frame scene (once)
  useEffect(() => {
    if (!window.AFRAME) {
      onError('A-Frame library not loaded');
      return;
    }

    if (!permissionGranted) return;

    const container = containerRef.current;
    if (!container) return;

    try {
      // Create A-Frame scene
      const sceneEl = document.createElement('a-scene');
      sceneEl.setAttribute('embedded', '');
      sceneEl.setAttribute('arjs', 'sourceType: webcam; debugUIEnabled: false;');
      sceneEl.style.width = '100%';
      sceneEl.style.height = '100%';

      // Add GPS camera (remove problematic rotation-reader dependency)
      const cameraEl = document.createElement('a-camera');
      cameraEl.setAttribute('gps-camera', 'gpsMinDistance: 5; gpsTimeInterval: 5000;');
      sceneEl.appendChild(cameraEl);

      // Store scene reference for dynamic entity updates
      sceneRef.current = sceneEl;
      
      // Append scene to container
      container.appendChild(sceneEl);
      setIsInitialized(true);

      return () => {
        // Clean up scene and entities
        entitiesRef.current.clear();
        if (container.contains(sceneEl)) {
          container.removeChild(sceneEl);
        }
        sceneRef.current = null;
      };

    } catch (error) {
      console.error('Failed to initialize location AR:', error);
      onError('Failed to initialize location-based AR.');
    }
  }, [permissionGranted, onError]);

  // Reactive entity management based on nearbyLocations
  useEffect(() => {
    if (!sceneRef.current || !ar.locations) return;

    const scene = sceneRef.current;
    const entities = entitiesRef.current;

    // Remove entities that are no longer nearby
    for (const [locationId, entityEl] of entities.entries()) {
      if (!nearbyLocations.includes(locationId)) {
        scene.removeChild(entityEl);
        entities.delete(locationId);
      }
    }

    // Add entities for newly nearby locations
    for (const locationId of nearbyLocations) {
      if (!entities.has(locationId)) {
        const location = ar.locations.find(loc => loc.id === locationId);
        if (!location) continue;

        // Create entity for this nearby location
        const entityEl = document.createElement('a-entity');
        entityEl.setAttribute('gps-entity-place', `latitude: ${location.lat}; longitude: ${location.lng};`);
        
        // Load and configure 3D model
        const modelEl = document.createElement('a-entity');
        modelEl.setAttribute('gltf-model', location.model.glbUrl);
        
        // Apply scale
        if (location.model.scale) {
          const scale = typeof location.model.scale === 'string' 
            ? location.model.scale 
            : '1 1 1';
          modelEl.setAttribute('scale', scale);
        }
        
        // Combine model rotation and heading offset properly
        let rotationX = 0;
        let rotationY = 0;
        let rotationZ = 0;
        
        // Apply base model rotation first
        if (location.model.rotation) {
          rotationX = location.model.rotation.x || 0;
          rotationY = location.model.rotation.y || 0;
          rotationZ = location.model.rotation.z || 0;
        }
        
        // Add heading offset to Y rotation (compass heading)
        if (location.headingOffset) {
          rotationY += location.headingOffset;
        }
        
        // Apply the combined rotation
        modelEl.setAttribute('rotation', `${rotationX} ${rotationY} ${rotationZ}`);

        entityEl.appendChild(modelEl);

        // Add optional text label
        if (location.title) {
          const textEl = document.createElement('a-text');
          textEl.setAttribute('value', location.title);
          textEl.setAttribute('look-at', '[gps-camera]');
          textEl.setAttribute('scale', '10 10 10');
          textEl.setAttribute('position', '0 3 0');
          textEl.setAttribute('color', '#ffffff');
          textEl.setAttribute('align', 'center');
          entityEl.appendChild(textEl);
        }

        scene.appendChild(entityEl);
        entities.set(locationId, entityEl);
      }
    }
  }, [nearbyLocations, ar.locations]);

  // Get directions to the nearest location
  const getNearestLocation = useCallback((): LocationWithDistance | null => {
    if (!ar.locations || !userLocation) return null;

    let nearest: LocationWithDistance | null = null;
    let minDistance = Infinity;

    ar.locations.forEach(location => {
      const distance = calculateDistance(
        userLocation.latitude,
        userLocation.longitude,
        location.lat,
        location.lng
      );
      
      if (distance < minDistance) {
        minDistance = distance;
        nearest = { ...location, distance };
      }
    });

    return nearest;
  }, [ar, userLocation, calculateDistance]);

  const nearestLocation = getNearestLocation();

  return (
    <div className="fixed inset-0 z-50 bg-black">
      {/* AR container */}
      <div 
        ref={containerRef} 
        className="w-full h-full relative"
        style={{ background: 'transparent' }}
      />

      {/* Close button */}
      <div className="absolute top-4 right-4 z-10">
        <button
          onClick={onClose}
          className="p-3 rounded-full bg-black/50 text-white hover:bg-black/70 transition-colors"
          aria-label="Close AR"
        >
          <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      {/* Status and instructions overlay */}
      <div className="absolute bottom-0 left-0 right-0 p-4 bg-gradient-to-t from-black/80 to-transparent text-white">
        <div className="text-center">
          {!permissionGranted ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span className="text-lg">Getting your location...</span>
            </div>
          ) : !isInitialized ? (
            <div className="flex items-center justify-center space-x-2">
              <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
              <span className="text-lg">Initializing location AR...</span>
            </div>
          ) : nearbyLocations.length > 0 ? (
            <>
              <p className="text-lg mb-2">🎯 AR content found nearby!</p>
              <div className="flex items-center justify-center space-x-4 text-sm text-gray-300">
                <span>✅ {nearbyLocations.length} location{nearbyLocations.length !== 1 ? 's' : ''} active</span>
                <span>📱 Look around to find AR objects</span>
              </div>
            </>
          ) : nearestLocation ? (
            <>
              <p className="text-lg mb-2">📍 Nearest AR location</p>
              <div className="text-center mb-2">
                <div className="text-xl font-semibold">{nearestLocation.title || 'AR Location'}</div>
                <div className="text-sm text-gray-300">
                  {Math.round(nearestLocation.distance)}m away
                </div>
              </div>
              <div className="text-sm text-gray-300">
                Move closer to {nearestLocation.radiusM}m range to see AR content
              </div>
            </>
          ) : (
            <>
              <p className="text-lg mb-2">🗺️ Exploring AR locations</p>
              <div className="flex items-center justify-center space-x-4 text-sm text-gray-300">
                <span>📍 {ar.locations?.length || 0} location{ar.locations?.length !== 1 ? 's' : ''} available</span>
                <span>🚶 Walk around to discover AR content</span>
              </div>
            </>
          )}
        </div>
      </div>

      {/* Location list overlay */}
      {userLocation && (
        <div className="absolute top-4 left-4 text-white text-sm bg-black/50 p-3 rounded-lg max-w-xs">
          <div className="text-base font-semibold mb-2">AR Locations</div>
          {ar.locations?.map((location) => {
            const distance = calculateDistance(
              userLocation.latitude,
              userLocation.longitude,
              location.lat,
              location.lng
            );
            const isNearby = distance <= location.radiusM;
            
            return (
              <div key={location.id} className={`mb-1 ${isNearby ? 'text-green-300' : 'text-gray-400'}`}>
                <div className="flex justify-between">
                  <span>{location.title || location.id}</span>
                  <span>{Math.round(distance)}m</span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Debug info (only in development) */}
      {process.env.NODE_ENV === 'development' && userLocation && (
        <div className="absolute top-20 right-4 text-white text-xs bg-black/50 p-2 rounded">
          <div>Lat: {userLocation.latitude.toFixed(6)}</div>
          <div>Lng: {userLocation.longitude.toFixed(6)}</div>
          <div>Accuracy: {userLocation.accuracy?.toFixed(0)}m</div>
          <div>Nearby: {nearbyLocations.length}</div>
        </div>
      )}
    </div>
  );
}