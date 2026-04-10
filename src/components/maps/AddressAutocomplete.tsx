import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useTheme } from '@/contexts/ThemeContext';

interface AddressData {
  formattedAddress: string;
  latitude: number;
  longitude: number;
  city: string | null;
  state: string | null;
  country: string | null;
  postalCode: string | null;
}

interface AddressAutocompleteProps {
  value: string;
  latitude: string;
  longitude: string;
  city: string;
  state: string;
  country: string;
  onAddressChange: (data: Partial<AddressData & { address: string }>) => void;
  disabled?: boolean;
}

interface Suggestion {
  placeId: string;
  description: string;
  mainText: string;
  secondaryText: string;
}

const GOOGLE_MAPS_API_KEY = import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '';

const DEFAULT_CENTER = { lat: 20, lng: 0 };
const DEFAULT_ZOOM = 2;

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

const createCustomMarkerIcon = (isDark: boolean) => {
  const pinColor = isDark ? '#60A5FA' : '#0E182E'; // blue-400 for dark, navy for light
  const dotColor = isDark ? '#1E293B' : '#ffffff'; // slate-800 for dark, white for light
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42"><path fill="${pinColor}" d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26s16-14 16-26c0-8.837-7.163-16-16-16z"/><circle fill="${dotColor}" cx="16" cy="16" r="6"/></svg>`;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const getGoogle = (): any => (window as any).google;

// Global promise to avoid loading the script multiple times
let mapsLoadPromise: Promise<void> | null = null;

const loadGoogleMaps = (apiKey: string): Promise<void> => {
  if (mapsLoadPromise) return mapsLoadPromise;

  // Already loaded
  if (getGoogle()?.maps?.places) {
    mapsLoadPromise = Promise.resolve();
    return mapsLoadPromise;
  }

  mapsLoadPromise = new Promise((resolve, reject) => {
    const script = document.createElement('script');
    script.src = `https://maps.googleapis.com/maps/api/js?key=${apiKey}&libraries=places,geocoding&language=en&region=US`;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => {
      mapsLoadPromise = null;
      reject(new Error('Failed to load Google Maps'));
    };
    document.head.appendChild(script);
  });

  return mapsLoadPromise;
};

export const AddressAutocomplete = ({
  value,
  latitude,
  longitude,
  city,
  state,
  country,
  onAddressChange,
  disabled = false,
}: AddressAutocompleteProps) => {
  const [inputValue, setInputValue] = useState(value);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [isApiLoaded, setIsApiLoaded] = useState(false);
  const [mapError, setMapError] = useState<string | null>(null);

  const { theme } = useTheme();

  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geocoderRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autocompleteServiceRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Load Google Maps script
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setMapError('Google Maps API key not configured. Add VITE_GOOGLE_MAPS_API_KEY to your environment.');
      return;
    }

    loadGoogleMaps(GOOGLE_MAPS_API_KEY)
      .then(() => {
        const google = getGoogle();
        geocoderRef.current = new google.maps.Geocoder();
        autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
        setIsApiLoaded(true);
      })
      .catch(() => {
        setMapError('Failed to load Google Maps. Check your API key and network connection.');
      });
  }, []);

  // Helper to add or update marker with theme-aware icon
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const addMarker = useCallback((position: { lat: number; lng: number }) => {
    const google = getGoogle();
    if (!mapInstanceRef.current || !google) return;

    if (markerRef.current) {
      markerRef.current.setMap(null);
    }

    const isDark = theme === 'dark';

    markerRef.current = new google.maps.Marker({
      position,
      map: mapInstanceRef.current,
      draggable: true,
      animation: google.maps.Animation.DROP,
      icon: {
        url: createCustomMarkerIcon(isDark),
        scaledSize: new google.maps.Size(32, 42),
        anchor: new google.maps.Point(16, 42),
      },
    });

    markerRef.current.addListener('dragend', () => {
      const pos = markerRef.current?.getPosition();
      if (pos && geocoderRef.current) {
        const lat = pos.lat();
        const lng = pos.lng();
        onAddressChange({ latitude: lat, longitude: lng });
        geocoderRef.current.geocode(
          { location: { lat, lng }, language: 'en' },
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          (results: any, status: string) => {
            if (status === 'OK' && results?.[0]) {
              const addressData = parseAddressComponents(results[0]);
              onAddressChange({ address: results[0].formatted_address, ...addressData });
              setInputValue(results[0].formatted_address);
            }
          }
        );
      }
    });
  }, [theme, onAddressChange]);

  // Initialize map after API is loaded
  useEffect(() => {
    const google = getGoogle();
    if (!isApiLoaded || !mapRef.current || !google) return;

    const hasCoordinates = latitude && longitude &&
      parseFloat(latitude) !== 0 && parseFloat(longitude) !== 0 &&
      !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude));

    const center = hasCoordinates
      ? { lat: parseFloat(latitude), lng: parseFloat(longitude) }
      : DEFAULT_CENTER;

    const isDark = theme === 'dark';

    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center,
      zoom: hasCoordinates ? 15 : DEFAULT_ZOOM,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      styles: isDark ? darkMapStyle : silverMapStyle,
    });

    if (hasCoordinates) {
      addMarker(center);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isApiLoaded]);

  // React to theme changes — update map styles and marker icon in real-time
  useEffect(() => {
    if (!mapInstanceRef.current) return;
    const isDark = theme === 'dark';
    mapInstanceRef.current.setOptions({
      styles: isDark ? darkMapStyle : silverMapStyle,
    });

    // Update marker icon if it exists
    if (markerRef.current) {
      const google = getGoogle();
      if (google) {
        markerRef.current.setIcon({
          url: createCustomMarkerIcon(isDark),
          scaledSize: new google.maps.Size(32, 42),
          anchor: new google.maps.Point(16, 42),
        });
      }
    }
  }, [theme]);

  // Update map when coordinates change externally
  useEffect(() => {
    if (!mapInstanceRef.current) return;

    const hasCoordinates = latitude && longitude &&
      parseFloat(latitude) !== 0 && parseFloat(longitude) !== 0 &&
      !isNaN(parseFloat(latitude)) && !isNaN(parseFloat(longitude));

    if (!hasCoordinates) {
      mapInstanceRef.current.setCenter(DEFAULT_CENTER);
      mapInstanceRef.current.setZoom(DEFAULT_ZOOM);
      if (markerRef.current) {
        markerRef.current.setMap(null);
        markerRef.current = null;
      }
      return;
    }

    const position = { lat: parseFloat(latitude), lng: parseFloat(longitude) };
    mapInstanceRef.current.setCenter(position);
    mapInstanceRef.current.setZoom(15);

    if (markerRef.current) {
      markerRef.current.setPosition(position);
    } else {
      addMarker(position);
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [latitude, longitude]);

  useEffect(() => {
    setInputValue(value);
  }, [value]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionsRef.current && !suggestionsRef.current.contains(event.target as Node) &&
        inputRef.current && !inputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const parseAddressComponents = (place: any): Partial<AddressData> => {
    const components = place.address_components || [];
    let cityValue = '', stateValue = '', countryValue = '', postalCode = '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    for (const component of components) {
      const types = component.types;
      if (types.includes('locality') || types.includes('administrative_area_level_2')) cityValue = component.long_name;
      if (types.includes('administrative_area_level_1')) stateValue = component.short_name;
      if (types.includes('country')) countryValue = component.long_name;
      if (types.includes('postal_code')) postalCode = component.long_name;
    }
    return { city: cityValue || null, state: stateValue || null, country: countryValue || null, postalCode: postalCode || null };
  };

  const searchPlaces = useCallback((query: string) => {
    if (query.length < 3 || !autocompleteServiceRef.current) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    autocompleteServiceRef.current.getPlacePredictions(
      { input: query, types: ['geocode', 'establishment'] },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (predictions: any[] | null, status: string) => {
        setIsLoading(false);
        const google = getGoogle();
        if (status === google?.maps?.places?.PlacesServiceStatus?.OK && predictions) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setSuggestions(predictions.map((p: any) => ({
            placeId: p.place_id,
            description: p.description,
            mainText: p.structured_formatting?.main_text || p.description,
            secondaryText: p.structured_formatting?.secondary_text || '',
          })));
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
        }
      }
    );
  }, []);

  const handleSelectSuggestion = (suggestion: Suggestion) => {
    if (!geocoderRef.current) return;

    setIsLoading(true);
    setShowSuggestions(false);

    geocoderRef.current.geocode(
      { placeId: suggestion.placeId, language: 'en' },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (results: any[] | null, status: string) => {
        setIsLoading(false);
        if (status === 'OK' && results?.[0]) {
          const lat = results[0].geometry?.location?.lat();
          const lng = results[0].geometry?.location?.lng();
          const addressData = parseAddressComponents(results[0]);
          setInputValue(results[0].formatted_address || suggestion.description);
          onAddressChange({
            address: results[0].formatted_address || suggestion.description,
            latitude: lat || 0,
            longitude: lng || 0,
            ...addressData,
          });
        }
      }
    );
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onAddressChange({ address: newValue });
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPlaces(newValue), 350);
  };

  const handleClear = () => {
    setInputValue('');
    setSuggestions([]);
    onAddressChange({ address: '', latitude: 0, longitude: 0, city: null, state: null, country: null });
    if (markerRef.current) {
      markerRef.current.setMap(null);
      markerRef.current = null;
    }
    if (mapInstanceRef.current) {
      mapInstanceRef.current.setCenter(DEFAULT_CENTER);
      mapInstanceRef.current.setZoom(DEFAULT_ZOOM);
    }
  };

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="address">Address</Label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            ref={inputRef}
            id="address"
            placeholder={isApiLoaded ? "Search for an address..." : "Loading maps..."}
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            disabled={disabled || (!isApiLoaded && !mapError)}
            className="pl-10 pr-10"
          />
          {inputValue && (
            <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={handleClear}>
              <X className="h-4 w-4" />
            </Button>
          )}
          {isLoading && <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}

          {showSuggestions && suggestions.length > 0 && (
            <div ref={suggestionsRef} className="absolute z-50 w-full mt-1 bg-popover border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.placeId}
                  type="button"
                  className="w-full px-4 py-3 text-left hover:bg-accent flex items-start gap-3 border-b last:border-b-0"
                  onClick={() => handleSelectSuggestion(suggestion)}
                >
                  <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="font-medium text-sm">{suggestion.mainText}</div>
                    <div className="text-xs text-muted-foreground">{suggestion.secondaryText}</div>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>
        {mapError && (
          <p className="text-xs text-amber-600">{mapError}</p>
        )}
        {!GOOGLE_MAPS_API_KEY && (
          <p className="text-xs text-amber-600">Configure VITE_GOOGLE_MAPS_API_KEY for address autocomplete</p>
        )}
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <div className="space-y-2">
          <Label htmlFor="city">City</Label>
          <Input id="city" value={city} onChange={(e) => onAddressChange({ city: e.target.value })} placeholder="City" disabled={disabled} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="state">State / Province</Label>
          <Input id="state" value={state} onChange={(e) => onAddressChange({ state: e.target.value })} placeholder="State" disabled={disabled} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="country">Country</Label>
          <Input id="country" value={country} onChange={(e) => onAddressChange({ country: e.target.value })} placeholder="Country" disabled={disabled} />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="latitude">Latitude</Label>
          <Input id="latitude" type="number" step="any" value={latitude} onChange={(e) => onAddressChange({ latitude: parseFloat(e.target.value) || 0 })} placeholder="-23.550520" disabled={disabled} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="longitude">Longitude</Label>
          <Input id="longitude" type="number" step="any" value={longitude} onChange={(e) => onAddressChange({ longitude: parseFloat(e.target.value) || 0 })} placeholder="-46.633308" disabled={disabled} />
        </div>
      </div>

      <div className="space-y-2">
        <Label>Location Map</Label>
        <div
          ref={mapRef}
          className={cn(
            'w-full h-48 rounded-lg border bg-muted',
            (mapError || (!isApiLoaded && !mapError)) && 'flex items-center justify-center'
          )}
        >
          {mapError && (
            <div className="text-center text-sm text-muted-foreground p-4">
              <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p className="text-xs">{mapError}</p>
            </div>
          )}
          {!isApiLoaded && !mapError && (
            <div className="flex items-center justify-center h-full gap-2 text-muted-foreground">
              <Loader2 className="h-5 w-5 animate-spin" />
              <span className="text-sm">Loading map...</span>
            </div>
          )}
        </div>
        {latitude && longitude && parseFloat(latitude) !== 0 && (
          <p className="text-xs text-muted-foreground">Drag the marker to adjust the exact location</p>
        )}
      </div>
    </div>
  );
};