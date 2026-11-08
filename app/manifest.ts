import { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "LustHub — Free HD Porn Videos",
    short_name: "LustHub",
    description: "Watch thousands of free HD porn videos updated daily on LustHub. Fast streaming, no registration required.",
    start_url: "/",
    display: "standalone",
    background_color: "#0a0a0a",
    theme_color: "#0a0a0a",
    icons: [
      {
        src: "/favicon.webp",
        sizes: "192x192",
        type: "image/webp",
      },
      {
        src: "/logo.webp",
        sizes: "512x512",
        type: "image/webp",
      },
    ],
  };
}
