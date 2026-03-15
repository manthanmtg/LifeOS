// --- Crop History Formula Engine ---
// Supports: SUM(field), AVG(field), WEIGHTED_AVG(value, weight), MIN(field), MAX(field), COUNT()
// Plus arithmetic: +, -, *, /, (, ), and direct variable references.

export interface FormulaContext {
    // Per-area values: { areaId: { fieldId: number } }
    areaValues: Record<string, Record<string, number>>;
    // Summary/period-level values (one per period)
    summaryValues: Record<string, number>;
    // Previously computed calculated field values (in order)
    calculatedValues: Record<string, number>;
    // Ordered list of area IDs
    areaIds: string[];
    // Constants defined per crop (e.g. UNDRIED_TO_BAG_CONVERT = 120)
    constants?: Record<string, number>;
}

// Resolve built-in aggregate functions into numeric values
function resolveFunctions(formula: string, ctx: FormulaContext): string {
    let expr = formula;

    // WEIGHTED_AVG(value_field, weight_field) — must come before simpler patterns
    expr = expr.replace(/WEIGHTED_AVG\(\s*(\w+)\s*,\s*(\w+)\s*\)/gi, (_match, valField, weightField) => {
        let numerator = 0;
        let denominator = 0;
        for (const areaId of ctx.areaIds) {
            const v = ctx.areaValues[areaId]?.[valField] ?? 0;
            const w = ctx.areaValues[areaId]?.[weightField] ?? 0;
            numerator += v * w;
            denominator += w;
        }
        return denominator === 0 ? "0" : (numerator / denominator).toString();
    });

    // SUM(field)
    expr = expr.replace(/SUM\(\s*(\w+)\s*\)/gi, (_match, fieldId) => {
        let total = 0;
        for (const areaId of ctx.areaIds) {
            total += ctx.areaValues[areaId]?.[fieldId] ?? 0;
        }
        return total.toString();
    });

    // AVG(field)
    expr = expr.replace(/AVG\(\s*(\w+)\s*\)/gi, (_match, fieldId) => {
        if (!ctx.areaIds.length) return "0";
        let total = 0;
        for (const areaId of ctx.areaIds) {
            total += ctx.areaValues[areaId]?.[fieldId] ?? 0;
        }
        return (total / ctx.areaIds.length).toString();
    });

    // MIN(field)
    expr = expr.replace(/MIN\(\s*(\w+)\s*\)/gi, (_match, fieldId) => {
        if (!ctx.areaIds.length) return "0";
        let min = Infinity;
        for (const areaId of ctx.areaIds) {
            const v = ctx.areaValues[areaId]?.[fieldId] ?? 0;
            if (v < min) min = v;
        }
        return min === Infinity ? "0" : min.toString();
    });

    // MAX(field)
    expr = expr.replace(/MAX\(\s*(\w+)\s*\)/gi, (_match, fieldId) => {
        if (!ctx.areaIds.length) return "0";
        let max = -Infinity;
        for (const areaId of ctx.areaIds) {
            const v = ctx.areaValues[areaId]?.[fieldId] ?? 0;
            if (v > max) max = v;
        }
        return max === -Infinity ? "0" : max.toString();
    });

    // COUNT()
    expr = expr.replace(/COUNT\(\s*\)/gi, () => {
        return ctx.areaIds.length.toString();
    });

    // ROUND(expr, decimals) — resolve after all other functions
    // Process from innermost out by looping
    let safety = 0;
    while (/ROUND\(/i.test(expr) && safety < 10) {
        expr = expr.replace(/ROUND\(\s*([^()]+?)\s*,\s*(\d+)\s*\)/gi, (_match, innerExpr, decimals) => {
            const val = safeEvaluateArithmetic(innerExpr.trim());
            if (val !== null && isFinite(val)) {
                return val.toFixed(Number(decimals));
            }
            return innerExpr;
        });
        safety++;
    }

    return expr;
}

// Resolve variable references to numeric values
function resolveVariables(expression: string, ctx: FormulaContext): string {
    let expr = expression;

    // Build flat lookup: total_field (sum across areas), summary fields, calculated fields
    const vars: Record<string, number> = {};

    // total_<field> = SUM across areas (backward compat with old formulas)
    const allFieldIds = new Set<string>();
    for (const areaId of ctx.areaIds) {
        for (const fieldId of Object.keys(ctx.areaValues[areaId] || {})) {
            allFieldIds.add(fieldId);
        }
    }
    for (const fieldId of allFieldIds) {
        let total = 0;
        for (const areaId of ctx.areaIds) {
            total += ctx.areaValues[areaId]?.[fieldId] ?? 0;
        }
        vars[`total_${fieldId}`] = total;
        // Also expose raw field id as total (for convenience / backward compat in simple formulas)
        if (!(fieldId in vars)) {
            vars[fieldId] = total;
        }
    }

    // Summary fields override (they take precedence as direct names)
    for (const [k, v] of Object.entries(ctx.summaryValues)) {
        vars[k] = v;
    }

    // Previously calculated fields
    for (const [k, v] of Object.entries(ctx.calculatedValues)) {
        vars[k] = v;
    }

    // Constants (e.g. UNDRIED_TO_BAG_CONVERT = 120)
    if (ctx.constants) {
        for (const [k, v] of Object.entries(ctx.constants)) {
            vars[k] = v;
        }
    }

    // Replace variables — sort by length descending to avoid partial matches
    const sortedVars = Object.keys(vars).sort((a, b) => b.length - a.length);
    for (const varName of sortedVars) {
        const val = vars[varName];
        const numVal = (val === undefined || isNaN(val)) ? 0 : val;
        const regex = new RegExp(`\\b${varName}\\b`, 'g');
        expr = expr.replace(regex, numVal.toString());
    }

    return expr;
}

// Safe recursive descent parser for arithmetic expressions
// Supports: +, -, *, /, (, ), unary minus, decimal numbers
function safeEvaluateArithmetic(expression: string): number | null {
    const trimmed = expression.trim();
    if (!trimmed) return null;
    // Reject anything that isn't numbers, operators, parens, whitespace, or decimal points
    if (/[^0-9+\-*/().\s]/.test(trimmed)) return null;

    let pos = 0;
    const input = trimmed;

    function skipWhitespace() {
        while (pos < input.length && input[pos] === ' ') pos++;
    }

    function parseNumber(): number | null {
        skipWhitespace();
        const start = pos;
        if (pos < input.length && (input[pos] === '-' || input[pos] === '+')) pos++;
        if (pos >= input.length || (input[pos] < '0' || input[pos] > '9') && input[pos] !== '.') {
            pos = start;
            return null;
        }
        while (pos < input.length && input[pos] >= '0' && input[pos] <= '9') pos++;
        if (pos < input.length && input[pos] === '.') {
            pos++;
            while (pos < input.length && input[pos] >= '0' && input[pos] <= '9') pos++;
        }
        const num = parseFloat(input.slice(start, pos));
        return isNaN(num) ? null : num;
    }

    function parsePrimary(): number | null {
        skipWhitespace();
        // Unary minus/plus
        if (pos < input.length && input[pos] === '-') {
            pos++;
            const val = parsePrimary();
            return val === null ? null : -val;
        }
        if (pos < input.length && input[pos] === '+') {
            pos++;
            return parsePrimary();
        }
        // Parenthesized expression
        if (pos < input.length && input[pos] === '(') {
            pos++; // skip '('
            const val = parseAddSub();
            skipWhitespace();
            if (pos >= input.length || input[pos] !== ')') return null;
            pos++; // skip ')'
            return val;
        }
        return parseNumber();
    }

    function parseMulDiv(): number | null {
        let left = parsePrimary();
        if (left === null) return null;
        while (true) {
            skipWhitespace();
            if (pos >= input.length) break;
            const op = input[pos];
            if (op !== '*' && op !== '/') break;
            pos++;
            const right = parsePrimary();
            if (right === null) return null;
            if (op === '*') left = left * right;
            else { if (right === 0) return null; left = left / right; }
        }
        return left;
    }

    function parseAddSub(): number | null {
        let left = parseMulDiv();
        if (left === null) return null;
        while (true) {
            skipWhitespace();
            if (pos >= input.length) break;
            const op = input[pos];
            if (op !== '+' && op !== '-') break;
            pos++;
            const right = parseMulDiv();
            if (right === null) return null;
            if (op === '+') left = left + right;
            else left = left - right;
        }
        return left;
    }

    try {
        const result = parseAddSub();
        skipWhitespace();
        // Ensure we consumed the entire input
        if (pos !== input.length) return null;
        if (result === null || !isFinite(result)) return null;
        return result;
    } catch {
        return null;
    }
}

// Public alias used by the rest of the module
function evaluateArithmetic(expression: string): number | null {
    return safeEvaluateArithmetic(expression);
}

/**
 * Evaluate a formula with full function and variable support.
 * Supports: SUM(field), AVG(field), WEIGHTED_AVG(val, weight), MIN(field), MAX(field), COUNT()
 * Plus: total_<field>, summary field names, calculated field names, and arithmetic.
 */
export function evaluateFormula(formula: string, ctx: FormulaContext): number | null {
    if (!formula) return null;

    try {
        // Step 1: Resolve aggregate functions
        let expr = resolveFunctions(formula, ctx);

        // Step 2: Resolve variable references
        expr = resolveVariables(expr, ctx);

        // Step 3: Evaluate arithmetic
        return evaluateArithmetic(expr);
    } catch (e) {
        console.error("Formula evaluation failed:", formula, e);
        return null;
    }
}

/**
 * Legacy simple evaluator (flat context). Kept for any edge-case usage.
 */
export function evaluateSimpleFormula(formula: string, context: Record<string, number>): number | null {
    if (!formula) return null;
    try {
        let expression = formula;
        const variables = Object.keys(context).sort((a, b) => b.length - a.length);
        for (const variable of variables) {
            const value = context[variable];
            const numValue = (value === undefined || isNaN(value)) ? 0 : value;
            const regex = new RegExp(`\\b${variable}\\b`, 'g');
            expression = expression.replace(regex, numValue.toString());
        }
        return evaluateArithmetic(expression);
    } catch {
        return null;
    }
}

// --- Utility: build a FormulaContext from raw data ---
export function buildFormulaContext(
    areaIds: string[],
    sourceData: Record<string, Record<string, number>>,  // areaId -> fieldId -> value
    summaryData: Record<string, number>,
): FormulaContext {
    return {
        areaValues: sourceData,
        summaryValues: summaryData,
        calculatedValues: {},
        areaIds,
    };
}

/**
 * Evaluate all calculated fields for a period in order, returning the full context.
 * Each calculated field can reference previous ones.
 */
export function evaluateAllCalculatedFields(
    calculatedFields: { id: string; formula: string }[],
    baseCtx: FormulaContext,
): Record<string, number> {
    const results: Record<string, number> = {};
    const ctx = { ...baseCtx, calculatedValues: { ...baseCtx.calculatedValues } };

    for (const cf of calculatedFields) {
        const val = evaluateFormula(cf.formula, ctx) ?? 0;
        results[cf.id] = val;
        ctx.calculatedValues[cf.id] = val;
    }

    return results;
}
