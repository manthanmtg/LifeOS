import { z } from "zod";

import {
  DEFAULT_NOTIFICATION_SETTINGS,
  type NotificationSettings,
} from "./contracts";
import { validateIanaTimezone } from "./time";

const ObjectIdStringSchema = z
  .string()
  .trim()
  .regex(/^[a-f\d]{24}$/i, "Must be a valid ObjectId");

const CalendarDateSchema = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, "Must be YYYY-MM-DD")
  .refine((value) => {
    const date = new Date(`${value}T00:00:00.000Z`);
    return (
      !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
    );
  }, "Must be a valid calendar date");

const UrlSchema = z
  .string()
  .trim()
  .url("Must be a valid URL")
  .max(2048)
  .refine((value) => {
    const protocol = new URL(value).protocol;
    return protocol === "http:" || protocol === "https:";
  }, "Must be an HTTP or HTTPS URL");

export const NotificationMessageSchema = z.object({
  title: z.string().trim().min(1).max(200),
  body: z.string().trim().min(1).max(3000),
  url: UrlSchema.optional(),
});

export const NotificationRuleSchema = z
  .object({
    event: z
      .string()
      .trim()
      .min(1)
      .max(80)
      .regex(/^[a-z0-9_-]+$/, "Event must be lowercase slug text"),
    offsets_days: z
      .array(z.number().int().min(0).max(365))
      .min(1)
      .max(10)
      .transform((offsets) => [...offsets].sort((a, b) => a - b)),
    channel_ids: z.array(ObjectIdStringSchema).min(1).max(20).optional(),
  })
  .superRefine((rule, ctx) => {
    if (new Set(rule.offsets_days).size !== rule.offsets_days.length) {
      ctx.addIssue({
        code: "custom",
        path: ["offsets_days"],
        message: "Offsets must be unique",
      });
    }
  });

export const NotificationPreferencesSchema = z
  .object({
    enabled: z.boolean(),
    rules: z.array(NotificationRuleSchema).max(10),
  })
  .superRefine((preferences, ctx) => {
    if (preferences.enabled && preferences.rules.length === 0) {
      ctx.addIssue({
        code: "custom",
        path: ["rules"],
        message: "Enabled preferences require at least one rule",
      });
    }

    const events = preferences.rules.map((rule) => rule.event);
    if (new Set(events).size !== events.length) {
      ctx.addIssue({
        code: "custom",
        path: ["rules"],
        message: "Each notification event may appear only once",
      });
    }
  });

export const NotificationCandidateSchema = z.object({
  source: z.object({
    module_type: z.string().trim().min(1).max(100),
    document_id: z.string().trim().min(1).max(100),
    event: z.string().trim().min(1).max(80),
    event_date: CalendarDateSchema,
  }),
  scheduled_date: CalendarDateSchema,
  offset_days: z.number().int().min(0).max(365),
  channel_ids: z.array(ObjectIdStringSchema).min(1).max(20).optional(),
  message: NotificationMessageSchema,
});

export const NotificationSettingsSchema: z.ZodType<NotificationSettings> = z
  .object({
    enabled: z.boolean().default(DEFAULT_NOTIFICATION_SETTINGS.enabled),
    timezone: z
      .string()
      .trim()
      .min(1)
      .default(DEFAULT_NOTIFICATION_SETTINGS.timezone)
      .refine(validateIanaTimezone, "Must be a valid IANA timezone"),
    deliveryHour: z
      .number()
      .int()
      .min(0)
      .max(23)
      .default(DEFAULT_NOTIFICATION_SETTINGS.deliveryHour),
    catchUpHours: z
      .number()
      .int()
      .min(1)
      .max(168)
      .default(DEFAULT_NOTIFICATION_SETTINGS.catchUpHours),
  })
  .transform((settings) => ({
    ...settings,
    catchUpHours: DEFAULT_NOTIFICATION_SETTINGS.catchUpHours,
  }));

export const NotificationSettingsUpdateSchema = z
  .object({
    enabled: z.boolean().optional(),
    timezone: z
      .string()
      .trim()
      .min(1)
      .refine(validateIanaTimezone, "Must be a valid IANA timezone")
      .optional(),
    deliveryHour: z.number().int().min(0).max(23).optional(),
  })
  .strict();

export const TelegramChannelCreateSchema = z
  .object({
    adapter_type: z.literal("telegram"),
    name: z.string().trim().min(1).max(100),
    bot_token: z.string().trim().min(10).max(300),
    chat_id: z.string().trim().min(1).max(100),
  })
  .strict();

export const TelegramChannelUpdateSchema = z
  .object({
    name: z.string().trim().min(1).max(100).optional(),
    enabled: z.boolean().optional(),
    bot_token: z.string().trim().min(10).max(300).optional(),
    chat_id: z.string().trim().min(1).max(100).optional(),
  })
  .strict()
  .refine((value) => Object.keys(value).length > 0, {
    message: "At least one channel field is required",
  });

export const NotificationDispatchRequestSchema = z
  .object({
    batchSize: z.number().int().min(1).max(10).optional(),
  })
  .strict();
