// Internal DB row shapes
export interface LinkRow {
  id: number;
  slug: string;
  target_url: string;
  created_at: string;
  total_clicks?: number;
}

export interface DailyClickRow {
  day: string;
  clicks: number;
}
