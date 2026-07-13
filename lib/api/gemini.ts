
export interface GeminiClassificationResult {
  cleanedTags: string[];
  category: string;
  isSpam: boolean;
  scores: {
    trending: number;
    engagement: number;
    spam: number;
  };
  seoDescription: string;
}

const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-2.5-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;

export const GeminiAPI = {
  async classifyVideo(title: string, keywords: string): Promise<GeminiClassificationResult> {
    const fallbackResult: GeminiClassificationResult = {
      cleanedTags: keywords ? keywords.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean) : [],
      category: "General",
      isSpam: false,
      scores: { trending: 50, engagement: 50, spam: 5 },
      seoDescription: `Watch full video ${title} for free. Find more of the best Eporner videos catalog on our website.`,
    };

    if (!GEMINI_API_KEY) {
      console.warn("[GeminiAPI] GEMINI_API_KEY is not set. Using fallback classification.");
      return fallbackResult;
    }

    try {
      const prompt = `
        Classify the following video for a premium website catalog.
        Video Title: "${title}"
        Original Keywords: "${keywords}"

        Perform the following analysis:
        1. Clean up original keywords from duplicates, typos, and make clean tags in lowercase format (max 10 most relevant tags).
        2. Determine the single most matching category (e.g. Teen, Amateur, MILF, College, POV, Asian, Anal, Solo, etc.).
        3. Detect if the title contains spam, extreme clickbait, or scams (isSpam = true/false).
        CRITICAL RULE: If the video contains or implies gay, male-on-male, shemale, ladyboy, trans, or homosexual content, you MUST set isSpam = true so it is filtered out of our straight-only catalog.
        4. Provide scores (0 to 100) for:
           - trending: current virality potential / trendiness.
           - engagement: viewer interest / click ratio.
           - spam: probability that the title is spam.
        5. Write a compelling SEO description in English (1-2 sentences) to improve Google search performance.
      `;

      const res = await fetch(API_URL, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: prompt }] }],
          generationConfig: {
            responseMimeType: "application/json",
            responseSchema: {
              type: "OBJECT",
              properties: {
                cleanedTags: { type: "ARRAY", items: { type: "STRING" } },
                category: { type: "STRING" },
                isSpam: { type: "BOOLEAN" },
                scores: {
                  type: "OBJECT",
                  properties: {
                    trending: { type: "NUMBER" },
                    engagement: { type: "NUMBER" },
                    spam: { type: "NUMBER" },
                  },
                  required: ["trending", "engagement", "spam"],
                },
                seoDescription: { type: "STRING" },
              },
              required: ["cleanedTags", "category", "isSpam", "scores", "seoDescription"],
            },
          },
        }),
      });

      if (!res.ok) {
        throw new Error(`HTTP Error: ${res.status}`);
      }

      const responseData = await res.json();
      const jsonText = responseData?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!jsonText) {
        throw new Error("Empty response from Gemini API");
      }

      const result = JSON.parse(jsonText) as GeminiClassificationResult;
      
      // Basic validation of score types
      return {
        cleanedTags: Array.isArray(result.cleanedTags) ? result.cleanedTags.map(t => t.trim().toLowerCase()) : fallbackResult.cleanedTags,
        category: result.category || fallbackResult.category,
        isSpam: typeof result.isSpam === "boolean" ? result.isSpam : fallbackResult.isSpam,
        scores: {
          trending: typeof result.scores?.trending === "number" ? result.scores.trending : 50,
          engagement: typeof result.scores?.engagement === "number" ? result.scores.engagement : 50,
          spam: typeof result.scores?.spam === "number" ? result.scores.spam : 5,
        },
        seoDescription: result.seoDescription || fallbackResult.seoDescription,
      };
    } catch (err) {
      const error = err as Error;
      console.error("[GeminiAPI] Error during video classification:", error.message);
      return fallbackResult;
    }
  },
};
