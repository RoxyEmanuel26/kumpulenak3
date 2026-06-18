export interface EpornerVideo {
  id: string;
  title: string;
  keywords: string;
  views: number;
  rate: string;
  url: string;
  added: string;
  length_sec: number;
  length_min: string;
  embed: string;
  default_thumb: {
    size: string;
    width: number;
    height: number;
    src: string;
  };
  thumbs: Array<{
    size: string;
    width: number;
    height: number;
    src: string;
  }>;
}

export interface EpornerSearchResponse {
  time_ms: number;
  total_count: number;
  total_pages: number;
  per_page: number;
  current_page: number;
  videos: EpornerVideo[];
}

