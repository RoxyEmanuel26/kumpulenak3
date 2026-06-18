import axios from "axios";
import { EpornerSearchResponse, EpornerVideo, EpornerRemovedResponse } from "../../types/eporner";

const BASE_URL = "https://www.eporner.com/api/v2/video";

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
      params: { format: "json", per_page: 100, order: "latest", ...params },
    });
    return data;
  },

  async getById(id: string): Promise<EpornerVideo | null> {
    try {
      const { data } = await axios.get(`${BASE_URL}/id/`, {
        params: { id, format: "json" },
      });
      return data?.vid ? data.vid : null;
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

