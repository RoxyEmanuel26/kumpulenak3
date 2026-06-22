/**
 * app/(user)/category/[slug]/opengraph-image.tsx
 *
 * Dynamic per-category OG image for LustHub.
 * Served at: /category/{slug}/opengraph-image
 *
 * Displays the category name prominently with LustHub branding.
 * Pre-generated at build time for all Tier-1 category slugs.
 * Zero external image dependencies — fully self-hosted.
 */
import { ImageResponse } from "next/og";
import { getCategoryBySlug, TIER1_CATEGORIES } from "@/lib/category-config";

export const runtime = "edge";
export const alt = "LustHub Category";
export const size = { width: 1200, height: 630 };
export default async function CategoryOGImage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const cat = getCategoryBySlug(slug);

  // Fallback if slug is not recognized
  const categoryName = cat?.name ?? slug;
  const categoryTitle = cat?.title ?? `${slug} Porn Videos`;

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
        {/* Top-left red glow */}
        <div
          style={{
            position: "absolute",
            top: "-80px",
            left: "-60px",
            width: "420px",
            height: "420px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(220,38,38,0.3) 0%, transparent 70%)",
          }}
        />

        {/* Bottom-right accent */}
        <div
          style={{
            position: "absolute",
            bottom: "-120px",
            right: "-80px",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "radial-gradient(circle, rgba(147,51,234,0.15) 0%, transparent 70%)",
          }}
        />

        {/* LustHub brand at top */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "8px",
            marginBottom: "48px",
          }}
        >
          <span
            style={{
              fontSize: "28px",
              fontWeight: "800",
              color: "white",
              letterSpacing: "-1px",
            }}
          >
            Lust
          </span>
          <span
            style={{
              fontSize: "28px",
              fontWeight: "800",
              color: "#dc2626",
              letterSpacing: "-1px",
            }}
          >
            Hub
          </span>
          <div
            style={{
              width: "6px",
              height: "6px",
              borderRadius: "50%",
              background: "#dc2626",
              flexShrink: 0,
            }}
          />
        </div>

        {/* Category name — main focus */}
        <p
          style={{
            fontSize: "80px",
            fontWeight: "900",
            color: "white",
            letterSpacing: "-3px",
            margin: "0 0 12px 0",
            lineHeight: 1,
          }}
        >
          {categoryName}
        </p>

        {/* Subtitle */}
        <p
          style={{
            fontSize: "34px",
            fontWeight: "500",
            color: "#888888",
            margin: "0 0 52px 0",
            letterSpacing: "-0.5px",
          }}
        >
          {categoryTitle.includes("Porn Videos") ? "Porn Videos" : `${categoryName} Videos`}
        </p>

        {/* Footer row */}
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "16px",
          }}
        >
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(220,38,38,0.12)",
              border: "1px solid rgba(220,38,38,0.25)",
              borderRadius: "999px",
              padding: "8px 20px",
            }}
          >
            <span
              style={{
                fontSize: "18px",
                fontWeight: "600",
                color: "#f87171",
              }}
            >
              Free HD
            </span>
          </div>
          <div
            style={{
              display: "flex",
              alignItems: "center",
              background: "rgba(255,255,255,0.05)",
              border: "1px solid rgba(255,255,255,0.1)",
              borderRadius: "999px",
              padding: "8px 20px",
            }}
          >
            <span
              style={{
                fontSize: "18px",
                fontWeight: "500",
                color: "#AAAAAA",
              }}
            >
              lusthub.web.id
            </span>
          </div>
        </div>
      </div>
    ),
    { ...size }
  );
}
