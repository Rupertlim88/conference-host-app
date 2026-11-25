// The app is installable, English only, and shows times in Denver by default.
import type { Metadata, MetadataRoute, Viewport } from "next";
import { NextIntlClientProvider } from "next-intl";

import { Providers } from "@/features/connection";
import text from "@/features/text/en.json";

/** The zone the AMS 2027 meeting runs in (Denver). Times show in it unless the guest picks their device's zone. */
export const MEETING_ZONE = "America/Denver";

/** One query-string value. Next gives an array when a name repeats (?q=a&q=b); the first one counts. The NUL
 *  character is dropped, because the database cannot hold it. */
export function firstParam(value: string | string[] | undefined): string {
  return ((Array.isArray(value) ? value[0] : value) ?? "").replaceAll("\u0000", "");
}

const THEME_COLOUR = "#1f3b70";

export const metadata: Metadata = { title: text.app.name, description: text.app.tagline, applicationName: text.app.name };

export const viewport: Viewport = { themeColor: THEME_COLOUR, width: "device-width", initialScale: 1 };

/** Every page, in English, with the backend connection and the meeting's time zone around it. */
export function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-background font-sans text-foreground antialiased">
        <NextIntlClientProvider>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}

/** What a phone needs to install the app: its name, colours and icon. */
export function manifest(): MetadataRoute.Manifest {
  return {
    name: text.app.name,
    short_name: text.app.shortName,
    description: text.app.tagline,
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: THEME_COLOUR,
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
