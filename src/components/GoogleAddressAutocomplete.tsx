"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Script from "next/script";

type AddressAutocompleteProps = {
  label?: string;
  placeholder?: string;
  initialValue?: string;
  onPlaceSelected: (payload: {
    formattedAddress: string;
    placeId?: string;
    location?: { lat: number; lng: number };
    components?: google.maps.GeocoderAddressComponent[];
  }) => void;
};

type Suggestion = {
  description: string;
  place_id: string;
};

export default function GoogleAddressAutocomplete(props: AddressAutocompleteProps) {
  const { label = "Adresa", placeholder = "Začněte psát adresu…", initialValue = "", onPlaceSelected } = props;
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [isScriptLoaded, setIsScriptLoaded] = useState(false);
  const [value, setValue] = useState(initialValue);
  const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const serviceRef = useRef<google.maps.places.AutocompleteService | null>(null);
  const placesRef = useRef<google.maps.places.PlacesService | null>(null);
  const tokenRef = useRef<google.maps.places.AutocompleteSessionToken | null>(null);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);

  const apiKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;
  const disableMaps = process.env.NEXT_PUBLIC_DISABLE_MAPS === "1";

  const ensureServices = useCallback(() => {
    if (!window.google?.maps?.places) return false;
    if (!serviceRef.current) {
      serviceRef.current = new google.maps.places.AutocompleteService();
    }
    if (!placesRef.current) {
      const container = document.createElement("div");
      placesRef.current = new google.maps.places.PlacesService(container);
    }
    if (!tokenRef.current) {
      tokenRef.current = new google.maps.places.AutocompleteSessionToken();
    }
    return true;
  }, []);

  const requestPredictions = useCallback((input: string) => {
    if (!ensureServices()) return;
    if (input.length < 3) {
      setSuggestions([]);
      setIsOpen(false);
      return;
    }
    setLoading(true);
    serviceRef.current!.getPlacePredictions(
      {
        input,
        sessionToken: tokenRef.current!,
        types: ["address"],
        componentRestrictions: { country: ["cz", "sk"] },
      },
      (predictions, status) => {
        setLoading(false);
        if (status !== google.maps.places.PlacesServiceStatus.OK || !predictions) {
          setSuggestions([]);
          setIsOpen(false);
          return;
        }
        const mapped = predictions.map((p) => ({ description: p.description, place_id: p.place_id! }));
        setSuggestions(mapped);
        setIsOpen(true);
      }
    );
  }, [ensureServices]);

  const handleChange = useCallback(
    (next: string) => {
      setValue(next);
      if (debounceRef.current) clearTimeout(debounceRef.current);
      debounceRef.current = setTimeout(() => {
        if (disableMaps) {
          onPlaceSelected({ formattedAddress: next });
        } else {
          requestPredictions(next);
        }
      }, 350);
    },
    [requestPredictions]
  );

  const handleSelect = useCallback(
    (s: Suggestion) => {
      setValue(s.description);
      setSuggestions([]);
      setIsOpen(false);
      if (!ensureServices()) return;
      placesRef.current!.getDetails(
        {
          placeId: s.place_id,
          sessionToken: tokenRef.current!,
          fields: ["formatted_address", "geometry", "address_component", "place_id"],
        },
        (place, status) => {
          // reset token after a complete selection per Google guidance
          tokenRef.current = new google.maps.places.AutocompleteSessionToken();
          if (status !== google.maps.places.PlacesServiceStatus.OK || !place) return;
          const formattedAddress = place.formatted_address || s.description;
          const geometry = place.geometry?.location;
          const location = geometry ? { lat: geometry.lat(), lng: geometry.lng() } : undefined;
          onPlaceSelected({
            formattedAddress,
            placeId: place.place_id,
            location,
            components: place.address_components,
          });
        }
      );
    },
    [ensureServices, onPlaceSelected]
  );

  useEffect(() => {
    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, []);

  const scriptUrl = useMemo(() => {
    const params = new URLSearchParams({
      key: apiKey || "",
      libraries: "places",
      region: "CZ",
      language: "cs",
    });
    return `https://maps.googleapis.com/maps/api/js?${params.toString()}`;
  }, [apiKey]);

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 8, position: "relative" }}>
      {!disableMaps && (
        <Script src={scriptUrl} strategy="afterInteractive" onLoad={() => setIsScriptLoaded(true)} />
      )}
      {label ? <label style={{ fontWeight: 500 }}>{label}</label> : null}
      <input
        ref={inputRef}
        value={value}
        onChange={(e) => handleChange(e.target.value)}
        placeholder={placeholder}
        autoComplete="off"
        onFocus={() => value.length >= 3 && suggestions.length > 0 && setIsOpen(true)}
        onBlur={() => setTimeout(() => setIsOpen(false), 150)}
        style={{
          border: "1px solid #ccc",
          borderRadius: 8,
          padding: "10px 12px",
          fontSize: 16,
          outline: "none",
        }}
      />
      {!disableMaps && isOpen && (suggestions.length > 0 || loading) ? (
        <div
          style={{
            position: "absolute",
            top: label ? 62 : 42,
            left: 0,
            right: 0,
            background: "#fff",
            border: "1px solid #ddd",
            borderRadius: 8,
            boxShadow: "0 6px 24px rgba(0,0,0,0.08)",
            zIndex: 10,
            maxHeight: 280,
            overflowY: "auto",
          }}
        >
          {loading ? (
            <div style={{ padding: 10, color: "#666" }}>Hledám…</div>
          ) : (
            suggestions.map((s) => (
              <button
                key={s.place_id}
                type="button"
                onMouseDown={(e) => e.preventDefault()}
                onClick={() => handleSelect(s)}
                style={{
                  display: "block",
                  width: "100%",
                  textAlign: "left",
                  padding: "10px 12px",
                  background: "#fff",
                  border: "none",
                  borderBottom: "1px solid #eee",
                  cursor: "pointer",
                }}
              >
                {s.description}
              </button>
            ))
          )}
        </div>
      ) : null}
    </div>
  );
}



