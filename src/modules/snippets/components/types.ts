export interface Snippet {
  _id: string;
  created_at: string;
  payload: {
    title: string;
    code: string;
    language: string;
    description?: string;
    tags: string[];
    is_favorite: boolean;
  };
}

export interface SnippetSettings extends Record<string, unknown> {
  defaultLanguage: string;
  languages: string[];
  showLineNumbers: boolean;
}

export interface SnippetStats {
  total: number;
  favorites: number;
  languages: number;
  averageLength: number;
  recentCount: number;
  tagCount: number;
}

export const LANGUAGES = [
  "javascript",
  "typescript",
  "python",
  "rust",
  "go",
  "java",
  "c",
  "cpp",
  "html",
  "css",
  "sql",
  "bash",
  "json",
  "yaml",
  "markdown",
  "other",
];

export const SNIPPET_DEFAULTS: SnippetSettings = {
  defaultLanguage: "javascript",
  languages: LANGUAGES,
  showLineNumbers: false,
};

export function formatDate(iso: string): string {
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "";
  return date.toLocaleDateString();
}

export function withLineNumbers(code: string): string {
  return code
    .split("\n")
    .map((line, index) => `${String(index + 1).padStart(2, "0")}  ${line}`)
    .join("\n");
}

export function getLanguageColor(lang: string): string {
  const colors: Record<string, string> = {
    javascript: "text-yellow-400",
    typescript: "text-blue-400",
    python: "text-green-400",
    rust: "text-orange-400",
    go: "text-cyan-400",
    java: "text-red-400",
    c: "text-gray-400",
    cpp: "text-pink-400",
    html: "text-orange-300",
    css: "text-blue-300",
    sql: "text-emerald-400",
    bash: "text-lime-400",
    json: "text-amber-300",
    yaml: "text-purple-400",
    markdown: "text-zinc-300",
  };
  return colors[lang] || "text-zinc-400";
}
