import { z } from "zod";

const CalendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);

    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }, "Must be a valid calendar date");

const CurrencyCodeSchema = z
  .string()
  .trim()
  .regex(/^[A-Z]{3}$/, "Currency must be a 3-letter ISO code");

const ObjectIdStringSchema = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, "Must be a valid ObjectId");

const MimeTypeSchema = z
  .string()
  .trim()
  .min(1, "Content type is required")
  .max(100, "Content type is too long")
  .regex(
    /^[a-z0-9!#$&^_.+-]+\/[a-z0-9!#$&^_.+-]+$/i,
    "Must be a valid MIME type",
  );

const AppThemeSchema = z.enum([
  "one-dark",
  "dracula",
  "github-dark",
  "night-owl",
  "solarized-dark",
  "material-dark",
  "monokai",
  "cyberpunk",
  "aurora",
  "ocean-dark",
  "sunset",
  "coffee",
  "minimal-light",
  "nordic-light",
]);

const IsoCalendarDateOrDateTimeSchema = z.union([
  CalendarDateSchema,
  z.string().datetime("Must be a valid ISO date-time"),
]);

const DeckUrlMaxLength = 14 * 1024 * 1024;

// --- 1. PORTFOLIO & IDENTITY ---
const SocialLinkSchema = z.object({
  platform: z
    .string()
    .trim()
    .min(1, "Platform name is required (e.g., GitHub, LinkedIn)")
    .max(50),
  url: z.string().url("Must be a valid URL").max(500),
});

const PortfolioProfileSchema = z.object({
  full_name: z
    .string()
    .trim()
    .min(1, "Full name is required")
    .max(100)
    .default("Life OS"),
  hero_title: z
    .string()
    .trim()
    .min(3, "Title must be at least 3 characters")
    .max(200),
  sub_headline: z.string().trim().min(1).max(500).optional(),
  bio: z
    .string()
    .trim()
    .min(1)
    .max(1000, "Bio is getting too long! Keep it under 1000 characters."),
  skills: z.array(z.string().trim().min(1).max(50)).max(100),
  social_links: z.array(SocialLinkSchema),
  available_for_hire: z.boolean().default(false),
});

// --- 2. EXPENSE TRACKER ---
export const ExpenseSchema = z.object({
  amount: z.number().positive("Amount must be greater than 0"),
  currency: CurrencyCodeSchema.default("USD"),
  description: z
    .string()
    .trim()
    .min(2, "Please provide a brief description")
    .max(200),
  merchant: z.string().trim().max(100).optional(),
  account: z
    .enum([
      "Cash",
      "Debit Card",
      "Credit Card",
      "Bank Transfer",
      "UPI",
      "Other",
    ])
    .default("UPI"),
  category: z.string().trim().min(1, "Category is required").max(80),
  subcategory: z.string().trim().max(80).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  date: z.string().datetime("Must be a valid ISO Date string"),
  type: z.enum(["income", "expense"]).default("expense"),
  is_recurring: z.boolean().default(false),
  receipt_url: z
    .string()
    .trim()
    .url("Must be a valid URL")
    .max(2048, "Receipt URL is too long")
    .optional(),
});

// --- 3. BLOG POSTS ---
const BlogPostSchema = z.object({
  title: z.string().trim().min(3, "Post title is required").max(200),
  slug: z
    .string()
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, "Slug must be URL-friendly")
    .max(200),
  content: z.string().min(1, "Post cannot be empty").max(1000000),
  status: z.enum(["draft", "published", "archived"]).default("draft"),
  published_at: z.string().datetime().optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  cover_image_url: z.string().trim().url().max(2048).optional(),
  estimated_reading_time: z
    .number()
    .int()
    .min(1, "Estimated reading time must be at least 1 minute")
    .max(600, "Estimated reading time is unrealistically high")
    .optional(),
  seo_description: z
    .string()
    .trim()
    .max(160, "SEO description limit is 160 characters")
    .optional(),
});

// --- 4. RECURRING EXPENSES ---
export const RecurringExpenseSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  cost: z.number().positive("Cost must be greater than 0"),
  currency: CurrencyCodeSchema.default("USD"),
  billing_cycle: z.enum(["monthly", "yearly", "weekly", "daily", "quarterly"]),
  next_renewal_date: z.string().datetime("Must be a valid ISO Date"),
  category: z.string().trim().min(1, "Category is required").max(100),
  url: z
    .string()
    .trim()
    .url("Must be a valid URL")
    .max(2048, "Expense URL is too long")
    .optional(),
  is_active: z.boolean().default(true),
  enable_reminders: z.boolean().default(true),
  notes: z.string().trim().max(2000).optional(),
  order: z.number().optional(),
});

// --- 5. READING QUEUE ---
const ReadingItemSchema = z.object({
  url: z.string().trim().url("Must be a valid URL").max(2048),
  title: z.string().trim().min(1, "Title is required").max(500),
  source_domain: z.string().trim().min(1).max(200).optional(),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  type: z.string().trim().min(1).max(50).default("article"),
  is_read: z.boolean().default(false),
  read_at: z.string().datetime().optional(),
  notes: z.string().trim().max(5000).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
});

// --- 6. BOOKSHELF ---
const BookSchema = z.object({
  title: z.string().trim().min(1, "Book title is required").max(300),
  author: z.string().trim().min(1, "Author is required").max(200),
  isbn: z.string().trim().max(20).optional(),
  cover_url: z.string().trim().url().max(2048).optional(),
  status: z
    .enum(["want_to_read", "reading", "completed", "abandoned"])
    .default("want_to_read"),
  total_pages: z.number().int().positive().optional(),
  current_page: z.number().int().min(0).default(0),
  rating: z.number().int().min(1).max(5).optional(),
  started_at: z.string().datetime().optional(),
  finished_at: z.string().datetime().optional(),
  summary: z.string().trim().max(5000).optional(),
  notes: z.string().trim().max(5000).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
});

// --- 7. IDEA DUMP ---
export const IdeaSchema = z.object({
  title: z.string().trim().min(1, "Idea title is required").max(200),
  description: z.string().trim().min(1).max(1000).optional(),
  notes: z.string().trim().min(1).max(5000).optional(),
  category: z.string().trim().min(1).max(50).optional(),
  status: z.enum(["raw", "exploring", "archived"]).default("raw"),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  promoted_to_portfolio: z.boolean().default(false),
  promoted_at: z.string().datetime().optional(),
  order: z.number().int().optional(),
});

// --- 8. SNIPPET BOX ---
export const SnippetSchema = z.object({
  title: z.string().trim().min(1, "Snippet title is required").max(200),
  code: z.string().min(1, "Code content is required").max(100000),
  language: z.string().trim().min(1, "Language is required").max(50),
  description: z.string().trim().max(1000).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  is_favorite: z.boolean().default(false),
});

// --- 9. HABIT TRACKER ---
const HabitSchema = z.object({
  name: z.string().trim().min(1, "Habit name is required").max(100),
  description: z.string().trim().max(500).optional(),
  frequency: z.enum(["daily", "weekly"]).default("daily"),
  target_count: z.number().int().positive().default(1),
  color: z
    .string()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color code")
    .default("#10b981"),
  completions: z
    .array(
      z.object({
        date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD"),
        count: z.number().int().min(0).default(1),
      }),
    )
    .default([]),
});

// --- SCHEMA REGISTRY EXPORT ---
// --- 9. COMPASS (KANBAN) ---
const CompassCommentSchema = z.object({
  text: z.string().trim().min(1).max(2000),
  created_at: z.string().datetime(),
});

export const CompassTaskSchema = z.object({
  title: z.string().trim().min(1, "Task title is required").max(200),
  status: z
    .enum(["backlog", "in_progress", "review", "done"])
    .default("backlog"),
  description: z.string().trim().max(2000).optional(),
  comments: z.array(CompassCommentSchema).default([]),
  checklist: z
    .array(
      z.object({
        id: z
          .string()
          .uuid()
          .default(() => crypto.randomUUID()),
        text: z.string().trim().min(1).max(200),
        completed: z.boolean().default(false),
        description: z.string().trim().max(2000).optional(),
        comments: z.array(CompassCommentSchema).default([]),
      }),
    )
    .default([]),
  category_tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  priority: z.enum(["p1", "p2", "p3", "p4", "p5"]).default("p3"),
  target_date: z.string().datetime().optional(),
  links: z
    .array(
      z.object({
        label: z.string().trim().min(1).max(100),
        url: z.string().url("Must be a valid URL").max(500),
      }),
    )
    .default([]),
});

// --- 10. EMI TRACKER ---
export const EmiLoanSchema = z.object({
  title: z.string().trim().min(1, "Loan title is required").max(200),
  lender_name: z
    .string()
    .trim()
    .min(1, "Bank / financier name is required")
    .max(200)
    .optional(),
  category: z
    .string()
    .trim()
    .min(1, "Category is required")
    .max(100)
    .default("Loan"),
  currency: CurrencyCodeSchema.default("INR"),

  principal: z.number().positive("Loan amount must be greater than 0"),
  tenure_months: z
    .number()
    .int()
    .positive("Tenure (months) must be greater than 0"),

  interest_type: z.enum(["fixed", "floating"]).default("fixed"),
  annual_interest_rate: z.number().min(0, "Interest rate cannot be negative"),

  // Explicitly asked + stored (authoritative for schedule)
  monthly_emi: z.number().positive("Monthly EMI must be greater than 0"),

  processing_fee_amount: z.number().min(0).optional(),
  processing_fee_percent: z
    .number()
    .min(0, "Processing fee percent cannot be negative")
    .max(100, "Processing fee percent cannot exceed 100")
    .optional(),
  processing_fee_financed: z.boolean().default(false),

  start_date: z.string().datetime("Must be a valid ISO date-time"),

  // Prefer due day for stable monthly generation (1–28 recommended)
  due_day_of_month: z.number().int().min(1).max(28).default(5),
  first_due_date: z.string().datetime().optional(),

  recast_strategy: z
    .enum(["keep_tenure_adjust_emi", "keep_emi_adjust_tenure"])
    .default("keep_tenure_adjust_emi"),
  rate_adjustments: z
    .array(
      z.object({
        effective_date: z.string().datetime("Must be a valid ISO date-time"),
        annual_interest_rate: z.number().min(0),
        note: z.string().trim().max(2000).optional(),
      }),
    )
    .default([]),

  payments: z
    .array(
      z.object({
        date: z.string().datetime("Must be a valid ISO date-time"),
        amount: z.number().positive(),
        kind: z.enum(["emi", "prepayment"]),
        note: z.string().trim().max(2000).optional(),
        receipt_url: z.string().url().optional(),
      }),
    )
    .default([]),

  documents: z
    .array(
      z.object({
        type: z
          .enum(["sanction_letter", "noc", "interest_certificate", "other"])
          .default("other"),
        title: z.string().trim().min(1).max(200),
        url: z.string().url(),
        issued_at: z.string().datetime().optional(),
        added_at: z
          .string()
          .datetime()
          .default(() => new Date().toISOString()),
      }),
    )
    .default([]),

  status: z.enum(["active", "closed", "archived"]).default("active"),
  closed_at: z.string().datetime().optional(),
});

// --- 11. CROP HISTORY ---
const CropHistorySchema = z.object({
  crop_id: z.string().trim().min(1, "Crop ID is required").max(100),
  schedule_period: z
    .string()
    .trim()
    .min(1, "Schedule period is required")
    .max(100),
  // actual data records for each source { sourceId: { fieldId: value } }
  source_data: z
    .record(z.string(), z.record(z.string(), z.coerce.number().optional()))
    .default({}),
  // summary user-entered data for the period { fieldId: value }
  summary_data: z.record(z.string(), z.coerce.number().optional()).default({}),
  notes: z.string().trim().max(2000).optional(),
});

const TodoSchema = z.object({
  title: z.string().trim().min(1, "Task title is required").max(200),
  notes: z.string().trim().max(2000).optional(),
  due_date: z.string().datetime().optional(),
  completed: z.boolean().default(false),
  completed_at: z.string().datetime().optional(),
  order: z.number().int().min(0).optional(),
});

// --- 14. SHOPPING LIST MODULE ---
const ShoppingItemSchema = z.object({
  id: z.string().trim().min(1).max(100),
  name: z.string().trim().min(1, "Item name is required").max(100),
  quantity: z.string().trim().max(50).optional(),
  unit: z.string().trim().max(20).optional(),
  purchased: z.boolean().default(false),
});

export const ShoppingListSchema = z.object({
  title: z.string().trim().min(1, "List title is required").max(200),
  items: z.array(ShoppingItemSchema).default([]),
  is_completed: z.boolean().default(false),
  completed_at: z.string().datetime().optional(),
  notes: z.string().trim().max(2000).optional(),
});

// --- 12. RAIN TRACKER ---
const RainAreaSchema = z.object({
  name: z.string().trim().min(1, "Area name is required").max(100),
  location: z.string().trim().max(200).optional(),
  description: z.string().trim().max(1000).optional(),
  is_active: z.boolean().default(true),
});

export const RainEntrySchema = z.object({
  area_id: z.string().trim().min(1, "Area is required").max(100),
  rainfall_amount: z.number().min(0, "Rainfall cannot be negative"),
  rainfall_unit: z.enum(["mm", "cm", "in"]).default("mm"),
  date: z.string().datetime("Must be a valid ISO date-time"),
  notes: z.string().trim().max(2000).optional(),
  source: z
    .enum(["manual", "sensor", "imported"])
    .default("manual")
    .optional(),
});

// --- 15. PORTFOLIO RESUME ---
const ResumeSchema = z.object({
  filename: z.string().trim().min(1, "Filename is required").max(255),
  content: z.string().min(1, "Resume content is required").max(10485760), // Base64 PDF data, 10MB limit
  is_active: z.boolean().default(false),
  uploaded_at: z
    .string()
    .datetime()
    .default(() => new Date().toISOString()),
});

// --- 16. AI USAGE TRACKER ---
export const AiProviderConfigSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  provider: z.enum(["openai", "anthropic"]),
  admin_api_key: z.string().trim().min(1, "Admin API key is required").max(500),
  plan: z.string().trim().max(100).optional(),
  monthly_budget: z.number().min(0).optional(),
  organization_name: z.string().trim().max(200).optional(),
  is_active: z.boolean().default(true),
  last_synced_at: z.string().datetime().optional(),
});

export const AiUsageSchema = z.object({
  provider: z.enum([
    "openai",
    "anthropic",
    "google",
    "mistral",
    "cohere",
    "perplexity",
    "groq",
    "together",
    "fireworks",
    "deepseek",
    "xai",
    "other",
  ]),
  provider_config_id: ObjectIdStringSchema.optional(),
  model: z.string().trim().min(1, "Model name is required").max(100),
  input_tokens: z.number().int().min(0).default(0),
  output_tokens: z.number().int().min(0).default(0),
  cache_read_tokens: z.number().int().min(0).default(0),
  cache_write_tokens: z.number().int().min(0).default(0),
  num_requests: z.number().int().min(0).default(0),
  cost: z.number().min(0, "Cost cannot be negative"),
  currency: CurrencyCodeSchema.default("USD"),
  date: z.string().datetime("Must be a valid ISO date-time"),
  bucket_width: z.enum(["1d", "1h"]).default("1d"),
  api_key_label: z.string().trim().max(100).optional(),
  session_label: z.string().trim().max(100).optional(),
  notes: z.string().trim().max(2000).optional(),
  synced: z.boolean().default(false),
});

// --- 17. PERSONAL CRM (PEOPLE) ---
export const PersonSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  relationship: z
    .enum([
      "family",
      "friend",
      "colleague",
      "acquaintance",
      "mentor",
      "client",
      "other",
    ])
    .default("friend"),
  phone: z
    .string()
    .trim()
    .min(7, "Phone number must be at least 7 characters")
    .regex(
      /^\+?[0-9][0-9\s().-]{5,49}$/,
      "Phone number can only contain digits, spaces, parentheses, and dashes",
    )
    .max(50)
    .optional(),
  email: z
    .string()
    .trim()
    .email("Must be a valid email")
    .max(320, "Email is too long")
    .optional()
    .or(z.literal("")),
  company: z.string().trim().max(100).optional(),
  role: z.string().trim().max(100).optional(),
  birthday: CalendarDateSchema.optional(),
  avatar_url: z
    .string()
    .trim()
    .url("Must be a valid URL")
    .max(2048, "Avatar URL is too long")
    .optional()
    .or(z.literal("")),
  profile_pic: z
    .object({
      data: z.string().trim().min(1, "Profile picture data is required"),
      content_type: MimeTypeSchema,
    })
    .optional(),
  interests: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  notes: z.string().trim().max(5000).optional(),
  social_links: z
    .array(
      z.object({
        platform: z.string().trim().min(1).max(50),
        url: z.string().url().max(500),
      }),
    )
    .default([]),
  interactions: z
    .array(
      z.object({
        date: CalendarDateSchema,
        type: z
          .enum([
            "call",
            "meeting",
            "in_person",
            "message",
            "email",
            "gift",
            "other",
          ])
          .default("other"),
        note: z.string().trim().max(2000).optional(),
      }),
    )
    .default([]),
  last_contacted: CalendarDateSchema.optional(),
  is_favorite: z.boolean().default(false),
  documents: z
    .array(
      z.object({
        id: z
          .string()
          .trim()
          .min(1, "Document id is required")
          .max(100),
        name: z.string().trim().min(1, "Document name is required").max(200),
        filename: z
          .string()
          .trim()
          .min(1, "Filename is required")
          .max(255),
        content_type: MimeTypeSchema,
        data: z.string().min(1), // base64
        size: z.number().int().min(0),
        added_at: z
          .string()
          .datetime()
          .default(() => new Date().toISOString()),
      }),
    )
    .default([]),
});

// --- 18. VEHICLE MANAGER ---
export const VehicleSchema = z.object({
  name: z.string().trim().min(1, "Vehicle name is required").max(100),
  make: z.string().trim().max(100).optional(),
  model: z.string().trim().max(100).optional(),
  year: z
    .number()
    .int()
    .min(1886, "Year must be 1886 or later")
    .max(new Date().getFullYear() + 1, "Year cannot be too far in the future")
    .optional(),
  registration_number: z.string().trim().max(50).optional(),
  color: z.string().trim().max(50).optional(),
  fuel_type: z
    .enum(["petrol", "diesel", "electric", "hybrid", "cng", "lpg", "other"])
    .default("petrol"),
  odometer_reading: z.number().min(0).default(0),
  odometer_unit: z.enum(["km", "mi"]).default("km"),
  insurance_expiry: z.string().datetime().optional(),
  pollution_certificate_expiry: z.string().datetime().optional(),
  next_service_due: z.string().datetime().optional(),
  next_service_odometer: z.number().min(0).optional(),
  service_records: z
    .array(
      z.object({
        id: z
          .string()
          .trim()
          .min(1)
          .max(100)
          .default(() => crypto.randomUUID()),
        date: z.string().datetime("Must be a valid ISO date-time"),
        type: z
          .enum([
            "routine",
            "repair",
            "inspection",
            "tire",
            "oil_change",
            "brake",
            "battery",
            "wash",
            "other",
          ])
          .default("routine"),
        description: z.string().trim().min(1).max(500),
        odometer: z.number().min(0).optional(),
        cost: z.number().min(0).optional(),
        currency: CurrencyCodeSchema.default("INR"),
        garage: z.string().trim().max(200).optional(),
        notes: z.string().trim().max(2000).optional(),
      }),
    )
    .default([]),
  fuel_logs: z
    .array(
      z.object({
        id: z
          .string()
          .trim()
          .min(1)
          .max(100)
          .default(() => crypto.randomUUID()),
        date: z.string().datetime("Must be a valid ISO date-time"),
        quantity: z.number().positive(),
        fuel_unit: z.enum(["liters", "gallons"]).default("liters"),
        cost: z.number().min(0),
        currency: CurrencyCodeSchema.default("INR"),
        odometer: z.number().min(0).optional(),
        full_tank: z.boolean().default(true),
        station: z.string().trim().max(200).optional(),
      }),
    )
    .default([]),
  documents: z
    .array(
      z.object({
        id: z
          .string()
          .trim()
          .min(1)
          .max(100)
          .default(() => crypto.randomUUID()),
        type: z
          .enum([
            "insurance",
            "registration",
            "pollution",
            "license",
            "warranty",
            "other",
          ])
          .default("other"),
        title: z.string().trim().min(1).max(200),
        expiry_date: z.string().datetime().optional(),
        notes: z.string().trim().max(2000).optional(),
      }),
    )
    .default([]),
  notes: z.string().trim().max(5000).optional(),
});

// --- 19. MAINTENANCE LOG ---
export const MaintenanceTaskSchema = z.object({
  name: z.string().trim().min(1, "Task name is required").max(200),
  description: z.string().trim().max(1000).optional(),
  category: z
    .enum([
      "home",
      "appliance",
      "vehicle",
      "electronics",
      "plumbing",
      "electrical",
      "hvac",
      "garden",
      "cleaning",
      "insurance",
      "subscription",
      "other",
    ])
    .default("home"),
  service_type: z.enum(["self", "managed"]).default("self"),
  frequency_months: z.number().int().positive().optional(), // recurring interval
  last_completed: IsoCalendarDateOrDateTimeSchema.optional(),
  next_due: IsoCalendarDateOrDateTimeSchema.optional(),
  estimated_cost: z.number().min(0).optional(), // only relevant for managed service_type
  currency: CurrencyCodeSchema.default("INR"),
  priority: z.enum(["high", "medium", "low"]).default("medium"),
  status: z
    .enum(["upcoming", "overdue", "completed", "skipped"])
    .default("upcoming"),
  is_recurring: z.boolean().default(true),
  reminder_enabled: z.boolean().default(true),
  history: z
    .array(
      z.object({
        id: z.string().default(() => crypto.randomUUID()),
        completed_at: z.string().datetime(), // ISO date
        cost: z.number().min(0).optional(),
        notes: z.string().trim().max(2000).optional(),
        vendor: z.string().trim().max(200).optional(),
      }),
    )
    .default([]),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  notes: z.string().trim().max(5000).optional(),
});

// --- 21. WHITEBOARD ---
export const WhiteboardNoteSchema = z.object({
  name: z.string().trim().min(1, "Whiteboard name is required").max(100),
  description: z.string().trim().max(1000).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  is_favorite: z.boolean().default(false),
  color_label: z
    .enum(["none", "red", "blue", "green", "yellow", "purple", "orange"])
    .default("none"),
  elements: z.unknown().default([]),
  app_state: z.unknown().default({}),
  files: z.unknown().default({}),
});

// --- 20. HEALTH PROFILES ---
const BillAttachmentContentTypeSchema = z
  .string()
  .trim()
  .min(1)
  .max(100)
  .refine(
    (value) =>
      value === "application/pdf" || /^image\/[a-z0-9.+-]+$/i.test(value),
    "Only image files and PDFs are allowed",
  );

const GenericAttachmentSchema = z.object({
  id: z.string().trim().min(1).max(100),
  filename: z
    .string()
    .trim()
    .min(1, "Filename is required")
    .max(255, "Filename is too long"),
  content_type: MimeTypeSchema,
  data: z.string().trim().min(1, "Attachment data is required"), // base64
  size: z.number().int().min(0),
  uploaded_at: z
    .string()
    .datetime()
    .default(() => new Date().toISOString()),
});

const BillAttachmentSchema = GenericAttachmentSchema.extend({
  content_type: BillAttachmentContentTypeSchema,
});

export const HealthProfileSchema = z.object({
  name: z.string().trim().min(1, "Name is required").max(100),
  type: z.enum(["self", "family", "pet"]).default("self"),
  relation: z.string().trim().max(100).optional(),
  date_of_birth: z.string().datetime().optional(),
  blood_group: z
    .enum(["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "unknown"])
    .default("unknown"),
  gender: z.enum(["male", "female", "other"]).optional(),
  avatar_url: z
    .string()
    .trim()
    .url("Must be a valid URL")
    .max(2048, "Avatar URL is too long")
    .optional(),
  profile_pic: z
    .object({
      data: z.string().trim().min(1, "Profile picture data is required"),
      content_type: MimeTypeSchema,
    })
    .optional(),
  emergency_contact: z.string().trim().max(200).optional(),
  insurance_info: z.string().trim().max(500).optional(),
  allergies: z.array(z.string().trim().min(1).max(100)).max(50).default([]),
  conditions: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(100),
        name: z.string().trim().min(1).max(200),
        diagnosed_date: z.string().datetime().optional(),
        status: z.enum(["active", "managed", "resolved"]).default("active"),
        notes: z.string().trim().max(2000).optional(),
      }),
    )
    .default([]),
  medications: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(100),
        name: z.string().trim().min(1).max(200),
        dosage: z.string().trim().max(100).optional(),
        prescribed_by: z.string().trim().max(200).optional(),
        start_date: z.string().datetime().optional(),
        end_date: z.string().datetime().optional(),
        refill_date: z.string().datetime().optional(),
        status: z
          .enum(["active", "completed", "discontinued"])
          .default("active"),
        notes: z.string().trim().max(2000).optional(),
      }),
    )
    .default([]),
  vaccinations: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(100),
        name: z.string().trim().min(1).max(200),
        date_administered: z.string().datetime(),
        next_due: z.string().datetime().optional(),
        provider: z.string().trim().max(200).optional(),
        batch_number: z.string().trim().max(100).optional(),
        notes: z.string().trim().max(2000).optional(),
      }),
    )
    .default([]),
  visits: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(100),
        date: z.string().datetime(),
        type: z
          .enum([
            "checkup",
            "consultation",
            "emergency",
            "surgery",
            "lab_test",
            "follow_up",
            "dental",
            "eye",
            "other",
          ])
          .default("checkup"),
        doctor: z.string().trim().max(200).optional(),
        facility: z.string().trim().max(200).optional(),
        diagnosis: z.string().trim().max(500).optional(),
        prescription: z.string().trim().max(2000).optional(),
        cost: z.number().min(0).optional(),
        currency: CurrencyCodeSchema.default("INR"),
        notes: z.string().trim().max(5000).optional(),
      }),
    )
    .default([]),
  lab_results: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(100),
        date: z.string().datetime(),
        test_name: z.string().trim().min(1).max(200),
        value: z.string().trim().min(1).max(100),
        unit: z.string().trim().max(50).optional(),
        reference_range: z.string().trim().max(100).optional(),
        status: z.enum(["normal", "borderline", "abnormal"]).default("normal"),
        notes: z.string().trim().max(2000).optional(),
      }),
    )
    .default([]),
  measurements: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(100),
        date: z.string().datetime(),
        height_cm: z.number().positive().optional(),
        weight_kg: z.number().positive().optional(),
        notes: z.string().trim().max(1000).optional(),
      }),
    )
    .default([]),
  documents: z
    .array(
      z.object({
        id: z.string().trim().min(1).max(100),
        type: z
          .enum([
            "prescription",
            "bill",
            "lab_report",
            "discharge_summary",
            "insurance",
            "imaging",
            "other",
          ])
          .default("other"),
        title: z.string().trim().min(1).max(200),
        date: z.string().datetime().optional(),
        notes: z.string().trim().max(5000).optional(),
        attachments: z.array(GenericAttachmentSchema).default([]),
      }),
    )
    .default([]),
  notes: z.string().trim().max(5000).optional(),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
});

// --- 22. DECKS ---
export const DeckSchema = z.object({
  title: z.string().trim().min(1, "Deck title is required").max(200),
  description: z.string().trim().max(1000).optional(),
  format: z
    .enum(["html", "pdf", "pptx", "google_slides", "reveal_js", "url"])
    .default("url"),
  visibility: z.enum(["public", "private", "link_only"]).default("private"),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
  author: z.string().trim().max(100).optional(),
  topic: z.string().trim().max(100).optional(),
  folder: z.string().trim().max(100).optional(),
  deck_url: z
    .string()
    .trim()
    .url()
    .max(DeckUrlMaxLength, "Deck URL or upload data is too large")
    .optional(),
  file_name: z.string().trim().max(255).optional(),
  file_size: z.number().int().min(0).optional(),
  thumbnail_url: z.string().url().max(500).optional(),
  embed_enabled: z.boolean().default(false),
});

export const BillSchema = z.object({
  name: z.string().trim().min(1, "Bill name is required").max(200),
  bill_date: z.string().datetime("Must be a valid ISO date-time"),
  amount: z.number().nonnegative("Amount cannot be negative").optional(),
  currency: CurrencyCodeSchema.default("INR"),
  description: z.string().trim().min(1).max(1000).optional(),
  notes: z.string().trim().min(1).max(5000).optional(),
  folder_id: ObjectIdStringSchema.optional(),
  attachments: z.array(BillAttachmentSchema).max(50).default([]),
  tags: z.array(z.string().trim().min(1).max(50)).max(20).default([]),
});

export const BillFolderSchema = z.object({
  name: z.string().trim().min(1, "Folder name is required").max(100),
  parent_id: ObjectIdStringSchema.optional(),
  color: z
    .string()
    .trim()
    .regex(/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/, "Invalid hex color")
    .optional(),
});

// --- 23. SYSTEM CONFIG ---
export const SystemUpdateSchema = z
  .object({
    active_theme: AppThemeSchema.optional(),
    color_mode: z.enum(["light", "dark"]).optional(),
    site_title: z.string().trim().min(1).max(100).optional(),
    site_icon: z.string().trim().min(1).max(200).optional(),
    bio: z.string().trim().max(1000).optional(),
    moduleRegistry: z
      .record(
        z.string(),
        z.object({ enabled: z.boolean(), isPublic: z.boolean() }),
      )
      .optional(),
    widgetRegistry: z.record(z.string(), z.boolean()).optional(),
    moduleOrder: z
      .array(z.string().trim().min(1, "Module slug is required").max(100))
      .optional(),
    orderingStrategy: z.enum(["custom", "name", "visits"]).optional(),
    visitSortScope: z.enum(["admin", "public", "all"]).optional(),
  })
  .catchall(z.unknown());

export const MetricEventSchema = z.object({
  path: z
    .string()
    .trim()
    .min(1, "Path is required")
    .max(400, "Path is too long")
    .regex(/^\//, "Path must start with a slash")
    .default("/"),
  module: z
    .string()
    .trim()
    .min(1, "Module is required")
    .max(100, "Module is too long")
    .regex(
      /^[a-z0-9_-]+$/,
      "Module should only include lowercase letters, numbers, underscores, and dashes",
    )
    .default("core"),
  action: z
    .string()
    .trim()
    .min(1, "Action is required")
    .max(50, "Action is too long")
    .regex(
      /^[a-z0-9_-]+$/,
      "Action should only include lowercase letters, numbers, underscores, and dashes",
    )
    .default("view"),
  label: z.string().trim().max(200).nullable().optional(),
  value: z.number().nullable().optional(),
  metadata: z.record(z.string(), z.unknown()).default({}),
  referrer: z.string().trim().max(500).nullable().optional(),
  device_type: z
    .enum(["mobile", "tablet", "desktop", "unknown"])
    .default("unknown"),
  is_admin: z.boolean().default(false),
});

const CalculatorProfileSchema = z
  .object({
    enabledCategories: z.record(z.string(), z.boolean()).default({}),
    enabledCalculators: z.record(z.string(), z.boolean()).default({}),
  })
  .catchall(z.unknown());

const BingeItemSchema = z.object({
  title: z.string().trim().min(1, "Title is required").max(200),
  type: z.enum(["movie", "series", "documentary", "anime"]).default("movie"),
  status: z
    .enum(["to_watch", "watching", "completed", "dropped"])
    .default("to_watch"),
  rating: z.number().int().min(1).max(10).optional(),
  notes: z.string().trim().max(5000).optional(),
  genre: z.string().trim().max(100).optional(),
  platform: z.string().trim().max(100).optional(),
  year: z.number().int().min(1900).max(2100).optional(),
  poster_url: z.string().trim().url().max(500).optional(),
  recommended_by: z.string().trim().max(100).optional(),
  rewatched: z.boolean().default(false),
  rewatch_count: z.number().int().min(0).max(999).default(0),
  current_season: z.number().int().min(1).max(999).optional(),
  current_episode: z.number().int().min(1).max(10000).optional(),
  total_seasons: z.number().int().min(1).max(999).optional(),
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
  calculator_profile: CalculatorProfileSchema,
  metric: MetricEventSchema,
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
  binge_item: BingeItemSchema,
  deck: DeckSchema,
  bill: BillSchema,
  bill_folder: BillFolderSchema,
};
