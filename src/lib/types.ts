import { ObjectId } from "mongodb";

export interface SystemConfig {
  _id: "global";
  site_title: string;
  site_icon?: string;
  active_theme: string;
  color_mode?: "light" | "dark";
  bio: string;
  moduleRegistry: Record<string, { enabled: boolean; isPublic: boolean }>;
  widgetRegistry?: Record<string, boolean>;
  moduleOrder?: string[];
  orderingStrategy?: "custom" | "name" | "visits";
  visitSortScope?: "admin" | "public" | "all";
  tieredVisits?: Record<
    string,
    {
      admin: [number, number, number, number];
      public: [number, number, number, number];
    }
  >;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  [key: string]: any; // Allow for module-specific settings (e.g., expenseSettings)
}

export interface BlogPostPayload {
  title: string;
  slug: string;
  content: string;
  status: "draft" | "published" | "archived";
  published_at?: string;
  tags?: string[];
  cover_image_url?: string;
  estimated_reading_time?: number;
  seo_description?: string;
  description?: string;
}

export interface ContentDocument<T = unknown> {
  _id?: ObjectId;
  module_type:
    | "expense"
    | "blog_post"
    | "portfolio_profile"
    | "portfolio_resume"
    | string;
  is_public: boolean;
  created_at: string; // ISO String
  updated_at: string; // ISO String
  payload: T;
}

export interface MetricEvent {
  _id?: ObjectId;
  path: string;
  referrer: string;
  device_type: "mobile" | "tablet" | "desktop" | "unknown";
  timestamp: string; // ISO String
}
