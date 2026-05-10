export interface DeckItem {
  _id: string;
  created_at: string;
  updated_at?: string;
  is_public: boolean;
  payload: {
    title: string;
    description?: string;
    format: "html" | "pdf" | "pptx" | "google_slides" | "reveal_js" | "url";
    visibility: "public" | "private" | "link_only";
    tags: string[];
    author?: string;
    topic?: string;
    folder?: string;
    deck_url?: string;
    file_name?: string;
    file_size?: number;
    thumbnail_url?: string;
    embed_enabled: boolean;
  };
}

export const FORMATS = [
  "html",
  "pdf",
  "pptx",
  "google_slides",
  "reveal_js",
  "url",
] as const;
export const VISIBILITIES = ["public", "private", "link_only"] as const;

export const FORMAT_LABELS: Record<string, string> = {
  html: "HTML",
  pdf: "PDF",
  pptx: "PowerPoint",
  google_slides: "Google Slides",
  reveal_js: "Reveal.js",
  url: "URL",
};

export const FORMAT_STYLES: Record<string, string> = {
  html: "bg-warning/15 text-warning border-warning/25",
  pdf: "bg-danger/15 text-danger border-danger/25",
  pptx: "bg-accent/15 text-accent border-accent/25",
  google_slides: "bg-success/15 text-success border-success/25",
  reveal_js: "bg-accent/15 text-accent border-accent/25",
  url: "bg-success/15 text-success border-success/25",
};

export const VISIBILITY_LABELS: Record<string, string> = {
  public: "Public",
  private: "Private",
  link_only: "Link Only",
};

export const VISIBILITY_STYLES: Record<string, string> = {
  public: "bg-success/15 text-success border-success/25",
  private: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
  link_only: "bg-warning/15 text-warning border-warning/25",
};
