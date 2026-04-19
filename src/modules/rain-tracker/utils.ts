import { Cloud, CloudDrizzle, CloudLightning, CloudRain } from "lucide-react";
import type {
  RainAnalytics,
  RainArea,
  RainAreaListItem,
  RainEntry,
  RainEntryListItem,
  RainFilters,
  RainSettings,
  RainUnit,
} from "./types";

export const DEFAULT_RAIN_SETTINGS: RainSettings = {
  defaultUnit: "mm",
  chartType: "bar",
};

export const UNIT_OPTIONS: RainUnit[] = ["mm", "cm", "in"];
export const CHART_OPTIONS: RainSettings["chartType"][] = ["bar", "area"];

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
) {
  let match = true;
  const entryValue =
    entry.payload.rainfall_amount * CONVERSION_FROM_MM[displayUnit];

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
) {
  const query = searchQuery.trim().toLowerCase();

  return entries
    .filter((entry) => entry.payload.area_id === selectedAreaId)
    .filter((entry) => matchesRainFilters(entry, filters, displayUnit))
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
