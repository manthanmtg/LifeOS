import type { DeckItem } from "./types";

/**
 * Helper to determine the iframe src or srcDoc for a deck item.
 */
export const getIframeSrc = (deck: DeckItem) => {
    if (!deck.payload.deck_url) return null;
    if (deck.payload.format === "html" && deck.payload.deck_url.startsWith("data:")) {
        try {
            const base64Content = deck.payload.deck_url.split(",")[1];
            return { type: "srcDoc", value: atob(base64Content) };
        } catch (e) {
            console.error("Failed to decode base64 HTML", e);
            return null;
        }
    }
    return { type: "src", value: deck.payload.deck_url };
};
