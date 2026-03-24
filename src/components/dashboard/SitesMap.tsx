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
  { featureType: "road", elementType: "geometry", stylers: [{ color: "#ffffff" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#dadada" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#c9c9c9" }] },
];

const PIN_W = 40;
const PIN_H = 50;

// Exact Tabler Icons SVG paths (stroke-based, viewBox 0 0 24 24)
// These match exactly what IconWindmill, IconSolarPanel, etc. render
const SITE_TYPE_CONFIG: Record<string, {
  bg: string;
  stroke: string;
  // Multiple path elements as array of {d, fill?}
  paths: Array<{ d: string; fill?: string }>;
}> = {
  eolica: {
    bg: '#dbeafe', stroke: '#1d4ed8',
    paths: [
      // IconWindmill - windmill blades
      { d: 'M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0' },
      { d: 'M12 3l1 3l-1 .5l-1 -.5z' },
      { d: 'M12 3c0 0 -3.5 5 -3.5 9.5' },
      { d: 'M12 3c0 0 3.5 5 3.5 9.5' },
      { d: 'M6 20.5l2.5 -2.5l.5 .5l-.5 1z' },
      { d: 'M6 20.5c0 0 5.5 -1 8.5 -3.5' },
      { d: 'M6 20.5c0 0 2 -5.5 5 -7.5' },
      { d: 'M18 20.5l-2.5 -2.5l-.5 .5l.5 1z' },
      { d: 'M18 20.5c0 0 -5.5 -1 -8.5 -3.5' },
      { d: 'M18 20.5c0 0 -2 -5.5 -5 -7.5' },
    ],
  },
  eolica_offshore: {
    bg: '#cffafe', stroke: '#0e7490',
    paths: [
      { d: 'M12 12m-1 0a1 1 0 1 0 2 0a1 1 0 1 0 -2 0' },
      { d: 'M12 3l1 3l-1 .5l-1 -.5z' },
      { d: 'M12 3c0 0 -3.5 5 -3.5 9.5' },
      { d: 'M12 3c0 0 3.5 5 3.5 9.5' },
      { d: 'M6 20.5l2.5 -2.5l.5 .5l-.5 1z' },
      { d: 'M6 20.5c0 0 5.5 -1 8.5 -3.5' },
      { d: 'M6 20.5c0 0 2 -5.5 5 -7.5' },
      { d: 'M18 20.5l-2.5 -2.5l-.5 .5l.5 1z' },
      { d: 'M18 20.5c0 0 -5.5 -1 -8.5 -3.5' },
      { d: 'M18 20.5c0 0 -2 -5.5 -5 -7.5' },
    ],
  },
  fotovoltaica: {
    bg: '#fef3c7', stroke: '#b45309',
    paths: [
      // IconSolarPanel - grid of panels
      { d: 'M4 3h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1z' },
      { d: 'M16 3h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1z' },
      { d: 'M4 13h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1z' },
      { d: 'M16 13h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1z' },
      { d: 'M10 7h4' },
      { d: 'M10 17h4' },
      { d: 'M7 10v4' },
      { d: 'M17 10v4' },
    ],
  },
  bess: {
    bg: '#dcfce7', stroke: '#15803d',
    paths: [
      // IconBattery4 - full battery
      { d: 'M6 7h11a2 2 0 0 1 2 2v.5a.5 .5 0 0 0 .5 .5a.5 .5 0 0 1 .5 .5v3a.5 .5 0 0 1 -.5 .5a.5 .5 0 0 0 -.5 .5v.5a2 2 0 0 1 -2 2h-11a2 2 0 0 1 -2 -2v-6a2 2 0 0 1 2 -2' },
      { d: 'M7 10l0 4' },
      { d: 'M10 10l0 4' },
      { d: 'M13 10l0 4' },
      { d: 'M16 10l0 4' },
    ],
  },
  hidreletrica: {
    bg: '#e0e7ff', stroke: '#4338ca',
    paths: [
      // IconDroplet
      { d: 'M6.8 11a6 6 0 1 0 10.396 0l-5.197 -8l-5.2 8z' },
    ],
  },
  biomassa: {
    bg: '#ffedd5', stroke: '#c2410c',
    paths: [
      // IconFlame
      { d: 'M12 12c2 -2.96 0 -7 -1 -8c0 3.038 -1.773 4.741 -3 6c-1.226 1.26 -2 3.24 -2 5a6 6 0 0 0 12 0c0 -1.532 -1.056 -3.94 -2 -5c-1.786 3 -2.791 3 -4 2z' },
    ],
  },
  biocombustivel: {
    bg: '#f0fdf4', stroke: '#4d7c0f',
    paths: [
      // IconLeaf
      { d: 'M5 21c.5 -4.5 2.5 -8 7 -10' },
      { d: 'M9 18c6.218 0 10.5 -3.288 11 -12v-2h-4.014c-9 0 -11.986 4 -12 9c0 1 0 3 2 5h3z' },
    ],
  },
  hibrida: {
    bg: '#ede9fe', stroke: '#7c3aed',
    paths: [
      // IconBolt
      { d: 'M13 3l0 7l6 0l-8 11l0 -7l-6 0l8 -11' },
    ],
  },
  subestacao: {
    bg: '#f1f5f9', stroke: '#475569',
    paths: [
      // IconBuildingSkyscraper
      { d: 'M3 21l18 0' },
      { d: 'M5 21v-14l8 -4v18' },
      { d: 'M19 21v-10l-6 -4' },
      { d: 'M9 9l0 .01' },
      { d: 'M9 12l0 .01' },
      { d: 'M9 15l0 .01' },
      { d: 'M9 18l0 .01' },
    ],
  },
  energia_residuos: {
    bg: '#fee2e2', stroke: '#b91c1c',
    paths: [
      { d: 'M13 3l0 7l6 0l-8 11l0 -7l-6 0l8 -11' },
    ],
  },
  geotermica: {
    bg: '#ffe4e6', stroke: '#be123c',
    paths: [
      { d: 'M6.8 11a6 6 0 1 0 10.396 0l-5.197 -8l-5.2 8z' },
    ],
  },
  hidrogenio: {
    bg: '#e0f2fe', stroke: '#0369a1',
    paths: [
      { d: 'M6.8 11a6 6 0 1 0 10.396 0l-5.197 -8l-5.2 8z' },
    ],
  },
  solar_termico: {
    bg: '#fef9c3', stroke: '#a16207',
    paths: [
      { d: 'M4 3h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1z' },
      { d: 'M16 3h4a1 1 0 0 1 1 1v4a1 1 0 0 1 -1 1h-4a1 1 0 0 1 -1 -1v-4a1 1 0 0 1 1 -1z' },
      { d: 'M10 7h4' },
      { d: 'M7 10v4' },
    ],
  },
  nuclear: {
    bg: '#ede9fe', stroke: '#6d28d9',
    paths: [
      // IconAtom
      { d: 'M12 12m-3 0a3 3 0 1 0 6 0a3 3 0 1 0 -6 0' },
      { d: 'M12 21l0 -3' },
      { d: 'M3 6l2.5 1.5' },
      { d: 'M21 6l-2.5 1.5' },
      { d: 'M6.5 19.5l1.5 -2.5' },
      { d: 'M17.5 19.5l-1.5 -2.5' },
      { d: 'M3 18l2.5 -1.5' },
      { d: 'M21 18l-2.5 -1.5' },
      { d: 'M6.5 4.5l1.5 2.5' },
      { d: 'M17.5 4.5l-1.5 2.5' },
    ],
  },
  ondas: {
    bg: '#ccfbf1', stroke: '#0f766e',
    paths: [
      // IconWaveSine
      { d: 'M4 12c1.333 -5.333 2.667 -8 4 -8c2 0 2 8 4 8s2 -8 4 -8c1.333 0 2.667 2.667 4 8' },
    ],
  },
  mare: {
    bg: '#dbeafe', stroke: '#1e40af',
    paths: [
      { d: 'M4 12c1.333 -5.333 2.667 -8 4 -8c2 0 2 8 4 8s2 -8 4 -8c1.333 0 2.667 2.667 4 8' },
    ],
  },
  solar_telhado: {
    bg: '#fff7ed', stroke: '#c2410c',
    paths: [
      // IconHome + solar panel hint
      { d: 'M5 12l-2 0l9 -9l9 9l-2 0' },
      { d: 'M5 12v7a2 2 0 0 0 2 2h10a2 2 0 0 0 2 -2v-7' },
      { d: 'M9 21v-6a2 2 0 0 1 2 -2h2a2 2 0 0 1 2 2v6' },
    ],
  },
};

const DEFAULT_CONFIG = {
  bg: '#f1f5f9', stroke: '#475569',
  paths: [
    { d: 'M9 11a3 3 0 1 0 6 0a3 3 0 0 0 -6 0' },
    { d: 'M17.657 16.657l-4.243 4.243a2 2 0 0 1 -2.827 0l-4.244 -4.243a8 8 0 1 1 11.314 0z' },
  ],
};

const createMarkerSvg = (siteType: string | null): string => {
  const config = SITE_TYPE_CONFIG[siteType || ''] || DEFAULT_CONFIG;
  const cx = PIN_W / 2;
  const cy = PIN_W / 2; // circle center (top part of pin)

  // Icon rendered inside the circle
  const iconSize = 16;
  const iconX = cx - iconSize / 2;
  const iconY = cy - iconSize / 2;
  const scale = iconSize / 24;

  // Build path elements
  const pathElements = config.paths.map(p =>
    `<path d="${p.d}" fill="${p.fill || 'none'}" stroke="${config.stroke}" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"/>`
  ).join('');

  const pinSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PIN_W}" height="${PIN_H}" viewBox="0 0 ${PIN_W} ${PIN_H}">
    <!-- Drop shadow -->
    <ellipse cx="${cx}" cy="${PIN_H - 2}" rx="6" ry="2" fill="rgba(0,0,0,0.15)"/>
    <!-- Pin body -->
    <path d="M${cx} ${PIN_H - 4} C${cx} ${PIN_H - 4} 3 ${PIN_W * 0.72} 3 ${cy} C3 ${(cy * 0.38).toFixed(1)} ${(cx * 0.38).toFixed(1)} 3 ${cx} 3 C${(cx * 1.62).toFixed(1)} 3 ${PIN_W - 3} ${(cy * 0.38).toFixed(1)} ${PIN_W - 3} ${cy} C${PIN_W - 3} ${PIN_W * 0.72} ${cx} ${PIN_H - 4} ${cx} ${PIN_H - 4}Z" fill="${config.stroke}"/>
    <!-- White circle -->
    <circle cx="${cx}" cy="${cy}" r="${(cx * 0.68).toFixed(1)}" fill="${config.bg}"/>
    <!-- Icon -->
    <g transform="translate(${iconX}, ${iconY}) scale(${scale})">
      ${pathElements}
    </g>
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
          anchor: new google.maps.Point(PIN_W / 2, PIN_H - 4),
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