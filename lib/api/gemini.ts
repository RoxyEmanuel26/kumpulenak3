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

// Parse multiple keys if provided (comma-separated), fallback to single key
const rawKeys = process.env.GEMINI_API_KEYS || process.env.GEMINI_API_KEY || "";
const API_KEYS = rawKeys.split(",").map((k) => k.trim()).filter(Boolean);

// Use Gemini 3.5 Flash-Lite for blazing fast text processing, JSON extraction, and maximum cost-efficiency
const MODEL_NAME = "gemini-3.5-flash-lite";

let currentKeyIndex = 0;

function getApiUrl(key: string) {
  return `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${key}`;
}

export const GeminiAPI = {
  async classifyVideo(title: string, keywords: string): Promise<GeminiClassificationResult> {
    const fallbackResult: GeminiClassificationResult = {
      cleanedTags: keywords ? keywords.split(",").map((t) => t.trim().toLowerCase()).filter(Boolean) : [],
      category: "General",
      isSpam: false,
      scores: { trending: 50, engagement: 50, spam: 5 },
      seoDescription: `Watch full video ${title} for free. Find more of the best Eporner videos catalog on our website.`,
    };

    if (API_KEYS.length === 0) {
      console.warn("[GeminiAPI] No GEMINI_API_KEY(S) set. Using fallback classification.");
      return fallbackResult;
    }

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

    const requestBody = JSON.stringify({
      contents: [{ parts: [{ text: prompt }] }],
      generationConfig: {
        responseMimeType: "application/json",
        responseSchema: {
          type: "OBJECT",
          properties: {
            cleanedTags: {
              type: "ARRAY",
              items: { type: "STRING" },
            },
            category: { type: "STRING" },
            isSpam: { type: "BOOLEAN" },
            scores: {
              type: "OBJECT",
              properties: {
                trending: { type: "INTEGER" },
                engagement: { type: "INTEGER" },
                spam: { type: "INTEGER" },
              },
              required: ["trending", "engagement", "spam"],
            },
            seoDescription: { type: "STRING" },
          },
          required: ["cleanedTags", "category", "isSpam", "scores", "seoDescription"],
        },
      },
    });

    // Try up to the number of keys we have available
    let attempts = 0;
    while (attempts < API_KEYS.length) {
      const activeKey = API_KEYS[currentKeyIndex];
      const apiUrl = getApiUrl(activeKey);

      try {
        const res = await fetch(apiUrl, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: requestBody,
        });

        if (res.status === 429) {
          // Rate limit hit! Switch to the next key
          console.warn(`[GeminiAPI] Rate Limit Hit (429) on Key #${currentKeyIndex + 1}. Switching to next API Key...`);
          currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
          attempts++;
          continue; // Try again with the new key
        }

        if (!res.ok) {
          console.error(`[GeminiAPI] Error API response: ${res.statusText}`);
          return fallbackResult;
        }

        const data = await res.json();
        const textResponse = data?.candidates?.[0]?.content?.parts?.[0]?.text;
        
        if (!textResponse) {
          console.error("[GeminiAPI] Invalid JSON response structure", data);
          return fallbackResult;
        }

        const parsed = JSON.parse(textResponse) as GeminiClassificationResult;
        
        // Basic validation of score types
        return {
          cleanedTags: Array.isArray(parsed.cleanedTags) ? parsed.cleanedTags.map(t => t.trim().toLowerCase()) : fallbackResult.cleanedTags,
          category: parsed.category || fallbackResult.category,
          isSpam: typeof parsed.isSpam === "boolean" ? parsed.isSpam : fallbackResult.isSpam,
          scores: {
            trending: typeof parsed.scores?.trending === "number" ? parsed.scores.trending : 50,
            engagement: typeof parsed.scores?.engagement === "number" ? parsed.scores.engagement : 50,
            spam: typeof parsed.scores?.spam === "number" ? parsed.scores.spam : 5,
          },
          seoDescription: parsed.seoDescription || fallbackResult.seoDescription,
        };

      } catch (err) {
        console.error(`[GeminiAPI] Connection error on Key #${currentKeyIndex + 1}:`, err);
        // If it's a network error, switch key just in case
        currentKeyIndex = (currentKeyIndex + 1) % API_KEYS.length;
        attempts++;
      }
    }

    console.error("[GeminiAPI] All API Keys exhausted or failed. Using fallback.");
    return fallbackResult;
  },
};
