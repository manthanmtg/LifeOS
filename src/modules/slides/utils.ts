import type { DeckItem } from "./types";

/**
 * Decode base64 string to UTF-8 text.
 * atob() only handles ASCII, so we need to properly decode UTF-8 bytes.
 */
const decodeBase64Utf8 = (base64: string): string => {
    const binaryString = atob(base64);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
        bytes[i] = binaryString.charCodeAt(i);
    }
    return new TextDecoder("utf-8").decode(bytes);
};

/**
 * Helper to determine the iframe src or srcDoc for a deck item.
 */
export const getIframeSrc = (deck: DeckItem) => {
    if (!deck.payload.deck_url) return null;
    if (deck.payload.format === "html" && deck.payload.deck_url.startsWith("data:")) {
        try {
            const base64Content = deck.payload.deck_url.split(",")[1];
            return { type: "srcDoc", value: decodeBase64Utf8(base64Content) };
        } catch (e) {
            console.error("Failed to decode base64 HTML", e);
            return null;
        }
    }
    return { type: "src", value: deck.payload.deck_url };
};
