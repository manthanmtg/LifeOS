import { Cloud, CloudDrizzle, CloudLightning, CloudRain } from "lucide-react";
import type {
  RainAnalytics,
  RainArea,
  RainAreaPortfolioSummary,
  RainAreaListItem,
  RainEntry,
  RainEntryListItem,
  RainFilters,
  RainFilterPreset,
  RainSettings,
  RainSource,
  RainUnit,
} from "./types";

export const DEFAULT_RAIN_SETTINGS: RainSettings = {
  defaultUnit: "mm",
  chartType: "bar",
};

export const UNIT_OPTIONS: RainUnit[] = ["mm", "cm", "in"];
export const CHART_OPTIONS: RainSettings["chartType"][] = ["bar", "area"];
export const QUICK_FILTER_PRESETS: Array<{
  id: RainFilterPreset;
  label: string;
}> = [
  { id: "all", label: "All" },
  { id: "last7", label: "Last 7d" },
  { id: "last30", label: "Last 30d" },
  { id: "heavy", label: "Heavy rain" },
  { id: "sensor", label: "Sensor" },
];
export const RAIN_SOURCE_OPTIONS: RainSource[] = [
  "manual",
  "sensor",
  "imported",
];

export const CONVERSION_TO_MM: Record<RainUnit, number> = {
  mm: 1,
  cm: 10,
  in: 25.4,
};

export const CONVERSION_FROM_MM: Record<RainUnit, number> = {
  mm: 1,
  cm: 0.1,
  in: 0.0393701,
};

export function getDefaultEntryDateTime(now = new Date()) {
  const iso = now.toISOString();
  return {
    date: iso.slice(0, 10),
    time: iso.slice(11, 16),
  };
}

export function parseDateInputToISO(dateOnly: string, timeOnly = "00:00") {
  return new Date(`${dateOnly}T${timeOnly}`).toISOString();
}

export function coerceRainSource(value: unknown): RainSource {
  return RAIN_SOURCE_OPTIONS.includes(value as RainSource)
    ? (value as RainSource)
    : "manual";
}

export function formatRainValue(mmValue: number, unit: RainUnit, digits = 2) {
  return Number((mmValue * CONVERSION_FROM_MM[unit]).toFixed(digits));
}

export function formatRainAmount(mmValue: number, unit: RainUnit, digits = 2) {
  return formatRainValue(mmValue, unit, digits).toFixed(digits);
}

export function getRainIntensity(mmAmount: number) {
  if (mmAmount <= 2.5) {
    return {
      label: "Light",
      color: "text-accent",
      bgColor: "bg-accent/10 border-accent/20",
      icon: CloudDrizzle,
    };
  }

  if (mmAmount <= 7.5) {
    return {
      label: "Moderate",
      color: "text-warning",
      bgColor: "bg-warning/10 border-warning/20",
      icon: Cloud,
    };
  }

  if (mmAmount <= 35) {
    return {
      label: "Heavy",
      color: "text-accent",
      bgColor: "bg-accent/10 border-accent/20",
      icon: CloudRain,
    };
  }

  return {
    label: "Very Heavy",
    color: "text-danger",
    bgColor: "bg-danger/10 border-danger/20",
    icon: CloudLightning,
  };
}

export function matchesRainFilters(
  entry: RainEntry,
  filters: RainFilters,
  displayUnit: RainUnit,
  now = new Date(),
) {
  let match = true;
  const entryValue =
    entry.payload.rainfall_amount * CONVERSION_FROM_MM[displayUnit];
  const entryDate = new Date(entry.payload.date);
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

  if (filters.preset === "last7" && entryDate < sevenDaysAgo) {
    match = false;
  }

  if (filters.preset === "last30" && entryDate < thirtyDaysAgo) {
    match = false;
  }

  if (filters.preset === "heavy" && entry.payload.rainfall_amount <= 7.5) {
    match = false;
  }

  if (filters.preset === "sensor" && entry.payload.source !== "sensor") {
    match = false;
  }

  if (filters.amountMin) {
    const minimum = Number.parseFloat(filters.amountMin);
    if (!Number.isNaN(minimum) && entryValue < minimum) {
      match = false;
    }
  }

  if (filters.amountMax) {
    const maximum = Number.parseFloat(filters.amountMax);
    if (!Number.isNaN(maximum) && entryValue > maximum) {
      match = false;
    }
  }

  if (filters.notes) {
    const notes = entry.payload.notes?.toLowerCase() ?? "";
    if (!notes.includes(filters.notes.toLowerCase())) {
      match = false;
    }
  }

  return match;
}

export function getAreaListItems(areas: RainArea[], entries: RainEntry[]) {
  const counts: Record<string, number> = {};
  const latestDates: Record<string, string> = {};

  for (const entry of entries) {
    const areaId = entry.payload.area_id;
    counts[areaId] = (counts[areaId] ?? 0) + 1;

    if (
      !latestDates[areaId] ||
      new Date(entry.payload.date).getTime() >
        new Date(latestDates[areaId]).getTime()
    ) {
      latestDates[areaId] = entry.payload.date;
    }
  }

  return areas.map<RainAreaListItem>((area) => ({
    area,
    entryCount: counts[area._id] ?? 0,
    lastRainLabel: latestDates[area._id]
      ? new Date(latestDates[area._id]).toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        })
      : undefined,
  }));
}

export function getVisibleRainEntries(
  entries: RainEntry[],
  selectedAreaId: string | null,
  filters: RainFilters,
  displayUnit: RainUnit,
  searchQuery: string,
  now = new Date(),
) {
  const query = searchQuery.trim().toLowerCase();

  return entries
    .filter((entry) => entry.payload.area_id === selectedAreaId)
    .filter((entry) => matchesRainFilters(entry, filters, displayUnit, now))
    .filter((entry) => {
      if (!query) {
        return true;
      }

      const searchText = [
        entry.payload.notes,
        entry.payload.source,
        new Date(entry.payload.date).toLocaleDateString(),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();

      return searchText.includes(query);
    })
    .sort(
      (left, right) =>
        new Date(right.payload.date).getTime() -
        new Date(left.payload.date).getTime(),
    )
    .map<RainEntryListItem>((entry) => {
      const entryDate = new Date(entry.payload.date);
      return {
        entry,
        displayAmount: formatRainAmount(
          entry.payload.rainfall_amount,
          displayUnit,
        ),
        monthLabel: entryDate.toLocaleDateString(undefined, { month: "short" }),
        dayLabel: String(entryDate.getDate()),
        dateLabel: entryDate.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
          year: "numeric",
        }),
        timeLabel: entryDate.toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        }),
      };
    });
}

export function buildRainAreaPortfolioSummary(
  areas: RainArea[],
  entries: RainEntry[],
  displayUnit: RainUnit,
  now = new Date(),
): RainAreaPortfolioSummary {
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const areaTotals = new Map<string, number>();
  const latestDates = new Map<string, string>();
  let last7TotalMm = 0;

  for (const entry of entries) {
    const areaId = entry.payload.area_id;
    const entryDate = new Date(entry.payload.date);
    const nextTotal =
      (areaTotals.get(areaId) ?? 0) + entry.payload.rainfall_amount;
    areaTotals.set(areaId, nextTotal);

    const latestDate = latestDates.get(areaId);
    if (!latestDate || entryDate.getTime() > new Date(latestDate).getTime()) {
      latestDates.set(areaId, entry.payload.date);
    }

    if (entryDate >= sevenDaysAgo) {
      last7TotalMm += entry.payload.rainfall_amount;
    }
  }

  const wettestAreaEntry = areas
    .map((area) => ({
      area,
      totalMm: areaTotals.get(area._id) ?? 0,
    }))
    .sort((left, right) => right.totalMm - left.totalMm)[0];

  const staleAreaCount = areas.filter((area) => {
    const latestDate = latestDates.get(area._id);
    if (!latestDate) {
      return true;
    }

    return new Date(latestDate) < sevenDaysAgo;
  }).length;

  return {
    totalAreas: areas.length,
    activeAreas: areas.filter((area) => area.payload.is_active).length,
    last7Total: formatRainValue(last7TotalMm, displayUnit),
    wettestArea:
      wettestAreaEntry && wettestAreaEntry.totalMm > 0
        ? {
            label: "Wettest area",
            value: wettestAreaEntry.area.payload.name,
            sublabel: `${formatRainAmount(wettestAreaEntry.totalMm, displayUnit)} ${displayUnit} total`,
          }
        : undefined,
    staleAreaCount,
  };
}

export function buildRainAnalytics(
  entries: RainEntry[],
  selectedAreaId: string | null,
  displayUnit: RainUnit,
  now = new Date(),
): RainAnalytics {
  const areaEntries = entries
    .filter((entry) => entry.payload.area_id === selectedAreaId)
    .sort(
      (left, right) =>
        new Date(left.payload.date).getTime() -
        new Date(right.payload.date).getTime(),
    );

  if (areaEntries.length === 0) {
    return {
      total: 0,
      last7: 0,
      last30: 0,
      prevLast30: 0,
      avgPerEntry: 0,
      maxSingle: 0,
      rainyDays: 0,
      chartData: [],
      dailyData: [],
    };
  }

  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

  let totalMm = 0;
  let last7Mm = 0;
  let last30Mm = 0;
  let prevLast30Mm = 0;
  let maxSingleMm = 0;

  const monthlyAggregate: Record<string, number> = {};
  const dailyAggregate: Record<string, number> = {};
  const rainyDays = new Set<string>();

  for (const entry of areaEntries) {
    const entryDate = new Date(entry.payload.date);
    const amountMm = entry.payload.rainfall_amount;

    totalMm += amountMm;
    maxSingleMm = Math.max(maxSingleMm, amountMm);

    if (entryDate >= sevenDaysAgo) {
      last7Mm += amountMm;
    }

    if (entryDate >= thirtyDaysAgo) {
      last30Mm += amountMm;
    }

    if (entryDate >= sixtyDaysAgo && entryDate < thirtyDaysAgo) {
      prevLast30Mm += amountMm;
    }

    const monthKey = `${entryDate.getFullYear()}-${String(entryDate.getMonth() + 1).padStart(2, "0")}`;
    monthlyAggregate[monthKey] = (monthlyAggregate[monthKey] ?? 0) + amountMm;

    const dayKey = entryDate.toISOString().slice(0, 10);
    dailyAggregate[dayKey] = (dailyAggregate[dayKey] ?? 0) + amountMm;
    rainyDays.add(dayKey);
  }

  const latestEntry = areaEntries[areaEntries.length - 1];
  const wettestMonthEntry = Object.entries(monthlyAggregate).sort(
    (left, right) => right[1] - left[1],
  )[0];
  const wettestDayEntry = Object.entries(dailyAggregate).sort(
    (left, right) => right[1] - left[1],
  )[0];
  const latestEntryDate = latestEntry
    ? new Date(latestEntry.payload.date)
    : null;
  const daysSinceLastEntry = latestEntryDate
    ? Math.max(
        0,
        Math.floor(
          (now.getTime() - latestEntryDate.getTime()) / (24 * 60 * 60 * 1000),
        ),
      )
    : 0;

  return {
    total: formatRainValue(totalMm, displayUnit),
    last7: formatRainValue(last7Mm, displayUnit),
    last30: formatRainValue(last30Mm, displayUnit),
    prevLast30: formatRainValue(prevLast30Mm, displayUnit),
    avgPerEntry: formatRainValue(totalMm / areaEntries.length, displayUnit),
    maxSingle: formatRainValue(maxSingleMm, displayUnit),
    rainyDays: rainyDays.size,
    chartData: Object.entries(monthlyAggregate)
      .sort(([left], [right]) => left.localeCompare(right))
      .slice(-12)
      .map(([month, amountMm]) => {
        const [year, monthNumber] = month.split("-");
        const labelDate = new Date(Number(year), Number(monthNumber) - 1);
        return {
          name: labelDate.toLocaleDateString(undefined, {
            month: "short",
            year: "2-digit",
          }),
          displayAmount: formatRainValue(amountMm, displayUnit),
        };
      }),
    dailyData: Array.from({ length: 30 }, (_, index) => {
      const date = new Date(now.getTime() - (29 - index) * 24 * 60 * 60 * 1000);
      const key = date.toISOString().slice(0, 10);
      return {
        day: date.toLocaleDateString(undefined, {
          month: "short",
          day: "numeric",
        }),
        amount: formatRainValue(dailyAggregate[key] ?? 0, displayUnit),
      };
    }),
    latestEntry: latestEntry
      ? {
          label: "Latest reading",
          value: `${formatRainAmount(latestEntry.payload.rainfall_amount, displayUnit)} ${displayUnit}`,
          sublabel: new Date(latestEntry.payload.date).toLocaleDateString(
            undefined,
            {
              month: "short",
              day: "numeric",
              year: "numeric",
            },
          ),
        }
      : undefined,
    wettestDay: wettestDayEntry
      ? {
          label: "Wettest day",
          value: `${formatRainAmount(wettestDayEntry[1], displayUnit)} ${displayUnit}`,
          sublabel: new Date(
            `${wettestDayEntry[0]}T00:00:00`,
          ).toLocaleDateString(undefined, {
            month: "short",
            day: "numeric",
            year: "numeric",
          }),
        }
      : undefined,
    averageRainyDay:
      rainyDays.size > 0
        ? {
            label: "Average rainy day",
            value: `${formatRainAmount(totalMm / rainyDays.size, displayUnit)} ${displayUnit}`,
            sublabel: `${rainyDays.size} ${rainyDays.size === 1 ? "day" : "days"} with rain`,
          }
        : undefined,
    drySpell: latestEntryDate
      ? {
          label: daysSinceLastEntry === 0 ? "Updated today" : "Dry spell",
          value:
            daysSinceLastEntry === 0
              ? "Fresh reading"
              : `${daysSinceLastEntry} ${daysSinceLastEntry === 1 ? "day" : "days"}`,
          sublabel: `Last reading ${latestEntryDate.toLocaleDateString(
            undefined,
            {
              month: "short",
              day: "numeric",
              year: "numeric",
            },
          )}`,
        }
      : undefined,
    wettestMonth: wettestMonthEntry
      ? {
          label: "Wettest month",
          value: `${formatRainAmount(wettestMonthEntry[1], displayUnit)} ${displayUnit}`,
          sublabel: new Date(
            `${wettestMonthEntry[0]}-01T00:00:00`,
          ).toLocaleDateString(undefined, {
            month: "long",
            year: "numeric",
          }),
        }
      : undefined,
  };
}

export function getLast30Trend(last30: number, prevLast30: number) {
  if (prevLast30 === 0) {
    return undefined;
  }

  return {
    value: ((last30 - prevLast30) / prevLast30) * 100,
    label: "vs prev 30d",
  };
}
