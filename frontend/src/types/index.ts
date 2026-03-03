export interface Link {
  id: number;
  slug: string;
  targetUrl: string;
  shortUrl: string;
  totalClicks: number;
  createdAt: string;
}

export interface ClicksByDay {
  date: string;
  clicks: number;
}

export interface AnalyticsData {
  slug: string;
  targetUrl: string;
  totalClicks: number;
  clicksByDay: ClicksByDay[];
}

export interface PaginatedLinks {
  items: Link[];
  total: number;
  page: number;
  limit: number;
}

export interface CreateLinkRequest {
  targetUrl: string;
  slug?: string;
}

export interface ApiError {
  code: string;
  message: string | Record<string, string[]>;
}
