import { 
  computeSourceHash, 
  saveEnrichedVideo, 
  EnrichedVideoData 
} from "./enrichment-store";

export interface VideoInputItem {
  id: string;
  title: string;
  keywords?: string;
  length_min?: string;
  views?: number;
}

export interface EnrichmentConfig {
  apiKey?: string;
  model?: string;
  batchSize?: number;
  dailyLimit?: number;
}

interface RawGeminiOutputItem {
  video_id: string;
  seo_title: string;
  meta_description: string;
  summary: string;
  highlights: string[];
  tags: string[];
  faq: Array<{ question: string; answer: string }>;
}

/** Simple Jaccard similarity between two tokenized text strings */
function calculateTextSimilarity(textA: string, textB: string): number {
  const setA = new Set(textA.toLowerCase().split(/\W+/).filter(Boolean));
  const setB = new Set(textB.toLowerCase().split(/\W+/).filter(Boolean));
  if (setA.size === 0 || setB.size === 0) return 0;

  const intersection = new Set([...setA].filter((x) => setB.has(x)));
  const union = new Set([...setA, ...setB]);
  return intersection.size / union.size;
}

/**
 * Validates the quality of a generated record against strict SEO guidelines.
 * Returns null if passing, or an error string if rejected.
 */
function validateQuality(
  output: RawGeminiOutputItem, 
  input: VideoInputItem
): string | null {
  if (!output.seo_title || output.seo_title.length < 10 || output.seo_title.length > 65) {
    return `Invalid seo_title length: ${output.seo_title?.length || 0} chars (must be 10-65)`;
  }

  if (!output.meta_description || output.meta_description.length < 110 || output.meta_description.length > 165) {
    return `Invalid meta_description length: ${output.meta_description?.length || 0} chars (must be 110-165)`;
  }

  if (!output.summary || output.summary.split(/[.!?]+/).filter(Boolean).length < 2) {
    return `Summary too short: must contain at least 2 distinct sentences`;
  }

  if (!Array.isArray(output.highlights) || output.highlights.length < 2 || output.highlights.length > 6) {
    return `Highlights count invalid: ${output.highlights?.length || 0} items (expected 2-6)`;
  }

  if (!Array.isArray(output.tags) || output.tags.length < 2) {
    return `Tags count invalid: ${output.tags?.length || 0} items`;
  }

  if (!Array.isArray(output.faq) || output.faq.length < 2) {
    return `FAQ count invalid: ${output.faq?.length || 0} items (expected 2-3)`;
  }

  // Similarity check: Reject if description is essentially a copy-paste of raw title/keywords
  const rawInput = `${input.title} ${input.keywords || ""}`;
  const similarity = calculateTextSimilarity(rawInput, output.meta_description);
  if (similarity > 0.85) {
    return `Similarity too high (${(similarity * 100).toFixed(1)}%): text is too close to raw metadata`;
  }

  return null;
}

/**
 * Sends a batch of videos to the Gemini API for unique SEO metadata enrichment.
 * Uses native fetch with exponential backoff for 429 rate limits.
 */
export async function processBatchWithGemini(
  videos: VideoInputItem[],
  customConfig?: EnrichmentConfig
): Promise<{ enrichedCount: number; rejectedCount: number; failedCount: number }> {
  const apiKey = customConfig?.apiKey || process.env.GEMINI_API_KEY;
  const model = customConfig?.model || process.env.GEMINI_MODEL || "gemini-3.5-flash";

  if (!apiKey) {
    console.warn("\n⚠️ [GeminiEnricher] GEMINI_API_KEY is not configured. Skipping AI generation.");
    console.warn("Set GEMINI_API_KEY in your .env or environment to activate the enrichment pipeline.\n");
    return { enrichedCount: 0, rejectedCount: 0, failedCount: 0 };
  }

  if (videos.length === 0) {
    return { enrichedCount: 0, rejectedCount: 0, failedCount: 0 };
  }

  const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const promptText = `
You are an expert technical SEO copywriter for an adult video platform.
Analyze the following batch of ${videos.length} videos and generate unique, high-value, non-templated SEO metadata for each video.

Input Videos:
${JSON.stringify(videos, null, 2)}

Strict Editorial Guidelines:
1. Use ONLY the provided metadata (title, keywords, length, views).
2. DO NOT hallucinate or invent fake names, performers, or fictional studio details not in the input.
3. Language: English. Natural, engaging, human-written tone (never sounding like an AI template).
4. Strictly NO clickbait, NO keyword-stuffing, NO spam repetitions.
5. Provide a valid JSON array of objects conforming exactly to this structure:
[
  {
    "video_id": "string (matches input video id)",
    "seo_title": "string (clean, enticing title, strictly 15 to 60 characters)",
    "meta_description": "string (honest, click-worthy meta description, strictly 120 to 155 characters)",
    "summary": "string (2 to 3 well-crafted sentences summarizing theme and action)",
    "highlights": ["string", "string", "string"] (3 to 5 key highlights),
    "tags": ["string", "string", "string"] (3 to 6 curated tags),
    "faq": [
      { "question": "string", "answer": "string" },
      { "question": "string", "answer": "string" }
    ] (2 to 3 frequently asked questions and answers)
  }
]
`;

  let responseJson: any = null;
  let attempts = 0;
  const maxRetries = 3;

  while (attempts <= maxRetries) {
    try {
      attempts++;
      const res = await fetch(endpoint, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contents: [{ parts: [{ text: promptText }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json",
          },
        }),
      });

      if (res.status === 429) {
        const delay = Math.pow(2, attempts) * 1000;
        console.warn(`[GeminiEnricher] Rate limit (429) encountered. Retrying in ${delay / 1000}s...`);
        await new Promise((r) => setTimeout(r, delay));
        continue;
      }

      if (!res.ok) {
        const errText = await res.text();
        console.error(`[GeminiEnricher] Gemini API returned error ${res.status}:`, errText);
        return { enrichedCount: 0, rejectedCount: 0, failedCount: videos.length };
      }

      const data = await res.json();
      const rawText = data?.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!rawText) throw new Error("Empty candidate text in Gemini response");

      responseJson = JSON.parse(rawText);
      break;
    } catch (err) {
      if (attempts > maxRetries) {
        console.error("[GeminiEnricher] Max retries exhausted:", err);
        return { enrichedCount: 0, rejectedCount: 0, failedCount: videos.length };
      }
      await new Promise((r) => setTimeout(r, 2000));
    }
  }

  if (!Array.isArray(responseJson)) {
    console.error("[GeminiEnricher] Gemini did not return a JSON array:", responseJson);
    return { enrichedCount: 0, rejectedCount: 0, failedCount: videos.length };
  }

  let enrichedCount = 0;
  let rejectedCount = 0;
  let failedCount = 0;

  for (const item of responseJson as RawGeminiOutputItem[]) {
    const originalInput = videos.find((v) => v.id === item.video_id);
    if (!originalInput) {
      failedCount++;
      continue;
    }

    const sourceHash = computeSourceHash(originalInput.title, originalInput.keywords);
    const rejectionReason = validateQuality(item, originalInput);

    if (rejectionReason) {
      console.warn(`[GeminiEnricher] Video ${item.video_id} REJECTED by QC: ${rejectionReason}`);
      await saveEnrichedVideo({
        video_id: item.video_id,
        source_hash: sourceHash,
        seo_title: item.seo_title || originalInput.title,
        meta_description: item.meta_description || "",
        summary: item.summary || "",
        highlights: item.highlights || [],
        tags: item.tags || [],
        faq: item.faq || [],
        status: "rejected",
        model,
        generated_at: new Date().toISOString(),
        attempts: 1,
        rejection_reason: rejectionReason,
      });
      rejectedCount++;
    } else {
      await saveEnrichedVideo({
        video_id: item.video_id,
        source_hash: sourceHash,
        seo_title: item.seo_title.trim(),
        meta_description: item.meta_description.trim(),
        summary: item.summary.trim(),
        highlights: item.highlights,
        tags: item.tags,
        faq: item.faq,
        status: "enriched",
        model,
        generated_at: new Date().toISOString(),
        attempts: 1,
      });
      enrichedCount++;
    }
  }

  return { enrichedCount, rejectedCount, failedCount };
}
