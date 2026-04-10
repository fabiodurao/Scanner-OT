import { useEffect, useRef, useState, useCallback } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Loader2 } from 'lucide-react';
import { SITE_TYPE_ICONS } from '@/components/icons/SiteTypeIcon';
import { siteTypeConfig } from '@/pages/SitesManagement';
import { SiteDiscoveryStats } from '@/types/discovery';
import { renderSiteMapCardHTML } from './SiteMapCard';
import { useTheme } from '@/hooks/useTheme';

interface SiteMapData {
  id: string;
  identifier: string | null;
  name: string | null;
  site_type: string | null;
  city: string | null;
  state: string | null;
  latitude?: number | null;
  longitude?: number | null;
  stats?: SiteDiscoveryStats | null;
  pcap?: { fileCount: number; totalBytes: number } | null;
}

interface SitesMapProps {
  sites: SiteMapData[];
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

const darkMapStyle = [
  { elementType: "geometry", stylers: [{ color: "#212121" }] },
  { elementType: "labels.icon", stylers: [{ visibility: "off" }] },
  { elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { elementType: "labels.text.stroke", stylers: [{ color: "#212121" }] },
  { featureType: "administrative", elementType: "geometry", stylers: [{ color: "#757575" }] },
  { featureType: "administrative.country", elementType: "labels.text.fill", stylers: [{ color: "#9e9e9e" }] },
  { featureType: "administrative.land_parcel", stylers: [{ visibility: "off" }] },
  { featureType: "administrative.locality", elementType: "labels.text.fill", stylers: [{ color: "#bdbdbd" }] },
  { featureType: "poi", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "poi.park", elementType: "geometry", stylers: [{ color: "#181818" }] },
  { featureType: "poi.park", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "poi.park", elementType: "labels.text.stroke", stylers: [{ color: "#1b1b1b" }] },
  { featureType: "road", elementType: "geometry.fill", stylers: [{ color: "#2c2c2c" }] },
  { featureType: "road", elementType: "labels.text.fill", stylers: [{ color: "#8a8a8a" }] },
  { featureType: "road.arterial", elementType: "geometry", stylers: [{ color: "#373737" }] },
  { featureType: "road.highway", elementType: "geometry", stylers: [{ color: "#3c3c3c" }] },
  { featureType: "road.highway.controlled_access", elementType: "geometry", stylers: [{ color: "#4e4e4e" }] },
  { featureType: "road.local", elementType: "labels.text.fill", stylers: [{ color: "#616161" }] },
  { featureType: "transit", elementType: "labels.text.fill", stylers: [{ color: "#757575" }] },
  { featureType: "water", elementType: "geometry", stylers: [{ color: "#000000" }] },
  { featureType: "water", elementType: "labels.text.fill", stylers: [{ color: "#3d3d3d" }] },
];

const PIN_W = 40;
const PIN_H = 50;

const createMarkerSvg = (siteType: string | null): string => {
  const config = siteType ? siteTypeConfig[siteType] : null;
  const IconComponent = siteType ? SITE_TYPE_ICONS[siteType] : null;

  const bg = config?.bgColor ?? '#f1f5f9';
  const stroke = config?.primaryColor ?? '#475569';

  const cx = PIN_W / 2;
  const cy = PIN_W / 2;

  let iconSvgContent = '';
  if (IconComponent) {
    const fullSvg = renderToStaticMarkup(
      IconComponent({ primaryColor: stroke, secondaryColor: stroke, size: 16 })
    );
    const innerMatch = fullSvg.match(/<svg[^>]*>([\s\S]*?)<\/svg>/);
    if (innerMatch) {
      iconSvgContent = innerMatch[1];
    }
  }

  const iconSize = 16;
  const iconX = cx - iconSize / 2;
  const iconY = cy - iconSize / 2;

  const pinSvg = `<svg xmlns="http://www.w3.org/2000/svg" width="${PIN_W}" height="${PIN_H}" viewBox="0 0 ${PIN_W} ${PIN_H}">
    <ellipse cx="${cx}" cy="${PIN_H - 2}" rx="5" ry="2" fill="rgba(0,0,0,0.18)"/>
    <path d="M${cx} ${PIN_H - 4} C${cx} ${PIN_H - 4} 3 ${(PIN_W * 0.72).toFixed(1)} 3 ${cy} C3 ${(cy * 0.38).toFixed(1)} ${(cx * 0.38).toFixed(1)} 3 ${cx} 3 C${(cx * 1.62).toFixed(1)} 3 ${PIN_W - 3} ${(cy * 0.38).toFixed(1)} ${PIN_W - 3} ${cy} C${PIN_W - 3} ${(PIN_W * 0.72).toFixed(1)} ${cx} ${PIN_H - 4} ${cx} ${PIN_H - 4}Z" fill="${stroke}"/>
    <circle cx="${cx}" cy="${cy}" r="${(cx * 0.7).toFixed(1)}" fill="${bg}"/>
    <svg x="${iconX}" y="${iconY}" width="${iconSize}" height="${iconSize}" viewBox="0 0 24 24" fill="none" stroke="${stroke}" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
      ${iconSvgContent}
    </svg>
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
  const { theme } = useTheme();
  const onSiteClickRef = useRef(onSiteClick);
  onSiteClickRef.current = onSiteClick;

  const sitesWithCoords = sites.filter(
    s => s.latitude != null && s.longitude != null &&
         !isNaN(Number(s.latitude)) && !isNaN(Number(s.longitude))
  );

  // Load Google Maps script
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) { setError('Google Maps API key not configured (VITE_GOOGLE_MAPS_API_KEY).'); return; }
    loadGoogleMaps(GOOGLE_MAPS_API_KEY).then(() => setIsLoaded(true)).catch(() => setError('Failed to load Google Maps.'));
  }, []);

  // DEBUG: Log every theme change
  useEffect(() => {
    console.log('[SitesMap] 🎨 Theme changed to:', theme);
    console.log('[SitesMap] 🗺️ mapInstanceRef.current exists?', !!mapInstanceRef.current);
    console.log('[SitesMap] 🗺️ mapInstanceRef.current type:', typeof mapInstanceRef.current);
    
    if (mapInstanceRef.current) {
      console.log('[SitesMap] 🗺️ Map instance found, has setOptions?', typeof mapInstanceRef.current.setOptions);
      const styles = theme === 'dark' ? darkMapStyle : silverMapStyle;
      console.log('[SitesMap] 🎨 Applying', theme === 'dark' ? 'DARK' : 'LIGHT', 'styles, count:', styles.length);
      try {
        mapInstanceRef.current.setOptions({ styles });
        console.log('[SitesMap] ✅ setOptions called successfully');
      } catch (e) {
        console.error('[SitesMap] ❌ setOptions failed:', e);
      }
    } else {
      console.log('[SitesMap] ⚠️ No map instance available yet');
    }
  }, [theme]);

  // Create map + markers
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const google = (window as any).google;
    if (!isLoaded || !mapRef.current || !google) {
      console.log('[SitesMap] 🏗️ Create map skipped:', { isLoaded, hasMapRef: !!mapRef.current, hasGoogle: !!google });
      return;
    }

    const currentStyles = theme === 'dark' ? darkMapStyle : silverMapStyle;
    console.log('[SitesMap] 🏗️ Creating map with theme:', theme);

    const map = new google.maps.Map(mapRef.current, {
      center: { lat: -15, lng: -50 },
      zoom: 4,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: true,
      zoomControl: true,
      styles: currentStyles,
    });

    // Store in ref
    mapInstanceRef.current = map;
    console.log('[SitesMap] 🏗️ Map created and stored in ref. mapInstanceRef.current exists?', !!mapInstanceRef.current);

    if (sitesWithCoords.length === 0) {
      console.log('[SitesMap] 🏗️ No sites with coords, skipping markers');
      return;
    }

    const bounds = new google.maps.LatLngBounds();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let currentInfoWindow: any = null;

    sitesWithCoords.forEach(site => {
      const position = { lat: Number(site.latitude), lng: Number(site.longitude) };
      bounds.extend(position);

      const markerIcon = createMarkerSvg(site.site_type);

      const marker = new google.maps.Marker({
        position,
        map,
        title: site.name || site.identifier || 'Site',
        icon: {
          url: markerIcon,
          scaledSize: new google.maps.Size(PIN_W, PIN_H),
          anchor: new google.maps.Point(PIN_W / 2, PIN_H - 4),
        },
      });

      const cardHTML = renderSiteMapCardHTML(
        { id: site.id, identifier: site.identifier, name: site.name, site_type: site.site_type, city: site.city, state: site.state },
        site.stats ?? null,
        site.pcap ?? null
      );

      const infoWindow = new google.maps.InfoWindow({
        content: cardHTML,
        disableAutoPan: true,
        pixelOffset: new google.maps.Size(0, -PIN_H + 4),
      });

      google.maps.event.addListener(infoWindow, 'domready', () => {
        const closeButtons = document.querySelectorAll('.gm-ui-hover-effect');
        closeButtons.forEach((btn: Element) => {
          (btn as HTMLElement).style.display = 'none';
        });
        const iwOuter = document.querySelector('.gm-style-iw-d');
        if (iwOuter) {
          (iwOuter as HTMLElement).style.overflow = 'hidden';
          (iwOuter as HTMLElement).style.padding = '0';
        }
        const iwContainer = document.querySelector('.gm-style-iw-c');
        if (iwContainer) {
          (iwContainer as HTMLElement).style.padding = '0';
          (iwContainer as HTMLElement).style.borderRadius = '10px';
          (iwContainer as HTMLElement).style.boxShadow = '0 4px 20px rgba(0,0,0,0.15)';
        }
      });

      marker.addListener('mouseover', () => {
        if (currentInfoWindow) currentInfoWindow.close();
        infoWindow.open(map, marker);
        currentInfoWindow = infoWindow;
      });

      marker.addListener('mouseout', () => {
        infoWindow.close();
        currentInfoWindow = null;
      });

      marker.addListener('click', () => {
        infoWindow.close();
        onSiteClickRef.current(site.identifier, site.id);
      });
    });

    if (sitesWithCoords.length === 1) {
      map.setCenter(bounds.getCenter());
      map.setZoom(10);
    } else {
      map.fitBounds(bounds, { top: 60, right: 60, bottom: 60, left: 60 });
    }

    return () => {
      console.log('[SitesMap] 🧹 Cleanup: clearing mapInstanceRef');
      mapInstanceRef.current = null;
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded, sitesWithCoords.length]);

  // DEBUG: Log component render
  console.log('[SitesMap] 🔄 Render. theme:', theme, 'isLoaded:', isLoaded, 'mapExists:', !!mapInstanceRef.current);

  if (error) {
    return (
      <div className="w-full rounded-lg border bg-slate-50 dark:bg-muted flex items-center justify-center text-center p-6" style={{ height: 'calc(100vh - 380px)', minHeight: '400px' }}>
        <div>
          <p className="text-sm text-muted-foreground">{error}</p>
          <p className="text-xs text-slate-400 mt-1">Configure VITE_GOOGLE_MAPS_API_KEY to enable the map view.</p>
        </div>
      </div>
    );
  }

  if (!isLoaded) {
    return (
      <div className="w-full rounded-lg border bg-slate-50 dark:bg-muted flex items-center justify-center gap-2 text-muted-foreground" style={{ height: 'calc(100vh - 380px)', minHeight: '400px' }}>
        <Loader2 className="h-5 w-5 animate-spin" />
        <span className="text-sm">Loading map...</span>
      </div>
    );
  }

  return (
    <div className="relative w-full rounded-lg border overflow-hidden shadow-sm" style={{ height: 'calc(100vh - 380px)', minHeight: '400px' }}>
      <div ref={mapRef} className="w-full h-full" />
      {sitesWithCoords.length === 0 && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 dark:bg-background/80 pointer-events-none">
          <p className="text-sm text-muted-foreground">No sites with coordinates registered yet.</p>
        </div>
      )}
    </div>
  );
};