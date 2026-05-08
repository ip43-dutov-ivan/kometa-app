import type { ComponentProps } from "react";
import type { Geocoder } from "@mapbox/search-js-react";

export type MapboxTheme = "light" | "dark";

type GeocoderTheme = ComponentProps<typeof Geocoder>["theme"];

export function getGeocoderTheme(theme: MapboxTheme): GeocoderTheme {
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
