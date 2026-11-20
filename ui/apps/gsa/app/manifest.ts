import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Strata Guide (Demo)",
    short_name: "Strata Demo",
    description: "A demo conference app showing the GSA Connects 2026 programme.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1d5c4b",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
