"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useLingui } from "@lingui/react";
import { t } from "@kometa/i18n";
import {
  createEmptyPhysicalTaskLocation,
  createPhysicalTaskLocation,
  createRemoteTaskLocation,
  type Coordinates,
  type TaskLocation,
  type TaskLocationCity,
} from "@kometa/logic";
import { useTheme } from "next-themes";
import { Input } from "@/components/ui/input";
import { getGeocoderTheme, type MapboxTheme } from "../lib/mapbox-geocoder-theme";
import { reverseGeocodeLocation } from "../lib/mapbox-geocoding";
import { getMapboxLanguage } from "../lib/mapbox-language";
import { TaskLocationCoordinateFields } from "./task-location-coordinate-fields";
import { TaskLocationMap } from "./task-location-map";
import { TaskLocationRemoteToggle } from "./task-location-remote-toggle";
import { TaskLocationSearch } from "./task-location-search";

const KYIV_CENTER = { latitude: 50.4501, longitude: 30.5234 } satisfies Coordinates;
const MAPBOX_ACCESS_TOKEN = process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN ?? "";

interface TaskLocationPickerProps {
  value: TaskLocation;
  onChange: (location: TaskLocation) => void;
  disabled?: boolean;
}

export function TaskLocationPicker({ value, onChange, disabled = false }: TaskLocationPickerProps) {
  const { i18n } = useLingui();
  const { resolvedTheme } = useTheme();
  const onChangeRef = useRef(onChange);
  const lastResolvedLocationRef = useRef<TaskLocation | null>(null);
  const reverseGeocodeRequestRef = useRef(0);
  const [hasLoadedMap, setHasLoadedMap] = useState(!value.isRemote);
  const mapTheme: MapboxTheme = resolvedTheme === "light" ? "light" : "dark";
  const geocoderTheme = useMemo(() => getGeocoderTheme(mapTheme), [mapTheme]);
  const mapboxLanguage = getMapboxLanguage(i18n.locale);
  const pinnedLocationLabel = t("Pinned location");

  useEffect(() => {
    onChangeRef.current = onChange;
  }, [onChange]);

  useEffect(() => {
    if (!value.isRemote) {
      setHasLoadedMap(true);
    }
  }, [value.isRemote]);

  const setPhysicalLocation = useCallback(
    (latitude: number, longitude: number, label: string, city?: TaskLocationCity) => {
      const nextLocation = createPhysicalTaskLocation({
        latitude,
        longitude,
        label,
        fallbackLabel: pinnedLocationLabel,
        city,
      });

      lastResolvedLocationRef.current = nextLocation;
      onChangeRef.current(nextLocation);
    },
    [pinnedLocationLabel],
  );

  const setPinnedPhysicalLocation = useCallback(
    async (latitude: number, longitude: number) => {
      const requestId = reverseGeocodeRequestRef.current + 1;
      reverseGeocodeRequestRef.current = requestId;
      setPhysicalLocation(latitude, longitude, pinnedLocationLabel);

      const location = await reverseGeocodeLocation(
        latitude,
        longitude,
        mapboxLanguage,
        MAPBOX_ACCESS_TOKEN,
      );
      if (requestId === reverseGeocodeRequestRef.current && location.label) {
        setPhysicalLocation(latitude, longitude, location.label, location.city);
      }
    },
    [mapboxLanguage, pinnedLocationLabel, setPhysicalLocation],
  );

  const onPinnedLocationChange = useCallback(
    (latitude: number, longitude: number) => {
      void setPinnedPhysicalLocation(latitude, longitude);
    },
    [setPinnedPhysicalLocation],
  );

  function onRemoteChange(isRemote: boolean) {
    onChange(isRemote ? createRemoteTaskLocation(t("Remote")) : createEmptyPhysicalTaskLocation());
  }

  return (
    <div className="grid min-w-0 max-w-full gap-3 overflow-hidden">
      <TaskLocationRemoteToggle
        checked={value.isRemote}
        disabled={disabled}
        onCheckedChange={onRemoteChange}
      />

      <div className="grid min-w-0 max-w-full gap-3">
        {value.isRemote ? (
          <Input value={value.label} disabled />
        ) : (
          <TaskLocationSearch
            accessToken={MAPBOX_ACCESS_TOKEN}
            disabled={disabled}
            geocoderTheme={geocoderTheme}
            language={mapboxLanguage}
            lastResolvedLocationRef={lastResolvedLocationRef}
            pinnedLocationLabel={pinnedLocationLabel}
            proximity={KYIV_CENTER}
            value={value}
            onChange={onChange}
          />
        )}

        <TaskLocationMap
          accessToken={MAPBOX_ACCESS_TOKEN}
          disabled={disabled}
          fallbackCenter={KYIV_CENTER}
          hasLoadedMap={hasLoadedMap}
          mapTheme={mapTheme}
          value={value}
          onPinnedLocationChange={onPinnedLocationChange}
        />

        {!value.isRemote && !MAPBOX_ACCESS_TOKEN ? (
          <TaskLocationCoordinateFields value={value} disabled={disabled} onChange={onChange} />
        ) : null}
      </div>
    </div>
  );
}
