import { z } from "zod";

// --- 1. PORTFOLIO & IDENTITY ---
export const SocialLinkSchema = z.object({
    platform: z.string().min(1, "Platform name is required (e.g., GitHub, LinkedIn)"),
    url: z.string().url("Must be a valid URL"),
});

export const PortfolioProfileSchema = z.object({
    hero_title: z.string().min(3, "Title must be at least 3 characters"),
    sub_headline: z.string().optional(),
    bio: z.string().max(1000, "Bio is getting too long! Keep it under 1000 characters."),
    skills: z.array(z.string()),
    social_links: z.array(SocialLinkSchema),
    available_for_hire: z.boolean().default(false),
});

// --- 2. EXPENSE TRACKER ---
export const ExpenseSchema = z.object({
    amount: z.number().positive("Amount must be greater than 0"),
    currency: z.string().length(3).default("USD"),
    description: z.string().min(2, "Please provide a brief description"),
    category: z.enum([
        "Housing", "Food", "Transportation", "Utilities",
        "Entertainment", "Tech/Subscriptions", "Health", "Other"
    ]),
    date: z.string().datetime("Must be a valid ISO Date string"),
    is_recurring: z.boolean().default(false),
    receipt_url: z.string().url().optional(),
});

// --- 3. BLOG POSTS ---
export const BlogPostSchema = z.object({
    title: z.string().min(3, "Post title is required"),
    slug: z.string().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be URL-friendly"),
    content: z.string().min(1, "Post cannot be empty"),
    status: z.enum(["draft", "published", "archived"]).default("draft"),
    published_at: z.string().datetime().optional(),
    tags: z.array(z.string()).default([]),
    cover_image_url: z.string().url().optional(),
    estimated_reading_time: z.number().int().optional(),
    seo_description: z.string().max(160, "SEO description limit is 160 characters").optional(),
});

// --- SCHEMA REGISTRY EXPORT ---
export const SchemaRegistry: Record<string, z.ZodType> = {
    expense: ExpenseSchema,
    blog_post: BlogPostSchema,
    portfolio_profile: PortfolioProfileSchema,
};
