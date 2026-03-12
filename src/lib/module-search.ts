import type { AdminModuleItem } from "@/lib/admin-modules";

export interface MatchRange {
    start: number;
    end: number;
}

export interface ModuleSearchResult {
    item: AdminModuleItem;
    score: number;
    nameMatches: MatchRange[];
    descriptionMatches: MatchRange[];
    matchedTags: Array<{ tag: string; matches: MatchRange[] }>;
}

function normalize(value: string) {
    return value.trim().toLowerCase();
}

function toTokens(query: string) {
    return normalize(query).split(/\s+/).filter(Boolean);
}

function findSubstringRanges(value: string, token: string) {
    if (!token) {
        return [];
    }

    const lowerValue = value.toLowerCase();
    const ranges: MatchRange[] = [];
    let startIndex = 0;

    while (startIndex < lowerValue.length) {
        const matchIndex = lowerValue.indexOf(token, startIndex);
        if (matchIndex === -1) {
            break;
        }

        ranges.push({ start: matchIndex, end: matchIndex + token.length });
        startIndex = matchIndex + token.length;
    }

    return ranges;
}

function isSubsequenceMatch(value: string, token: string) {
    let tokenIndex = 0;

    for (const char of value) {
        if (char === token[tokenIndex]) {
            tokenIndex += 1;
            if (tokenIndex === token.length) {
                return true;
            }
        }
    }

    return false;
}

function scoreField(value: string, token: string, weight: number) {
    const normalizedValue = normalize(value);
    if (!normalizedValue) {
        return null;
    }

    if (normalizedValue === token) {
        return weight * 12;
    }

    if (normalizedValue.startsWith(token)) {
        return weight * 9;
    }

    if (normalizedValue.includes(` ${token}`)) {
        return weight * 7;
    }

    if (normalizedValue.includes(token)) {
        return weight * 5;
    }

    if (isSubsequenceMatch(normalizedValue, token)) {
        return weight * 2;
    }

    return null;
}

function mergeRanges(ranges: MatchRange[]) {
    if (ranges.length <= 1) {
        return ranges;
    }

    const sorted = [...ranges].sort((a, b) => a.start - b.start);
    const merged: MatchRange[] = [sorted[0]];

    for (const range of sorted.slice(1)) {
        const previous = merged[merged.length - 1];
        if (range.start <= previous.end) {
            previous.end = Math.max(previous.end, range.end);
            continue;
        }

        merged.push({ ...range });
    }

    return merged;
}

export function getModuleSearchResults(modules: AdminModuleItem[], query: string) {
    const tokens = toTokens(query);

    if (tokens.length === 0) {
        return modules.map((item, index) => ({
            item,
            score: modules.length - index,
            nameMatches: [],
            descriptionMatches: [],
            matchedTags: [],
        }));
    }

    return modules
        .map((item) => {
            let totalScore = 0;
            const nameMatches: MatchRange[] = [];
            const descriptionMatches: MatchRange[] = [];
            const tagMatchMap = new Map<string, MatchRange[]>();

            for (const token of tokens) {
                const nameScore = scoreField(item.name, token, 5);
                const descriptionScore = scoreField(item.description, token, 3);
                const slugScore = scoreField(item.key.replace(/-/g, " "), token, 2);
                const tagScores = item.tags
                    .map((tag) => ({ tag, score: scoreField(tag, token, 4) }))
                    .filter((entry) => entry.score !== null) as Array<{ tag: string; score: number }>;

                const bestScore = Math.max(
                    nameScore ?? 0,
                    descriptionScore ?? 0,
                    slugScore ?? 0,
                    ...tagScores.map((entry) => entry.score)
                );

                if (bestScore <= 0) {
                    return null;
                }

                totalScore += bestScore;
                nameMatches.push(...findSubstringRanges(item.name, token));
                descriptionMatches.push(...findSubstringRanges(item.description, token));

                for (const { tag } of tagScores) {
                    const matches = tagMatchMap.get(tag) || [];
                    matches.push(...findSubstringRanges(tag, token));
                    tagMatchMap.set(tag, matches);
                }
            }

            return {
                item,
                score: totalScore,
                nameMatches: mergeRanges(nameMatches),
                descriptionMatches: mergeRanges(descriptionMatches),
                matchedTags: Array.from(tagMatchMap.entries()).map(([tag, matches]) => ({
                    tag,
                    matches: mergeRanges(matches),
                })),
            };
        })
        .filter((result): result is ModuleSearchResult => result !== null)
        .sort((a, b) => b.score - a.score || a.item.name.localeCompare(b.item.name));
}

export function highlightText(value: string, ranges: MatchRange[]) {
    if (ranges.length === 0) {
        return [{ text: value, highlighted: false }];
    }

    const parts: Array<{ text: string; highlighted: boolean }> = [];
    let cursor = 0;

    for (const range of ranges) {
        if (cursor < range.start) {
            parts.push({ text: value.slice(cursor, range.start), highlighted: false });
        }

        parts.push({ text: value.slice(range.start, range.end), highlighted: true });
        cursor = range.end;
    }

    if (cursor < value.length) {
        parts.push({ text: value.slice(cursor), highlighted: false });
    }

    return parts.filter((part) => part.text.length > 0);
}
