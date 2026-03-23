import { useEffect, useRef, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { FA_PATHS } from '@/pages/SitesManagement';

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

const siteTypeMapConfig: Record<string, { svgPath: string; viewBox: string; bg: string; stroke: string }> = {
  eolica:          { svgPath: FA_PATHS.windTurbine.path,            viewBox: FA_PATHS.windTurbine.viewBox,            bg: '#dbeafe', stroke: '#2563eb' },
  eolica_offshore: { svgPath: FA_PATHS.windSparkle.path,            viewBox: FA_PATHS.windSparkle.viewBox,            bg: '#cffafe', stroke: '#0891b2' },
  fotovoltaica:    { svgPath: FA_PATHS.solarPanel.path,             viewBox: FA_PATHS.solarPanel.viewBox,             bg: '#fef3c7', stroke: '#d97706' },
  bess:            { svgPath: FA_PATHS.batteryBolt.path,            viewBox: FA_PATHS.batteryBolt.viewBox,            bg: '#dcfce7', stroke: '#16a34a' },
  hidreletrica:    { svgPath: FA_PATHS.arrowUpFromGroundWater.path, viewBox: FA_PATHS.arrowUpFromGroundWater.viewBox, bg: '#e0e7ff', stroke: '#4f46e5' },
  biomassa:        { svgPath: FA_PATHS.fireFlameCurved.path,        viewBox: FA_PATHS.fireFlameCurved.viewBox,        bg: '#ffedd5', stroke: '#ea580c' },
  biocombustivel:  { svgPath: FA_PATHS.seedling.path,               viewBox: FA_PATHS.seedling.viewBox,               bg: '#f0fdf4', stroke: '#65a30d' },
  hibrida:         { svgPath: FA_PATHS.bolt.path,                   viewBox: FA_PATHS.bolt.viewBox,                   bg: '#ede9fe', stroke: '#7c3aed' },
  subestacao:      { svgPath: FA_PATHS.building.path,               viewBox: FA_PATHS.building.viewBox,               bg: '#f1f5f9', stroke: '#475569' },
  default:         { svgPath: FA_PATHS.building.path,               viewBox: FA_PATHS.building.viewBox,               bg: '#f1f5f9', stroke: '#0e182e' },
};

const createMarkerSvg = (siteType: string | null): string => {
  const config = siteTypeMapConfig[siteType || 'default'] || siteTypeMapConfig.default;
  const cx = PIN_W / 2;

  const iconSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${ICON_SIZE}" height="${ICON_SIZE}" viewBox="${config.viewBox}"><path fill="${config.stroke}" d="${config.svgPath}"/></svg>`;

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