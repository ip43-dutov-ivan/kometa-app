import {
  getTaskLocationFeatureCity,
  getTaskLocationFeatureLabel,
  type TaskLocationCity,
  type TaskLocationFeatureContext,
} from "@kometa/logic";

type ReverseGeocodeResponse = {
  features?: Array<{
    properties?: {
      context?: TaskLocationFeatureContext;
      feature_type?: string;
      full_address?: string;
      mapbox_id?: string;
      name_preferred?: string;
      place_formatted?: string;
      name?: string;
    };
  }>;
};

export async function reverseGeocodeLocation(
  latitude: number,
  longitude: number,
  language: string,
  accessToken: string,
): Promise<{ label: string; city?: TaskLocationCity }> {
  if (!accessToken) {
    return { label: "" };
  }

  try {
    const searchParams = new URLSearchParams({
      access_token: accessToken,
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
      ? {
          label: getTaskLocationFeatureLabel(properties),
          city: getTaskLocationFeatureCity(properties),
        }
      : { label: "" };
  } catch {
    return { label: "" };
  }
}
