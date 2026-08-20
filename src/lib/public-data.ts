import "server-only";

import { cache } from "react";
import { moduleRegistry } from "@/registry";
import { getDb } from "@/lib/mongodb";
import type { SystemConfig } from "@/lib/types";
import type { SocialLink } from "@/components/shell/footer-links";
import type { PortfolioProfile } from "@/modules/portfolio/PortfolioShowcase";
import type { BlogPost } from "@/modules/blog/types";

export interface PublicModuleLink {
  slug: string;
  name: string;
}

type PublicSystemConfig = Pick<SystemConfig, "moduleRegistry" | "moduleOrder">;

export interface PublicSiteData {
  userName: string;
  publicModules: PublicModuleLink[];
  socialLinks: SocialLink[];
  profile: PortfolioProfile | null;
  resumeAvailable: boolean;
}

interface RawBlogDoc {
  _id: unknown;
  created_at?: string;
  updated_at?: string;
  payload?: {
    title?: string;
    slug?: string;
    content?: string;
    status?: string;
    published_at?: string;
    tags?: string[];
    estimated_reading_time?: number;
    seo_description?: string;
    cover_image_url?: string;
  };
}

export function getPublicModuleLinks(
  config: Partial<PublicSystemConfig> | null | undefined,
): PublicModuleLink[] {
  const visibility = config?.moduleRegistry || {};
  const order = config?.moduleOrder || [];
  const orderIndex = new Map(order.map((slug, index) => [slug, index]));

  return Object.entries(moduleRegistry)
    .filter(([slug, module]) => {
      const setting = visibility[slug];
      return setting
        ? setting.enabled && setting.isPublic
        : module.defaultPublic;
    })
    .sort(([slugA], [slugB]) => {
      const indexA = orderIndex.get(slugA);
      const indexB = orderIndex.get(slugB);
      if (indexA === undefined && indexB === undefined) return 0;
      if (indexA === undefined) return 1;
      if (indexB === undefined) return -1;
      return indexA - indexB;
    })
    .map(([slug, module]) => ({ slug, name: module.name }));
}

export function serializePublicContent(
  document: Record<string, unknown>,
): Record<string, unknown> {
  const serialized = JSON.parse(JSON.stringify(document)) as Record<
    string,
    unknown
  >;
  serialized._id = String(document._id ?? "");
  return serialized;
}

export function toBlogPost(doc: RawBlogDoc): BlogPost {
  const status = doc.payload?.status;
  return {
    _id: String(doc._id),
    payload: {
      title: doc.payload?.title || "",
      slug: doc.payload?.slug || "",
      content: doc.payload?.content || "",
      status:
        status === "published" || status === "archived" ? status : "draft",
      published_at: doc.payload?.published_at,
      tags: Array.isArray(doc.payload?.tags) ? doc.payload.tags : [],
      estimated_reading_time: doc.payload?.estimated_reading_time,
      seo_description: doc.payload?.seo_description,
      cover_image_url: doc.payload?.cover_image_url,
    },
    created_at: doc.created_at || new Date(0).toISOString(),
    updated_at: doc.updated_at,
  };
}

async function loadPublicSiteData(): Promise<PublicSiteData> {
  const fallback: PublicSiteData = {
    userName: "Life OS",
    publicModules: getPublicModuleLinks(null),
    socialLinks: [],
    profile: null,
    resumeAvailable: false,
  };

  try {
    const db = await getDb();
    const [system, profileDocument, resumeDocument] = await Promise.all([
      db.collection<SystemConfig>("system").findOne({ _id: "global" }),
      db.collection("content").findOne({
        module_type: "portfolio_profile",
        is_public: true,
      }),
      db.collection("content").findOne(
        {
          module_type: "portfolio_resume",
          is_public: true,
          "payload.is_active": true,
        },
        { projection: { _id: 1 } },
      ),
    ]);

    const profile = profileDocument?.payload
      ? (JSON.parse(
          JSON.stringify(profileDocument.payload),
        ) as PortfolioProfile)
      : null;
    const socialLinks = Array.isArray(profile?.social_links)
      ? profile.social_links.filter(
          (link): link is SocialLink =>
            typeof link?.platform === "string" && typeof link?.url === "string",
        )
      : [];

    return {
      userName: profile?.full_name?.trim() || "Life OS",
      publicModules: getPublicModuleLinks(
        system as Partial<PublicSystemConfig> | null,
      ),
      socialLinks,
      profile,
      resumeAvailable: Boolean(resumeDocument),
    };
  } catch (error) {
    console.error("Failed to load public site data", error);
    return fallback;
  }
}

export const getPublicSiteData = cache(loadPublicSiteData);

async function loadPublicContent(contentType: string) {
  try {
    const db = await getDb();
    const documents = await db
      .collection("content")
      .find({ module_type: contentType, is_public: true })
      .sort({ created_at: -1 })
      .toArray();
    return documents.map((document) =>
      serializePublicContent(document as unknown as Record<string, unknown>),
    );
  } catch (error) {
    console.error(`Failed to load public ${contentType} content`, error);
    return [];
  }
}

export const getPublicContent = cache(loadPublicContent);

async function loadPublishedBlogPosts(): Promise<BlogPost[]> {
  try {
    const db = await getDb();
    const documents = await db
      .collection("content")
      .find({
        module_type: "blog_post",
        is_public: true,
        "payload.status": "published",
      })
      .sort({ "payload.published_at": -1, created_at: -1 })
      .toArray();
    return documents.map((document) => toBlogPost(document as RawBlogDoc));
  } catch (error) {
    console.error("Failed to load published blog posts", error);
    return [];
  }
}

export const getPublishedBlogPosts = cache(loadPublishedBlogPosts);

async function loadPublishedBlogPost(slug: string) {
  try {
    const db = await getDb();
    const [document, relatedDocuments] = await Promise.all([
      db.collection("content").findOne({
        module_type: "blog_post",
        is_public: true,
        "payload.slug": slug,
        "payload.status": "published",
      }),
      db
        .collection("content")
        .find({
          module_type: "blog_post",
          is_public: true,
          "payload.status": "published",
          "payload.slug": { $ne: slug },
        })
        .sort({ "payload.published_at": -1, created_at: -1 })
        .limit(3)
        .toArray(),
    ]);

    return {
      post: document ? toBlogPost(document as RawBlogDoc) : null,
      relatedPosts: relatedDocuments.map((item) =>
        toBlogPost(item as RawBlogDoc),
      ),
    };
  } catch (error) {
    console.error(`Failed to load published blog post ${slug}`, error);
    return { post: null, relatedPosts: [] as BlogPost[] };
  }
}

export const getPublishedBlogPost = cache(loadPublishedBlogPost);
