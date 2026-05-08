"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { ComponentProps } from "react";
import { useLingui } from "@lingui/react";
import { Geocoder } from "@mapbox/search-js-react";
import mapboxgl from "mapbox-gl";
import { useTheme } from "next-themes";
import { isLocale, t } from "@kometa/i18n";
import type { TaskLocation } from "@kometa/logic";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";

const KYIV_CENTER = { latitude: 50.4501, longitude: 30.5234 };
const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";
const MAPBOX_STYLES = {
  light: "mapbox://styles/mapbox/light-v11",
  dark: "mapbox://styles/mapbox/dark-v11",
} as const;

interface TaskLocationPickerProps {
  value: TaskLocation;
  onChange: (location: TaskLocation) => void;
  disabled?: boolean;
}

type GeocoderComponentProps = ComponentProps<typeof Geocoder>;
type GeocoderFeature = Parameters<NonNullable<GeocoderComponentProps["onRetrieve"]>>[0];
type ReverseGeocodeResponse = {
  features?: Array<{
    properties?: {
      context?: MapboxFeatureContext;
      feature_type?: string;
      full_address?: string;
      mapbox_id?: string;
      name_preferred?: string;
      place_formatted?: string;
      name?: string;
    };
  }>;
};

type MapboxContextItem = {
  country_code?: string;
  mapbox_id?: string;
  name?: string;
  name_preferred?: string;
};

type MapboxFeatureContext = {
  country?: MapboxContextItem;
  district?: MapboxContextItem;
  locality?: MapboxContextItem;
  place?: MapboxContextItem;
  region?: MapboxContextItem;
};

export function TaskLocationPicker({ value, onChange, disabled = false }: TaskLocationPickerProps) {
  const { i18n } = useLingui();
  const { resolvedTheme } = useTheme();
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const latestValueRef = useRef(value);
  const lastRetrievedLocationRef = useRef<TaskLocation | null>(null);
  const disabledRef = useRef(disabled);
  const onChangeRef = useRef(onChange);
  const reverseGeocodeRequestRef = useRef(0);
  const [hasLoadedMap, setHasLoadedMap] = useState(!value.isRemote);
  const mapTheme = resolvedTheme === "light" ? "light" : "dark";
  const geocoderTheme = useMemo(() => getGeocoderTheme(mapTheme), [mapTheme]);
  const mapboxLanguage = getMapboxLanguage(i18n.locale);
  const pinnedLocationLabel = t("Pinned location");
  const mapThemeRef = useRef<keyof typeof MAPBOX_STYLES>(mapTheme);

  mapThemeRef.current = mapTheme;

  const setPhysicalLocation = useCallback(
    (latitude: number, longitude: number, label: string, city?: TaskLocationCity) => {
      const nextLocation = {
        label: label.trim() || pinnedLocationLabel,
        isRemote: false,
        latitude,
        longitude,
        cityId: city?.id,
        cityLabel: city?.label,
        countryCode: city?.countryCode,
      };

      lastRetrievedLocationRef.current = nextLocation;
      onChangeRef.current(nextLocation);
    },
    [pinnedLocationLabel],
  );

  const setPinnedPhysicalLocation = useCallback(
    async (latitude: number, longitude: number) => {
      const requestId = reverseGeocodeRequestRef.current + 1;
      reverseGeocodeRequestRef.current = requestId;
      setPhysicalLocation(latitude, longitude, pinnedLocationLabel);

      const location = await reverseGeocodeLocation(latitude, longitude, mapboxLanguage);
      if (requestId === reverseGeocodeRequestRef.current && location.label) {
        setPhysicalLocation(latitude, longitude, location.label, location.city);
      }
    },
    [mapboxLanguage, pinnedLocationLabel, setPhysicalLocation],
  );

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
    if (!value.isRemote) {
      setHasLoadedMap(true);
    }
  }, [value.isRemote]);

  useEffect(() => {
    if (!hasLoadedMap || !MAPBOX_ACCESS_TOKEN || !mapContainerRef.current || mapRef.current) {
      return;
    }

    const initialLocation = latestValueRef.current;
    const initialCenter = getLocationCenter(initialLocation);
    mapboxgl.accessToken = MAPBOX_ACCESS_TOKEN;

    const map = new mapboxgl.Map({
      container: mapContainerRef.current,
      style: MAPBOX_STYLES[mapThemeRef.current],
      center: [initialCenter.longitude, initialCenter.latitude],
      zoom: initialLocation.latitude && initialLocation.longitude ? 13 : 11,
    });

    map.addControl(new mapboxgl.NavigationControl({ showCompass: false }), "top-right");
    map.on("click", (event) => {
      if (latestValueRef.current.isRemote || disabledRef.current) {
        return;
      }

      void setPinnedPhysicalLocation(event.lngLat.lat, event.lngLat.lng);
    });

    mapRef.current = map;

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [hasLoadedMap, setPinnedPhysicalLocation]);

  useEffect(() => {
    mapRef.current?.setStyle(MAPBOX_STYLES[mapTheme]);
  }, [mapTheme]);

  useEffect(() => {
    if (!value.isRemote) {
      mapRef.current?.resize();
    }
  }, [value.isRemote]);

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
          void setPinnedPhysicalLocation(nextPosition.lat, nextPosition.lng);
        }
      });
    } else {
      markerRef.current.setLngLat(coordinates);
    }

    map.easeTo({ center: coordinates, zoom: Math.max(map.getZoom(), 13) });
  }, [setPinnedPhysicalLocation, value]);

  function onRemoteChange(isRemote: boolean) {
    if (isRemote) {
      onChange({ label: t("Remote"), isRemote: true });
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

    setPhysicalLocation(
      latitude,
      longitude,
      getFeatureLabel(feature.properties),
      getFeatureCity(feature.properties),
    );
  }

  return (
    <div className="grid min-w-0 max-w-full gap-3 overflow-hidden">
      <div className="flex items-center justify-between gap-3 rounded-lg border px-3 py-2">
        <Label htmlFor="task-location-remote">{t("Remote task")}</Label>
        <Switch
          id="task-location-remote"
          checked={value.isRemote}
          onCheckedChange={onRemoteChange}
          disabled={disabled}
        />
      </div>

      <div className="grid min-w-0 max-w-full gap-3">
        {value.isRemote ? (
          <Input value={value.label} disabled />
        ) : MAPBOX_ACCESS_TOKEN ? (
          <div className="min-w-0 max-w-full [&_mapbox-geocoder]:block [&_mapbox-geocoder]:max-w-full">
            <Geocoder
              accessToken={MAPBOX_ACCESS_TOKEN}
              value={value.label}
              onChange={(label) => {
                if (label === lastRetrievedLocationRef.current?.label) {
                  onChange(lastRetrievedLocationRef.current);
                  return;
                }

                onChange({
                  label,
                  isRemote: false,
                  latitude: undefined,
                  longitude: undefined,
                  cityId: undefined,
                  cityLabel: undefined,
                  countryCode: undefined,
                });
              }}
              onRetrieve={onRetrieve}
              options={{
                country: "ua",
                language: mapboxLanguage,
                proximity: {
                  lat: KYIV_CENTER.latitude,
                  lng: KYIV_CENTER.longitude,
                },
              }}
              placeholder={t("Search for an address or place")}
              marker={false}
              theme={geocoderTheme}
            />
          </div>
        ) : (
          <Input
            value={value.label}
            onChange={(event) => onChange({ ...value, label: event.target.value })}
            placeholder={t("Location label")}
            disabled={disabled}
          />
        )}

        {hasLoadedMap ? (
          <div
            className={`min-w-0 max-w-full overflow-hidden ${
              value.isRemote ? "h-0 opacity-0" : "h-64 opacity-100"
            }`}
            aria-hidden={value.isRemote}
          >
            <div
              ref={mapContainerRef}
              className="h-64 min-w-0 max-w-full overflow-hidden rounded-lg border bg-muted"
              aria-label={t("Task location map")}
            />
          </div>
        ) : null}

        {!value.isRemote && !MAPBOX_ACCESS_TOKEN ? (
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="grid gap-2">
              <Label htmlFor="task-location-latitude">{t("Latitude")}</Label>
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
              <Label htmlFor="task-location-longitude">{t("Longitude")}</Label>
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
    </div>
  );
}

async function reverseGeocodeLocation(
  latitude: number,
  longitude: number,
  language: string,
): Promise<{ label: string; city?: TaskLocationCity }> {
  if (!MAPBOX_ACCESS_TOKEN) {
    return { label: "" };
  }

  try {
    const searchParams = new URLSearchParams({
      access_token: MAPBOX_ACCESS_TOKEN,
      country: "ua",
      language,
      latitude: String(latitude),
      limit: "1",
      longitude: String(longitude),
    });
    const response = await fetch(
      `https://api.mapbox.com/search/geocode/v6/reverse?${searchParams.toString()}`,
    );

    if (!response.ok) {
      return { label: "" };
    }

    const data = (await response.json()) as ReverseGeocodeResponse;
    const properties = data.features?.[0]?.properties;

    return properties
      ? { label: getFeatureLabel(properties), city: getFeatureCity(properties) }
      : { label: "" };
  } catch {
    return { label: "" };
  }
}

interface TaskLocationCity {
  id: string;
  label: string;
  countryCode?: string;
}

function getFeatureLabel(properties: {
  full_address?: string;
  name_preferred?: string;
  place_formatted?: string;
  name?: string;
}): string {
  return (
    properties.full_address ||
    [properties.name_preferred, properties.place_formatted].filter(Boolean).join(", ") ||
    properties.name ||
    ""
  );
}

function getFeatureCity(properties: {
  context?: MapboxFeatureContext;
  feature_type?: string;
  mapbox_id?: string;
  name_preferred?: string;
  name?: string;
}): TaskLocationCity | undefined {
  const context = properties.context;
  const contextCity = context?.place ?? context?.locality ?? context?.district;
  const countryCode = context?.country?.country_code?.toUpperCase();
  const cityLabel =
    contextCity?.name_preferred ||
    contextCity?.name ||
    (properties.feature_type === "place" ? properties.name_preferred || properties.name : "");

  if (!cityLabel) {
    return undefined;
  }

  return {
    id:
      contextCity?.mapbox_id || properties.mapbox_id || buildFallbackCityId(cityLabel, countryCode),
    label: cityLabel,
    countryCode,
  };
}

function buildFallbackCityId(cityLabel: string, countryCode?: string): string {
  const countryPrefix = countryCode?.toLocaleLowerCase() || "place";
  const citySlug = cityLabel
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLocaleLowerCase()
    .replace(/[-\s]+/g, "-");

  return `${countryPrefix}-${citySlug}`;
}

function getLocationCenter(location: TaskLocation): { latitude: number; longitude: number } {
  if (location.latitude !== undefined && location.longitude !== undefined) {
    return { latitude: location.latitude, longitude: location.longitude };
  }

  return KYIV_CENTER;
}

function getMapboxLanguage(locale: string): string {
  return isLocale(locale) ? locale : "en";
}

function getGeocoderTheme(theme: keyof typeof MAPBOX_STYLES): GeocoderComponentProps["theme"] {
  const colors =
    theme === "light"
      ? {
          border: "oklch(0.88 0.008 250)",
          shadow: "0 12px 30px rgb(15 23 42 / 0.12)",
          background: "oklch(1 0 0)",
          active: "oklch(0.94 0.006 250)",
          hover: "oklch(0.96 0.005 250)",
          primary: "oklch(0.58 0.15 195)",
          secondary: "oklch(0.48 0.01 270)",
          text: "oklch(0.16 0.01 270)",
        }
      : {
          border: "oklch(0.22 0.01 270)",
          shadow: "0 12px 30px rgb(0 0 0 / 0.35)",
          background: "oklch(0.09 0.01 270)",
          active: "oklch(0.18 0.01 270)",
          hover: "oklch(0.16 0.01 270)",
          primary: "oklch(0.75 0.18 195)",
          secondary: "oklch(0.55 0 0)",
          text: "oklch(0.98 0 0)",
        };

  return {
    variables: {
      borderRadius: "0.5rem",
      border: `1px solid ${colors.border}`,
      boxShadow: colors.shadow,
      colorBackground: colors.background,
      colorBackgroundActive: colors.active,
      colorBackgroundHover: colors.hover,
      colorPrimary: colors.primary,
      colorSecondary: colors.secondary,
      colorText: colors.text,
      fontFamily: 'var(--font-inter), "Inter", ui-sans-serif, system-ui, sans-serif',
      minWidth: "0",
    },
    cssText: `
      .Input,
      .Input:focus {
        box-sizing: border-box !important;
        color: ${colors.text} !important;
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
        color: ${colors.secondary} !important;
        opacity: 1;
      }

      .SearchIcon,
      .ActionIcon {
        color: ${colors.secondary} !important;
        fill: ${colors.secondary} !important;
      }

      .Suggestion,
      .SuggestionName,
      .SuggestionDesc,
      .ResultsAttribution {
        color: ${colors.text} !important;
      }

      .SuggestionDesc,
      .ResultsAttribution,
      .ResultsAttribution a {
        color: ${colors.secondary} !important;
      }
    `,
  };
}
