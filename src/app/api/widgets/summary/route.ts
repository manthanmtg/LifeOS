/* eslint-disable @typescript-eslint/no-explicit-any */
import { getDb } from "@/lib/mongodb";
import { ContentDocument } from "@/lib/types";
import { ApiSuccess, ApiError } from "@/lib/api-response";
import { cookies } from "next/headers";
import { verifyToken } from "@/lib/auth";

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

function computeScheduleLite(loan: any, decimals: number) {
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
      (a: any) => !!a.effective_date && Number.isFinite(a.annual_interest_rate),
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
    const docs = (await contentColl
      .find({ module_type, is_public: false })
      .toArray()) as any[];

    let summary: any = {};
    const nowRef = Date.now();

    switch (module_type) {
      case "vehicle": {
        let alertCount = 0;
        let latestService: any = null;
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
        let latestVisit: any = null;
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

      case "recurring_expense": {
        const act = docs.filter((s) => s.payload.is_active);

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
        let nextRenewal: any = null;

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
        let recentBill: any = null;

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

        const folderDocs = await contentColl
          .find({ module_type: "bill_folder", is_public: false })
          .toArray();

        summary = {
          total: docs.length,
          folderCount: folderDocs.length,
          totalAttachments,
          recentBill,
        };
        break;
      }

      case "rain_entry": {
        const sevenDaysAgo = new Date(nowRef - 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysAgo = new Date(nowRef - 30 * 24 * 60 * 60 * 1000);
        let last7Mm = 0,
          last30Mm = 0,
          totalMm = 0;
        for (const entry of docs) {
          const date = new Date(entry.payload.date);
          const amtMm = entry.payload.rainfall_amount;
          totalMm += amtMm;
          if (date >= sevenDaysAgo) last7Mm += amtMm;
          if (date >= thirtyDaysAgo) last30Mm += amtMm;
        }
        summary = {
          last7Mm: roundTo(last7Mm, 2),
          last30Mm: roundTo(last30Mm, 2),
          totalMm: roundTo(totalMm, 2),
        };
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
