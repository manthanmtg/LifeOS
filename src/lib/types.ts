import { ObjectId } from "mongodb";

export interface SystemConfig {
    _id: "global";
    site_title: string;
    active_theme: string;
    bio: string;
    moduleRegistry: Record<string, { enabled: boolean; isPublic: boolean }>;
}

export interface ContentDocument<T = any> {
    _id?: ObjectId;
    module_type: "expense" | "blog_post" | "portfolio_profile" | string;
    is_public: boolean;
    created_at: string; // ISO String
    updated_at: string; // ISO String
    payload: T;
}

export interface MetricEvent {
    _id?: ObjectId;
    path: string;
    referrer: string;
    device_type: "mobile" | "tablet" | "desktop" | "unknown";
    timestamp: string; // ISO String
}
