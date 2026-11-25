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
    related: ["asian", "korean", "hentai", "amateur"],
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
    related: ["blonde", "brunette", "homemade", "amateur"],
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
    slug: "asian",
    name: "Asian",
    imageId: "11",
    title: "Asian Porn Videos",
    description:
      "Free Asian porn videos on LustHub. Browse HD content featuring Japanese, Korean, Thai, Chinese, and other Asian performers. Updated daily.",
    intro:
      "Asian porn covers a wide range of styles and cultures — from Japanese JAV and Korean amateur clips to Thai and Filipino content. LustHub's Asian category is one of the most popular on the platform, offering HD videos updated every day.",
    related: ["japanese", "korean", "hentai", "indian"],
  },
  {
    slug: "european",
    name: "European",
    imageId: "37",
    title: "European Porn Videos",
    description:
      "Watch free European porn videos in HD on LustHub. Featuring French, German, Czech, Italian, Eastern European, and UK adult scenes updated daily.",
    intro:
      "European porn brings together diverse styles from across Europe — from glamorous studio productions in France, Germany, and Spain to authentic Czech and Eastern European amateur clips, all streaming free in HD.",
    related: ["blonde", "brunette", "milf", "amateur"],
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
    related: ["big-ass", "big-tits", "amateur", "milf"],
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
    related: ["interracial", "big-ass", "amateur", "milf"],
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
    slug: "blonde",
    name: "Blonde",
    imageId: "37",
    title: "Blonde Porn Videos",
    description:
      "Free blonde porn videos in HD on LustHub. Watch American and European blonde amateurs and top pornstars in solo, POV, and hardcore scenes.",
    intro:
      "Blonde porn is a perennial favorite across North America and Europe. Browse thousands of HD videos featuring gorgeous blonde performers — from girl-next-door amateurs to elite studio stars, updated daily.",
    related: ["european", "brunette", "milf", "big-tits"],
  },
  {
    slug: "brunette",
    name: "Brunette",
    imageId: "38",
    title: "Brunette Porn Videos",
    description:
      "Free brunette porn videos in HD on LustHub. Stream sensual dark-haired performers across amateur, POV, European, and studio scenes.",
    intro:
      "The Brunette category highlights stunning dark-haired performers from the US, Europe, and worldwide. Enjoy homemade couples, POV encounters, and polished studio features in crisp HD quality.",
    related: ["blonde", "european", "latina", "amateur"],
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
    related: ["milf", "big-ass", "blonde", "hardcore"],
  },
  {
    slug: "big-ass",
    name: "Big Ass",
    imageId: "44",
    title: "Big Ass Porn Videos",
    description:
      "Free big ass porn videos in HD on LustHub. Watch curvy amateurs, Latina, Ebony, and top studio performers in high-definition scenes.",
    intro:
      "Big Ass porn is among the most searched categories in the United States, Europe, and Latin America. LustHub curates thousands of HD scenes showcasing curvy performers across POV, anal, and amateur genres.",
    related: ["latina", "ebony", "anal", "big-tits"],
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
    related: ["blowjob", "amateur", "creampie", "teen"],
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
    related: ["big-ass", "hardcore", "interracial", "pov"],
  },
  {
    slug: "creampie",
    name: "Creampie",
    imageId: "47",
    title: "Creampie Porn Videos",
    description:
      "Watch free creampie porn videos in HD on LustHub. Amateur couples, MILF, Asian, and studio creampie scenes updated daily with no signup.",
    intro:
      "Creampie porn ranks among the highest-searched categories across the US, Europe, and Asia. Explore thousands of authentic amateur and studio HD creampie scenes updated daily on LustHub.",
    related: ["amateur", "homemade", "milf", "japanese"],
  },
  {
    slug: "blowjob",
    name: "Blowjob",
    imageId: "8",
    title: "Blowjob Porn Videos",
    description:
      "Free HD blowjob porn videos on LustHub. Stream POV, amateur, deepthroat, and studio oral sex scenes updated daily with fast HD playback.",
    intro:
      "Blowjob videos span intimate amateur clips, immersive POV angles, and intense studio encounters. LustHub indexes thousands of free HD blowjob scenes curated for audiences worldwide.",
    related: ["pov", "amateur", "teen", "blonde"],
  },
  {
    slug: "interracial",
    name: "Interracial",
    imageId: "48",
    title: "Interracial Porn Videos",
    description:
      "Free interracial porn videos in HD on LustHub. Watch diverse pairings across amateur, MILF, Ebony, Asian, and European scenes.",
    intro:
      "Interracial porn brings together passionate pairings across cultures and backgrounds. Browse thousands of HD amateur and professional interracial scenes updated daily on LustHub.",
    related: ["ebony", "milf", "blonde", "hardcore"],
  },
  {
    slug: "threesome",
    name: "Threesome",
    imageId: "9",
    title: "Threesome Porn Videos",
    description:
      "Watch free threesome porn videos in HD on LustHub. FFM, MMF, amateur couples, and studio threesome scenes updated daily.",
    intro:
      "Threesome porn delivers high-energy group chemistry — from real amateur couples inviting a third to top international studio productions, all available to stream free in HD.",
    related: ["lesbian", "hardcore", "amateur", "european"],
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
    related: ["threesome", "teen", "amateur", "homemade"],
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
    related: ["amateur", "creampie", "milf", "pov"],
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
    related: ["anal", "interracial", "threesome", "big-tits"],
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
    related: ["japanese", "asian", "korean", "teen"],
  },
  {
    slug: "korean",
    name: "Korean",
    imageId: "11",
    title: "Korean Porn Videos",
    description:
      "Watch free Korean porn videos in HD on LustHub. Browse amateur Korean couples, BJ cam clips, and East Asian adult content updated daily.",
    intro:
      "Korean porn is one of Asia's fastest-growing categories, prized for authentic amateur couples, webcam shows, and high-definition East Asian adult clips. Stream thousands of free videos on LustHub.",
    related: ["asian", "japanese", "amateur", "homemade"],
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
    slug: "indonesia",
    name: "Indonesia",
    imageId: "8",
    title: "Indonesian Porn Videos",
    description: "Watch the best free Indonesian porn videos on LustHub. Featuring amateur, viral, and Southeast Asian adult content in HD quality.",
    intro: "Indonesian porn features authentic Southeast Asian amateur couples and homemade clips. LustHub indexes free Indonesian and Asian videos streaming in HD quality.",
    related: ["asian", "amateur", "homemade"],
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
