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
const ICON_SIZE = 15;
const ICON_OFFSET = Math.round((PIN_W - ICON_SIZE) / 2);

// FontAwesome Free solid SVG paths (viewBox 0 0 512 512 or 576 512 etc.)
// Matching the icons shown in the company system prints
const FA_ICONS: Record<string, { viewBox: string; path: string; bg: string; stroke: string }> = {
  // fa-wind (Wind Turbine) — FA Free solid
  eolica: {
    bg: '#dbeafe',
    stroke: '#2563eb',
    viewBox: '0 0 512 512',
    path: 'M288 32c0 17.7-14.3 32-32 32s-32-14.3-32-32S270.3 0 256 0s-32 14.3-32 32zm0 448c0 17.7-14.3 32-32 32s-32-14.3-32-32V288c0-17.7 14.3-32 32-32s32 14.3 32 32v192zM160 256c0 53-43 96-96 96S0 309 0 256s43-96 96-96c23.7 0 45.4 8.6 62.1 22.8L222.1 96c8.8-15.3 28.3-20.5 43.6-11.7s20.5 28.3 11.7 43.6L213.4 224H160zm192 0c0-53 43-96 96-96s96 43 96 96-43 96-96 96c-23.7 0-45.4-8.6-62.1-22.8L321.9 416c-8.8 15.3-28.3 20.5-43.6 11.7s-20.5-28.3-11.7-43.6L320.6 288H352z',
  },
  // fa-water (Wind Offshore) — FA Free solid
  eolica_offshore: {
    bg: '#cffafe',
    stroke: '#0891b2',
    viewBox: '0 0 576 512',
    path: 'M562.1 383.9c-21.5-2.4-42.1-10.5-57.9-22.9-14.1-11.1-34.2-11.3-48.2 0-37.9 30.4-107.2 30.4-145.7-1.5-13.5-11.2-33-9.1-46.7 1.8-38 30.1-106.9 30.1-145.2-1.5-13.7-11.1-33.5-9.2-47.1 1.7C55.1 372.8 36 380.8 14.4 383.9c-17.6 2.4-30.1 18.5-27.7 36.1 2.4 17.6 18.5 30.1 36.1 27.7 28.5-3.9 55.7-13.3 79.4-27.7 49.5 29.1 117.1 29.1 166.6 0 49.5 29.1 117.1 29.1 166.6 0 23.7 14.4 50.9 23.8 79.4 27.7 17.6 2.4 33.7-10.1 36.1-27.7 2.4-17.6-10.1-33.7-27.7-36.1zM576 256c0 17.7-14.3 32-32 32H32c-17.7 0-32-14.3-32-32s14.3-32 32-32h512c17.7 0 32 14.3 32 32zM0 128c0-17.7 14.3-32 32-32h512c17.7 0 32 14.3 32 32s-14.3 32-32 32H32c-17.7 0-32-14.3-32-32z',
  },
  // fa-solar-panel (Solar) — FA Free solid
  fotovoltaica: {
    bg: '#fef3c7',
    stroke: '#d97706',
    viewBox: '0 0 640 512',
    path: 'M32 0C14.3 0 0 14.3 0 32V352c0 17.7 14.3 32 32 32H244.4c-3.5 14.1-8.6 27.7-15.3 40.5c-5.8 11.1-4.1 24.6 4.3 33.9S254.3 472 266.7 472h106.7c12.3 0 23.9-5.4 31.6-14.8s10.1-22.8 4.3-33.9c-6.7-12.8-11.8-26.4-15.3-40.5H608c17.7 0 32-14.3 32-32V32c0-17.7-14.3-32-32-32H32zM192 96H448V288H192V96zM64 96H128V160H64V96zM128 224v64H64V224h64zM512 96h64v64H512V96zm64 128v64H512V224h64z',
  },
  // fa-battery-bolt (BESS) — FA Pro, using fa-bolt as fallback (FA Free)
  bess: {
    bg: '#dcfce7',
    stroke: '#16a34a',
    viewBox: '0 0 576 512',
    path: 'M464 160c8.8 0 16 7.2 16 16V336c0 8.8-7.2 16-16 16H80c-8.8 0-16-7.2-16-16V176c0-8.8 7.2-16 16-16H464zM80 96C35.8 96 0 131.8 0 176V336c0 44.2 35.8 80 80 80H464c44.2 0 80-35.8 80-80V320c17.7 0 32-14.3 32-32V224c0-17.7-14.3-32-32-32V176c0-44.2-35.8-80-80-80H80zm208 88c-4.9-7.4-13.2-11.8-22-11.8s-17.1 4.4-22 11.8l-64 96c-5.3 8-5.6 18.2-.8 26.5S193.2 320 202.7 320H240v48c0 9.6 5.5 18.3 14.2 22.5s19 3.1 26.5-2.9l96-80c7.1-5.9 10.5-15.1 8.9-24.1s-8.1-16.4-17.1-19.1L320 256.4V208c0-10.4-6.3-19.8-15.9-23.8z',
  },
  // fa-droplet (Hydropower) — FA Free solid
  hidreletrica: {
    bg: '#e0e7ff',
    stroke: '#4f46e5',
    viewBox: '0 0 384 512',
    path: 'M192 512C86 512 0 426 0 320C0 228.8 130.2 57.7 166.6 11.7C172.6 4.2 181.5 0 191 0h2c9.5 0 18.4 4.2 24.4 11.7C253.8 57.7 384 228.8 384 320c0 106-86 192-192 192z',
  },
  // fa-fire-flame-curved (Biomass) — FA Free solid
  biomassa: {
    bg: '#ffedd5',
    stroke: '#ea580c',
    viewBox: '0 0 384 512',
    path: 'M153.6 29.9l16-21.3C173.6 3.2 180 0 186.7 0C198.4 0 208 9.6 208 21.3V43.5c0 13.1 5.4 25.7 14.9 34.7L307.6 159C356.4 205.6 384 270.2 384 337.7C384 434 306 512 209.7 512H192C86 512 0 426 0 320v-3.8c0-48.8 19.4-95.6 53.9-130.1l3.5-3.5c4.2-4.2 10-6.6 16-6.6C85.9 176 96 186.1 96 198.6V288c0 35.3 28.7 64 64 64s64-28.7 64-64v-3.9c0-18-7.2-35.3-19.9-48l-38.6-38.6c-24-24-37.5-56.7-37.5-90.7c0-27.7 9-54.8 25.6-76.9z',
  },
  // fa-seedling (Biofuels) — FA Free solid
  biocombustivel: {
    bg: '#f0fdf4',
    stroke: '#65a30d',
    viewBox: '0 0 512 512',
    path: 'M512 32c0 113.6-84.6 207.5-194.2 222c-7.1-53.4-30.6-101.6-65.3-139.3C290.8 46 364 0 448 0l32 0c17.7 0 32 14.3 32 32zM0 96C0 78.3 14.3 64 32 64l32 0c123.7 0 224 100.3 224 224l0 32 0 160c0 17.7-14.3 32-32 32s-32-14.3-32-32l0-160C100.3 320 0 219.7 0 96z',
  },
  // fa-bolt (Hybrid) — FA Free solid
  hibrida: {
    bg: '#ede9fe',
    stroke: '#7c3aed',
    viewBox: '0 0 448 512',
    path: 'M349.4 44.6c5.9-13.7 1.5-29.7-10.6-38.5s-28.6-8-39.9 1.8l-256 224c-10 8.8-13.6 22.9-8.9 35.3S50.7 288 64 288H175.5L98.6 467.4c-5.9 13.7-1.5 29.7 10.6 38.5s28.6 8 39.9-1.8l256-224c10-8.8 13.6-22.9 8.9-35.3s-16.6-20.7-30-20.7H272.5L349.4 44.6z',
  },
  // fa-building (Substation) — FA Free solid
  subestacao: {
    bg: '#f1f5f9',
    stroke: '#475569',
    viewBox: '0 0 384 512',
    path: 'M48 0C21.5 0 0 21.5 0 48V464c0 26.5 21.5 48 48 48h96V432c0-26.5 21.5-48 48-48s48 21.5 48 48v80h96c26.5 0 48-21.5 48-48V48c0-26.5-21.5-48-48-48H48zM64 240c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H80c-8.8 0-16-7.2-16-16V240zm112-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H176c-8.8 0-16-7.2-16-16V240c0-8.8 7.2-16 16-16zm112 16c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H304c-8.8 0-16-7.2-16-16V240zM64 96c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H80c-8.8 0-16-7.2-16-16V96zm112-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H176c-8.8 0-16-7.2-16-16V96c0-8.8 7.2-16 16-16zm112 16c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H304c-8.8 0-16-7.2-16-16V96z',
  },
  // Default fallback
  default: {
    bg: '#f1f5f9',
    stroke: '#0e182e',
    viewBox: '0 0 384 512',
    path: 'M48 0C21.5 0 0 21.5 0 48V464c0 26.5 21.5 48 48 48h96V432c0-26.5 21.5-48 48-48s48 21.5 48 48v80h96c26.5 0 48-21.5 48-48V48c0-26.5-21.5-48-48-48H48zM64 240c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H80c-8.8 0-16-7.2-16-16V240zm112-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H176c-8.8 0-16-7.2-16-16V240c0-8.8 7.2-16 16-16zm112 16c0-8.8 7.2-16 16-16h32c8.8 0 16 7.2 16 16v32c0 8.8-7.2 16-16 16H304c-8.8 0-16-7.2-16-16V240z',
  },
};

const createMarkerSvg = (siteType: string | null): string => {
  const config = FA_ICONS[siteType || 'default'] || FA_ICONS.default;
  const cx = PIN_W / 2;

  const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON_SIZE}" height="${ICON_SIZE}" viewBox="${config.viewBox}"><path fill="${config.stroke}" d="${config.path}"/></svg>`;

  const pinSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PIN_W}" height="${PIN_H}" viewBox="0 0 ${PIN_W} ${PIN_H}">
    <path d="M${cx} 0C${(cx * 0.45).toFixed(1)} 0 0 ${(cx * 0.45).toFixed(1)} 0 ${cx}C0 ${(PIN_H * 0.66).toFixed(1)} ${cx} ${PIN_H} ${cx} ${PIN_H}C${cx} ${PIN_H} ${PIN_W} ${(PIN_H * 0.66).toFixed(1)} ${PIN_W} ${cx}C${PIN_W} ${(cx * 0.45).toFixed(1)} ${(cx * 1.55).toFixed(1)} 0 ${cx} 0Z" fill="${config.stroke}"/>
    <circle cx="${cx}" cy="${cx}" r="${(cx * 0.72).toFixed(1)}" fill="${config.bg}"/>
    <image href="data:image/svg+xml;charset=UTF-8,${encodeURIComponent(iconSvg)}" x="${ICON_OFFSET}" y="${ICON_OFFSET}" width="${ICON_SIZE}" height="${ICON_SIZE}"/>
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

      const marker = new google.maps.Marker({
        position,
        map: mapInstanceRef.current,
        title: site.name || site.identifier || 'Site',
        icon: {
          url: createMarkerSvg(site.site_type),
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

      google.maps.event.addListener(infoWindow, 'domready', () => {
        const closeButtons = document.querySelectorAll('.gm-ui-hover-effect');
        closeButtons.forEach((btn: Element) => {
          (btn as HTMLElement).style.display = 'none';
        });
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