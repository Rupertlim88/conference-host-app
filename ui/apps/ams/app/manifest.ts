import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Isobar Meetings 2027 (Demo)",
    short_name: "Isobar 2027",
    description: "A demo conference app showing the AMS 107th Annual Meeting programme.",
    start_url: "/",
    display: "standalone",
    background_color: "#ffffff",
    theme_color: "#1f3b70",
    icons: [{ src: "/icon.svg", sizes: "any", type: "image/svg+xml" }],
  };
}
