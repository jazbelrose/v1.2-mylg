import { describe, expect, it } from "vitest";

import { parseBudget } from "./budgetUtils";

describe("parseBudget", () => {
  it("returns numeric input unchanged", () => {
    expect(parseBudget(1250)).toBe(1250);
  });

  it("parses formatted currency strings", () => {
    expect(parseBudget("$1,234.50")).toBeCloseTo(1234.5);
  });

  it("parses currency codes and accounting negatives", () => {
    expect(parseBudget("USD ($2,500.75)")).toBeCloseTo(-2500.75);
  });

  it("handles magnitude suffixes", () => {
    expect(parseBudget("1.5k")).toBeCloseTo(1500);
    expect(parseBudget("2m")).toBeCloseTo(2_000_000);
  });

  it("strips non-numeric characters", () => {
    expect(parseBudget("€ 3 200")).toBeCloseTo(3200);
    expect(parseBudget("approx. $987")).toBeCloseTo(987);
  });
});
