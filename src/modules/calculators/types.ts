export type CalculatorCategoryId =
    | "core"
    | "debt"
    | "tax"
    | "returns"
    | "conversion"
    | "utilities";

export type CalculatorInputKind = "number" | "select" | "textarea";

export interface CalculatorInputOption {
    label: string;
    value: string;
}

export interface CalculatorInputDefinition {
    key: string;
    label: string;
    kind: CalculatorInputKind;
    defaultValue: string;
    min?: number;
    max?: number;
    step?: number;
    unit?: string;
    helper?: string;
    options?: CalculatorInputOption[];
    placeholder?: string;
}

export interface CalculatorMetric {
    label: string;
    value: string;
    tone?: "neutral" | "good" | "warn" | "bad";
}

export interface CalculatorResult {
    primaryLabel: string;
    primaryValue: string;
    secondaryValue?: string;
    metrics: CalculatorMetric[];
    notes?: string[];
}

export interface CalculatorDefinition {
    id: string;
    name: string;
    shortName: string;
    categoryId: CalculatorCategoryId;
    description: string;
    inputs: CalculatorInputDefinition[];
    compute: (values: Record<string, string>) => CalculatorResult;
}

export interface CalculatorCategory {
    id: CalculatorCategoryId;
    name: string;
    description: string;
}

export interface CalculatorsModuleSettings {
    enabledCategories: Record<string, boolean>;
    enabledCalculators: Record<string, boolean>;
    [key: string]: unknown;
}
