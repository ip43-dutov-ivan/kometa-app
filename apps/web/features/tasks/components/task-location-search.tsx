import type { ComponentProps, MutableRefObject } from "react";
import { Geocoder } from "@mapbox/search-js-react";
import { t } from "@kometa/i18n";
import {
  createPhysicalTaskLocation,
  createUnresolvedPhysicalTaskLocation,
  getTaskLocationFeatureCity,
  getTaskLocationFeatureLabel,
  type Coordinates,
  type TaskLocation,
} from "@kometa/logic";
import { Input } from "@/components/ui/input";

type GeocoderComponentProps = ComponentProps<typeof Geocoder>;
type GeocoderFeature = Parameters<NonNullable<GeocoderComponentProps["onRetrieve"]>>[0];

interface TaskLocationSearchProps {
  accessToken: string;
  disabled: boolean;
  geocoderTheme: GeocoderComponentProps["theme"];
  language: string;
  lastResolvedLocationRef: MutableRefObject<TaskLocation | null>;
  pinnedLocationLabel: string;
  proximity: Coordinates;
  value: TaskLocation;
  onChange: (location: TaskLocation) => void;
}

export function TaskLocationSearch({
  accessToken,
  disabled,
  geocoderTheme,
  language,
  lastResolvedLocationRef,
  pinnedLocationLabel,
  proximity,
  value,
  onChange,
}: TaskLocationSearchProps) {
  if (accessToken) {
    return (
      <div className="min-w-0 max-w-full [&_mapbox-geocoder]:block [&_mapbox-geocoder]:max-w-full">
        <Geocoder
          accessToken={accessToken}
          value={value.label}
          onChange={(label) => {
            if (label === lastResolvedLocationRef.current?.label) {
              onChange(lastResolvedLocationRef.current);
              return;
            }

            onChange(createUnresolvedPhysicalTaskLocation(label));
          }}
          onRetrieve={(feature: GeocoderFeature) => {
            const latitude = feature.properties.coordinates.latitude;
            const longitude = feature.properties.coordinates.longitude;
            const nextLocation = createPhysicalTaskLocation({
              latitude,
              longitude,
              label: getTaskLocationFeatureLabel(feature.properties),
              fallbackLabel: pinnedLocationLabel,
              city: getTaskLocationFeatureCity(feature.properties),
            });

            lastResolvedLocationRef.current = nextLocation;
            onChange(nextLocation);
          }}
          options={{
            country: "ua",
            language,
            proximity: {
              lat: proximity.latitude,
              lng: proximity.longitude,
            },
          }}
          placeholder={t("Search for an address or place")}
          marker={false}
          theme={geocoderTheme}
        />
      </div>
    );
  }

  return (
    <Input
      value={value.label}
      onChange={(event) => onChange({ ...value, label: event.target.value })}
      placeholder={t("Location label")}
      disabled={disabled}
    />
  );
}
