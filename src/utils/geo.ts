import { GeoCoordinates } from '../types';

/**
 * Standard Haversine formula to compute great-circle distance between two GPS coordinates in kilometers.
 * Universal across any location on Earth.
 */
export function calculateHaversineDistanceKm(
  lat1: number,
  lon1: number,
  lat2: number | null | undefined,
  lon2: number | null | undefined
): number {
  if (lat2 === null || lat2 === undefined || lon2 === null || lon2 === undefined || isNaN(lat2) || isNaN(lon2)) {
    return 9999;
  }
  const R = 6371; // Earth's mean radius in km
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);

  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * Formats a distance in kilometers into a clean, legible badge string.
 * Example outputs: "à 0.8km", "à 1.4km", "à 50m" if ultra close.
 */
export function formatDistanceBadge(distanceKm: number): string {
  if (distanceKm >= 9000) {
    return 'Position non captée';
  }
  if (distanceKm < 0.1) {
    const meters = Math.max(10, Math.round(distanceKm * 1000));
    return `à ${meters}m`;
  }
  // Standard format requested: "à 0.8km"
  return `à ${distanceKm.toFixed(1)}km`;
}

/**
 * Default fallback coordinate (West Africa - Lomé / Coastline) when GPS is not yet allowed.
 */
export const DEFAULT_AFRICA_COORDS: GeoCoordinates = {
  lat: 6.1624,
  lng: 1.1685,
  addressLabel: 'Position GPS détectée',
};

/**
 * Asynchronously acquires device GPS coordinates via standard navigator.geolocation.
 */
export function requestDeviceCoordinates(): Promise<GeoCoordinates> {
  return new Promise((resolve, reject) => {
    if (typeof window === 'undefined' || !('geolocation' in navigator)) {
      reject(new Error('Géolocalisation non supportée par votre appareil'));
      return;
    }

    navigator.geolocation.getCurrentPosition(
      (pos) => {
        resolve({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          accuracy: pos.coords.accuracy,
          addressLabel: 'Position GPS en direct',
        });
      },
      (err) => {
        reject(err);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 60000,
      }
    );
  });
}
