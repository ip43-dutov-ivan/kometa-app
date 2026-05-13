import type { Metadata, Viewport } from "next";
import { Analytics } from "@vercel/analytics/next";
import { defaultI18n } from "@kometa/i18n";
import { Inter, Manrope } from "next/font/google";
import { ThemeProvider } from "@/components/theme-provider";
import { KometaI18nProvider } from "@/shared/i18n/i18n-provider";
import { MockServiceWorker } from "@/shared/mocks/mock-service-worker";
import "mapbox-gl/dist/mapbox-gl.css";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
});

const manrope = Manrope({
  subsets: ["latin", "cyrillic"],
  variable: "--font-space-grotesk",
});

export const metadata: Metadata = {
  title: defaultI18n._("app.title"),
  description: defaultI18n._("app.description"),
  generator: "v0.app",
  icons: {
    icon: [
      {
        url: "/icon-light-32x32.png",
        media: "(prefers-color-scheme: light)",
      },
      {
        url: "/icon-dark-32x32.png",
        media: "(prefers-color-scheme: dark)",
      },
      {
        url: "/icon.svg",
        type: "image/svg+xml",
      },
    ],
    apple: "/apple-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#0a0a0f",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="bg-background" suppressHydrationWarning>
      <body className={`${inter.variable} ${manrope.variable} font-sans antialiased`}>
        <ThemeProvider
          attribute="class"
          defaultTheme="dark"
          enableSystem={false}
          disableTransitionOnChange
        >
          <KometaI18nProvider>
            <MockServiceWorker />
            {children}
            {process.env.NODE_ENV === "production" && <Analytics />}
          </KometaI18nProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
