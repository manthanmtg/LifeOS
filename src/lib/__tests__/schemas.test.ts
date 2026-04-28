import { describe, it, expect } from "vitest";
import {
  CompassTaskSchema,
  RainEntrySchema,
  ExpenseSchema,
  EmiLoanSchema,
  IdeaSchema,
  PersonSchema,
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
  });
});
