import { describe, expect, it } from "vitest";
import {
  evaluateAllCalculatedFields,
  type FormulaContext,
} from "../FormulaEngine";

describe("FormulaEngine", () => {
  const baseContext: FormulaContext = {
    areaValues: {
      north: { yield: 100, weight: 2, loss: 10 },
      south: { yield: 40, weight: 1 },
      east: { yield: 0, weight: 0 },
    },
    summaryValues: {
      target: 180,
      penalty: 5,
    },
    calculatedValues: {
      baseRate: 4,
    },
    areaIds: ["north", "south", "east"],
    constants: {
      UNDRIED_TO_BAG_CONVERT: 120,
    },
  };

  it("resolves aggregate functions and arithmetic in-order", () => {
    const result = evaluateAllCalculatedFields(
      [
        { id: "avgYield", formula: "AVG(yield)" },
        { id: "spread", formula: "(SUM(yield) - MIN(yield)) / 2" },
      ],
      baseContext,
    );

    expect(result.avgYield).toBe(46.666666666666664);
    expect(result.spread).toBe(70);
  });

  it("supports weighted average with zero denominator fallback", () => {
    const noWeights: FormulaContext = {
      ...baseContext,
      areaValues: {
        north: { yield: 10, weight: 0 },
        south: { yield: 20, weight: 0 },
      },
      areaIds: ["north", "south"],
    };

    const result = evaluateAllCalculatedFields(
      [{ id: "adjusted", formula: "WEIGHTED_AVG(yield, weight)" }],
      noWeights,
    );

    expect(result.adjusted).toBe(0);
  });

  it("allows calculated field chaining and variable precedence", () => {
    const result = evaluateAllCalculatedFields(
      [
        { id: "totalProduction", formula: "total_yield" },
        {
          id: "targetRatio",
          formula: "(totalProduction - target) / UNDRIED_TO_BAG_CONVERT",
        },
      ],
      baseContext,
    );

    expect(result.totalProduction).toBe(140);
    expect(result.targetRatio).toBeCloseTo(-0.3333333333333333);
  });

  it("reuses prior calculated values for later formulas", () => {
    const result = evaluateAllCalculatedFields(
      [
        { id: "base", formula: "baseRate * 3" },
        { id: "adjusted", formula: "base + penalty" },
      ],
      baseContext,
    );

    expect(result.base).toBe(12);
    expect(result.adjusted).toBe(17);
  });

  it("returns 0 for invalid formulas and bad operations", () => {
    const result = evaluateAllCalculatedFields(
      [
        { id: "badArithmetic", formula: "(SUM(yield) / (" },
        { id: "divideByZero", formula: "10 / 0" },
        { id: "badChars", formula: "__proto__ + 1" },
      ],
      baseContext,
    );

    expect(result.badArithmetic).toBe(0);
    expect(result.divideByZero).toBe(0);
    expect(result.badChars).toBe(0);
  });

  it("supports ROUND helper and MIN/MAX bounds", () => {
    const result = evaluateAllCalculatedFields(
      [
        { id: "minYield", formula: "MIN(yield)" },
        { id: "maxYield", formula: "MAX(yield)" },
        { id: "rounded", formula: "ROUND((maxYield - minYield) / 3, 1)" },
      ],
      baseContext,
    );

    expect(result.minYield).toBe(0);
    expect(result.maxYield).toBe(100);
    expect(result.rounded).toBe(33.3);
  });
});
