/**
 * app/opengraph-image.tsx
 *
 * Global OG image fallback for LustHub.
 * Served at: /opengraph-image
 * Used by: homepage, any page without a route-specific OG image.
 *
 * Uses Next.js built-in ImageResponse (next/og) — zero new dependencies.
 * Generated server-side. Zero client JS cost.
 */
import { ImageResponse } from "next/og";

export const runtime = "edge";

export const alt = "LustHub — Free HD Porn Videos";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function OGImage() {
  return new ImageResponse(
    (
      <div
        style={{
          width: "1200px",
          height: "630px",
          background: "#0F0F0F",
          display: "flex",
          flexDirection: "column",
          alignItems: "flex-start",
          justifyContent: "center",
          padding: "80px 100px",
          position: "relative",
          overflow: "hidden",
        }}
      >
        {/* Top-left red gradient accent blob */}
        <div
          style={{
            position: "absolute",
            top: "-120px",
            left: "-80px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(220,38,38,0.35) 0%, transparent 70%)",
          }}
        />

        {/* Bottom-right purple accent blob */}
        <div
          style={{
            position: "absolute",
            bottom: "-150px",
            right: "-100px",
            width: "600px",
            height: "600px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(147,51,234,0.2) 0%, transparent 70%)",
          }}
        />

        {/* Brand wordmark */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "12px",
            marginBottom: "28px",
          }}
        >
          <span
            style={{
              fontSize: "72px",
              fontWeight: "900",
              letterSpacing: "-2px",
              color: "white",
              lineHeight: 1,
            }}
          >
            Lust
          </span>
          <span
            style={{
              fontSize: "72px",
              fontWeight: "900",
              letterSpacing: "-2px",
              color: "#dc2626",
              lineHeight: 1,
            }}
          >
            Hub
          </span>
          {/* Red dot */}
          <div
            style={{
              width: "14px",
              height: "14px",
              borderRadius: "50%",
              background: "#dc2626",
              marginTop: "4px",
              flexShrink: 0,
            }}
          />
        </div>

        {/* Tagline */}
        <p
          style={{
            fontSize: "36px",
            fontWeight: "600",
            color: "#F1F1F1",
            letterSpacing: "-0.5px",
            margin: "0 0 16px 0",
            lineHeight: 1.2,
          }}
        >
          Free HD Porn Videos
        </p>

        {/* Sub-tagline */}
        <p
          style={{
            fontSize: "22px",
            fontWeight: "400",
            color: "#888888",
            margin: "0 0 48px 0",
            lineHeight: 1.4,
          }}
        >
          Thousands of videos · No registration required · Updated daily
        </p>

        {/* Domain pill */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            background: "rgba(255,255,255,0.06)",
            border: "1px solid rgba(255,255,255,0.12)",
            borderRadius: "999px",
            padding: "10px 24px",
          }}
        >
          <span
            style={{
              fontSize: "20px",
              fontWeight: "500",
              color: "#AAAAAA",
              letterSpacing: "0.5px",
            }}
          >
            lusthub.web.id
          </span>
        </div>
      </div>
    ),
    {
      ...size,
    }
  );
}
