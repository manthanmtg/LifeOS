export interface ModuleConfig {
    name: string;
    icon: string;
    defaultPublic: boolean;
    contentType: string; // The module_type used in the content collection
    description: string;
    tags: string[];
}

export const moduleRegistry: Record<string, ModuleConfig> = {
    portfolio: { name: "Portfolio", icon: "User", defaultPublic: true, contentType: "portfolio_profile", description: "Profile, skills, bio, and public links.", tags: ["profile", "about", "links", "public"] },
    blog: { name: "Blog", icon: "FileText", defaultPublic: true, contentType: "blog_post", description: "Posts, drafts, publishing, and long-form writing.", tags: ["writing", "posts", "content", "public"] },
    expenses: { name: "Expenses", icon: "DollarSign", defaultPublic: false, contentType: "expense", description: "Track spending, categories, and day-to-day costs.", tags: ["money", "finance", "budget", "spending"] },
    "recurring-expenses": { name: "Recurring Expenses", icon: "CreditCard", defaultPublic: false, contentType: "recurring_expense", description: "Subscriptions, bills, and repeating monthly charges.", tags: ["subscriptions", "bills", "monthly", "finance"] },
    "emi-tracker": { name: "EMI Tracker", icon: "Calculator", defaultPublic: false, contentType: "emi_loan", description: "Manage loans, EMIs, payoff schedules, and balances.", tags: ["loan", "emi", "debt", "payments"] },
    calculators: { name: "Calculators", icon: "Calculator", defaultPublic: false, contentType: "calculator_profile", description: "Quick access to personal finance and utility calculators.", tags: ["math", "tools", "finance", "utility"] },
    reading: { name: "Reading", icon: "BookOpen", defaultPublic: false, contentType: "reading_item", description: "Reading queue for articles, papers, videos, and podcasts.", tags: ["queue", "learning", "articles", "media"] },
    bookshelf: { name: "Bookshelf", icon: "Library", defaultPublic: false, contentType: "book", description: "Books read, reading progress, and future reading list.", tags: ["books", "library", "reading", "tracking"] },
    ideas: { name: "Ideas", icon: "Lightbulb", defaultPublic: false, contentType: "idea", description: "Capture ideas, concepts, and rough explorations.", tags: ["brainstorm", "notes", "concepts", "creative"] },
    snippets: { name: "Snippets", icon: "Code", defaultPublic: false, contentType: "snippet", description: "Reusable code snippets and technical references.", tags: ["code", "dev", "reference", "programming"] },
    habits: { name: "Habits", icon: "Target", defaultPublic: false, contentType: "habit", description: "Track routines, streaks, and habit consistency.", tags: ["routine", "streaks", "tracking", "self"] },
    analytics: { name: "Analytics", icon: "BarChart3", defaultPublic: false, contentType: "metric", description: "Site metrics, usage patterns, and performance insights.", tags: ["metrics", "traffic", "reports", "insights"] },
    compass: { name: "Compass", icon: "Map", defaultPublic: false, contentType: "compass_task", description: "Project navigation, current focus, and directional planning.", tags: ["planning", "focus", "projects", "navigation"] },
    "crop-history": { name: "Crop History", icon: "Wheat", defaultPublic: false, contentType: "crop_history", description: "Farm records, crop cycles, and seasonal history.", tags: ["agriculture", "farm", "records", "seasonal"] },
    "rain-tracker": { name: "Rain Tracker", icon: "CloudRain", defaultPublic: false, contentType: "rain_area", description: "Monitor rainfall across areas and track precipitation patterns.", tags: ["weather", "rain", "areas", "monitoring"] },
    todo: { name: "Todo", icon: "CheckSquare", defaultPublic: false, contentType: "todo", description: "Task capture, prioritization, and completion flow.", tags: ["tasks", "checklist", "productivity", "planning"] },
    "shopping-list": { name: "Shopping List", icon: "ShoppingBag", defaultPublic: false, contentType: "shopping_list", description: "Shared or personal purchase lists and item tracking.", tags: ["groceries", "purchases", "list", "planning"] },
    "ai-usage": { name: "AI Usage", icon: "Bot", defaultPublic: false, contentType: "ai_usage", description: "Track model usage, provider costs, and dashboard links.", tags: ["ai", "llm", "tokens", "providers"] },
    people: { name: "People", icon: "Users", defaultPublic: false, contentType: "person", description: "Personal CRM for contacts, relationships, and notes.", tags: ["contacts", "crm", "relationships", "network"] },
    vehicle: { name: "Vehicle", icon: "Car", defaultPublic: false, contentType: "vehicle", description: "Vehicle details, service tracking, and ownership records.", tags: ["car", "service", "maintenance", "transport"] },
    maintenance: { name: "Maintenance", icon: "Wrench", defaultPublic: false, contentType: "maintenance_task", description: "Maintenance schedules, repair tasks, and service reminders.", tags: ["repairs", "service", "upkeep", "tasks"] },
    health: { name: "Health", icon: "HeartPulse", defaultPublic: false, contentType: "health_profile", description: "Health data, profiles, and wellness-related tracking.", tags: ["wellness", "medical", "fitness", "tracking"] },
    whiteboard: { name: "Whiteboard", icon: "PenLine", defaultPublic: false, contentType: "whiteboard_note", description: "Freeform notes, sketches, and visual thinking space.", tags: ["draw", "sketch", "notes", "canvas"] },
    binge: { name: "Binge", icon: "Tv", defaultPublic: false, contentType: "binge_item", description: "Track shows, movies, watchlists, and viewing progress.", tags: ["tv", "movies", "watchlist", "entertainment"] },
    slides: { name: "Slides", icon: "Presentation", defaultPublic: false, contentType: "deck", description: "Create, preview, and manage presentation decks.", tags: ["presentations", "decks", "talks", "slides"] },
};
