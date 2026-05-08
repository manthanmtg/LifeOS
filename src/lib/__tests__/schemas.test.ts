import { describe, it, expect } from "vitest";
import {
  CompassTaskSchema,
  RainEntrySchema,
  ExpenseSchema,
  EmiLoanSchema,
  IdeaSchema,
  PersonSchema,
  DeckSchema,
  AiUsageSchema,
  MaintenanceTaskSchema,
  HealthProfileSchema,
  VehicleSchema,
} from "../schemas";

describe("schemas", () => {
  describe("CompassTaskSchema", () => {
    it("validates a valid task", () => {
      const task = {
        title: "Test Task",
        priority: "p1",
        status: "backlog",
      };
      const result = CompassTaskSchema.safeParse(task);
      expect(result.success).toBe(true);
    });

    it("fails on missing title", () => {
      const task = {
        priority: "p1",
        status: "backlog",
      };
      const result = CompassTaskSchema.safeParse(task);
      expect(result.success).toBe(false);
    });

    it("rejects overlong task text fields", () => {
      const task = {
        title: "x".repeat(201),
        status: "backlog",
        description: "x".repeat(2001),
        comments: [
          {
            text: "x".repeat(2001),
            created_at: new Date().toISOString(),
          },
        ],
        checklist: [
          {
            id: crypto.randomUUID(),
            text: "x".repeat(201),
            description: "x".repeat(2001),
            comments: [
              {
                text: "x".repeat(2001),
                created_at: new Date().toISOString(),
              },
            ],
          },
        ],
        category_tags: ["x".repeat(51)],
        links: [
          {
            label: "x".repeat(101),
            url: "https://example.com",
          },
        ],
      };

      const result = CompassTaskSchema.safeParse(task);

      expect(result.success).toBe(false);
    });
  });

  describe("RainEntrySchema", () => {
    it("validates a valid rain entry", () => {
      const entry = {
        area_id: "area_1",
        rainfall_amount: 10.5,
        date: new Date().toISOString(),
      };
      const result = RainEntrySchema.safeParse(entry);
      expect(result.success).toBe(true);
    });
  });

  describe("ExpenseSchema", () => {
    it("validates a valid expense entry", () => {
      const expense = {
        amount: 100,
        currency: "USD",
        description: "Test Expense",
        category: "Food",
        date: new Date().toISOString(),
      };
      const result = ExpenseSchema.safeParse(expense);
      expect(result.success).toBe(true);
    });

    it("rejects malformed expense currency codes", () => {
      const expense = {
        amount: 100,
        currency: "usd",
        description: "Test Expense",
        category: "Food",
        date: new Date().toISOString(),
      };
      const result = ExpenseSchema.safeParse(expense);
      expect(result.success).toBe(false);
    });
  });

  describe("IdeaSchema", () => {
    it("preserves optional notes on ideas", () => {
      const idea = {
        title: "Capture notes correctly",
        description: "The notes field should survive validation.",
        notes: "This detail used to be dropped during writes.",
        status: "raw",
        priority: "medium",
        tags: ["notes"],
      };
      const result = IdeaSchema.safeParse(idea);
      expect(result.success).toBe(true);
      if (result.success) {
        expect(result.data.notes).toBe(idea.notes);
      }
    });
  });

  describe("EmiLoanSchema", () => {
    it("validates a valid loan", () => {
      const loan = {
        title: "Home Loan",
        principal: 5000000,
        tenure_months: 240,
        annual_interest_rate: 8.5,
        monthly_emi: 43391,
        interest_type: "floating",
        start_date: new Date().toISOString(),
        due_day_of_month: 5,
      };
      const result = EmiLoanSchema.safeParse(loan);
      expect(result.success).toBe(true);
    });

    it("rejects overlong EMI supporting text fields", () => {
      const loan = {
        title: "Home Loan",
        principal: 5000000,
        tenure_months: 240,
        annual_interest_rate: 8.5,
        monthly_emi: 43391,
        interest_type: "floating",
        start_date: new Date().toISOString(),
        rate_adjustments: [
          {
            effective_date: new Date().toISOString(),
            annual_interest_rate: 8.75,
            note: "x".repeat(2001),
          },
        ],
        payments: [
          {
            date: new Date().toISOString(),
            amount: 43391,
            kind: "emi",
            note: "x".repeat(2001),
          },
        ],
        documents: [
          {
            type: "other",
            title: "x".repeat(201),
            url: "https://example.com/loan.pdf",
          },
        ],
      };

      const result = EmiLoanSchema.safeParse(loan);

      expect(result.success).toBe(false);
    });
  });

  describe("PersonSchema", () => {
    it("validates a valid person", () => {
      const person = {
        name: "Jane Doe",
        relationship: "friend",
        is_favorite: true,
      };
      const result = PersonSchema.safeParse(person);
      expect(result.success).toBe(true);
    });

    it("rejects overlong person profile text fields", () => {
      const person = {
        name: "x".repeat(101),
        relationship: "friend",
        phone: "x".repeat(51),
        company: "x".repeat(101),
        role: "x".repeat(101),
        interests: ["x".repeat(51)],
        tags: ["x".repeat(51)],
        notes: "x".repeat(5001),
        social_links: [
          {
            platform: "x".repeat(51),
            url: "https://example.com/profile",
          },
        ],
      };

      const result = PersonSchema.safeParse(person);

      expect(result.success).toBe(false);
    });

    it("rejects malformed person date fields", () => {
      const person = {
        name: "Jane Doe",
        relationship: "friend",
        birthday: "01/31/1990",
        interactions: [
          {
            date: "yesterday",
            type: "message",
          },
        ],
        last_contacted: "2026-02-30",
      };

      const result = PersonSchema.safeParse(person);

      expect(result.success).toBe(false);
    });
  });

  describe("DeckSchema", () => {
    it("rejects malformed deck URLs while allowing uploaded data URLs", () => {
      const invalid = DeckSchema.safeParse({
        title: "Quarterly planning",
        deck_url: "not-a-url",
      });

      const uploaded = DeckSchema.safeParse({
        title: "Uploaded deck",
        format: "html",
        deck_url: "data:text/html;base64,PGgxPkhlbGxvPC9oMT4=",
      });

      expect(invalid.success).toBe(false);
      expect(uploaded.success).toBe(true);
    });

    it("rejects loose deck text and thumbnail fields", () => {
      const deck = {
        title: "x".repeat(201),
        description: "x".repeat(1001),
        tags: ["x".repeat(51)],
        author: "x".repeat(101),
        topic: "x".repeat(101),
        folder: "x".repeat(101),
        thumbnail_url: "not-a-url",
      };

      const result = DeckSchema.safeParse(deck);

      expect(result.success).toBe(false);
    });
  });

  describe("AiUsageSchema", () => {
    it("rejects overlong optional label and notes fields", () => {
      const usage = {
        provider: "openai",
        model: "gpt-5.4",
        cost: 0,
        currency: "USD",
        date: new Date().toISOString(),
        api_key_label: "x".repeat(101),
        session_label: "x".repeat(101),
        notes: "x".repeat(2001),
      };

      const result = AiUsageSchema.safeParse(usage);

      expect(result.success).toBe(false);
    });
  });

  describe("MaintenanceTaskSchema", () => {
    it("rejects malformed maintenance schedule dates", () => {
      const task = {
        name: "Water heater service",
        category: "home",
        service_type: "managed",
        currency: "INR",
        priority: "medium",
        status: "upcoming",
        last_completed: "last Friday",
        next_due: "soon",
      };

      const result = MaintenanceTaskSchema.safeParse(task);

      expect(result.success).toBe(false);
    });

    it("accepts date-only maintenance schedule dates from form inputs", () => {
      const task = {
        name: "Water heater service",
        category: "home",
        service_type: "managed",
        currency: "INR",
        priority: "medium",
        status: "upcoming",
        last_completed: "2026-04-01",
        next_due: "2026-07-01",
      };

      const result = MaintenanceTaskSchema.safeParse(task);

      expect(result.success).toBe(true);
    });

    it("rejects loose maintenance text fields and tags", () => {
      const task = {
        name: "Water heater service",
        category: "home",
        service_type: "managed",
        currency: "INR",
        priority: "medium",
        status: "upcoming",
        history: [
          {
            id: crypto.randomUUID(),
            completed_at: new Date().toISOString(),
            vendor: "x".repeat(201),
            notes: "x".repeat(2001),
          },
        ],
        tags: ["", "x".repeat(51)],
        notes: "x".repeat(5001),
      };

      const result = MaintenanceTaskSchema.safeParse(task);

      expect(result.success).toBe(false);
    });
  });

  describe("HealthProfileSchema", () => {
    it("rejects loose health profile notes and tags", () => {
      const profile = {
        name: "Jane Doe",
        type: "self",
        notes: "x".repeat(5001),
        tags: ["", "x".repeat(51)],
      };

      const result = HealthProfileSchema.safeParse(profile);

      expect(result.success).toBe(false);
    });
  });

  describe("VehicleSchema", () => {
    it("rejects loose vehicle record details and dates", () => {
      const vehicle = {
        name: "Commuter",
        service_records: [
          {
            date: "next week",
            description: "   ",
            currency: "inr",
            garage: "x".repeat(201),
            notes: "x".repeat(2001),
          },
        ],
        fuel_logs: [
          {
            date: "today",
            quantity: 20,
            cost: 1500,
            currency: "rs.",
            station: "x".repeat(201),
          },
        ],
        documents: [
          {
            title: "   ",
            expiry_date: "tomorrow",
            notes: "x".repeat(2001),
          },
        ],
        notes: "x".repeat(5001),
      };

      const result = VehicleSchema.safeParse(vehicle);

      expect(result.success).toBe(false);
    });
  });
});
