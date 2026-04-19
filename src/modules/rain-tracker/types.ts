export type RainUnit = "mm" | "cm" | "in";
export type RainChartType = "bar" | "area";
export type RainSource = "manual" | "sensor" | "imported";

export interface RainArea {
  _id: string;
  created_at: string;
  payload: {
    name: string;
    location?: string;
    description?: string;
    is_active: boolean;
  };
}

export interface RainEntry {
  _id: string;
  created_at: string;
  payload: {
    area_id: string;
    rainfall_amount: number;
    rainfall_unit: RainUnit;
    date: string;
    notes?: string;
    source?: RainSource;
  };
}

export interface RainSettings {
  defaultUnit: RainUnit;
  chartType: RainChartType;
  [key: string]: unknown;
}

export interface RainFilters {
  amountMin: string;
  amountMax: string;
  notes: string;
}

export interface RainAreaListItem {
  area: RainArea;
  entryCount: number;
  lastRainLabel?: string;
}

export interface RainEntryListItem {
  entry: RainEntry;
  displayAmount: string;
  monthLabel: string;
  dayLabel: string;
  dateLabel: string;
  timeLabel: string;
}

export interface RainChartPoint {
  name: string;
  displayAmount: number;
}

export interface RainDailyPoint {
  day: string;
  amount: number;
}

export interface RainInsight {
  label: string;
  value: string;
  sublabel: string;
}

export interface RainAnalytics {
  total: number;
  last7: number;
  last30: number;
  prevLast30: number;
  avgPerEntry: number;
  maxSingle: number;
  rainyDays: number;
  chartData: RainChartPoint[];
  dailyData: RainDailyPoint[];
  latestEntry?: RainInsight;
  wettestMonth?: RainInsight;
}

export interface RainSummary {
  last7Mm: number;
  last30Mm: number;
  totalMm: number;
  rainyDays: number;
  latestEntryDate?: string;
}
