"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.GeminiAPI = void 0;
const axios_1 = __importDefault(require("axios"));
const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
const MODEL_NAME = "gemini-2.5-flash";
const API_URL = `https://generativelanguage.googleapis.com/v1beta/models/${MODEL_NAME}:generateContent?key=${GEMINI_API_KEY}`;
exports.GeminiAPI = {
    async classifyVideo(title, keywords) {
        var _a, _b, _c, _d, _e, _f, _g, _h, _j;
        const fallbackResult = {
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
        4. Provide scores (0 to 100) for:
           - trending: current virality potential / trendiness.
           - engagement: viewer interest / click ratio.
           - spam: probability that the title is spam.
        5. Write a compelling SEO description in English (1-2 sentences) to improve Google search performance.
      `;
            const response = await axios_1.default.post(API_URL, {
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
            }, {
                headers: {
                    "Content-Type": "application/json",
                },
            });
            const jsonText = (_f = (_e = (_d = (_c = (_b = (_a = response.data) === null || _a === void 0 ? void 0 : _a.candidates) === null || _b === void 0 ? void 0 : _b[0]) === null || _c === void 0 ? void 0 : _c.content) === null || _d === void 0 ? void 0 : _d.parts) === null || _e === void 0 ? void 0 : _e[0]) === null || _f === void 0 ? void 0 : _f.text;
            if (!jsonText) {
                throw new Error("Empty response from Gemini API");
            }
            const result = JSON.parse(jsonText);
            // Basic validation of score types
            return {
                cleanedTags: Array.isArray(result.cleanedTags) ? result.cleanedTags.map(t => t.trim().toLowerCase()) : fallbackResult.cleanedTags,
                category: result.category || fallbackResult.category,
                isSpam: typeof result.isSpam === "boolean" ? result.isSpam : fallbackResult.isSpam,
                scores: {
                    trending: typeof ((_g = result.scores) === null || _g === void 0 ? void 0 : _g.trending) === "number" ? result.scores.trending : 50,
                    engagement: typeof ((_h = result.scores) === null || _h === void 0 ? void 0 : _h.engagement) === "number" ? result.scores.engagement : 50,
                    spam: typeof ((_j = result.scores) === null || _j === void 0 ? void 0 : _j.spam) === "number" ? result.scores.spam : 5,
                },
                seoDescription: result.seoDescription || fallbackResult.seoDescription,
            };
        }
        catch (err) {
            const error = err;
            console.error("[GeminiAPI] Error during video classification:", error.message);
            return fallbackResult;
        }
    },
};
