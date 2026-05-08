import type { TaskLocation } from "../api/dtos";

export interface Coordinates {
  latitude: number;
  longitude: number;
}

export interface TaskLocationCity {
  id: string;
  label: string;
  countryCode?: string;
}

export type TaskLocationFeatureContextItem = {
  country_code?: string;
  mapbox_id?: string;
  name?: string;
  name_preferred?: string;
};

export type TaskLocationFeatureContext = {
  country?: TaskLocationFeatureContextItem;
  district?: TaskLocationFeatureContextItem;
  locality?: TaskLocationFeatureContextItem;
  place?: TaskLocationFeatureContextItem;
  region?: TaskLocationFeatureContextItem;
};

export type TaskLocationFeatureProperties = {
  context?: TaskLocationFeatureContext;
  feature_type?: string;
  full_address?: string;
  mapbox_id?: string;
  name_preferred?: string;
  place_formatted?: string;
  name?: string;
};

export function createRemoteTaskLocation(label: string): TaskLocation {
  return {
    label,
    isRemote: true,
  };
}

export function createEmptyPhysicalTaskLocation(): TaskLocation {
  return {
    label: "",
    isRemote: false,
    latitude: undefined,
    longitude: undefined,
  };
}

export function createPhysicalTaskLocation(input: {
  latitude: number;
  longitude: number;
  label: string;
  fallbackLabel: string;
  city?: TaskLocationCity;
}): TaskLocation {
  const label = input.label.trim() || input.fallbackLabel;

  return {
    label,
    isRemote: false,
    latitude: input.latitude,
    longitude: input.longitude,
    cityId: input.city?.id,
    cityLabel: input.city?.label,
    countryCode: input.city?.countryCode,
  };
}

export function createUnresolvedPhysicalTaskLocation(label: string): TaskLocation {
  return {
    label,
    isRemote: false,
    latitude: undefined,
    longitude: undefined,
    cityId: undefined,
    cityLabel: undefined,
    countryCode: undefined,
  };
}

export function getTaskLocationCenter(location: TaskLocation, fallback: Coordinates): Coordinates {
  if (location.latitude !== undefined && location.longitude !== undefined) {
    return { latitude: location.latitude, longitude: location.longitude };
  }

  return fallback;
}

export function isTaskLocationComplete(location: TaskLocation): boolean {
  if (!location.label.trim()) {
    return false;
  }

  return (
    location.isRemote ||
    (location.latitude !== undefined &&
      location.longitude !== undefined &&
      Number.isFinite(location.latitude) &&
      Number.isFinite(location.longitude))
  );
}

export function getTaskLocationFeatureLabel(properties: {
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

export function getTaskLocationFeatureCity(properties: {
  context?: TaskLocationFeatureContext;
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
      contextCity?.mapbox_id ||
      properties.mapbox_id ||
      buildFallbackTaskLocationCityId(cityLabel, countryCode),
    label: cityLabel,
    countryCode,
  };
}

export function buildFallbackTaskLocationCityId(cityLabel: string, countryCode?: string): string {
  const countryPrefix = countryCode?.toLocaleLowerCase() || "place";
  const citySlug = cityLabel
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, "")
    .trim()
    .toLocaleLowerCase()
    .replace(/[-\s]+/g, "-");

  return `${countryPrefix}-${citySlug}`;
}
