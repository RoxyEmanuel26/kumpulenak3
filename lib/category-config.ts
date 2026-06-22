/**
 * lib/category-config.ts
 *
 * Tier-1 category registry for LustHub.
 * Each entry defines a crawlable /category/{slug} page with:
 *  - slug: URL segment (generated from name via slugify)
 *  - name: display name (exact string used by EpornerAPI.search)
 *  - imageId: Eporner category image ID for thumbnail
 *  - title: SEO <title> tag content (used in metadata)
 *  - description: SEO meta description
 *  - intro: unique paragraph shown as h2 section above the video grid (no JS needed)
 *  - related: slugs of related categories for internal linking
 *
 * Do NOT add a category here unless it has a real page at /category/{slug}.
 * Non-registered categories fall back to /results?search_query={name}.
 */

export interface CategoryConfig {
  slug: string;
  name: string;
  imageId: string;
  title: string;
  description: string;
  intro: string;
  related: string[];
}

export const TIER1_CATEGORIES: CategoryConfig[] = [
  {
    slug: "japanese",
    name: "Japanese",
    imageId: "52",
    title: "Japanese Porn Videos",
    description:
      "Watch the best free Japanese porn videos on LustHub. Featuring JAV, uncensored, amateur, and professional Japanese adult content in HD quality.",
    intro:
      "Japanese porn (JAV) is one of the most searched adult categories in the world, known for its unique aesthetics, high production quality, and wide variety of subgenres. From uncensored amateur clips to studio-produced JAV titles, LustHub indexes thousands of free Japanese adult videos in HD.",
    related: ["asian", "hentai", "amateur", "homemade"],
  },
  {
    slug: "milf",
    name: "MILF",
    imageId: "53",
    title: "MILF Porn Videos",
    description:
      "Free MILF porn videos on LustHub. Watch hot mature women in HD quality — amateur housewives, stepmoms, and experienced MILFs from top studios.",
    intro:
      "MILF porn features mature, experienced women who know exactly what they want. LustHub brings you thousands of free MILF videos — from passionate amateurs to polished studio productions — all in HD quality with no registration required.",
    related: ["homemade", "amateur", "latina", "ebony"],
  },
  {
    slug: "teen",
    name: "Teen",
    imageId: "0",
    title: "Teen Porn Videos (18+)",
    description:
      "Free 18+ teen porn videos on LustHub. All performers are verified adults. Watch amateur and professional teen adult content in HD.",
    intro:
      "LustHub features a large collection of 18+ teen adult videos. All performers are verified adults. Browse amateur and professional content from top studios, updated daily with new HD uploads.",
    related: ["amateur", "homemade", "pov", "lesbian"],
  },
  {
    slug: "asian",
    name: "Asian",
    imageId: "11",
    title: "Asian Porn Videos",
    description:
      "Free Asian porn videos on LustHub. Browse HD content featuring Japanese, Korean, Thai, Chinese, and other Asian performers. Updated daily.",
    intro:
      "Asian porn covers a wide range of styles and cultures — from Japanese JAV and Korean amateur clips to Thai and Filipino content. LustHub's Asian category is one of the most popular on the platform, offering HD videos updated every day.",
    related: ["japanese", "hentai", "indian", "homemade"],
  },
  {
    slug: "amateur",
    name: "Amateur",
    imageId: "1",
    title: "Amateur Porn Videos",
    description:
      "Real amateur porn videos on LustHub. Homemade, selfie, webcam, and user-submitted content featuring real people. Free HD streaming.",
    intro:
      "Amateur porn is the most authentic category on LustHub — real people, real situations, no scripts. From homemade clips filmed at home to webcam recordings and public submissions, this category keeps it raw and genuine.",
    related: ["homemade", "pov", "teen", "milf"],
  },
  {
    slug: "lesbian",
    name: "Lesbian",
    imageId: "6",
    title: "Lesbian Porn Videos",
    description:
      "Free lesbian porn videos on LustHub. Watch HD girl-on-girl content — amateur, studio, and exclusive lesbian scenes updated daily.",
    intro:
      "Lesbian porn on LustHub spans the full spectrum — from passionate softcore encounters to explicit studio productions. This is one of the platform's most consistently popular categories, featuring amateur, professional, and everything in between.",
    related: ["teen", "amateur", "pov", "homemade"],
  },
  {
    slug: "anal",
    name: "Anal",
    imageId: "3",
    title: "Anal Porn Videos",
    description:
      "Free anal porn videos in HD on LustHub. Amateur, professional, and POV anal scenes. New videos added daily.",
    intro:
      "Anal porn is consistently among the top-searched categories worldwide. LustHub's collection includes amateur anal clips, professional studio productions, POV perspectives, and interracial scenes — all in HD quality.",
    related: ["pov", "amateur", "hardcore", "homemade"],
  },
  {
    slug: "big-tits",
    name: "Big Tits",
    imageId: "25",
    title: "Big Tits Porn Videos",
    description:
      "Free big tits porn videos on LustHub. Browse HD content featuring busty amateurs and big-breasted pornstars. Updated daily.",
    intro:
      "The Big Tits category on LustHub features performers with naturally or surgically enhanced breasts in a wide variety of scenes — solo, POV, hardcore, and more. Browse thousands of HD clips from both amateur and professional studios.",
    related: ["milf", "amateur", "hardcore", "latina"],
  },
  {
    slug: "homemade",
    name: "Homemade",
    imageId: "12",
    title: "Homemade Porn Videos",
    description:
      "Real homemade porn videos on LustHub. Self-filmed, authentic adult content from real couples and amateurs. Free HD streaming, no registration.",
    intro:
      "Homemade porn captures real intimacy between real people — no sets, no scripts, just authentic moments filmed by the participants themselves. LustHub's homemade category is constantly updated with new couple videos, solo recordings, and amateur selfie clips.",
    related: ["amateur", "milf", "pov", "teen"],
  },
  {
    slug: "hardcore",
    name: "Hardcore",
    imageId: "5",
    title: "Hardcore Porn Videos",
    description:
      "Free hardcore porn videos in HD on LustHub. Intense, explicit scenes from amateur and professional studios. Updated daily.",
    intro:
      "Hardcore porn on LustHub covers the most explicit content on the platform — rough, intense, and unfiltered. Whether you prefer studio productions or raw amateur recordings, this category has thousands of HD videos to choose from.",
    related: ["anal", "pov", "amateur", "big-tits"],
  },
  {
    slug: "hentai",
    name: "Hentai",
    imageId: "42",
    title: "Hentai Porn Videos",
    description:
      "Free hentai porn videos on LustHub. Anime and manga-style adult animation — subbed, dubbed, and uncensored hentai in HD.",
    intro:
      "Hentai is adult animated content originating from Japan, based on manga and anime art styles. LustHub's hentai collection includes subbed, dubbed, censored, and uncensored titles spanning dozens of subgenres from vanilla romance to fantasy and beyond.",
    related: ["japanese", "asian", "teen", "amateur"],
  },
  {
    slug: "indian",
    name: "Indian",
    imageId: "59",
    title: "Indian Porn Videos",
    description:
      "Free Indian porn videos on LustHub. Desi, Bollywood-style, amateur, and professional Indian adult content in HD. Updated daily.",
    intro:
      "Indian (Desi) porn is one of the fastest growing categories on adult platforms globally. LustHub features amateur couples, solo clips, and professional Desi productions — from South Indian to North Indian regional content, all in HD.",
    related: ["asian", "amateur", "homemade", "milf"],
  },
  {
    slug: "latina",
    name: "Latina",
    imageId: "54",
    title: "Latina Porn Videos",
    description:
      "Free Latina porn videos in HD on LustHub. Passionate amateur and professional content featuring Latin women. Updated daily.",
    intro:
      "Latina porn features passionate and expressive performers from Latin America and Spain. LustHub's Latina category includes amateur clips, big ass content, interracial pairings, and professional studio productions — all available free in HD.",
    related: ["big-tits", "amateur", "milf", "ebony"],
  },
  {
    slug: "ebony",
    name: "Ebony",
    imageId: "10",
    title: "Ebony Porn Videos",
    description:
      "Free ebony porn videos in HD on LustHub. Amateur and professional content featuring Black women and couples. Updated daily.",
    intro:
      "The Ebony category on LustHub showcases Black performers in a wide range of scenes — from intimate amateur clips to high-energy professional productions. One of the platform's most consistently popular categories, updated with new HD content every day.",
    related: ["amateur", "latina", "milf", "homemade"],
  },
  {
    slug: "pov",
    name: "POV",
    imageId: "33",
    title: "POV Porn Videos",
    description:
      "Free POV (point-of-view) porn videos on LustHub. First-person perspective adult content in HD. Amateur and professional POV scenes updated daily.",
    intro:
      "POV (point-of-view) porn puts you directly in the scene, filmed from the performer's first-person perspective. It's one of the fastest growing categories in adult entertainment. LustHub features amateur, professional, and VR-style POV content all in one place.",
    related: ["amateur", "hardcore", "teen", "homemade"],
  },
];

/**
 * Map of slug → CategoryConfig for O(1) lookup.
 */
export const CATEGORY_MAP: Map<string, CategoryConfig> = new Map(
  TIER1_CATEGORIES.map((cat) => [cat.slug, cat])
);

/**
 * Returns the CategoryConfig for a given slug, or null if not a Tier-1 category.
 */
export function getCategoryBySlug(slug: string): CategoryConfig | null {
  return CATEGORY_MAP.get(slug) ?? null;
}

/**
 * Returns all Tier-1 slugs as a Set for O(1) membership checks.
 */
export const TIER1_SLUGS: Set<string> = new Set(TIER1_CATEGORIES.map((c) => c.slug));
