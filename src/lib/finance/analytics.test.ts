import { describe, expect, it } from "vitest";
import { demoDashboard } from "@/lib/data/demo";
import { createFinancialSnapshot, projectScenario } from "./analytics";

describe("deterministic analytics", () => {
  it("creates a snapshot from known dashboard values", () => {
    const snapshot = createFinancialSnapshot(demoDashboard);
    expect(snapshot.surplusMinor).toBe(demoDashboard.incomeMinor - demoDashboard.spendingMinor);
    expect(snapshot.topCategories[0]?.name).toBe("Housing");
  });

  it("projects a scenario without compounding or hidden assumptions", () => {
    expect(projectScenario(10000, 5000, 3000, 3)).toEqual([
      { month: 1, balanceMinor: 12000 },
      { month: 2, balanceMinor: 14000 },
      { month: 3, balanceMinor: 16000 },
    ]);
  });
});
