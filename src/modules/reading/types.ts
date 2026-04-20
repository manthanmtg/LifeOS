export type ReadingType = "article" | "paper" | "video" | "podcast" | string;
export type Priority = "high" | "medium" | "low";

export interface ReadingPayload {
  url: string;
  title: string;
  source_domain?: string;
  priority: Priority;
  type: ReadingType;
  is_read: boolean;
  notes?: string;
  read_at?: string;
  tags?: string[];
}

export interface ReadingItem {
  _id: string;
  created_at: string;
  payload: ReadingPayload;
}

export type ReadingSettings = {
  defaultPriority: Priority;
  defaultType: ReadingType;
  types: ReadingType[];
};

export const READING_DEFAULTS: ReadingSettings = {
  defaultPriority: "medium",
  defaultType: "article",
  types: ["article", "paper", "video", "podcast"],
};
