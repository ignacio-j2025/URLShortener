export interface Link {
  id: number;
  slug: string;
  targetUrl: string;
  shortUrl: string;
  totalClicks?: number;
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

// Internal DB row shapes
export interface LinkRow {
  id: number;
  slug: string;
  target_url: string;
  created_at: string;
  total_clicks?: number;
}

export interface ClickRow {
  id: number;
  link_id: number;
  clicked_at: string;
  user_agent: string | null;
}

export interface DailyClickRow {
  day: string;
  clicks: number;
}
