export type PostStatus = "draft" | "published" | "archived";
export type StatusFilter = "all" | PostStatus;
export type ViewMode = "split" | "write" | "preview";

export interface BlogPayload {
  title: string;
  slug: string;
  content: string;
  status: PostStatus;
  published_at?: string;
  tags: string[];
  estimated_reading_time?: number;
  seo_description?: string;
  cover_image_url?: string;
}

export interface BlogPost {
  _id: string;
  payload: BlogPayload;
  created_at: string;
  updated_at?: string;
}

export interface BlogHeading {
  id: string;
  text: string;
  level: 2 | 3;
}

export interface EditorDraft {
  title: string;
  slug: string;
  content: string;
  status: PostStatus;
  tagsInput: string;
  seoDesc: string;
  coverImageUrl: string;
  publishedAt?: string;
}

export interface BlogAdminStats {
  published: number;
  drafts: number;
  archived: number;
}

export interface BlogSummary {
  total: number;
  published: number;
  drafts: number;
  archived: number;
  totalReadMinutes: number;
  latestPublishedPost: {
    title: string;
    readingTime: number;
  } | null;
}
