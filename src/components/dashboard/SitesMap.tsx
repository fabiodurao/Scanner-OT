import { useEffect, useRef, useState, useCallback } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Loader2, Map, Satellite } from 'lucide-react';
import { SITE_TYPE_ICONS } from '@/components/icons/SiteTypeIcon';
import { siteTypeConfig } from '@/pages/SitesManagement';
import { SiteDiscoveryStats } from '@/types/discovery';
import { renderSiteMapCardHTML } from './SiteMapCard';
import { useTheme } from '@/contexts/ThemeContext';

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
    if (innerMatch) iconSvgContent = innerMatch[1];
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
  const [mapType, setMapType] = useState<'roadmap' | 'hybrid'>('roadmap');
  const [isStreetView, setIsStreetView] = useState(false);
  const onSiteClickRef = useRef(onSiteClick);
  onSiteClickRef.current = onSiteClick;

  const { theme } = useTheme();

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

  // Open Street View at a given position
  const openStreetView = useCallback((lat: number, lng: number) => {
    const map = mapInstanceRef.current;
    if (!map) return;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const google = (window as any).google;
    const sv = map.getStreetView();
    sv.setPosition({ lat, lng });
    sv.setPov({ heading: 0, pitch: 0 });
    sv.setVisible(true);
    setIsStreetView(true);

    // Listen for when user closes street view via the native X button
    google.maps.event.addListenerOnce(sv, 'visible_changed', () => {
      if (!sv.getVisible()) {
        setIsStreetView(false);
      }
    });
  }, []);

  // Initialize map
  useEffect(() => {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const google = (window as any).google;
    if (!isLoaded || !mapRef.current || !google) return;

    const isDark = theme === 'dark';

    const map = new google.maps.Map(mapRef.current, {
      center: { lat: -15, lng: -50 },
      zoom: 4,
      mapTypeId: 'roadmap',
      mapTypeControl: false,
      streetViewControl: true,
      fullscreenControl: true,
      zoomControl: true,
      styles: isDark ? darkMapStyle : silverMapStyle,
    });

    mapInstanceRef.current = map;

    // Track street view visibility changes
    const sv = map.getStreetView();
    google.maps.event.addListener(sv, 'visible_changed', () => {
      setIsStreetView(sv.getVisible());
    });

    if (sitesWithCoords.length === 0) return;

    const bounds = new google.maps.LatLngBounds();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let currentInfoWindow: any = null;

    sitesWithCoords.forEach(site => {
      const position = { lat: Number(site.latitude), lng: Number(site.longitude) };
      bounds.extend(position);

      const marker = new google.maps.Marker({
        position,
        map,
        title: site.name || site.identifier || 'Site',
        icon: {
          url: createMarkerSvg(site.site_type),
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
        document.querySelectorAll('.gm-ui-hover-effect').forEach((btn: Element) => {
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

        // Attach click handlers for the action buttons
        const openBtn = document.querySelector('[data-action="open"]');
        if (openBtn) {
          (openBtn as HTMLElement).addEventListener('click', (e) => {
            e.stopPropagation();
            infoWindow.close();
            onSiteClickRef.current(site.identifier, site.id);
          });
        }
        const svBtn = document.querySelector('[data-action="streetview"]');
        if (svBtn) {
          (svBtn as HTMLElement).addEventListener('click', (e) => {
            e.stopPropagation();
            infoWindow.close();
            openStreetView(Number(site.latitude), Number(site.longitude));
          });
        }
      });

      // Keep infoWindow open on hover — use a flag to track
      let isHoveringMarker = false;
      let isHoveringInfoWindow = false;
      let closeTimeout: ReturnType<typeof setTimeout> | null = null;

      const tryClose = () => {
        closeTimeout = setTimeout(() => {
          if (!isHoveringMarker && !isHoveringInfoWindow) {
            infoWindow.close();
            currentInfoWindow = null;
          }
        }, 150);
      };

      marker.addListener('mouseover', () => {
        isHoveringMarker = true;
        if (closeTimeout) clearTimeout(closeTimeout);
        if (currentInfoWindow && currentInfoWindow !== infoWindow) {
          currentInfoWindow.close();
        }
        infoWindow.open(map, marker);
        currentInfoWindow = infoWindow;
      });

      marker.addListener('mouseout', () => {
        isHoveringMarker = false;
        tryClose();
      });

      // Track mouse on the InfoWindow DOM
      google.maps.event.addListener(infoWindow, 'domready', () => {
        const iwWrapper = document.querySelector('.gm-style-iw-c');
        if (iwWrapper) {
          iwWrapper.addEventListener('mouseenter', () => {
            isHoveringInfoWindow = true;
            if (closeTimeout) clearTimeout(closeTimeout);
          });
          iwWrapper.addEventListener('mouseleave', () => {
            isHoveringInfoWindow = false;
            tryClose();
          });
        }
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
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoaded]);

  // React to theme changes — update map styles
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const isDark = theme === 'dark';
    const currentType = mapInstanceRef.current.getMapTypeId();
    // Only apply custom styles when in roadmap mode
    if (currentType === 'roadmap') {
      mapInstanceRef.current.setOptions({
        styles: isDark ? darkMapStyle : silverMapStyle,
      });
    }
  }, [theme]);

  // React to map type changes
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const isDark = theme === 'dark';
    mapInstanceRef.current.setMapTypeId(mapType);
    // Custom styles only apply to roadmap
    if (mapType === 'roadmap') {
      mapInstanceRef.current.setOptions({
        styles: isDark ? darkMapStyle : silverMapStyle,
      });
    } else {
      mapInstanceRef.current.setOptions({ styles: [] });
    }
  }, [mapType, theme]);

  const handleExitStreetView = () => {
    const map = mapInstanceRef.current;
    if (!map) return;
    const sv = map.getStreetView();
    sv.setVisible(false);
    setIsStreetView(false);
  };

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

      {/* Map type toggle — top-left */}
      {!isStreetView && (
        <div className="absolute top-3 left-3 z-10">
          <div className="flex rounded-lg overflow-hidden shadow-lg border border-black/10">
            <button
              onClick={() => setMapType('roadmap')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors ${
                mapType === 'roadmap'
                  ? 'bg-white text-gray-900'
                  : 'bg-white/70 text-gray-500 hover:bg-white/90 hover:text-gray-700'
              }`}
            >
              <Map className="h-3.5 w-3.5" />
              Map
            </button>
            <button
              onClick={() => setMapType('hybrid')}
              className={`flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium transition-colors border-l border-black/10 ${
                mapType === 'hybrid'
                  ? 'bg-white text-gray-900'
                  : 'bg-white/70 text-gray-500 hover:bg-white/90 hover:text-gray-700'
              }`}
            >
              <Satellite className="h-3.5 w-3.5" />
              Satellite
            </button>
          </div>
        </div>
      )}

      {/* Street View exit button */}
      {isStreetView && (
        <div className="absolute top-3 left-3 z-10">
          <button
            onClick={handleExitStreetView}
            className="flex items-center gap-2 px-4 py-2 rounded-lg bg-white shadow-lg text-sm font-medium text-gray-800 hover:bg-gray-50 transition-colors border border-black/10"
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M19 12H5" />
              <path d="M12 19l-7-7 7-7" />
            </svg>
            Back to map
          </button>
        </div>
      )}

      {sitesWithCoords.length === 0 && !isStreetView && (
        <div className="absolute inset-0 flex items-center justify-center bg-slate-50/80 dark:bg-background/80 pointer-events-none">
          <p className="text-sm text-muted-foreground">No sites with coordinates registered yet.</p>
        </div>
      )}
    </div>
  );
};
