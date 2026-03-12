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

export const FORMATS = ["html", "pdf", "pptx", "google_slides", "reveal_js", "url"] as const;
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
    html: "bg-orange-500/15 text-orange-300 border-orange-500/25",
    pdf: "bg-red-500/15 text-red-300 border-red-500/25",
    pptx: "bg-blue-500/15 text-blue-300 border-blue-500/25",
    google_slides: "bg-green-500/15 text-green-300 border-green-500/25",
    reveal_js: "bg-purple-500/15 text-purple-300 border-purple-500/25",
    url: "bg-cyan-500/15 text-cyan-300 border-cyan-500/25",
};

export const VISIBILITY_LABELS: Record<string, string> = {
    public: "Public",
    private: "Private",
    link_only: "Link Only",
};

export const VISIBILITY_STYLES: Record<string, string> = {
    public: "bg-green-500/15 text-green-300 border-green-500/25",
    private: "bg-zinc-500/15 text-zinc-400 border-zinc-500/25",
    link_only: "bg-yellow-500/15 text-yellow-300 border-yellow-500/25",
};
