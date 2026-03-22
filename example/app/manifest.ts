import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "better-auth-offline Example",
    short_name: "AuthOffline",
    description:
      "Example app demonstrating the better-auth offline plugin",
    start_url: "/",
    display: "standalone",
    background_color: "#fafafa",
    theme_color: "#0070f3",
    icons: [
      {
        src: "/icon-192x192.png",
        sizes: "192x192",
        type: "image/png",
      },
      {
        src: "/icon-512x512.png",
        sizes: "512x512",
        type: "image/png",
      },
    ],
  };
}
