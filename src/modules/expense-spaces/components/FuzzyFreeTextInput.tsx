"use client";

import { useId, useState } from "react";
import { History, Plus } from "lucide-react";

const MAX_VISIBLE_SUGGESTIONS = 6;

function normalize(value: string) {
  return value
    .normalize("NFKD")
    .replace(/\p{Diacritic}/gu, "")
    .trim()
    .replace(/\s+/g, " ")
    .toLocaleLowerCase("en-US");
}

function subsequenceScore(candidate: string, query: string) {
  let candidateIndex = 0;
  let firstMatch = -1;
  let lastMatch = -1;

  for (const character of query) {
    const matchIndex = candidate.indexOf(character, candidateIndex);
    if (matchIndex === -1) return null;
    if (firstMatch === -1) firstMatch = matchIndex;
    lastMatch = matchIndex;
    candidateIndex = matchIndex + 1;
  }

  return firstMatch + (lastMatch - firstMatch - query.length + 1);
}

function tokenScore(candidate: string, query: string) {
  if (candidate === query) return 0;
  if (candidate.startsWith(query)) return 10 + candidate.length - query.length;
  const substringIndex = candidate.indexOf(query);
  if (substringIndex >= 0) return 30 + substringIndex;
  const sequence = subsequenceScore(candidate, query);
  return sequence === null ? null : 60 + sequence;
}

function fuzzyScore(candidate: string, query: string) {
  if (!query) return 0;
  const directScore = tokenScore(candidate, query);
  const candidateWords = candidate.split(" ");
  const queryWords = query.split(" ");
  let wordScore = 0;

  for (const queryWord of queryWords) {
    const scores = candidateWords
      .map((candidateWord) => tokenScore(candidateWord, queryWord))
      .filter((score): score is number => score !== null);
    if (scores.length === 0) return directScore;
    wordScore += Math.min(...scores);
  }

  return directScore === null ? wordScore : Math.min(directScore, wordScore);
}

export function rankFuzzySuggestions(
  suggestions: string[],
  query: string,
  excluded: string[] = [],
) {
  const normalizedQuery = normalize(query);
  const excludedValues = new Set(excluded.map(normalize));
  const seen = new Set<string>();

  return suggestions
    .flatMap((suggestion, originalIndex) => {
      const key = normalize(suggestion);
      if (!key || seen.has(key) || excludedValues.has(key)) return [];
      seen.add(key);
      const score = fuzzyScore(key, normalizedQuery);
      return score === null ? [] : [{ suggestion, score, originalIndex }];
    })
    .sort(
      (left, right) =>
        left.score - right.score || left.originalIndex - right.originalIndex,
    )
    .slice(0, MAX_VISIBLE_SUGGESTIONS)
    .map(({ suggestion }) => suggestion);
}

interface Props {
  id: string;
  label: string;
  value: string;
  suggestions: string[];
  onChange: (value: string) => void;
  className: string;
  maxLength?: number;
  placeholder?: string;
  describedBy?: string;
  tagMode?: boolean;
}

function getTagContext(value: string) {
  const lastComma = value.lastIndexOf(",");
  const prefix = lastComma >= 0 ? value.slice(0, lastComma + 1) : "";
  const query = value.slice(lastComma + 1).trimStart();
  const previousTags = (lastComma >= 0 ? value.slice(0, lastComma) : "")
    .split(",")
    .map((tag) => tag.trim())
    .filter(Boolean);

  return { prefix, query, previousTags };
}

export default function FuzzyFreeTextInput({
  id,
  label,
  value,
  suggestions,
  onChange,
  className,
  maxLength,
  placeholder,
  describedBy,
  tagMode = false,
}: Props) {
  const generatedId = useId().replace(/:/g, "");
  const listboxId = `${id}-${generatedId}-suggestions`;
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const tagContext = getTagContext(value);
  const query = tagMode ? tagContext.query : value;
  const excluded = tagMode ? tagContext.previousTags : [];
  const matches = rankFuzzySuggestions(suggestions, query, excluded);
  const normalizedQuery = normalize(query);
  const hasExactMatch = matches.some(
    (suggestion) => normalize(suggestion) === normalizedQuery,
  );
  const newValue = query.trim();
  const showNewValue = Boolean(newValue) && !hasExactMatch;
  const options = [
    ...matches.map((suggestion) => ({ kind: "existing" as const, suggestion })),
    ...(showNewValue ? [{ kind: "new" as const, suggestion: newValue }] : []),
  ];
  const showListbox = open && options.length > 0;

  const choose = (suggestion: string) => {
    if (tagMode) {
      const separator =
        tagContext.prefix && !tagContext.prefix.endsWith(" ") ? " " : "";
      onChange(`${tagContext.prefix}${separator}${suggestion}`);
    } else {
      onChange(suggestion);
    }
    setOpen(false);
    setActiveIndex(-1);
  };

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      if (options.length === 0) return;
      event.preventDefault();
      setOpen(true);
      setActiveIndex((current) => {
        if (event.key === "ArrowDown") {
          return current >= options.length - 1 ? 0 : current + 1;
        }
        return current <= 0 ? options.length - 1 : current - 1;
      });
      return;
    }
    if (event.key === "Enter" && showListbox && activeIndex >= 0) {
      event.preventDefault();
      choose(options[activeIndex].suggestion);
      return;
    }
    if (event.key === "Escape") {
      setOpen(false);
      setActiveIndex(-1);
    }
  };

  return (
    <div className="relative">
      <input
        id={id}
        aria-label={label}
        aria-autocomplete="list"
        aria-controls={listboxId}
        aria-describedby={describedBy}
        aria-expanded={showListbox}
        aria-activedescendant={
          showListbox && activeIndex >= 0
            ? `${listboxId}-option-${activeIndex}`
            : undefined
        }
        role="combobox"
        autoComplete="off"
        value={value}
        maxLength={maxLength}
        placeholder={placeholder}
        onChange={(event) => {
          onChange(event.target.value);
          setOpen(true);
          setActiveIndex(-1);
        }}
        onFocus={() => setOpen(true)}
        onBlur={() => {
          setOpen(false);
          setActiveIndex(-1);
        }}
        onKeyDown={handleKeyDown}
        className={className}
      />

      {showListbox && (
        <div
          id={listboxId}
          role="listbox"
          aria-label="Previous values from this Expense Space"
          className={`absolute z-30 max-h-64 w-full overflow-y-auto rounded-xl border border-zinc-700 bg-zinc-950 p-1.5 shadow-2xl ${
            tagMode ? "bottom-full mb-2" : "mt-2"
          }`}
        >
          {matches.length > 0 && (
            <p className="px-3 pb-1.5 pt-2 text-xs font-bold uppercase tracking-[0.16em] text-zinc-500">
              Used in this Expense Space
            </p>
          )}
          {options.map((option, index) => (
            <button
              id={`${listboxId}-option-${index}`}
              key={`${option.kind}-${option.suggestion}`}
              type="button"
              role="option"
              aria-label={
                option.kind === "new"
                  ? `${option.suggestion}, use new`
                  : option.suggestion
              }
              aria-selected={activeIndex === index}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => setActiveIndex(index)}
              onClick={() => choose(option.suggestion)}
              className={`flex min-h-11 w-full items-center gap-2 rounded-lg px-3 py-2 text-left text-sm transition-colors ${
                activeIndex === index
                  ? "bg-zinc-800 text-zinc-50"
                  : "text-zinc-300 hover:bg-zinc-900 hover:text-zinc-50"
              } ${option.kind === "new" ? "border-t border-zinc-800" : ""}`}
            >
              {option.kind === "new" ? (
                <Plus
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-accent"
                />
              ) : (
                <History
                  aria-hidden="true"
                  className="h-4 w-4 shrink-0 text-zinc-500"
                />
              )}
              <span className="min-w-0 truncate">{option.suggestion}</span>
              {option.kind === "new" && (
                <span className="ml-auto shrink-0 text-xs text-zinc-500">
                  Use new
                </span>
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
