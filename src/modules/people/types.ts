export const RELATIONSHIPS = [
  "family",
  "friend",
  "colleague",
  "acquaintance",
  "mentor",
  "client",
  "other",
] as const;

export type Relationship = (typeof RELATIONSHIPS)[number];

export const INTERACTION_TYPES = [
  "call",
  "meeting",
  "message",
  "email",
  "gift",
  "other",
] as const;

export type InteractionType = (typeof INTERACTION_TYPES)[number];

export interface SocialLink {
  platform: string;
  url: string;
}

export interface Interaction {
  date: string;
  type: InteractionType;
  note?: string;
}

export interface PersonPayload {
  name: string;
  relationship: Relationship;
  phone?: string;
  email?: string;
  company?: string;
  role?: string;
  birthday?: string;
  avatar_url?: string;
  interests: string[];
  tags: string[];
  notes?: string;
  social_links: SocialLink[];
  interactions: Interaction[];
  last_contacted?: string;
  is_favorite: boolean;
}

export interface Person {
  _id: string;
  created_at: string;
  updated_at: string;
  payload: PersonPayload;
}
