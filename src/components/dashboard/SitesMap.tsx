import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';

interface SitesMapProps {
  sites: Array<{
    id: string;
    identifier: string | null;
    name: string | null;
    site_type: string | null;
    city: string | null;
    state: string | null;
    latitude?: number | null;
    longitude?: number | null;
  }>;
  onSiteClick: (identifier: string | null, id: string) => void;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const silverMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#f5f5f5" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#f5f5f5" }] },
  { featureType: "administrative.land_parcel", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "poi", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.arterial", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
  { featureType: "road.highway", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "transit.line", elementType: "geometry", stylers: [{ color: "#e5e5e5" }] },
  { featureType: "transit.station", elementType: "geometry", stylers: [{ color: "#eeeeee" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
];

const PIN_W = 31;
const PIN_H = 39;
const ICON_SIZE = 13;
const ICON_OFFSET = Math.round((PIN_W - ICON_SIZE) / 2);

// SVGs matching FontAwesome icons used in the main system
const siteTypeIcons: Record<string, { svg: string; bg: string; border: string }> = {
  // Wind Turbine (fa-wind-turbine) - blue
  eolica: {
    bg: '#dbeafe',
    border: '#3b82f6',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON_SIZE}" height="${ICON_SIZE}" viewBox="0 0 24 24" fill="none" stroke="#2563eb" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="12" x2="12" y2="22"/><path d="M12 12 C12 12 6 8 4 3 C7 4 10 8 12 12Z" fill="#2563eb" stroke="none"/><path d="M12 12 C12 12 18 8 20 3 C17 4 14 8 12 12Z" fill="#93c5fd" stroke="none"/><path d="M12 12 C12 12 5 14 2 19 C5 17 9 14 12 12Z" fill="#60a5fa" stroke="none"/></svg>`,
  },
  // Wind Offshore (fa-wind-sparkle) - cyan/teal
  eolica_offshore: {
    bg: '#cffafe',
    border: '#06b6d4',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON_SIZE}" height="${ICON_SIZE}" viewBox="0 0 24 24" fill="none" stroke="#0891b2" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="12" x2="12" y2="20"/><path d="M12 12 C12 12 6 8 4 3 C7 4 10 8 12 12Z" fill="#0891b2" stroke="none"/><path d="M12 12 C12 12 18 8 20 3 C17 4 14 8 12 12Z" fill="#67e8f9" stroke="none"/><path d="M12 12 C12 12 5 14 2 19 C5 17 9 14 12 12Z" fill="#22d3ee" stroke="none"/><path d="M19 3 L20 1 L21 3" stroke="#0891b2" stroke-width="1.5" fill="none"/><circle cx="20" cy="1" r="0.5" fill="#0891b2"/></svg>`,
  },
  // Solar (fa-solar-panel) - amber/yellow
  fotovoltaica: {
    bg: '#fef3c7',
    border: '#f59e0b',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON_SIZE}" height="${ICON_SIZE}" viewBox="0 0 24 24" fill="none" stroke="#d97706" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="2" y="5" width="20" height="14" rx="1"/><line x1="12" y1="5" x2="12" y2="19"/><line x1="2" y1="12" x2="22" y2="12"/><line x1="7" y1="5" x2="7" y2="19"/><line x1="17" y1="5" x2="17" y2="19"/></svg>`,
  },
  // BESS - Battery (fa-battery-bolt) - green
  bess: {
    bg: '#dcfce7',
    border: '#22c55e',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON_SIZE}" height="${ICON_SIZE}" viewBox="0 0 24 24" fill="none" stroke="#16a34a" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="1" y="7" width="18" height="10" rx="2"/><line x1="23" y1="11" x2="23" y2="13"/><path d="M11 7 L8 12 L11 12 L8 17" stroke="#16a34a" stroke-width="2" fill="none"/></svg>`,
  },
  // Hydropower (fa-arrow-up-from-water) - blue/indigo
  hidreletrica: {
    bg: '#e0e7ff',
    border: '#6366f1',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON_SIZE}" height="${ICON_SIZE}" viewBox="0 0 24 24" fill="none" stroke="#4f46e5" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 L12 15"/><path d="M8 7 L12 3 L16 7"/><path d="M2 17 C5 14 8 20 12 17 C16 14 19 20 22 17"/></svg>`,
  },
  // Biomass (fa-fire-flame-curved) - orange/red
  biomassa: {
    bg: '#ffedd5',
    border: '#f97316',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON_SIZE}" height="${ICON_SIZE}" viewBox="0 0 24 24" fill="none" stroke="#ea580c" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 2C6 6 4 10 6 14C7 16 9 17 12 17C15 17 17 16 18 14C20 10 18 6 12 2Z"/><path d="M12 17 C10 19 10 21 12 22 C14 21 14 19 12 17Z" fill="#ea580c" stroke="none"/></svg>`,
  },
  // Biofuels (fa-seedling) - lime/green
  biocombustivel: {
    bg: '#f0fdf4',
    border: '#84cc16',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON_SIZE}" height="${ICON_SIZE}" viewBox="0 0 24 24" fill="none" stroke="#65a30d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 22 L12 10"/><path d="M12 10 C12 10 8 8 6 4 C10 4 13 7 12 10Z" fill="#65a30d" stroke="none"/><path d="M12 14 C12 14 16 12 18 8 C14 8 11 11 12 14Z" fill="#a3e635" stroke="none"/></svg>`,
  },
  // Substation - slate
  subestacao: {
    bg: '#f1f5f9',
    border: '#64748b',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON_SIZE}" height="${ICON_SIZE}" viewBox="0 0 24 24" fill="none" stroke="#475569" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  },
  // Hybrid - purple
  hibrida: {
    bg: '#ede9fe',
    border: '#8b5cf6',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON_SIZE}" height="${ICON_SIZE}" viewBox="0 0 24 24" fill="none" stroke="#7c3aed" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/></svg>`,
  },
  // Default fallback
  default: {
    bg: '#f1f5f9',
    border: '#0e182e',
    svg: `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON_SIZE}" height="${ICON_SIZE}" viewBox="0 0 24 24" fill="none" stroke="#0e182e" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><polyline points="9 22 9 12 15 12 15 22"/></svg>`,
  },
};

const createMarkerSvg = (siteType: string | null): string => {
  const config = siteTypeIcons[siteType || 'default'] || siteTypeIcons.default;
  const encodedIcon = encodeURIComponent(config.svg);
  const cx = PIN_W / 2;
  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(`
    <svg xmlns="http://www.w3.org/2000/svg" width="${PIN_W}" height="${PIN_H}" viewBox="0 0 ${PIN_W} ${PIN_H}">
      <path d="M${cx} 0C${(cx * 0.45).toFixed(1)} 0 0 ${(cx * 0.45).toFixed(1)} 0 ${cx}C0 ${(PIN_H * 0.66).toFixed(1)} ${cx} ${PIN_H} ${cx} ${PIN_H}C${cx} ${PIN_H} ${PIN_W} ${(PIN_H * 0.66).toFixed(1)} ${PIN_W} ${cx}C${PIN_W} ${(cx * 0.45).toFixed(1)} ${(cx * 1.55).toFixed(1)} 0 ${cx} 0Z" fill="${config.border}"/>
      <circle cx="${cx}" cy="${cx}" r="${(cx * 0.7).toFixed(1)}" fill="${config.bg}"/>
      <image href="data:image/svg+xml;charset=UTF-8,${encodedIcon}" x="${ICON_OFFSET}" y="${ICON_OFFSET}" width="${ICON_SIZE}" height="${ICON_SIZE}"/>
    </svg>
  `)}`;
};

let mapsLoadPromise: Promise<void> | null = null;

const loadGoogleMaps = (apiKey: string): Promise<void> => {
  if (mapsLoadPromise) return mapsLoadPromise;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  if ((window as any).google?.maps?.places) {
    mapsLoadPromise = Promise.resolve();
    return mapsLoadPromise;
  }
  mapsLoadPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector('script[src*="maps.googleapis.com"]');
    if (existing) {
      existing.addEventListener('load', () => resolve());
      return;
    }
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geocoding&language=en&region=US`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => { mapsLoadPromise = null; reject(new Error('Failed to load Google Maps')); };
    document.head.appendChild(script);
  });
  return mapsLoadPromise;
};

export const SitesMap = ({ sites, onSiteClick }: SitesMapProps) => {
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  const [isLoaded, setIsLoaded] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sitesWithCoords = sites.filter(
    s => s.latitude != null && s.longitude != null &&
         !isNaN(Number(s.latitude)) && !isNaN(Number(s.longitude))
  );

  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setError('Google Maps API key not configured (VITE_GOOGLE_MAPS_API_KEY).');
      return;
    }
    loadGoogleMaps(GOOGLE_MAPS_API_KEY)
      .then(() => setIsLoaded(true))
      .catch(() => setError('Failed to load Google Maps.'));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const google = (window as any).google;
    if (!isLoaded || !mapRef.current || !google) return;

    const defaultCenter = { lat: -15, lng: -50 };
    const defaultZoom = 4;

    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center: defaultCenter,
      zoom: defaultZoom,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      styles: silverMapStyle,
    });

    if (sitesWithCoords.length === 0) return;

    const bounds = new google.maps.LatLngBounds();

    sitesWithCoords.forEach(site => {
      const position = { lat: Number(site.latitude), lng: Number(site.longitude) };
      bounds.extend(position);

      const markerUrl = createMarkerSvg(site.site_type);

      const marker = new google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        title: site.name || site.identifier || 'Site',
        icon: {
          url: markerUrl,
          scaledSize: new google.maps.Size(PIN_W, PIN_H),
          anchor: new google.maps.Point(PIN_W / 2, PIN_H),
        },
      });

      const infoContent = `
        <div style="font-family: 'Space Grotesk', system-ui, sans-serif; padding: 4px 2px; min-width: 140px;">
          <div style="font-weight: 600; font-size: 14px; color: #0e182e; margin-bottom: 2px;">
            ${site.name || 'Unnamed Site'}
          </div>
          ${site.city || site.state ? `
            <div style="font-size: 12px; color: #64748b;">
              ${[site.city, site.state].filter(Boolean).join(', ')}
            </div>
          ` : ''}
        </div>
      `;

      const infoWindow = new google.maps.InfoWindow({
        content: infoContent,
        disableAutoPan: true,
      });

      // Hide the close button
      google.maps.event.addListener(infoWindow, 'domready', () => {
        const closeButtons = document.querySelectorAll('.gm-ui-hover-effect');
        closeButtons.forEach((btn: Element) => {
          (btn as HTMLElement).style.display = 'none';
        });
      });

      marker.addListener('mouseover', () => {
        infoWindow.open(mapInstanceRef.current, marker);
      });

      marker.addListener('mouseout', () => {
        infoWindow.close();
      });

      marker.addListener('click', () => {
        onSiteClick(site.identifier, site.id);
      });
    });

    if (sitesWithCoords.length === 1) {
      mapInstanceRef.current.setCenter(bounds.getCenter());
      mapInstanceRef.current.setZoom(10);
    } else {
      mapInstanceRef.current.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
    }
  }, [isLoaded, sitesWithCoords.length]);

  if (error) {
    return (
      <div className="w-full rounded-lg border bg-slate-50 flex items-center justify-center text-center p-6" style={{ height: 'calc(100vh - 380px)', minHeight: '400px' }}>
        <div>
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="text-xs text-slate-400 mt-1">Configure VITE_GOOGLE_MAPS_API_KEY to enable the map view.</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full rounded-lg border bg-slate-50 flex items-center justify-center gap-2 text-muted-foreground" style={{ height: 'calc(100vh - 380px)', minHeight: '400px' }}>
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading map...</span>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-lg border overflow-hidden shadow-sm" style={{ height: 'calc(100vh - 380px)', minHeight: '400px' }}>
      <div ref={mapRef} className="w-full h-full" />
      {sitesWithCoords.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 pointer-events-none">
          <p className="text-sm text-muted-foreground">No sites with coordinates registered yet.</p>
        </div>
      )}
    </div>
  );
};