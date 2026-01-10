import { useState, useEffect, useRef, useCallback } from 'react';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { MapPin, Loader2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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

// Silver theme style for Google Maps
const silverMapStyle = [
  {
    elementType: "geometry",
    stylers: [{ color: "#f5f5f5" }],
  },
  {
    elementType: "labels.icon",
    stylers: [{ visibility: "off" }],
  },
  {
    elementType: "labels.text.fill",
    stylers: [{ color: "#616161" }],
  },
  {
    elementType: "labels.text.stroke",
    stylers: [{ color: "#f5f5f5" }],
  },
  {
    featureType: "administrative.land_parcel",
    elementType: "labels.text.fill",
    stylers: [{ color: "#bdbdbd" }],
  },
  {
    featureType: "poi",
    elementType: "geometry",
    stylers: [{ color: "#eeeeee" }],
  },
  {
    featureType: "poi",
    elementType: "labels.text.fill",
    stylers: [{ color: "#757575" }],
  },
  {
    featureType: "poi.park",
    elementType: "geometry",
    stylers: [{ color: "#e5e5e5" }],
  },
  {
    featureType: "poi.park",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9e9e9e" }],
  },
  {
    featureType: "road",
    elementType: "geometry",
    stylers: [{ color: "#ffffff" }],
  },
  {
    featureType: "road.arterial",
    elementType: "labels.text.fill",
    stylers: [{ color: "#757575" }],
  },
  {
    featureType: "road.highway",
    elementType: "geometry",
    stylers: [{ color: "#dadada" }],
  },
  {
    featureType: "road.highway",
    elementType: "labels.text.fill",
    stylers: [{ color: "#616161" }],
  },
  {
    featureType: "road.local",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9e9e9e" }],
  },
  {
    featureType: "transit.line",
    elementType: "geometry",
    stylers: [{ color: "#e5e5e5" }],
  },
  {
    featureType: "transit.station",
    elementType: "geometry",
    stylers: [{ color: "#eeeeee" }],
  },
  {
    featureType: "water",
    elementType: "geometry",
    stylers: [{ color: "#c9c9c9" }],
  },
  {
    featureType: "water",
    elementType: "labels.text.fill",
    stylers: [{ color: "#9e9e9e" }],
  },
];

// Custom marker icon SVG in navy blue (#0E182E)
const createCustomMarkerIcon = () => {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="32" height="42" viewBox="0 0 32 42">
      <path fill="#0E182E" d="M16 0C7.163 0 0 7.163 0 16c0 12 16 26 16 26s16-14 16-26c0-8.837-7.163-16-16-16z"/>
      <circle fill="#ffffff" cx="16" cy="16" r="6"/>
    </svg>
  `;
  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
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
  
  const inputRef = useRef<HTMLInputElement>(null);
  const suggestionsRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<HTMLDivElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const mapInstanceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const markerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const autocompleteServiceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const placesServiceRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const geocoderRef = useRef<any>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const getGoogle = (): any => (window as any).google;

  // Create marker with custom icon
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const createMarker = (position: { lat: number; lng: number }, map: any) => {
    const google = getGoogle();
    if (!google) return null;

    return new google.maps.Marker({
      position,
      map,
      draggable: true,
      animation: google.maps.Animation.DROP,
      icon: {
        url: createCustomMarkerIcon(),
        scaledSize: new google.maps.Size(32, 42),
        anchor: new google.maps.Point(16, 42),
      },
    });
  };

  // Load Google Maps API with English language
  useEffect(() => {
    if (!GOOGLE_MAPS_API_KEY) {
      setMapError('Google Maps API key not configured. Add VITE_GOOGLE_MAPS_API_KEY to your environment.');
      return;
    }

    if (getGoogle()?.maps?.places) {
      setIsApiLoaded(true);
      return;
    }

    const script = document.createElement('script');
    // Add language=en to force English results
    script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=places&language=en&region=US`;
    script.async = true;
    script.defer = true;
    
    script.onload = () => {
      setIsApiLoaded(true);
    };
    
    script.onerror = () => {
      setMapError('Failed to load Google Maps API');
    };

    document.head.appendChild(script);
  }, []);

  // Initialize services and map
  useEffect(() => {
    const google = getGoogle();
    if (!isApiLoaded || !mapRef.current || !google) return;

    autocompleteServiceRef.current = new google.maps.places.AutocompleteService();
    geocoderRef.current = new google.maps.Geocoder();

    const lat = latitude ? parseFloat(latitude) : -14.235;
    const lng = longitude ? parseFloat(longitude) : -51.9253;
    
    mapInstanceRef.current = new google.maps.Map(mapRef.current, {
      center: { lat, lng },
      zoom: latitude && longitude ? 15 : 4,
      mapTypeControl: false,
      streetViewControl: false,
      fullscreenControl: false,
      zoomControl: true,
      styles: silverMapStyle,
    });

    placesServiceRef.current = new google.maps.places.PlacesService(mapInstanceRef.current);

    if (latitude && longitude) {
      markerRef.current = createMarker({ lat, lng }, mapInstanceRef.current);

      if (markerRef.current) {
        markerRef.current.addListener('dragend', () => {
          const position = markerRef.current?.getPosition();
          if (position && geocoderRef.current) {
            onAddressChange({ latitude: position.lat(), longitude: position.lng() });
            
            // Use language: 'en' for reverse geocoding
            geocoderRef.current.geocode(
              { location: position, language: 'en' }, 
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
      }
    }
  }, [isApiLoaded]);

  // Update map when coordinates change
  useEffect(() => {
    const google = getGoogle();
    if (!mapInstanceRef.current || !latitude || !longitude || !google) return;

    const lat = parseFloat(latitude);
    const lng = parseFloat(longitude);
    if (isNaN(lat) || isNaN(lng)) return;

    const position = { lat, lng };
    mapInstanceRef.current.setCenter(position);
    mapInstanceRef.current.setZoom(15);

    if (markerRef.current) {
      markerRef.current.setPosition(position);
    } else {
      markerRef.current = createMarker(position, mapInstanceRef.current);

      if (markerRef.current) {
        markerRef.current.addListener('dragend', () => {
          const pos = markerRef.current?.getPosition();
          if (pos && geocoderRef.current) {
            onAddressChange({ latitude: pos.lat(), longitude: pos.lng() });
            
            // Use language: 'en' for reverse geocoding
            geocoderRef.current.geocode(
              { location: pos, language: 'en' },
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
      }
    }
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
    const google = getGoogle();
    if (!autocompleteServiceRef.current || query.length < 3 || !google) {
      setSuggestions([]);
      return;
    }

    setIsLoading(true);
    autocompleteServiceRef.current.getPlacePredictions(
      { 
        input: query, 
        types: ['geocode', 'establishment'],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (predictions: any[] | null, status: string) => {
        setIsLoading(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && predictions) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          setSuggestions(predictions.map((p: any) => ({
            placeId: p.place_id,
            description: p.description,
            mainText: p.structured_formatting.main_text,
            secondaryText: p.structured_formatting.secondary_text || '',
          })));
          setShowSuggestions(true);
        } else {
          setSuggestions([]);
        }
      }
    );
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onAddressChange({ address: newValue });

    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => searchPlaces(newValue), 300);
  };

  const handleSelectSuggestion = (suggestion: Suggestion) => {
    const google = getGoogle();
    if (!placesServiceRef.current || !google) return;

    setIsLoading(true);
    setShowSuggestions(false);

    placesServiceRef.current.getDetails(
      { 
        placeId: suggestion.placeId, 
        fields: ['formatted_address', 'geometry', 'address_components'],
      },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (place: any | null, status: string) => {
        setIsLoading(false);
        if (status === google.maps.places.PlacesServiceStatus.OK && place) {
          const lat = place.geometry?.location?.lat();
          const lng = place.geometry?.location?.lng();
          const addressData = parseAddressComponents(place);

          setInputValue(place.formatted_address || suggestion.description);
          onAddressChange({
            address: place.formatted_address || suggestion.description,
            latitude: lat || 0,
            longitude: lng || 0,
            ...addressData,
          });
        }
      }
    );
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
      mapInstanceRef.current.setCenter({ lat: -14.235, lng: -51.9253 });
      mapInstanceRef.current.setZoom(4);
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
            placeholder="Search for an address..."
            value={inputValue}
            onChange={handleInputChange}
            onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
            disabled={disabled || !isApiLoaded}
            className="pl-10 pr-10"
          />
          {inputValue && (
            <Button type="button" variant="ghost" size="sm" className="absolute right-1 top-1/2 -translate-y-1/2 h-7 w-7 p-0" onClick={handleClear}>
              <X className="h-4 w-4" />
            </Button>
          )}
          {isLoading && <Loader2 className="absolute right-10 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />}

          {showSuggestions && suggestions.length > 0 && (
            <div ref={suggestionsRef} className="absolute z-50 w-full mt-1 bg-white border rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {suggestions.map((suggestion) => (
                <button
                  key={suggestion.placeId}
                  type="button"
                  className="w-full px-4 py-3 text-left hover:bg-slate-50 flex items-start gap-3 border-b last:border-b-0"
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
        {!GOOGLE_MAPS_API_KEY && <p className="text-xs text-amber-600">Configure VITE_GOOGLE_MAPS_API_KEY for address autocomplete</p>}
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
        <div ref={mapRef} className={cn('w-full h-48 rounded-lg border bg-slate-100', mapError && 'flex items-center justify-center')}>
          {mapError && (
            <div className="text-center text-sm text-muted-foreground p-4">
              <MapPin className="h-8 w-8 mx-auto mb-2 opacity-50" />
              <p>{mapError}</p>
            </div>
          )}
          {!isApiLoaded && !mapError && (
            <div className="flex items-center justify-center h-full">
              <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
            </div>
          )}
        </div>
        {latitude && longitude && <p className="text-xs text-muted-foreground">Drag the marker to adjust the exact location</p>}
      </div>
    </div>
  );
};