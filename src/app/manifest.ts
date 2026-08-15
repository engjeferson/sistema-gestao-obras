import type { MetadataRoute } from "next";

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "RDO — Reis Engenharia",
    short_name: "RDO Obras",
    description: "Preenchimento de RDO no campo — Reis Engenharia & Construções",
    start_url: "/campo/obras",
    scope: "/",
    display: "standalone",
    orientation: "portrait",
    background_color: "#0e1a2a",
    theme_color: "#0e1a2a",
    icons: [
      { src: "/icon.png", sizes: "192x192", type: "image/png" },
      { src: "/icon.png", sizes: "512x512", type: "image/png" },
      { src: "/icon.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
