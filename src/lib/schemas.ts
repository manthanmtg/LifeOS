import { z } from "zod";

// --- 1. PORTFOLIO & IDENTITY ---
export const SocialLinkSchema = z.object({
    platform: z.string().min(1, "Platform name is required (e.g., GitHub, LinkedIn)"),
    url: z.string().url("Must be a valid URL"),
});

export const PortfolioProfileSchema = z.object({
    full_name: z.string().min(1, "Full name is required").default("Life OS"),
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
        "Entertainment", "Tech/Recurring", "Health", "Other"
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

// --- 4. RECURRING EXPENSES ---
export const RecurringExpenseSchema = z.object({
    name: z.string().min(1, "Name is required"),
    cost: z.number().positive("Cost must be greater than 0"),
    currency: z.string().length(3).default("USD"),
    billing_cycle: z.enum(["monthly", "yearly", "weekly", "daily", "quarterly"]),
    next_renewal_date: z.string().datetime("Must be a valid ISO Date"),
    category: z.string().min(1, "Category is required"),
    url: z.string().url().optional(),
    is_active: z.boolean().default(true),
    enable_reminders: z.boolean().default(true),
    notes: z.string().optional(),
    order: z.number().optional(),
});

// --- 5. READING QUEUE ---
export const ReadingItemSchema = z.object({
    url: z.string().url("Must be a valid URL"),
    title: z.string().min(1, "Title is required"),
    source_domain: z.string().optional(),
    priority: z.enum(["high", "medium", "low"]).default("medium"),
    type: z.enum(["article", "paper", "video", "podcast"]).default("article"),
    is_read: z.boolean().default(false),
    read_at: z.string().datetime().optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).default([]),
});

// --- 6. BOOKSHELF ---
export const BookSchema = z.object({
    title: z.string().min(1, "Book title is required"),
    author: z.string().min(1, "Author is required"),
    isbn: z.string().optional(),
    cover_url: z.string().url().optional(),
    status: z.enum(["want_to_read", "reading", "completed", "abandoned"]).default("want_to_read"),
    total_pages: z.number().int().positive().optional(),
    current_page: z.number().int().min(0).default(0),
    rating: z.number().int().min(1).max(5).optional(),
    started_at: z.string().datetime().optional(),
    finished_at: z.string().datetime().optional(),
    summary: z.string().optional(),
    notes: z.string().optional(),
    tags: z.array(z.string()).default([]),
});

// --- 7. IDEA DUMP ---
export const IdeaSchema = z.object({
    title: z.string().min(1, "Idea title is required"),
    description: z.string().optional(),
    category: z.string().optional(),
    status: z.enum(["raw", "exploring", "archived"]).default("raw"),
    tags: z.array(z.string()).default([]),
    priority: z.enum(["high", "medium", "low"]).default("medium"),
    promoted_to_portfolio: z.boolean().default(false),
    promoted_at: z.string().datetime().optional(),
    order: z.number().optional(),
});

// --- 8. SNIPPET BOX ---
export const SnippetSchema = z.object({
    title: z.string().min(1, "Snippet title is required"),
    code: z.string().min(1, "Code content is required"),
    language: z.string().min(1, "Language is required"),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
    is_favorite: z.boolean().default(false),
});

// --- 9. HABIT TRACKER ---
export const HabitSchema = z.object({
    name: z.string().min(1, "Habit name is required"),
    description: z.string().optional(),
    frequency: z.enum(["daily", "weekly"]).default("daily"),
    target_count: z.number().int().positive().default(1),
    color: z.string().default("#10b981"),
    completions: z.array(z.object({
        date: z.string(),
        count: z.number().int().min(0).default(1),
    })).default([]),
});

// --- SCHEMA REGISTRY EXPORT ---
// --- 9. COMPASS (KANBAN) ---
export const CompassTaskSchema = z.object({
    title: z.string().min(1, "Task title is required"),
    status: z.enum(["backlog", "in_progress", "review", "done"]).default("backlog"),
    description: z.string().optional(),
    comments: z.array(z.object({
        text: z.string().min(1),
        created_at: z.string().datetime()
    })).default([]),
    checklist: z.array(z.object({
        id: z.string().uuid().default(() => crypto.randomUUID()),
        text: z.string().min(1),
        completed: z.boolean().default(false),
        description: z.string().optional(),
        comments: z.array(z.object({
            text: z.string().min(1),
            created_at: z.string().datetime()
        })).default([]),
    })).default([]),
    category_tags: z.array(z.string()).default([]),
    priority: z.enum(["p1", "p2", "p3", "p4", "p5"]).default("p3"),
    target_date: z.string().datetime().optional(),
    links: z.array(z.object({
        label: z.string().min(1),
        url: z.string().url("Must be a valid URL")
    })).default([]),
});

// --- 10. EMI TRACKER ---
export const EmiLoanSchema = z.object({
    title: z.string().min(1, "Loan title is required"),
    lender_name: z.string().min(1, "Bank / financier name is required").optional(),
    category: z.string().min(1, "Category is required").default("Loan"),
    currency: z.string().length(3).default("INR"),

    principal: z.number().positive("Loan amount must be greater than 0"),
    tenure_months: z.number().int().positive("Tenure (months) must be greater than 0"),

    interest_type: z.enum(["fixed", "floating"]).default("fixed"),
    annual_interest_rate: z.number().min(0, "Interest rate cannot be negative"),

    // Explicitly asked + stored (authoritative for schedule)
    monthly_emi: z.number().positive("Monthly EMI must be greater than 0"),

    processing_fee_amount: z.number().min(0).optional(),
    processing_fee_percent: z.number().min(0).optional(),
    processing_fee_financed: z.boolean().default(false),

    start_date: z.string().datetime("Must be a valid ISO date-time"),

    // Prefer due day for stable monthly generation (1–28 recommended)
    due_day_of_month: z.number().int().min(1).max(28).default(5),
    first_due_date: z.string().datetime().optional(),

    recast_strategy: z.enum(["keep_tenure_adjust_emi", "keep_emi_adjust_tenure"]).default("keep_tenure_adjust_emi"),
    rate_adjustments: z.array(z.object({
        effective_date: z.string().datetime("Must be a valid ISO date-time"),
        annual_interest_rate: z.number().min(0),
        note: z.string().optional(),
    })).default([]),

    payments: z.array(z.object({
        date: z.string().datetime("Must be a valid ISO date-time"),
        amount: z.number().positive(),
        kind: z.enum(["emi", "prepayment"]),
        note: z.string().optional(),
        receipt_url: z.string().url().optional(),
    })).default([]),

    documents: z.array(z.object({
        type: z.enum(["sanction_letter", "noc", "interest_certificate", "other"]).default("other"),
        title: z.string().min(1),
        url: z.string().url(),
        issued_at: z.string().datetime().optional(),
        added_at: z.string().datetime().default(() => new Date().toISOString()),
    })).default([]),

    status: z.enum(["active", "closed", "archived"]).default("active"),
    closed_at: z.string().datetime().optional(),
});

// --- 11. CROP HISTORY ---
export const CropHistorySchema = z.object({
    crop_id: z.string().min(1, "Crop ID is required"),
    schedule_period: z.string().min(1, "Schedule period is required"),
    // actual data records for each source { sourceId: { fieldId: value } }
    source_data: z.record(z.string(), z.record(z.string(), z.coerce.number().optional())).default({}),
    // summary user-entered data for the period { fieldId: value }
    summary_data: z.record(z.string(), z.coerce.number().optional()).default({}),
    notes: z.string().optional(),
});

// --- 13. TODO MODULE ---
export const TodoSchema = z.object({
    title: z.string().min(1, "Task title is required"),
    notes: z.string().optional(),
    due_date: z.string().datetime().optional(),
    completed: z.boolean().default(false),
    completed_at: z.string().datetime().optional(),
    order: z.number().int().optional(),
});

// --- 14. SHOPPING LIST MODULE ---
export const ShoppingItemSchema = z.object({
    id: z.string().uuid().or(z.string()),
    name: z.string().min(1, "Item name is required"),
    quantity: z.string().optional(),
    unit: z.string().optional(),
    purchased: z.boolean().default(false),
});

export const ShoppingListSchema = z.object({
    title: z.string().min(1, "List title is required"),
    items: z.array(ShoppingItemSchema).default([]),
    is_completed: z.boolean().default(false),
    completed_at: z.string().datetime().optional(),
    notes: z.string().optional(),
});

// --- 12. RAIN TRACKER ---
export const RainAreaSchema = z.object({
    name: z.string().min(1, "Area name is required"),
    location: z.string().optional(),
    description: z.string().optional(),
    is_active: z.boolean().default(true),
});

export const RainEntrySchema = z.object({
    area_id: z.string().min(1, "Area is required"),
    rainfall_amount: z.number().min(0, "Rainfall cannot be negative"),
    rainfall_unit: z.enum(["mm", "cm", "in"]).default("mm"),
    date: z.string().datetime("Must be a valid ISO date-time"),
    notes: z.string().optional(),
    source: z.string().optional(), // e.g., manual, sensor, imported
});

// --- 15. PORTFOLIO RESUME ---
export const ResumeSchema = z.object({
    filename: z.string().min(1, "Filename is required"),
    content: z.string().min(1, "Resume content is required"), // Base64 PDF data
    is_active: z.boolean().default(false),
    uploaded_at: z.string().datetime().default(() => new Date().toISOString()),
});

// --- 16. AI USAGE TRACKER ---
export const AiProviderConfigSchema = z.object({
    name: z.string().min(1, "Name is required"),
    provider: z.enum(["openai", "anthropic"]),
    admin_api_key: z.string().min(1, "Admin API key is required"),
    plan: z.string().optional(),
    monthly_budget: z.number().min(0).optional(),
    organization_name: z.string().optional(),
    is_active: z.boolean().default(true),
    last_synced_at: z.string().datetime().optional(),
});

export const AiUsageSchema = z.object({
    provider: z.enum([
        "openai", "anthropic", "google", "mistral", "cohere",
        "perplexity", "groq", "together", "fireworks", "deepseek", "xai", "other"
    ]),
    provider_config_id: z.string().optional(),
    model: z.string().min(1, "Model name is required"),
    input_tokens: z.number().int().min(0).default(0),
    output_tokens: z.number().int().min(0).default(0),
    cache_read_tokens: z.number().int().min(0).default(0),
    cache_write_tokens: z.number().int().min(0).default(0),
    num_requests: z.number().int().min(0).default(0),
    cost: z.number().min(0, "Cost cannot be negative"),
    currency: z.string().length(3).default("USD"),
    date: z.string().datetime("Must be a valid ISO date-time"),
    bucket_width: z.enum(["1d", "1h"]).default("1d"),
    api_key_label: z.string().optional(),
    session_label: z.string().optional(),
    notes: z.string().optional(),
    synced: z.boolean().default(false),
});

// --- 17. PERSONAL CRM (PEOPLE) ---
export const PersonSchema = z.object({
    name: z.string().min(1, "Name is required"),
    relationship: z.enum(["family", "friend", "colleague", "acquaintance", "mentor", "client", "other"]).default("friend"),
    phone: z.string().optional(),
    email: z.string().email().optional().or(z.literal("")),
    company: z.string().optional(),
    role: z.string().optional(),
    birthday: z.string().optional(), // YYYY-MM-DD
    avatar_url: z.string().url().optional().or(z.literal("")),
    interests: z.array(z.string()).default([]),
    tags: z.array(z.string()).default([]),
    notes: z.string().optional(),
    social_links: z.array(z.object({
        platform: z.string().min(1),
        url: z.string().url(),
    })).default([]),
    interactions: z.array(z.object({
        date: z.string(), // ISO date
        type: z.enum(["call", "meeting", "message", "email", "gift", "other"]).default("other"),
        note: z.string().optional(),
    })).default([]),
    last_contacted: z.string().optional(), // ISO date
    is_favorite: z.boolean().default(false),
});

// --- 18. VEHICLE MANAGER ---
export const VehicleSchema = z.object({
    name: z.string().min(1, "Vehicle name is required"),
    make: z.string().optional(),
    model: z.string().optional(),
    year: z.number().int().optional(),
    registration_number: z.string().optional(),
    color: z.string().optional(),
    fuel_type: z.enum(["petrol", "diesel", "electric", "hybrid", "cng", "lpg", "other"]).default("petrol"),
    odometer_reading: z.number().min(0).default(0),
    odometer_unit: z.enum(["km", "mi"]).default("km"),
    insurance_expiry: z.string().optional(), // ISO date
    pollution_certificate_expiry: z.string().optional(), // ISO date
    next_service_due: z.string().optional(), // ISO date
    next_service_odometer: z.number().optional(),
    service_records: z.array(z.object({
        id: z.string().default(() => crypto.randomUUID()),
        date: z.string(), // ISO date
        type: z.enum(["routine", "repair", "inspection", "tire", "oil_change", "brake", "battery", "wash", "other"]).default("routine"),
        description: z.string().min(1),
        odometer: z.number().optional(),
        cost: z.number().min(0).optional(),
        currency: z.string().length(3).default("INR"),
        garage: z.string().optional(),
        notes: z.string().optional(),
    })).default([]),
    fuel_logs: z.array(z.object({
        id: z.string().default(() => crypto.randomUUID()),
        date: z.string(),
        quantity: z.number().positive(),
        fuel_unit: z.enum(["liters", "gallons"]).default("liters"),
        cost: z.number().min(0),
        currency: z.string().length(3).default("INR"),
        odometer: z.number().optional(),
        full_tank: z.boolean().default(true),
        station: z.string().optional(),
    })).default([]),
    documents: z.array(z.object({
        id: z.string().default(() => crypto.randomUUID()),
        type: z.enum(["insurance", "registration", "pollution", "license", "warranty", "other"]).default("other"),
        title: z.string().min(1),
        expiry_date: z.string().optional(),
        notes: z.string().optional(),
    })).default([]),
    notes: z.string().optional(),
});

// --- 19. MAINTENANCE LOG ---
export const MaintenanceTaskSchema = z.object({
    name: z.string().min(1, "Task name is required"),
    description: z.string().optional(),
    category: z.enum([
        "home", "appliance", "vehicle", "electronics", "plumbing",
        "electrical", "hvac", "garden", "cleaning", "insurance", "subscription", "other"
    ]).default("home"),
    frequency_months: z.number().int().positive().optional(), // recurring interval
    last_completed: z.string().optional(), // ISO date
    next_due: z.string().optional(), // ISO date
    estimated_cost: z.number().min(0).optional(),
    currency: z.string().length(3).default("INR"),
    priority: z.enum(["high", "medium", "low"]).default("medium"),
    status: z.enum(["upcoming", "overdue", "completed", "skipped"]).default("upcoming"),
    is_recurring: z.boolean().default(true),
    reminder_enabled: z.boolean().default(true),
    history: z.array(z.object({
        id: z.string().default(() => crypto.randomUUID()),
        completed_at: z.string(), // ISO date
        cost: z.number().min(0).optional(),
        notes: z.string().optional(),
        vendor: z.string().optional(),
    })).default([]),
    tags: z.array(z.string()).default([]),
    notes: z.string().optional(),
});

// --- 21. WHITEBOARD ---
export const WhiteboardNoteSchema = z.object({
    name: z.string().min(1, "Whiteboard name is required"),
    description: z.string().optional(),
    tags: z.array(z.string()).default([]),
    is_favorite: z.boolean().default(false),
    color_label: z.enum(["none", "red", "blue", "green", "yellow", "purple", "orange"]).default("none"),
    elements: z.any().default([]),
    app_state: z.any().default({}),
    files: z.any().default({}),
});

// --- 20. HEALTH PROFILES ---
export const HealthProfileSchema = z.object({
    name: z.string().min(1, "Name is required"),
    type: z.enum(["self", "family", "pet"]).default("self"),
    relation: z.string().optional(),
    date_of_birth: z.string().optional(),
    blood_group: z.enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"]).default("unknown"),
    gender: z.enum(["male", "female", "other"]).optional(),
    avatar_url: z.string().optional(),
    emergency_contact: z.string().optional(),
    insurance_info: z.string().optional(),
    allergies: z.array(z.string()).default([]),
    conditions: z.array(z.object({
        id: z.string(),
        name: z.string().min(1),
        diagnosed_date: z.string().optional(),
        status: z.enum(["active", "managed", "resolved"]).default("active"),
        notes: z.string().optional(),
    })).default([]),
    medications: z.array(z.object({
        id: z.string(),
        name: z.string().min(1),
        dosage: z.string().optional(),
        prescribed_by: z.string().optional(),
        start_date: z.string().optional(),
        end_date: z.string().optional(),
        refill_date: z.string().optional(),
        status: z.enum(["active", "completed", "discontinued"]).default("active"),
        notes: z.string().optional(),
    })).default([]),
    vaccinations: z.array(z.object({
        id: z.string(),
        name: z.string().min(1),
        date_administered: z.string(),
        next_due: z.string().optional(),
        provider: z.string().optional(),
        batch_number: z.string().optional(),
        notes: z.string().optional(),
    })).default([]),
    visits: z.array(z.object({
        id: z.string(),
        date: z.string(),
        type: z.enum(["checkup", "consultation", "emergency", "surgery", "lab_test", "follow_up", "dental", "eye", "other"]).default("checkup"),
        doctor: z.string().optional(),
        facility: z.string().optional(),
        diagnosis: z.string().optional(),
        prescription: z.string().optional(),
        cost: z.number().min(0).optional(),
        currency: z.string().length(3).default("INR"),
        notes: z.string().optional(),
    })).default([]),
    lab_results: z.array(z.object({
        id: z.string(),
        date: z.string(),
        test_name: z.string().min(1),
        value: z.string(),
        unit: z.string().optional(),
        reference_range: z.string().optional(),
        status: z.enum(["normal", "borderline", "abnormal"]).default("normal"),
        notes: z.string().optional(),
    })).default([]),
    measurements: z.array(z.object({
        id: z.string(),
        date: z.string(),
        height_cm: z.number().positive().optional(),
        weight_kg: z.number().positive().optional(),
        notes: z.string().optional(),
    })).default([]),
    documents: z.array(z.object({
        id: z.string(),
        type: z.enum(["prescription", "bill", "lab_report", "discharge_summary", "insurance", "imaging", "other"]).default("other"),
        title: z.string().min(1),
        date: z.string().optional(),
        notes: z.string().optional(),
    })).default([]),
    notes: z.string().optional(),
    tags: z.array(z.string()).default([]),
});

// --- 22. DECKS ---
export const DeckSchema = z.object({
    title: z.string().min(1, "Deck title is required"),
    description: z.string().optional(),
    format: z.enum(["html", "pdf", "pptx", "google_slides", "reveal_js", "url"]).default("url"),
    visibility: z.enum(["public", "private", "link_only"]).default("private"),
    tags: z.array(z.string()).default([]),
    author: z.string().optional(),
    topic: z.string().optional(),
    folder: z.string().optional(),
    deck_url: z.string().optional(),
    file_name: z.string().optional(),
    file_size: z.number().optional(),
    thumbnail_url: z.string().optional(),
    embed_enabled: z.boolean().default(false),
});

export const SchemaRegistry: Record<string, z.ZodTypeAny> = {
    expense: ExpenseSchema,
    blog_post: BlogPostSchema,
    portfolio_profile: PortfolioProfileSchema,
    recurring_expense: RecurringExpenseSchema,
    reading_item: ReadingItemSchema,
    book: BookSchema,
    idea: IdeaSchema,
    snippet: SnippetSchema,
    habit: HabitSchema,
    compass_task: CompassTaskSchema,
    emi_loan: EmiLoanSchema,
    crop_history: CropHistorySchema,
    rain_area: RainAreaSchema,
    rain_entry: RainEntrySchema,
    todo: TodoSchema,
    shopping_list: ShoppingListSchema,
    portfolio_resume: ResumeSchema,
    ai_usage: AiUsageSchema,
    person: PersonSchema,
    vehicle: VehicleSchema,
    maintenance_task: MaintenanceTaskSchema,
    health_profile: HealthProfileSchema,
    whiteboard_note: WhiteboardNoteSchema,
    deck: DeckSchema,
};
