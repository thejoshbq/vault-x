import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "Vault X",
    short_name: "Vault X",
    description: "Track, plan, and understand your finances.",
    start_url: "/home",
    display: "standalone",
    background_color: "#f5f2ea",
    theme_color: "#285d52",
    icons: [
      { src: "/icon.svg", sizes: "any", type: "image/svg+xml", purpose: "any" },
      { src: "/icon-maskable.svg", sizes: "any", type: "image/svg+xml", purpose: "maskable" },
    ],
  };
}
