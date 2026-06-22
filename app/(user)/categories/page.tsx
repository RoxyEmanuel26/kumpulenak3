import { prisma } from "@/lib/db/prisma";
import { Metadata } from "next";
import { LayoutGrid } from "lucide-react";
import { CategoriesClient } from "./CategoriesClient";
import { TIER1_CATEGORIES } from "@/lib/category-config";

const SITE_URL = process.env.NEXT_PUBLIC_APP_URL || "https://lusthub.web.id";

// ISR: regenerate the categories page once per day.
// Category metadata and video counts change slowly — daily refresh is sufficient.
// Eliminates per-request DB queries for stable, non-personalized content.
export const revalidate = 86400;

export const metadata: Metadata = {
  title: "Categories",
  description: "Browse all porn video categories on LustHub. Find exactly what you're looking for — from amateur to HD, Asian to MILF and everything in between.",
  alternates: {
    canonical: `${SITE_URL}/categories`,
  },
  openGraph: {
    title: "Browse All Categories \u2014 LustHub",
    description: "Browse all porn video categories on LustHub. Find exactly what you're looking for — amateur, HD, Asian, MILF, Lesbian and more.",
    type: "website",
    url: `${SITE_URL}/categories`,
    siteName: "LustHub",
    images: [
      {
        url: `${SITE_URL}/opengraph-image`,
        width: 1200,
        height: 630,
        alt: "LustHub \u2014 Browse All Categories",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "Browse All Categories \u2014 LustHub",
    description: "Browse all porn video categories on LustHub.",
    images: [`${SITE_URL}/opengraph-image`],
  },
};


const CATEGORY_MAPPING = [
  { name: "Japanese", imageId: "52" },
  { name: "Anal", imageId: "3" },
  { name: "HD Porn 1080p", imageId: "43" },
  { name: "VR Porn", imageId: "72" },
  { name: "Teen", imageId: "0" },
  { name: "Asian", imageId: "11" },
  { name: "Big Tits", imageId: "25" },
  { name: "Shemale", imageId: "24" },
  { name: "MILF", imageId: "53" },
  { name: "Ebony", imageId: "10" },
  { name: "Homemade", imageId: "12" },
  { name: "Indian", imageId: "59" },
  { name: "Interracial", imageId: "48" },
  { name: "Amateur", imageId: "1" },
  { name: "Lesbian", imageId: "6" },
  { name: "60 FPS", imageId: "67" },
  { name: "Big Ass", imageId: "44" },
  { name: "POV", imageId: "33" },
  { name: "Mature", imageId: "17" },
  { name: "Creampie", imageId: "47" },
  { name: "Hentai", imageId: "42" },
  { name: "Hardcore", imageId: "5" },
  { name: "BBW", imageId: "63" },
  { name: "Threesome", imageId: "9" },
  { name: "Latina", imageId: "54" },
  { name: "Big Dick", imageId: "7" },
  { name: "Double Penetration", imageId: "2" },
  { name: "Pornstar", imageId: "66" },
  { name: "Group Sex", imageId: "26" },
  { name: "Vintage", imageId: "57" },
  { name: "Cumshot", imageId: "4" },
  { name: "Blowjob", imageId: "8" },
  { name: "Masturbation", imageId: "28" },
  { name: "Students", imageId: "19" },
  { name: "Blonde", imageId: "37" },
  { name: "Petite", imageId: "65" },
  { name: "Webcam", imageId: "62" },
  { name: "Orgy", imageId: "58" },
  { name: "Brunette", imageId: "38" },
  { name: "Office", imageId: "23" },
  { name: "BDSM", imageId: "29" },
  { name: "Public", imageId: "15" },
  { name: "Older Men", imageId: "13" },
  { name: "Massage", imageId: "49" },
  { name: "Lingerie", imageId: "36" },
  { name: "Toys", imageId: "30" },
  { name: "Hotel", imageId: "35" },
  { name: "Squirt", imageId: "51" },
  { name: "Outdoor", imageId: "16" },
  { name: "Fat", imageId: "18" },
  { name: "Fetish", imageId: "60" },
  { name: "Redhead", imageId: "39" },
  { name: "Housewives", imageId: "20" },
  { name: "Small Tits", imageId: "50" },
  { name: "Sleep", imageId: "22" },
  { name: "Swinger", imageId: "32" },
  { name: "Bukkake", imageId: "55" },
  { name: "Uniform", imageId: "27" },
  { name: "Striptease", imageId: "61" },
  { name: "Handjob", imageId: "21" },
  { name: "Bondage", imageId: "45" },
  { name: "For Women", imageId: "64" },
  { name: "Nurses", imageId: "41" },
  { name: "Fisting", imageId: "56" },
  { name: "HQ Porn", imageId: "69" },
  { name: "Footjob", imageId: "40" },
  { name: "HD Sex", imageId: "70" },
  { name: "Bisexual", imageId: "46" },
  { name: "ASMR", imageId: "31" },
  { name: "Doctor", imageId: "34" },
  { name: "Indonesia", imageId: "80" },
  { name: "Stepmom", imageId: "84" },
  { name: "Compilation", imageId: "75" },
  { name: "Cuckold", imageId: "77" },
  { name: "Stepsister", imageId: "85" },
  { name: "AI", imageId: "73" },
  { name: "Casting", imageId: "74" },
  { name: "Cosplay", imageId: "76" },
  { name: "Hotwife", imageId: "79" },
  { name: "PAWG", imageId: "81" },
  { name: "Pregnant", imageId: "83" },
  { name: "Pinay", imageId: "82" },
  { name: "Gloryhole", imageId: "78" }
];

export default async function CategoriesPage() {
  // Retrieve categories from the database
  const dbCategories = await prisma.category.findMany({
    orderBy: { name: "asc" },
    include: {
      _count: {
        select: { videos: true }
      }
    }
  });

  const categoryList = [...CATEGORY_MAPPING];

  // Add DB categories if they are not in the mapping list
  dbCategories.forEach((dbCat: any) => {
    const lowerName = dbCat.name.toLowerCase();
    if (lowerName === "gay") {
      return;
    }

    const exists = categoryList.some(
      (c) => c.name.toLowerCase() === lowerName
    );
    if (!exists) {
      // Generate a stable fallback image ID based on category name character code sum
      const charCodeSum = Array.from(dbCat.name as string).reduce((acc: number, char: string) => acc + char.charCodeAt(0), 0);
      const fallbackIds = ["1", "3", "6", "9", "11", "12", "17", "25", "33", "47", "53", "59", "66", "72"];
      const fallbackImageId = fallbackIds[charCodeSum % fallbackIds.length];

      categoryList.push({
        name: dbCat.name,
        imageId: fallbackImageId
      });
    }
  });

  // Attach database counts
  const finalCategories = categoryList.map((cat) => {
    const dbMatch = dbCategories.find(
      (dbCat) => dbCat.name.toLowerCase() === cat.name.toLowerCase()
    );
    return {
      name: cat.name,
      imageId: cat.imageId,
      count: dbMatch ? dbMatch._count.videos : 0
    };
  }).sort((a, b) => a.name.localeCompare(b.name));

  // ── ItemList JSON-LD ──────────────────────────────────────────────────────
  // Enumerates all Tier-1 category pages that have dedicated SEO-optimized routes.
  // Helps Google understand /categories as a navigational hub.
  // Only includes categories with real canonical /category/{slug} pages (Tier-1).
  const categoriesJsonLd = {
    "@context": "https://schema.org",
    "@type": "ItemList",
    "name": "Adult Video Categories — LustHub",
    "description": "Browse all adult video categories on LustHub — free HD porn organized by type.",
    "url": `${SITE_URL}/categories`,
    "numberOfItems": TIER1_CATEGORIES.length,
    "itemListElement": TIER1_CATEGORIES.map((cat, index) => ({
      "@type": "ListItem",
      "position": index + 1,
      "name": cat.name,
      "url": `${SITE_URL}/category/${cat.slug}`,
    })),
  };

  return (
    <>
      {/* ItemList JSON-LD — server-side, invisible to users */}
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(categoriesJsonLd) }}
      />
    <div className="container mx-auto max-w-7xl px-4 py-6 space-y-6">
      <div className="border-b border-white/5 pb-4 text-left">
        <h1 className="text-xl font-bold text-white flex items-center gap-2">
          <LayoutGrid className="h-5 w-5 text-red-500" />
          Browse Categories
        </h1>
        <p className="text-xs text-muted-foreground mt-1 font-mono">
          Explore all {finalCategories.length} media classification channels
        </p>
      </div>

      <CategoriesClient categories={finalCategories} />
    </div>
    </>
  );
}
