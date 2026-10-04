import { useState, useRef, useEffect, useCallback } from 'react';
import { GeolocationErrorState } from '../types';

export interface LocationCoords {
  lat: number;
  lng: number;
  accuracy: number;
  speed?: number | null;
  heading?: number | null;
  altitude?: number | null;
  batteryLevel?: number | null;
}

export function useDeviceLocation(
  onLocationUpdate?: (coords: LocationCoords) => void
) {
  const [isTracking, setIsTracking] = useState(false);
  const [error, setError] = useState<GeolocationErrorState | null>(null);
  const [coords, setCoords] = useState<LocationCoords | null>(null);
  const [batteryLevel, setBatteryLevel] = useState<number | null>(null);

  const watchIdRef = useRef<number | null>(null);

  // Monitor real battery level if available
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const nav = navigator as any;
    if (nav.getBattery) {
      nav.getBattery().then((battery: { level: number; addEventListener: (event: string, fn: () => void) => void }) => {
        setBatteryLevel(Math.round(battery.level * 100));
        battery.addEventListener('levelchange', () => {
          setBatteryLevel(Math.round(battery.level * 100));
        });
      }).catch(() => {});
    }
  }, []);

  const handleSuccess = useCallback((pos: GeolocationPosition) => {
    setError(null);
    const newCoords: LocationCoords = {
      lat: pos.coords.latitude,
      lng: pos.coords.longitude,
      accuracy: pos.coords.accuracy,
      speed: pos.coords.speed ?? null,
      heading: pos.coords.heading ?? null,
      altitude: pos.coords.altitude ?? null,
      batteryLevel
    };
    setCoords(newCoords);
    if (onLocationUpdate) {
      onLocationUpdate(newCoords);
    }
  }, [batteryLevel, onLocationUpdate]);

  const handleError = useCallback((err: GeolocationPositionError) => {
    let type: GeolocationErrorState['type'] = 'POSITION_UNAVAILABLE';
    let userRemedy = 'Ensure device Location Services and GPS are switched on.';

    if (err.code === err.PERMISSION_DENIED) {
      type = 'PERMISSION_DENIED';
      userRemedy = 'Location permission was denied. Tap the lock/tune icon in your browser address bar and set Location to "Allow".';
    } else if (err.code === err.TIMEOUT) {
      type = 'TIMEOUT';
      userRemedy = 'GPS request timed out. Please ensure you have network connectivity and clear satellite or Wi-Fi visibility.';
    }

    setError({
      code: err.code,
      type,
      message: err.message || 'Location error occurred.',
      userRemedy
    });
  }, []);

  const stopTracking = useCallback(() => {
    if (watchIdRef.current !== null) {
      navigator.geolocation.clearWatch(watchIdRef.current);
      watchIdRef.current = null;
    }
    setIsTracking(false);
  }, []);

  const startTracking = useCallback(() => {
    if (!navigator.geolocation) {
      setError({
        code: 0,
        type: 'NOT_SUPPORTED',
        message: 'Geolocation is not supported by your browser.',
        userRemedy: 'Please switch to a modern browser (Chrome, Safari, Firefox, Edge).'
      });
      return;
    }

    stopTracking();
    setError(null);
    setIsTracking(true);

    // Initial position fetch with high accuracy first, network fallback second
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleSuccess(pos);
      },
      (err) => {
        console.warn('[BeaconPath] High-accuracy GPS initial check notice:', err.message);
        if (err.code === err.PERMISSION_DENIED) {
          handleError(err);
          setIsTracking(false);
          return;
        }

        // Fallback to standard network-assisted geolocation
        navigator.geolocation.getCurrentPosition(
          (pos) => {
            handleSuccess(pos);
          },
          (fallbackErr) => {
            handleError(fallbackErr);
            setIsTracking(false);
          },
          { enableHighAccuracy: false, timeout: 15000, maximumAge: 60000 }
        );
      },
      { enableHighAccuracy: true, timeout: 15000, maximumAge: 5000 }
    );

    // Continuous watchPosition for live real-time GPS streaming
    try {
      watchIdRef.current = navigator.geolocation.watchPosition(
        (pos) => handleSuccess(pos),
        (err) => {
          if (err.code === err.PERMISSION_DENIED) {
            handleError(err);
            stopTracking();
          }
        },
        { enableHighAccuracy: true, timeout: 20000, maximumAge: 5000 }
      );
    } catch (e) {
      console.error('watchPosition error:', e);
    }
  }, [handleSuccess, handleError, stopTracking]);

  useEffect(() => {
    return () => {
      if (watchIdRef.current !== null) {
        navigator.geolocation.clearWatch(watchIdRef.current);
      }
    };
  }, []);

  return {
    isTracking,
    error,
    coords,
    startTracking,
    stopTracking
  };
}
