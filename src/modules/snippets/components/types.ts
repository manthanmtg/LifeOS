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

export function getSnippetStats(
  snippets: Snippet[],
  referenceTime: number,
): SnippetStats {
  const total = snippets.length;
  const weekAgo = referenceTime - 7 * 24 * 60 * 60 * 1000;
  const languages = new Set<string>();
  const tags = new Set<string>();
  let favorites = 0;
  let totalLines = 0;
  let recentCount = 0;

  for (const snippet of snippets) {
    languages.add(snippet.payload.language);
    totalLines += snippet.payload.code.split("\n").length;

    if (snippet.payload.is_favorite) {
      favorites += 1;
    }

    if (Date.parse(snippet.created_at) >= weekAgo) {
      recentCount += 1;
    }

    for (const tag of snippet.payload.tags) {
      tags.add(tag);
    }
  }

  return {
    total,
    favorites,
    languages: languages.size,
    averageLength: total > 0 ? Math.round(totalLines / total) : 0,
    recentCount,
    tagCount: tags.size,
  };
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
] as const;

export const SNIPPET_DEFAULTS: SnippetSettings = {
  defaultLanguage: "javascript",
  languages: [...LANGUAGES],
  showLineNumbers: false,
};

/**
 * Formats an ISO date string to a localized date string.
 * Memoize calls to this if used in a large list.
 */
export function formatDate(iso: string): string {
  if (!iso) return "";
  try {
    const date = new Date(iso);
    if (isNaN(date.getTime())) return "";
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    }).format(date);
  } catch {
    return "";
  }
}

/**
 * Prepends line numbers to a code block.
 */
export function withLineNumbers(code: string): string {
  if (!code) return "";
  const lines = code.split("\n");
  const maxDigits = Math.max(2, String(lines.length).length);
  return lines
    .map((line, index) => {
      const lineNum = String(index + 1).padStart(maxDigits, "0");
      return `<span class="text-zinc-600 select-none mr-4">${lineNum}</span>${line}`;
    })
    .join("\n");
}

/**
 * Very basic syntax highlighter using regex.
 * Not meant to be perfect, just adds some color.
 */
export function highlightCode(code: string): string {
  if (!code) return "";

  let highlighted = code
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

  const rules: { regex: RegExp; className: string }[] = [
    // Comments
    { regex: /(\/\/.*$|\/\*[\s\S]*?\*\/|#.*$)/gm, className: "text-zinc-500" },
    // Strings
    { regex: /(["'])(?:(?=(\\?))\2.)*?\1/g, className: "text-success" },
    // Keywords
    {
      regex:
        /\b(const|let|var|function|return|if|else|for|while|switch|case|break|continue|import|export|from|extends|new|this|async|await|try|catch|finally|throw|default|interface|type|enum|public|private|protected|static|readonly|void|any|unknown|never|boolean|string|number|object|symbol|bigint)\b/g,
      className: "text-accent",
    },
    // Booleans and null
    {
      regex: /\b(true|false|null|undefined)\b/g,
      className: "text-warning",
    },
    // Functions
    { regex: /\b([a-zA-Z_][a-zA-Z0-9_]*)(?=\s*\()/g, className: "text-accent" },
    // Numbers
    { regex: /\b(\d+)\b/g, className: "text-warning" },
  ];

  rules.forEach((rule) => {
    highlighted = highlighted.replace(
      rule.regex,
      (match) => `<span class="${rule.className}">${match}</span>`,
    );
  });

  return highlighted;
}
