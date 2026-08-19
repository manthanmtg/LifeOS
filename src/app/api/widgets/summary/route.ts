import { getDb } from "@/lib/mongodb";
import { ContentDocument, SystemConfig } from "@/lib/types";
import { ApiSuccess, ApiError } from "@/lib/api-response";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";
import { getIdeaMetrics, getIdeaSpotlight } from "@/modules/ideas/insights";
import type { IdeaRecord } from "@/modules/ideas/shared";
import { getPeopleSummary, toPersonDocument } from "@/modules/people/insights";
import type { PersonPayload } from "@/modules/people/types";
import { getCropHistorySummary } from "@/modules/crop-history/insights";
import type {
  CropRecord,
  ModuleSettings as CropSettings,
} from "@/modules/crop-history/AdminView";
import { computeMetrics } from "@/modules/habits/components/types";
import type { Habit } from "@/modules/habits/components/types";
import { z } from "zod";
import {
  VehicleSchema,
  HealthProfileSchema,
  RecurringExpenseSchema,
  BillSchema,
  SnippetSchema,
  WhiteboardNoteSchema,
} from "@/lib/schemas";
import type { EmiLoan } from "@/modules/emi-tracker/types";

// --- Types for local use ---
type LoanPayload = EmiLoan["payload"];
type VehiclePayload = z.infer<typeof VehicleSchema>;
type HealthProfilePayload = z.infer<typeof HealthProfileSchema>;
type RecurringExpensePayload = z.infer<typeof RecurringExpenseSchema>;
type BillPayload = z.infer<typeof BillSchema>;
type SnippetPayload = z.infer<typeof SnippetSchema>;
type WhiteboardNotePayload = z.infer<typeof WhiteboardNoteSchema>;
type BingeSummaryPayload = {
  title: string;
  status?: string;
  rating?: number;
  current_season?: number;
  current_episode?: number;
};

// --- EMI Utility Functions ---
function clampDueDay(year: number, monthIndex: number, dueDay: number) {
  return new Date(year, monthIndex, dueDay, 12, 0, 0, 0);
}

function computeFirstDueDate(startISO: string, dueDay: number) {
  const start = new Date(startISO);
  const candidate = clampDueDay(start.getFullYear(), start.getMonth(), dueDay);
  if (candidate.getTime() >= start.getTime()) return candidate;
  return clampDueDay(start.getFullYear(), start.getMonth() + 1, dueDay);
}

function computeEmiFromFormula(
  principal: number,
  annualRate: number,
  months: number,
) {
  const r = annualRate / 12 / 100;
  if (months <= 0) return 0;
  if (r === 0) return principal / months;
  const pow = Math.pow(1 + r, months);
  return (principal * (r * pow)) / (pow - 1);
}

function roundTo(n: number, decimals: number) {
  const f = Math.pow(10, decimals);
  return Math.round(n * f) / f;
}

function computeScheduleLite(loan: LoanPayload, decimals: number) {
  const processingFee =
    (loan.processing_fee_amount ?? 0) +
    (loan.processing_fee_percent
      ? (loan.processing_fee_percent / 100) * loan.principal
      : 0);
  const financedFee = loan.processing_fee_financed ? processingFee : 0;
  const basePrincipal = loan.principal + financedFee;

  const firstDue = loan.first_due_date
    ? new Date(loan.first_due_date)
    : computeFirstDueDate(loan.start_date, loan.due_day_of_month);
  const dueDay = loan.due_day_of_month;

  const adjustments = [...(loan.rate_adjustments || [])]
    .filter(
      (a) => !!a.effective_date && Number.isFinite(a.annual_interest_rate),
    )
    .sort(
      (a, b) =>
        new Date(a.effective_date).getTime() -
        new Date(b.effective_date).getTime(),
    );

  const getAnnualRateForDueDate = (dueDate: Date) => {
    let rate = loan.annual_interest_rate;
    for (const adj of adjustments) {
      if (new Date(adj.effective_date).getTime() <= dueDate.getTime())
        rate = adj.annual_interest_rate;
      else break;
    }
    return rate;
  };

  const strategy =
    loan.interest_type === "floating"
      ? loan.recast_strategy
      : "keep_emi_adjust_tenure";
  const plannedMonths = loan.tenure_months;
  const hardCapMonths = 480;
  const maxMonths =
    strategy === "keep_emi_adjust_tenure" ? hardCapMonths : plannedMonths;

  let balance = basePrincipal;
  let currentEmi = loan.monthly_emi;
  const rows = [];

  for (let i = 0; i < maxMonths; i++) {
    const dueDate = clampDueDay(
      firstDue.getFullYear(),
      firstDue.getMonth() + i,
      dueDay,
    );
    const annualRate = getAnnualRateForDueDate(dueDate);
    const r = annualRate / 12 / 100;

    if (
      loan.interest_type === "floating" &&
      strategy === "keep_tenure_adjust_emi"
    ) {
      const prevDue = clampDueDay(
        dueDate.getFullYear(),
        dueDate.getMonth() - 1,
        dueDay,
      );
      const prevRate =
        i === 0 ? loan.annual_interest_rate : getAnnualRateForDueDate(prevDue);
      if (annualRate !== prevRate) {
        const remaining = Math.max(1, plannedMonths - i);
        currentEmi = computeEmiFromFormula(balance, annualRate, remaining);
      }
    }

    const emi =
      strategy === "keep_emi_adjust_tenure" ? loan.monthly_emi : currentEmi;
    const interest = roundTo(balance * r, decimals);
    if (emi <= interest + 1e-9) break;

    const principalPay = roundTo(emi - interest, decimals);
    const principalApplied = Math.min(principalPay, balance);
    const closing = roundTo(balance - principalApplied, decimals);

    rows.push({ due_date: dueDate.toISOString(), closing_balance: closing });
    balance = closing;
    if (balance <= Math.pow(10, -decimals)) break;
  }
  return rows;
}
// ------------------------------

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url);
    const module_type = searchParams.get("module_type");

    if (!module_type) {
      return ApiError("module_type is required", 400);
    }

    const cookieStore = await cookies();
    const token = cookieStore.get("lifeos_token")?.value;
    const isAdmin = token ? !!(await verifyToken(token)) : false;

    if (!isAdmin) {
      return ApiError("Unauthorized", 401);
    }

    const db = await getDb();
    const contentColl = db.collection<ContentDocument>("content");

    if (module_type === "expense_space") {
      const activeSpaces = (await contentColl
        .find(
          { module_type: "expense_space", "payload.status": "active" },
          {
            projection: {
              _id: 0,
              "payload.space_key": 1,
              "payload.currency": 1,
              "payload.budget": 1,
            },
          },
        )
        .toArray()) as Array<{
        payload: {
          space_key: string;
          currency: string;
          budget?: { amount: number; cadence: "total" | "monthly" };
        };
      }>;

      if (activeSpaces.length === 0) {
        return ApiSuccess({
          active_spaces: 0,
          entries_this_month: 0,
          spaces_with_budgets: 0,
          currencies_in_use: 0,
        });
      }

      const now = new Date();
      const year = now.getUTCFullYear();
      const month = now.getUTCMonth();
      const monthStart = `${year}-${String(month + 1).padStart(2, "0")}-01`;
      const monthEnd = new Date(Date.UTC(year, month + 1, 0))
        .toISOString()
        .slice(0, 10);
      const entriesThisMonth = await contentColl.countDocuments({
        module_type: "expense_space_entry",
        "payload.space_key": {
          $in: activeSpaces.map((space) => space.payload.space_key),
        },
        "payload.date": { $gte: monthStart, $lte: monthEnd },
      });

      return ApiSuccess({
        active_spaces: activeSpaces.length,
        entries_this_month: entriesThisMonth,
        spaces_with_budgets: activeSpaces.filter(
          (space) => space.payload.budget !== undefined,
        ).length,
        currencies_in_use: new Set(
          activeSpaces.map((space) => space.payload.currency),
        ).size,
      });
    }

    if (module_type === "snippet") {
      const snippetDocs = (await contentColl
        .find(
          { module_type },
          { projection: { "payload.is_favorite": 1, "payload.language": 1 } },
        )
        .toArray()) as ContentDocument<SnippetPayload>[];
      const languageSet = new Set<string>();
      let favorites = 0;

      for (const snippet of snippetDocs) {
        if (snippet.payload.is_favorite) favorites++;
        if (snippet.payload.language) languageSet.add(snippet.payload.language);
      }

      return ApiSuccess({
        total: snippetDocs.length,
        favorites,
        languageCount: languageSet.size,
      });
    }

    if (module_type === "analytics") {
      const now = new Date();
      const today = now.toISOString().split("T")[0];
      const yesterday = new Date(Date.now() - 86400000)
        .toISOString()
        .split("T")[0];

      const metricsColl = db.collection("metrics");
      const todayCount = await metricsColl.countDocuments({
        timestamp: { $gte: today },
      });
      const yesterdayCount = await metricsColl.countDocuments({
        timestamp: { $gte: yesterday, $lt: today },
      });

      return ApiSuccess({
        todayCount,
        yesterdayCount,
      });
    }

    if (module_type === "whiteboard_note") {
      const docs = (await contentColl
        .find(
          { module_type },
          {
            projection: {
              is_public: 1,
              updated_at: 1,
              "payload.name": 1,
              "payload.is_favorite": 1,
            },
          },
        )
        .toArray()) as ContentDocument<WhiteboardNotePayload>[];

      let favorites = 0;
      let publicCount = 0;
      let latest: ContentDocument<WhiteboardNotePayload> | null = null;

      for (const doc of docs) {
        if (doc.is_public) publicCount++;
        if (doc.payload.is_favorite) favorites++;

        if (!latest) {
          latest = doc;
        } else {
          const currentIsFav = latest.payload.is_favorite;
          const docIsFav = doc.payload.is_favorite;

          if (docIsFav && !currentIsFav) {
            latest = doc;
          } else if (docIsFav === currentIsFav) {
            if (new Date(doc.updated_at) > new Date(latest.updated_at)) {
              latest = doc;
            }
          }
        }
      }

      return ApiSuccess({
        total: docs.length,
        favorites,
        publicCount,
        latest: latest
          ? {
              name: latest.payload.name,
              is_favorite: latest.payload.is_favorite,
              updated_at: latest.updated_at,
            }
          : null,
      });
    }

    if (module_type === "binge_item") {
      const bingeDocs = (await contentColl
        .find(
          { module_type },
          {
            projection: {
              "payload.title": 1,
              "payload.status": 1,
              "payload.rating": 1,
              "payload.current_season": 1,
              "payload.current_episode": 1,
            },
          },
        )
        .sort({ created_at: -1 })
        .toArray()) as ContentDocument<BingeSummaryPayload>[];

      const bingeSummary = bingeDocs.reduce(
        (acc, item) => {
          if (item.payload.status === "watching") {
            acc.watchingCount += 1;
            if (!acc.latestWatching) {
              acc.latestWatching = item.payload;
            }
          }

          const rating = item.payload.rating;
          if (typeof rating === "number") {
            acc.ratedSum += rating;
            acc.ratedCount += 1;
          }

          return acc;
        },
        {
          watchingCount: 0,
          latestWatching: null as BingeSummaryPayload | null,
          ratedSum: 0,
          ratedCount: 0,
        },
      );

      const { watchingCount, latestWatching, ratedSum, ratedCount } =
        bingeSummary;
      const avgRating = ratedCount > 0 ? ratedSum / ratedCount : 0;
      const latest = latestWatching;

      return ApiSuccess({
        total: bingeDocs.length,
        watchingCount,
        avgRating: Number.isFinite(avgRating) ? avgRating : 0,
        latest: latest
          ? {
              title: latest.title,
              current_season: latest.current_season,
              current_episode: latest.current_episode,
            }
          : null,
      });
    }

    const PROJECTIONS: Record<string, Record<string, number>> = {
      deck: {
        "payload.visibility": 1,
        "payload.topic": 1,
        "payload.title": 1,
        "payload.format": 1,
        created_at: 1,
      },
      expense: {
        "payload.date": 1,
        "payload.amount": 1,
        "payload.category": 1,
      },
      todo: {
        "payload.completed": 1,
        "payload.title": 1,
        "payload.completed_at": 1,
        created_at: 1,
        updated_at: 1,
      },
      reading_item: {
        "payload.type": 1,
        "payload.is_read": 1,
        "payload.priority": 1,
        "payload.title": 1,
      },
      rain_entry: { "payload.date": 1, "payload.rainfall_amount": 1 },
      blog_post: {
        "payload.status": 1,
        "payload.published_at": 1,
        "payload.estimated_reading_time": 1,
        "payload.content": 1,
        "payload.title": 1,
        created_at: 1,
      },
      compass_task: { "payload.status": 1, "payload.priority": 1 },
      maintenance_task: {
        "payload.status": 1,
        "payload.next_due": 1,
        "payload.history": 1,
      },
      recurring_expense: {
        "payload.is_active": 1,
        "payload.cost": 1,
        "payload.billing_cycle": 1,
        "payload.next_renewal_date": 1,
        "payload.enable_reminders": 1,
        "payload.name": 1,
      },
      book: {
        "payload.status": 1,
        "payload.rating": 1,
        "payload.total_pages": 1,
        "payload.current_page": 1,
        "payload.title": 1,
        "payload.author": 1,
        created_at: 1,
      },
      ai_usage: {
        "payload.date": 1,
        "payload.cost": 1,
        "payload.input_tokens": 1,
        "payload.output_tokens": 1,
        "payload.provider": 1,
      },
      vehicle: {
        "payload.insurance_expiry": 1,
        "payload.pollution_certificate_expiry": 1,
        "payload.next_service_due": 1,
        "payload.service_records": 1,
        "payload.fuel_logs": 1,
      },
      bill: { "payload.attachments": 1, created_at: 1 },
    };

    const query: Record<string, unknown> = { module_type };

    if (module_type === "expense") {
      const now = new Date();
      const firstDayOfLastMonth = new Date(
        now.getFullYear(),
        now.getMonth() - 1,
        1,
      );
      // We only need expenses from last month and this month for the summary calculations
      query["payload.date"] = { $gte: firstDayOfLastMonth.toISOString() };
    }

    const docs = (await contentColl
      .find(query, { projection: PROJECTIONS[module_type] || {} })
      .toArray()) as ContentDocument<any>[]; // eslint-disable-line @typescript-eslint/no-explicit-any

    let summary: Record<string, unknown> = {};
    const nowRef = Date.now();

    switch (module_type) {
      case "deck": {
        const publicDecks = docs.filter(
          (i) => i.payload.visibility === "public",
        ).length;
        const uniqueTopics = new Set(
          docs.map((i) => i.payload.topic).filter(Boolean),
        ).size;
        const latestDoc =
          docs.length > 0
            ? docs.reduce((a, b) =>
                new Date(b.created_at).getTime() >
                new Date(a.created_at).getTime()
                  ? b
                  : a,
              )
            : null;

        summary = {
          total: docs.length,
          publicDecks,
          uniqueTopics,
          latest: latestDoc
            ? {
                payload: {
                  title: latestDoc.payload.title,
                  format: latestDoc.payload.format,
                },
                created_at: latestDoc.created_at,
              }
            : null,
        };
        break;
      }

      case "vehicle": {
        let alertCount = 0;
        let latestService: VehiclePayload["service_records"][number] | null =
          null;
        let fuelCostThisMonth = 0;
        const now = new Date();
        const monthStart = new Date(
          now.getFullYear(),
          now.getMonth(),
          1,
        ).toISOString();

        const getExpiryStatus = (dateStr?: string) => {
          if (!dateStr) return "none";
          const expiry = new Date(dateStr);
          if (expiry < now) return "expired";
          const diffDays = Math.ceil(
            (expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24),
          );
          if (diffDays <= 30) return "warning";
          return "ok";
        };

        for (const v of docs) {
          const p = v.payload;
          const ins = getExpiryStatus(p.insurance_expiry);
          const pol = getExpiryStatus(p.pollution_certificate_expiry);
          const svc = getExpiryStatus(p.next_service_due);
          if (ins === "expired" || ins === "warning") alertCount++;
          if (pol === "expired" || pol === "warning") alertCount++;
          if (svc === "expired" || svc === "warning") alertCount++;

          for (const sr of p.service_records || []) {
            if (!latestService || sr.date > latestService.date)
              latestService = sr;
          }

          for (const fl of p.fuel_logs || []) {
            if (fl.date >= monthStart) fuelCostThisMonth += fl.cost;
          }
        }

        summary = {
          total: docs.length,
          alertCount,
          latestService,
          fuelCostThisMonth,
        };
        break;
      }

      case "health_profile": {
        let alertCount = 0;
        let latestVisit: HealthProfilePayload["visits"][number] | null = null;
        let activeMedCount = 0;
        let activeConditionCount = 0;
        let upcomingVacCount = 0;

        const isWithinDays = (dateStr?: string, days = 7) => {
          if (!dateStr) return false;
          const target = new Date(dateStr);
          const diffDays = Math.ceil(
            (target.getTime() - nowRef) / (1000 * 60 * 60 * 24),
          );
          return diffDays <= days;
        };

        const profiles: Array<{
          name: string;
          type: string;
          alertCount: number;
        }> = [];

        for (const p of docs) {
          const payload = p.payload;
          let profileAlerts = 0;

          for (const med of payload.medications || []) {
            if (med.status === "active") {
              activeMedCount++;
              if (isWithinDays(med.refill_date, 7)) {
                alertCount++;
                profileAlerts++;
              }
            }
          }
          for (const vac of payload.vaccinations || []) {
            if (isWithinDays(vac.next_due, 30)) {
              upcomingVacCount++;
              if (isWithinDays(vac.next_due, 7)) {
                alertCount++;
                profileAlerts++;
              }
            }
          }
          for (const cond of payload.conditions || []) {
            if (cond.status === "active") activeConditionCount++;
          }
          for (const v of payload.visits || []) {
            if (!latestVisit || v.date > latestVisit.date) latestVisit = v;
          }

          profiles.push({
            name: payload.name,
            type: payload.type || "self",
            alertCount: profileAlerts,
          });
        }

        summary = {
          total: docs.length,
          alertCount,
          latestVisit,
          activeMedCount,
          activeConditionCount,
          upcomingVacCount,
          profiles,
        };
        break;
      }

      case "idea": {
        const typedIdeas = docs as unknown as IdeaRecord[];
        const metrics = getIdeaMetrics(typedIdeas);
        const spotlight = getIdeaSpotlight(typedIdeas);

        summary = {
          total: metrics.total,
          promoted: metrics.promoted,
          exploring: metrics.exploring,
          reviewCount: metrics.reviewCount,
          spotlightTitle: spotlight?.payload.title,
          spotlightStatus: spotlight?.payload.status,
        };
        break;
      }

      case "todo": {
        const activeTodos = docs
          .filter((t) => !t.payload.completed)
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          );
        const recentlyDone = docs
          .filter((t) => t.payload.completed)
          .sort(
            (a, b) =>
              new Date(b.payload?.completed_at || b.updated_at).getTime() -
              new Date(a.payload?.completed_at || a.updated_at).getTime(),
          );

        summary = {
          activeCount: activeTodos.length,
          doneCount: recentlyDone.length,
          topActive: activeTodos
            .slice(0, 2)
            .map((t) => ({ _id: t._id, title: t.payload.title })),
        };
        break;
      }

      case "compass_task": {
        let inProgressCount = 0;
        let criticalCount = 0;
        let reviewCount = 0;

        for (const task of docs) {
          const { status, priority } = task.payload;

          if (status === "in_progress") {
            inProgressCount++;
            if (priority === "p1") criticalCount++;
          } else if (status === "review") {
            reviewCount++;
          }
        }

        summary = {
          total: docs.length,
          inProgressCount,
          criticalCount,
          reviewCount,
        };
        break;
      }

      case "maintenance_task": {
        const now = nowRef;
        const thirtyDaysFromNow = now + 30 * 24 * 60 * 60 * 1000;
        const monthStart = new Date();
        monthStart.setUTCDate(1);
        monthStart.setUTCHours(0, 0, 0, 0);

        let overdue = 0;
        let upcoming = 0;
        let completedThisMonth = 0;

        for (const doc of docs) {
          const payload = doc.payload;
          const status = payload.status;
          const isOpen = status !== "completed" && status !== "skipped";
          const nextDueTime = payload.next_due
            ? new Date(payload.next_due).getTime()
            : null;

          if (isOpen && nextDueTime !== null && nextDueTime < now) {
            overdue++;
          }

          if (
            isOpen &&
            nextDueTime !== null &&
            nextDueTime >= now &&
            nextDueTime <= thirtyDaysFromNow
          ) {
            upcoming++;
          }

          for (const entry of payload.history || []) {
            const completedAt = entry.completed_at
              ? new Date(entry.completed_at).getTime()
              : null;
            if (
              completedAt !== null &&
              Number.isFinite(completedAt) &&
              completedAt >= monthStart.getTime()
            ) {
              completedThisMonth++;
            }
          }
        }

        summary = {
          total: docs.length,
          overdue,
          upcoming,
          completedThisMonth,
        };
        break;
      }

      case "recurring_expense": {
        const act = docs.filter(
          (s) => s.payload.is_active,
        ) as ContentDocument<RecurringExpensePayload>[];

        const monthlyEquivalent = (cost: number, cycle: string) => {
          if (cycle === "yearly") return cost / 12;
          if (cycle === "quarterly") return cost / 3;
          if (cycle === "weekly") return cost * 4.33;
          if (cycle === "daily") return cost * 30.44;
          return cost;
        };

        const totalBurn = act.reduce(
          (s, sub) =>
            s + monthlyEquivalent(sub.payload.cost, sub.payload.billing_cycle),
          0,
        );

        let overdueCount = 0;
        let dueSoonCount = 0;
        let nextRenewal: { name: string; next_renewal_date: string } | null =
          null;

        for (const s of act) {
          const payload = s.payload;
          const diffDays = Math.ceil(
            (new Date(payload.next_renewal_date).getTime() - nowRef) /
              (1000 * 60 * 60 * 24),
          );

          if (diffDays < 0) overdueCount++;
          if (diffDays >= 0 && diffDays <= 7) dueSoonCount++;

          if (payload.enable_reminders !== false) {
            if (
              !nextRenewal ||
              new Date(payload.next_renewal_date) <
                new Date(nextRenewal.next_renewal_date)
            ) {
              nextRenewal = {
                name: payload.name,
                next_renewal_date: payload.next_renewal_date,
              };
            }
          }
        }

        const daysUntilNext = nextRenewal
          ? Math.ceil(
              (new Date(nextRenewal.next_renewal_date).getTime() - nowRef) /
                (1000 * 60 * 60 * 24),
            )
          : null;

        summary = {
          activeCount: act.length,
          totalBurn,
          overdueCount,
          dueSoonCount,
          nextRenewal,
          daysUntilNext,
        };
        break;
      }

      case "crop_history": {
        const systemColl = db.collection<SystemConfig>("system");
        const config = await systemColl.findOne({
          _id: "global",
        });
        const settings = (config?.cropHistorySettings || {
          crops: [],
          sources: [],
        }) as CropSettings;
        summary = getCropHistorySummary(
          docs as unknown as CropRecord[],
          settings,
        ) as unknown as Record<string, unknown>;
        break;
      }

      case "emi_loan": {
        const active = docs.filter((l) => l.payload.status === "active");
        const outstandingByCurrencyMap: Record<string, number> = {};
        let nearest: { title: string; due: string } | null = null;
        const nowAsDate = new Date(nowRef);
        const decimals = parseInt(searchParams.get("decimals") || "2", 10);
        const defaultCurrency = searchParams.get("currency") || "INR";

        for (const l of active) {
          const payload = l.payload;
          const processingFee =
            (payload.processing_fee_amount ?? 0) +
            (payload.processing_fee_percent
              ? (payload.processing_fee_percent / 100) * payload.principal
              : 0);
          const financedFee = payload.processing_fee_financed
            ? processingFee
            : 0;
          const startPrincipal = payload.principal + financedFee;

          const sched = computeScheduleLite(payload, decimals);

          let outstanding = startPrincipal;
          let nextDue = null;
          if (sched.length > 0) {
            nextDue =
              sched.find(
                (r) => new Date(r.due_date).getTime() >= nowAsDate.getTime(),
              ) || null;
            const last =
              [...sched]
                .reverse()
                .find(
                  (r) => new Date(r.due_date).getTime() < nowAsDate.getTime(),
                ) || null;
            if (last) outstanding = last.closing_balance;
          }

          const currencyKey = payload.currency || defaultCurrency;
          outstandingByCurrencyMap[currencyKey] =
            (outstandingByCurrencyMap[currencyKey] || 0) + outstanding;

          if (nextDue) {
            if (
              !nearest ||
              new Date(nextDue.due_date).getTime() <
                new Date(nearest.due).getTime()
            ) {
              nearest = { title: payload.title, due: nextDue.due_date };
            }
          }
        }

        const outstandingByCurrency = Object.entries(outstandingByCurrencyMap)
          .map(([currency, amount]) => ({
            currency,
            amount: roundTo(amount, decimals),
          }))
          .sort((a, b) => a.currency.localeCompare(b.currency));

        summary = {
          activeCount: active.length,
          outstandingByCurrency,
          nearest,
        };
        break;
      }

      case "bill": {
        let totalAttachments = 0;
        let recentBill: ContentDocument<BillPayload> | null = null;

        for (const s of docs) {
          const payload = s.payload;
          totalAttachments += payload.attachments?.length || 0;

          if (!recentBill) {
            recentBill = s;
          } else if (
            new Date(s.created_at).getTime() >
            new Date(recentBill.created_at).getTime()
          ) {
            recentBill = s;
          }
        }

        const folderCount = await contentColl.countDocuments({
          module_type: "bill_folder",
        });

        summary = {
          total: docs.length,
          folderCount,
          totalAttachments,
          recentBill,
        };
        break;
      }

      case "rain_entry": {
        const sevenDaysAgo = new Date(nowRef - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(nowRef - 30 * 24 * 60 * 60 * 1000);
        const rainyDays = new Set<string>();
        let last7Mm = 0,
          last30Mm = 0,
          totalMm = 0;
        let latestEntryDate: string | null = null;
        for (const entry of docs) {
          const date = new Date(entry.payload.date);
          const amtMm = entry.payload.rainfall_amount;
          totalMm += amtMm;
          if (date >= sevenDaysAgo) last7Mm += amtMm;
          if (date >= thirtyDaysAgo) last30Mm += amtMm;
          rainyDays.add(date.toISOString().slice(0, 10));
          if (
            !latestEntryDate ||
            date.getTime() > new Date(latestEntryDate).getTime()
          ) {
            latestEntryDate = entry.payload.date;
          }
        }
        summary = {
          last7Mm: roundTo(last7Mm, 2),
          last30Mm: roundTo(last30Mm, 2),
          totalMm: roundTo(totalMm, 2),
          rainyDays: rainyDays.size,
          latestEntryDate,
        };
        break;
      }

      case "habit": {
        summary = computeMetrics(
          docs as unknown as Habit[],
        ) as unknown as Record<string, unknown>;
        break;
      }

      case "reading_item": {
        let unreadCount = 0;
        let readCount = 0;
        let highPriorityCount = 0;
        const typeSet = new Set<string>();
        let topPriority: { title: string } | null = null;

        for (const item of docs) {
          const payload = item.payload;
          if (payload.type) typeSet.add(payload.type);

          if (payload.is_read) {
            readCount++;
            continue;
          }

          unreadCount++;
          if (payload.priority === "high") {
            highPriorityCount++;
            if (!topPriority) {
              topPriority = { title: payload.title };
            }
          }
        }

        summary = {
          unreadCount,
          readCount,
          highPriorityCount,
          typeCount: typeSet.size,
          topPriority,
        };
        break;
      }

      case "blog_post": {
        const publishedPosts = docs.filter(
          (doc) => doc.payload.status === "published",
        );
        const latestPublishedPost =
          publishedPosts
            .slice()
            .sort(
              (a, b) =>
                new Date(
                  b.payload.published_at || b.created_at || 0,
                ).getTime() -
                new Date(a.payload.published_at || a.created_at || 0).getTime(),
            )[0] || null;

        const getReadTime = (content: string) => {
          const words = content.trim().split(/\s+/).filter(Boolean).length;
          if (words === 0) return 1;
          return Math.max(1, Math.ceil(words / 200));
        };

        summary = {
          total: docs.length,
          published: publishedPosts.length,
          drafts: docs.filter((doc) => doc.payload.status === "draft").length,
          archived: docs.filter((doc) => doc.payload.status === "archived")
            .length,
          totalReadMinutes: publishedPosts.reduce(
            (sum, doc) =>
              sum +
              (doc.payload.estimated_reading_time ||
                getReadTime(doc.payload.content || "")),
            0,
          ),
          latestPublishedPost: latestPublishedPost
            ? {
                title: latestPublishedPost.payload.title,
                readingTime:
                  latestPublishedPost.payload.estimated_reading_time ||
                  getReadTime(latestPublishedPost.payload.content || ""),
              }
            : null,
        };
        break;
      }

      case "book": {
        const readingBooks = docs
          .filter((doc) => doc.payload.status === "reading")
          .sort(
            (a, b) =>
              new Date(b.created_at).getTime() -
              new Date(a.created_at).getTime(),
          );
        const current = readingBooks[0] || null;
        const completedBooks = docs.filter(
          (doc) => doc.payload.status === "completed",
        );
        const ratedBooks = docs.filter((doc) => !!doc.payload.rating);
        const pagesRead = completedBooks.reduce(
          (sum, doc) => sum + (doc.payload.total_pages || 0),
          0,
        );
        const avgRating =
          ratedBooks.reduce((sum, doc) => sum + (doc.payload.rating || 0), 0) /
          Math.max(1, ratedBooks.length);
        const progress = current?.payload.total_pages
          ? Math.round(
              ((current.payload.current_page || 0) /
                current.payload.total_pages) *
                100,
            )
          : 0;

        summary = {
          total: docs.length,
          completedCount: completedBooks.length,
          avgRating,
          pagesRead,
          current: current
            ? {
                title: current.payload.title,
                author: current.payload.author,
                progress,
              }
            : null,
        };
        break;
      }

      case "person": {
        summary = getPeopleSummary(
          docs.map((doc) =>
            toPersonDocument(
              doc as unknown as ContentDocument<PersonPayload> & {
                _id: string;
              },
            ),
          ),
        ) as unknown as Record<string, unknown>;
        break;
      }

      case "expense": {
        const now = new Date(nowRef);
        const thisMonth: typeof docs = [];
        const lastMonth: typeof docs = [];

        for (const doc of docs) {
          const d = new Date(doc.payload.date);
          if (
            d.getMonth() === now.getMonth() &&
            d.getFullYear() === now.getFullYear()
          ) {
            thisMonth.push(doc);
          } else {
            const lm = new Date(now.getFullYear(), now.getMonth() - 1, 1);
            if (
              d.getMonth() === lm.getMonth() &&
              d.getFullYear() === lm.getFullYear()
            ) {
              lastMonth.push(doc);
            }
          }
        }

        const ttm = thisMonth.reduce((s, e) => s + (e.payload.amount || 0), 0);
        const tlm = lastMonth.reduce((s, e) => s + (e.payload.amount || 0), 0);
        const t = tlm > 0 ? ((ttm - tlm) / tlm) * 100 : 0;

        const categoryTotals = thisMonth.reduce<Record<string, number>>(
          (acc, e) => {
            const cat = e.payload.category || "Uncategorized";
            acc[cat] = (acc[cat] || 0) + (e.payload.amount || 0);
            return acc;
          },
          {},
        );
        const tc = Object.entries(categoryTotals).sort(
          (a, b) => b[1] - a[1],
        )[0];

        summary = {
          totalThisMonth: ttm,
          trend: t,
          topCategory: tc ? tc : null,
        };
        break;
      }

      case "ai_usage": {
        const now = new Date(nowRef);
        const thisMonth = now.getMonth();
        const thisYear = now.getFullYear();
        const lastMonthDate = new Date(thisYear, thisMonth - 1, 1);
        const lastMonth = lastMonthDate.getMonth();
        const lastYear = lastMonthDate.getFullYear();

        let totalThisMonth = 0;
        let totalLastMonth = 0;
        let totalTokens = 0;
        let thisMonthLength = 0;
        const providerCounts: Record<string, number> = {};

        for (const d of docs) {
          const p = d.payload;
          const dDate = new Date(p.date);
          const dMonth = dDate.getMonth();
          const dYear = dDate.getFullYear();
          const requestCount = p.num_requests || 1;

          if (dMonth === thisMonth && dYear === thisYear) {
            totalThisMonth += p.cost || 0;
            totalTokens += (p.input_tokens || 0) + (p.output_tokens || 0);
            thisMonthLength += requestCount;
            if (p.provider) {
              providerCounts[p.provider] =
                (providerCounts[p.provider] || 0) + requestCount;
            }
          } else if (dMonth === lastMonth && dYear === lastYear) {
            totalLastMonth += p.cost || 0;
          }
        }

        const trend =
          totalLastMonth > 0
            ? ((totalThisMonth - totalLastMonth) / totalLastMonth) * 100
            : 0;
        const topProvider =
          Object.entries(providerCounts).sort((a, b) => b[1] - a[1])[0] || null;

        summary = {
          totalCount: docs.length,
          totalThisMonth,
          trend,
          topProvider,
          totalTokens,
          thisMonthLength,
        };
        break;
      }

      case "portfolio_profile": {
        summary = (docs[0]?.payload || {}) as Record<string, unknown>;
        break;
      }

      default:
        summary = { total: docs.length };
        break;
    }

    return ApiSuccess(summary);
  } catch (error) {
    console.error("GET /api/widgets/summary failed:", error);
    return ApiError("Failed to fetch widget summary", 500);
  }
}
