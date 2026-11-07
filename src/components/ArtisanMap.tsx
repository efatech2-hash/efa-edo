import React, { useEffect, useRef } from 'react';
import L from 'leaflet';
import { Artisan, GeoCoordinates } from '../types';

interface ArtisanMapProps {
  artisans: Artisan[];
  selectedArtisan: Artisan | null;
  onSelectArtisan: (artisan: Artisan) => void;
  userLocation?: GeoCoordinates | null;
  center?: [number, number];
  zoom?: number;
  heightClass?: string;
}

export const ArtisanMap: React.FC<ArtisanMapProps> = ({
  artisans,
  selectedArtisan,
  onSelectArtisan,
  userLocation,
  center,
  zoom = 13,
  heightClass = 'h-[320px] md:h-[400px]',
}) => {
  const mapContainerRef = useRef<HTMLDivElement>(null);
  const mapInstanceRef = useRef<L.Map | null>(null);
  const markersRef = useRef<{ [key: string]: L.Marker }>({});
  const userMarkerRef = useRef<L.Marker | null>(null);

  // Compute map center priority: selected artisan > provided center > user location > first artisan with valid GPS > fallback Lomé [6.1624, 1.1685]
  const firstWithCoords = artisans.find(
    (a) => typeof a.lat === 'number' && typeof a.lng === 'number' && !isNaN(a.lat) && !isNaN(a.lng)
  );

  const mapCenter: [number, number] = center
    ? center
    : userLocation
    ? [userLocation.lat, userLocation.lng]
    : firstWithCoords
    ? [firstWithCoords.lat as number, firstWithCoords.lng as number]
    : [6.1624, 1.1685];

  useEffect(() => {
    if (!mapContainerRef.current) return;

    if (!mapInstanceRef.current) {
      // Initialize map
      const map = L.map(mapContainerRef.current, {
        center: mapCenter,
        zoom: zoom,
        zoomControl: true,
        attributionControl: false,
      });

      L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '© OpenStreetMap contributors',
      }).addTo(map);

      mapInstanceRef.current = map;
    }

    const map = mapInstanceRef.current;

    // Clear existing artisan markers
    Object.values(markersRef.current).forEach((marker) => marker.remove());
    markersRef.current = {};

    // User location pin (dynamic client GPS)
    if (userLocation) {
      if (userMarkerRef.current) {
        userMarkerRef.current.remove();
      }

      const userIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="position: relative; width: 36px; height: 36px; display: flex; align-items: center; justify-content: center;">
            <div style="position: absolute; width: 32px; height: 32px; border-radius: 9999px; background-color: rgba(59, 130, 246, 0.35); animation: ping 1.5s cubic-bezier(0, 0, 0.2, 1) infinite;"></div>
            <div style="width: 20px; height: 20px; border-radius: 9999px; background-color: #2563EB; border: 3px solid #FFFFFF; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.25);"></div>
          </div>
        `,
        iconSize: [36, 36],
        iconAnchor: [18, 18],
      });

      userMarkerRef.current = L.marker([userLocation.lat, userLocation.lng], { icon: userIcon })
        .addTo(map)
        .bindPopup(
          '<div style="font-family: inherit; font-size: 13px; font-weight: bold; padding: 2px;">📍 Tu es ici (Position GPS en direct)</div>'
        );
    }

    // Add artisan pins
    artisans.forEach((artisan) => {
      if (typeof artisan.lat !== 'number' || typeof artisan.lng !== 'number' || isNaN(artisan.lat) || isNaN(artisan.lng)) {
        return;
      }

      const isSelected = selectedArtisan?.id === artisan.id;
      const borderColor = isSelected ? '#D4AF37' : artisan.isOnline ? '#22C55E' : '#CBD5E1';
      const distanceBadgeText = artisan.distanceBadge || (artisan.distanceKm !== undefined ? `à ${artisan.distanceKm.toFixed(1)}km` : '');

      const customIcon = L.divIcon({
        className: 'custom-leaflet-marker',
        html: `
          <div style="position: relative; width: 46px; height: 46px; display: flex; flex-direction: column; align-items: center; cursor: pointer;">
            <div style="position: relative; width: 38px; height: 38px; border-radius: 9999px; border: 3px solid ${borderColor}; box-shadow: 0 4px 10px rgba(0,0,0,0.2); overflow: hidden; background: #ffffff;">
              <img src="${artisan.avatar}" style="width: 100%; height: 100%; object-fit: cover;" alt="${artisan.name}" />
            </div>
            ${
              artisan.isOnline
                ? `<div style="position: absolute; top: -2px; right: 2px; width: 14px; height: 14px; border-radius: 9999px; background-color: #22C55E; border: 2px solid #ffffff; box-shadow: 0 0 8px #22c55e;"></div>`
                : ''
            }
            ${
              distanceBadgeText
                ? `<div style="background: #0F172A; color: #FFFFFF; font-size: 10px; font-weight: 800; border-radius: 9999px; padding: 1px 6px; margin-top: -6px; white-space: nowrap; box-shadow: 0 2px 4px rgba(0,0,0,0.25);">
                    ${distanceBadgeText}
                  </div>`
                : ''
            }
          </div>
        `,
        iconSize: [46, 46],
        iconAnchor: [23, 40],
      });

      const marker = L.marker([artisan.lat, artisan.lng], { icon: customIcon }).addTo(map);

      marker.on('click', () => {
        onSelectArtisan(artisan);
      });

      markersRef.current[artisan.id] = marker;
    });

    // If an artisan is selected, center map onto them
    if (selectedArtisan && typeof selectedArtisan.lat === 'number' && typeof selectedArtisan.lng === 'number') {
      map.panTo([selectedArtisan.lat, selectedArtisan.lng], { animate: true, duration: 0.8 });
    }
  }, [artisans, selectedArtisan, userLocation, mapCenter, zoom, onSelectArtisan]);

  return (
    <div className={`w-full ${heightClass} rounded-3xl overflow-hidden shadow-inner border border-slate-200 relative`}>
      <div ref={mapContainerRef} className="w-full h-full z-10" />

      {/* Floating indicator: Online artisans on map */}
      <div className="absolute top-3 left-3 z-20 bg-white/95 backdrop-blur-md px-3 py-1.5 rounded-full border border-slate-200 text-xs font-bold text-slate-800 flex items-center gap-2 shadow-xs">
        <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
        <span>{artisans.filter((a) => a.isOnline).length} artisans en ligne autour de toi</span>
      </div>
    </div>
  );
};
