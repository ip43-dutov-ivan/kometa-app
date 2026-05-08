"use client";

import { useEffect, useRef } from "react";
import { t } from "@kometa/i18n";
import { getTaskLocationCenter, type Coordinates, type TaskLocation } from "@kometa/logic";
import mapboxgl from "mapbox-gl";
import type { MapboxTheme } from "../lib/mapbox-geocoder-theme";

const MAPBOX_STYLES = {
  light: "mapbox://styles/mapbox/light-v11",
  dark: "mapbox://styles/mapbox/dark-v11",
} as const;

interface TaskLocationMapProps {
  accessToken: string;
  disabled: boolean;
  fallbackCenter: Coordinates;
  hasLoadedMap: boolean;
  mapTheme: MapboxTheme;
  value: TaskLocation;
  onPinnedLocationChange: (latitude: number, longitude: number) => void;
}

export function TaskLocationMap({
  accessToken,
  disabled,
  fallbackCenter,
  hasLoadedMap,
  mapTheme,
  value,
  onPinnedLocationChange,
}: TaskLocationMapProps) {
  const mapContainerRef = useRef<HTMLDivElement | null>(null);
  const mapRef = useRef<mapboxgl.Map | null>(null);
  const markerRef = useRef<mapboxgl.Marker | null>(null);
  const latestValueRef = useRef(value);
  const disabledRef = useRef(disabled);
  const mapThemeRef = useRef<MapboxTheme>(mapTheme);
  const onPinnedLocationChangeRef = useRef(onPinnedLocationChange);

  latestValueRef.current = value;
  disabledRef.current = disabled;
  mapThemeRef.current = mapTheme;
  onPinnedLocationChangeRef.current = onPinnedLocationChange;

  useEffect(() => {
    if (!hasLoadedMap || !accessToken || !mapContainerRef.current || mapRef.current) {
      return;
    }

    const initialLocation = latestValueRef.current;
    const initialCenter = getTaskLocationCenter(initialLocation, fallbackCenter);
    mapboxgl.accessToken = accessToken;

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

      onPinnedLocationChangeRef.current(event.lngLat.lat, event.lngLat.lng);
    });

    mapRef.current = map;

    return () => {
      markerRef.current?.remove();
      markerRef.current = null;
      map.remove();
      mapRef.current = null;
    };
  }, [accessToken, fallbackCenter, hasLoadedMap]);

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
          onPinnedLocationChangeRef.current(nextPosition.lat, nextPosition.lng);
        }
      });
    } else {
      markerRef.current.setLngLat(coordinates);
    }

    map.easeTo({ center: coordinates, zoom: Math.max(map.getZoom(), 13) });
  }, [value]);

  if (!hasLoadedMap) {
    return null;
  }

  return (
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
  );
}
