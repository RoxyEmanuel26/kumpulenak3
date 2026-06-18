import axios from "axios";

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
      seoDescription: `Tonton video ${title} lengkap secara gratis. Temukan katalog video Eporner terbaik lainnya di website kami.`,
    };

    if (!GEMINI_API_KEY) {
      console.warn("[GeminiAPI] GEMINI_API_KEY is not set. Using fallback classification.");
      return fallbackResult;
    }

    try {
      const prompt = `
        Klasifikasikan video dewasa berikut ini untuk katalog website premium.
        Judul Video: "${title}"
        Keyword Asal: "${keywords}"

        Lakukan analisis berikut:
        1. Bersihkan keyword asal dari duplikasi, typos, dan buat tag bersih dalam format lowercase (maksimal 10 tag paling relevan).
        2. Tentukan 1 kategori utama yang paling cocok (contoh: Teen, Amateur, MILF, College, POV, Asian, Anal, Solo, dll).
        3. Deteksi jika judul mengandung spam, klik bait ekstrim, atau penipuan (isSpam = true/false).
        4. Berikan skor (0 hingga 100) untuk:
           - trending: potensi viralitas / tren saat ini.
           - engagement: ketertarikan penonton / rasio klik.
           - spam: probabilitas judul tersebut adalah spam.
        5. Buat deskripsi SEO yang memikat dalam Bahasa Indonesia (1-2 kalimat) untuk meningkatkan performa di Google Pencarian.
      `;

      const response = await axios.post(
        API_URL,
        {
          contents: [
            {
              parts: [
                {
                  text: prompt,
                },
              ],
            },
          ],
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
        },
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const jsonText = response.data?.candidates?.[0]?.content?.parts?.[0]?.text;
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
    } catch (err: any) {
      console.error("[GeminiAPI] Error during video classification:", err.message);
      return fallbackResult;
    }
  },
};
