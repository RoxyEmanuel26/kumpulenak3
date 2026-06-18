import axios from "axios";
import { EpornerSearchResponse, EpornerVideo } from "../../types/eporner";

const BASE_URL = "https://www.eporner.com/api/v2/video";

export function repairMojibake(str: string): string {
  if (!str) return str;

  // Regex to match valid UTF-8 sequences interpreted as ISO-8859-1/CP1252 characters
  const utf8Regex = /[\u00C2-\u00DF][\u0080-\u00BF]|[\u00E0-\u00EF][\u0080-\u00BF]{2}|[\u00F0-\u00F4][\u0080-\u00BF]{3}/g;

  return str.replace(utf8Regex, (match) => {
    try {
      return Buffer.from(match, 'binary').toString('utf8');
    } catch {
      return match;
    }
  });
}

export function cleanEpornerText(str: string): string {
  if (!str) return str;
  const repaired = repairMojibake(str);
  // Remove zero-width space (\u200b), zero-width non-joiner (\u200c), zero-width joiner (\u200d), left-to-right mark (\u200e), right-to-left mark (\u200f), byte order mark (\ufeff)
  return repaired.replace(/[\u200b-\u200d\u200e\u200f\ufeff]/g, '');
}

function cleanVideoData(video: EpornerVideo): EpornerVideo {
  if (!video) return video;
  return {
    ...video,
    title: cleanEpornerText(video.title),
    keywords: cleanEpornerText(video.keywords),
  };
}

export const EpornerAPI = {
  async search(params: {
    query?: string;
    per_page?: number;
    page?: number;
    thumbsize?: string;
    order?: "latest" | "top-weekly" | "top-monthly" | "most-popular" | "longest" | "shortest";
    gay?: 0 | 1 | 2;
    lq?: 0 | 1 | 2;
    format?: "json" | "xml";
  } = {}): Promise<EpornerSearchResponse> {
    const { data } = await axios.get<EpornerSearchResponse>(`${BASE_URL}/search/`, {
      params: { format: "json", per_page: 100, order: "latest", ...params, gay: 0, lq: 0 },
    });
    if (data && Array.isArray(data.videos)) {
      data.videos = data.videos.map(cleanVideoData);
    }
    return data;
  },

  async getById(id: string): Promise<EpornerVideo | null> {
    try {
      const { data } = await axios.get(`${BASE_URL}/id/`, {
        params: { id, format: "json" },
      });
      return (data && !Array.isArray(data) && data.id) ? cleanVideoData(data) : null;
    } catch {
      return null;
    }
  },

  async getRemoved(): Promise<string> {
    const { data } = await axios.get<string>(`${BASE_URL}/removed/`, {
      params: { format: "json" },
      responseType: "text",
    });
    return data;
  },
};


