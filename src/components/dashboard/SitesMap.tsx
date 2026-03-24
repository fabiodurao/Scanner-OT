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

const PIN_W = 36;
const PIN_H = 44;

// SVG paths for each site type (Tabler Icons paths, viewBox 0 0 24 24)
const SITE_TYPE_SVG: Record<string, { path: string; bg: string; stroke: string }> = {
  eolica: {
    bg: '#dbeafe', stroke: '#1d4ed8',
    path: 'M12 3a1 1 0 0 1 1 1v4.535l3.929-2.268a1 1 0 1 1 1 1.732L14 10.267V13.73l3.929 2.269a1 1 0 1 1-1 1.732L13 15.464V20a1 1 0 1 1-2 0v-4.535l-3.929 2.268a1 1 0 1 1-1-1.732L10 13.733V10.27L6.071 8a1 1 0 0 1 1-1.732L11 8.535V4a1 1 0 0 1 1-1z',
  },
  eolica_offshore: {
    bg: '#cffafe', stroke: '#0e7490',
    path: 'M12 3a1 1 0 0 1 1 1v4.535l3.929-2.268a1 1 0 1 1 1 1.732L14 10.267V13.73l3.929 2.269a1 1 0 1 1-1 1.732L13 15.464V20a1 1 0 1 1-2 0v-4.535l-3.929 2.268a1 1 0 1 1-1-1.732L10 13.733V10.27L6.071 8a1 1 0 0 1 1-1.732L11 8.535V4a1 1 0 0 1 1-1z',
  },
  fotovoltaica: {
    bg: '#fef3c7', stroke: '#b45309',
    path: 'M3 6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6zm7 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V6zm7 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V6zM3 13a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1v-2zm7 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2zm7 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1v-2zM7 20a1 1 0 0 1 1-1h8a1 1 0 1 1 0 2H8a1 1 0 0 1-1-1z',
  },
  bess: {
    bg: '#dcfce7', stroke: '#15803d',
    path: 'M6 7a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v10a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2V7zm5 3a1 1 0 1 0-2 0v4a1 1 0 1 0 2 0v-4zm4 0a1 1 0 1 0-2 0v4a1 1 0 1 0 2 0v-4zM9 4h6v1H9V4z',
  },
  hidreletrica: {
    bg: '#e0e7ff', stroke: '#4338ca',
    path: 'M12 3c-1.2 5.4-5 7.6-5 11a5 5 0 0 0 10 0c0-3.4-3.8-5.6-5-11z',
  },
  biomassa: {
    bg: '#ffedd5', stroke: '#c2410c',
    path: 'M12 2c0 6-4 8-4 13a4 4 0 0 0 8 0c0-5-4-7-4-13zM8 17h8',
  },
  biocombustivel: {
    bg: '#f0fdf4', stroke: '#4d7c0f',
    path: 'M12 20a8 8 0 0 1-8-8c0-4.314 3.686-8 8-8 1.06 0 2.06.2 3 .57V3a1 1 0 1 1 2 0v2.57A8 8 0 0 1 12 20zm-3-8a3 3 0 0 0 3 3V9a3 3 0 0 0-3 3z',
  },
  hibrida: {
    bg: '#ede9fe', stroke: '#7c3aed',
    path: 'M13 3l-6 9h5l-1 9 6-9h-5z',
  },
  subestacao: {
    bg: '#f1f5f9', stroke: '#475569',
    path: 'M3 21h18M5 21V7l7-4 7 4v14M9 21v-4a3 3 0 0 1 6 0v4',
  },
  energia_residuos: {
    bg: '#fee2e2', stroke: '#b91c1c',
    path: 'M13 3l-6 9h5l-1 9 6-9h-5z',
  },
  geotermica: {
    bg: '#ffe4e6', stroke: '#be123c',
    path: 'M12 2c0 6-4 8-4 13a4 4 0 0 0 8 0c0-5-4-7-4-13z',
  },
  hidrogenio: {
    bg: '#e0f2fe', stroke: '#0369a1',
    path: 'M12 3c-1.2 5.4-5 7.6-5 11a5 5 0 0 0 10 0c0-3.4-3.8-5.6-5-11z',
  },
  solar_termico: {
    bg: '#fef9c3', stroke: '#a16207',
    path: 'M3 6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6zm7 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V6zm7 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V6z',
  },
  nuclear: {
    bg: '#ede9fe', stroke: '#6d28d9',
    path: 'M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0M12 12m-9 0a9 9 0 1 0 18 0a9 9 0 1 0 -18 0M12 3v3M12 18v3M3 12h3M18 12h3',
  },
  ondas: {
    bg: '#ccfbf1', stroke: '#0f766e',
    path: 'M3 10c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0M3 14c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0',
  },
  mare: {
    bg: '#dbeafe', stroke: '#1e40af',
    path: 'M3 10c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0M3 14c1.5-2 3-2 4.5 0s3 2 4.5 0 3-2 4.5 0',
  },
  solar_telhado: {
    bg: '#fff7ed', stroke: '#c2410c',
    path: 'M3 6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1H4a1 1 0 0 1-1-1V6zm7 0a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1v2a1 1 0 0 1-1 1h-2a1 1 0 0 1-1-1V6z',
  },
};

const DEFAULT_SITE_SVG = {
  bg: '#f1f5f9', stroke: '#0e182e',
  path: 'M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7zm0 9.5c-1.38 0-2.5-1.12-2.5-2.5s1.12-2.5 2.5-2.5 2.5 1.12 2.5 2.5-1.12 2.5-2.5 2.5z',
};

const createMarkerSvg = (siteType: string | null): string => {
  const config = SITE_TYPE_SVG[siteType || ''] || DEFAULT_SITE_SVG;
  const cx = PIN_W / 2;

  // Icon area inside the circle
  const iconSize = 14;
  const iconOffset = (PIN_W - iconSize) / 2;
  const iconY = (PIN_W / 2) - (iconSize / 2); // center in the circle part

  const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" x="${iconOffset}" y="${iconY}" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="${config.stroke}" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="${config.path}"/></svg>`;

  const pinSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PIN_W}" height="${PIN_H}" viewBox="0 0 ${PIN_W} ${PIN_H}">
    <!-- Pin shape -->
    <path d="M${cx} ${PIN_H} C${cx} ${PIN_H} 2 ${PIN_W * 0.75} 2 ${cx} C2 ${(cx * 0.45).toFixed(1)} ${(cx * 0.45).toFixed(1)} 2 ${cx} 2 C${(cx * 1.55).toFixed(1)} 2 ${PIN_W - 2} ${(cx * 0.45).toFixed(1)} ${PIN_W - 2} ${cx} C${PIN_W - 2} ${PIN_W * 0.75} ${cx} ${PIN_H} ${cx} ${PIN_H}Z" fill="${config.stroke}"/>
    <!-- White circle background -->
    <circle cx="${cx}" cy="${cx}" r="${(cx * 0.72).toFixed(1)}" fill="${config.bg}"/>
    ${iconSvg}
  </svg>`;

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(pinSvg)}`;
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
    if (existing) { existing.addEventListener('load', () => resolve()); return; }
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
    if (!GOOGLE_MAPS_API_KEY) { setError('Google Maps API key not configured (VITE_GOOGLE_MAPS_API_KEY).'); return; }
    loadGoogleMaps(GOOGLE_MAPS_API_KEY).then(() => setIsLoaded(true)).catch(() => setError('Failed to load Google Maps.'));
  }, []);

  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const google = (window as any).google;
    if (!isLoaded || !mapRef.current || !google) return;

    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center: { lat: -15, lng: -50 },
      zoom: 4,
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

      const markerIcon = createMarkerSvg(site.site_type);

      const marker = new google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        title: site.name || site.identifier || 'Site',
        icon: {
          url: markerIcon,
          scaledSize: new google.maps.Size(PIN_W, PIN_H),
          anchor: new google.maps.Point(PIN_W / 2, PIN_H),
        },
      });

      const infoContent = `
        <div style="font-family: 'Space Grotesk', system-ui, sans-serif; padding: 4px 2px; min-width: 140px;">
          <div style="font-weight: 600; font-size: 14px; color: #0e182e; margin-bottom: 2px;">${site.name || 'Unnamed Site'}</div>
          ${site.city || site.state ? `<div style="font-size: 12px; color: #64748b;">${[site.city, site.state].filter(Boolean).join(', ')}</div>` : ''}
        </div>
      `;

      const infoWindow = new google.maps.InfoWindow({ content: infoContent, disableAutoPan: true });

      google.maps.event.addListener(infoWindow, 'domready', () => {
        document.querySelectorAll('.gm-ui-hover-effect').forEach((btn: Element) => { (btn as HTMLElement).style.display = 'none'; });
      });

      marker.addListener('mouseover', () => infoWindow.open(mapInstanceRef.current, marker));
      marker.addListener('mouseout', () => infoWindow.close());
      marker.addListener('click', () => onSiteClick(site.identifier, site.id));
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