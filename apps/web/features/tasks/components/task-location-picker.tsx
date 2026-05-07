"use client";

import { useCallback, useEffect, useRef } from "react";
import type { ComponentProps } from "react";
import { Geocoder } from "@mapbox/search-js-react";
import mapboxgl from "mapbox-gl";
import type { TaskLocation } from "@kometa/logic";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const KYIV_CENTER = { latitude: 50.4501, longitude: 30.5234 };
const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";

interface TaskLocationPickerProps {
  value: TaskLocation;
  onChange: (location: TaskLocation) => void;
  disabled?: boolean;
}

type GeocoderComponentProps = ComponentProps<typeof Geocoder>;
type GeocoderFeature = Parameters<NonNullable<GeocoderComponentProps["onRetrieve"]>>[0];

export function TaskLocationPicker({ value, onChange, disabled = false }: TaskLocationPickerProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const latestValueRef = useRef(value);
  const disabledRef = useRef(disabled);
  const onChangeRef = useRef(onChange);

  const setPhysicalLocation = useCallback((latitude: number, longitude: number, label: string) => {
    onChangeRef.current({
      label: label.trim() || "Pinned location",
      isRemote: false,
      latitude,
      longitude,
    });
  }, []);

  useEffect(() => {
    latestValueRef.current = value;
  }, [value]);

  useEffect(() => {
    disabledRef.current = disabled;
  }, [disabled]);

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!MAPBOX_ACCESS_TOKEN || !mapContainerRef.current || mapRef.current) {
      return;
    }

    const initialLocation = latestValueRef.current;
    const initialCenter = getLocationCenter(initialLocation);
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: "mapbox://styles/mapbox/dark-v11",
      center: [initialCenter.longitude, initialCenter.latitude],
      zoom: initialLocation.latitude && initialLocation.longitude ? 13 : 11,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.on("click", (event) => {
      if (latestValueRef.current.isRemote || disabledRef.current) {
        return;
      }

      setPhysicalLocation(event.lngLat.lat, event.lngLat.lng, latestValueRef.current.label);
    });

    mapRef.current = map;

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [setPhysicalLocation]);

  useEffect(() => {
    const map = mapRef.current;
    if (!map || value.isRemote || value.latitude === undefined || value.longitude === undefined) {
      markerRef.current?.remove();
      markerRef.current = null;
      return;
    }

    const coordinates: [number, number] = [value.longitude, value.latitude];
    if (!markerRef.current) {
      markerRef.current = new mapboxgl.Marker({ draggable: true })
        .setLngLat(coordinates)
        .addTo(map);
      markerRef.current.on("dragend", () => {
        const nextPosition = markerRef.current?.getLngLat();
        if (nextPosition) {
          setPhysicalLocation(nextPosition.lat, nextPosition.lng, latestValueRef.current.label);
        }
      });
    } else {
      markerRef.current.setLngLat(coordinates);
    }

    map.easeTo({ center: coordinates, zoom: Math.max(map.getZoom(), 13) });
  }, [setPhysicalLocation, value]);

  function onRemoteChange(isRemote: boolean) {
    if (isRemote) {
      onChange({ label: "Remote", isRemote: true });
      return;
    }

    onChange({
      label: "",
      isRemote: false,
      latitude: undefined,
      longitude: undefined,
    });
  }

  function onRetrieve(feature: GeocoderFeature) {
    const latitude = feature.properties.coordinates.latitude;
    const longitude = feature.properties.coordinates.longitude;
    const label =
      feature.properties.full_address ||
      [feature.properties.name_preferred, feature.properties.place_formatted]
        .filter(Boolean)
        .join(", ") ||
      feature.properties.name;

    setPhysicalLocation(latitude, longitude, label);
  }

  const geocoderTheme: GeocoderComponentProps["theme"] = {
    variables: {
      borderRadius: "0.5rem",
      border: "1px solid hsl(240 3.7% 15.9%)",
      boxShadow: "0 12px 30px rgb(0 0 0 / 0.35)",
      colorBackground: "hsl(240 10% 3.9%)",
      colorBackgroundActive: "hsl(240 3.7% 18%)",
      colorBackgroundHover: "hsl(240 3.7% 15.9%)",
      colorPrimary: "hsl(142.1 76.2% 36.3%)",
      colorSecondary: "hsl(240 5% 64.9%)",
      colorText: "hsl(0 0% 98%)",
      fontFamily: 'var(--font-inter), "Inter", ui-sans-serif, system-ui, sans-serif',
      minWidth: "0",
    },
    cssText: `
      .Input,
      .Input:focus {
        box-sizing: border-box !important;
        color: hsl(0 0% 98%) !important;
        max-width: 100% !important;
      }

      .MapboxSearch,
      .Geocoder,
      .Results {
        box-sizing: border-box !important;
        max-width: 100% !important;
        width: 100% !important;
      }

      .Results {
        max-width: min(var(--width), calc(100vw - 2rem)) !important;
        overflow-x: hidden !important;
      }

      .SuggestionText {
        min-width: 0 !important;
      }

      .SuggestionName,
      .SuggestionDesc {
        overflow: hidden !important;
        text-overflow: ellipsis !important;
        white-space: nowrap !important;
      }

      .Input::placeholder {
        color: hsl(240 5% 64.9%) !important;
        opacity: 1;
      }

      .SearchIcon,
      .ActionIcon {
        color: hsl(240 5% 64.9%) !important;
        fill: hsl(240 5% 64.9%) !important;
      }

      .Suggestion,
      .SuggestionName,
      .SuggestionDesc,
      .ResultsAttribution {
        color: hsl(0 0% 98%) !important;
      }

      .SuggestionDesc,
      .ResultsAttribution,
      .ResultsAttribution a {
        color: hsl(240 5% 64.9%) !important;
      }
    `,
  };

  return (
    <div className="grid min-w-0 max-w-full gap-3 overflow-hidden">
      <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
        <Label htmlFor="task-location-remote">Remote task</Label>
        <Switch
          id="task-location-remote"
          checked={value.isRemote}
          onCheckedChange={onRemoteChange}
          disabled={disabled}
        />
      </div>

      {value.isRemote ? (
        <Input value={value.label} disabled />
      ) : (
        <div className="grid min-w-0 max-w-full gap-3">
          {MAPBOX_ACCESS_TOKEN ? (
            <div className="min-w-0 max-w-full [&_mapbox-geocoder]:block [&_mapbox-geocoder]:max-w-full">
              <Geocoder
                accessToken={MAPBOX_ACCESS_TOKEN}
                value={value.label}
                onChange={(label) => onChange({ ...value, label })}
                onRetrieve={onRetrieve}
                options={{
                  country: "ua",
                  language: "en",
                  proximity: {
                    lat: KYIV_CENTER.latitude,
                    lng: KYIV_CENTER.longitude,
                  },
                }}
                placeholder="Search for an address or place"
                marker={false}
                theme={geocoderTheme}
              />
            </div>
          ) : (
            <Input
              value={value.label}
              onChange={(event) => onChange({ ...value, label: event.target.value })}
              placeholder="Location label"
              disabled={disabled}
            />
          )}

          <div
            ref={mapContainerRef}
            className="h-64 min-w-0 max-w-full overflow-hidden rounded-lg border bg-muted"
            aria-label="Task location map"
          />

          {!MAPBOX_ACCESS_TOKEN ? (
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="grid gap-2">
                <Label htmlFor="task-location-latitude">Latitude</Label>
                <Input
                  id="task-location-latitude"
                  type="number"
                  min="-90"
                  max="90"
                  step="any"
                  value={value.latitude ?? ""}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      latitude: event.target.value ? Number(event.target.value) : undefined,
                    })
                  }
                  disabled={disabled}
                />
              </div>
              <div className="grid gap-2">
                <Label htmlFor="task-location-longitude">Longitude</Label>
                <Input
                  id="task-location-longitude"
                  type="number"
                  min="-180"
                  max="180"
                  step="any"
                  value={value.longitude ?? ""}
                  onChange={(event) =>
                    onChange({
                      ...value,
                      longitude: event.target.value ? Number(event.target.value) : undefined,
                    })
                  }
                  disabled={disabled}
                />
              </div>
            </div>
          ) : null}
        </div>
      )}
    </div>
  );
}

function getLocationCenter(location: TaskLocation): { latitude: number; longitude: number } {
  if (location.latitude !== undefined && location.longitude !== undefined) {
    return { latitude: location.latitude, longitude: location.longitude };
  }

  return KYIV_CENTER;
}
