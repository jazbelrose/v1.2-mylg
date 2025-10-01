import React from "react";
import { render, act } from "@testing-library/react";
import { vi } from "vitest";
import BudgetStateManager from "./BudgetStateManager";
import { useBudget } from "@/dashboard/project/features/budget/context/BudgetContext";
import { updateBudgetItem } from "@/shared/utils/api";

vi.mock("@/dashboard/project/features/budget/context/BudgetContext", () => ({
  useBudget: vi.fn(),
}));

vi.mock("@/shared/utils/api", () => ({
  updateBudgetItem: vi.fn(),
}));

describe("BudgetStateManager header totals", () => {
  const mockedUseBudget = vi.mocked(useBudget);
  const mockedUpdateBudgetItem = vi.mocked(updateBudgetItem);

  afterEach(() => {
    vi.clearAllMocks();
  });

  test("syncHeaderTotals sums stored actual totals without quantity or reconciled influence", async () => {
    type Header = {
      budgetItemId: string;
      revision: number;
      headerBudgetedTotalCost: number;
      headerActualTotalCost: number;
      headerFinalTotalCost: number;
      headerEffectiveMarkup: number;
    };

    let header: Header = {
      budgetItemId: "header-1",
      revision: 3,
      headerBudgetedTotalCost: 0,
      headerActualTotalCost: 0,
      headerFinalTotalCost: 0,
      headerEffectiveMarkup: 0,
    };

    const setBudgetHeader = vi.fn(
      (update: Header | ((prev: Header) => Header)) => {
        if (typeof update === "function") {
          header = (update as (prev: Header) => Header)(header);
        } else {
          header = update;
        }
        return header;
      }
    );

    mockedUseBudget.mockReturnValue({
      budgetHeader: header,
      budgetItems: [],
      setBudgetHeader,
      setBudgetItems: vi.fn(),
    } as unknown as ReturnType<typeof useBudget>);

    mockedUpdateBudgetItem.mockResolvedValue(undefined);

    let capturedState: any;

    render(
      <BudgetStateManager activeProject={{ projectId: "proj-1" } as any }>
        {(state) => {
          capturedState = state;
          return null;
        }}
      </BudgetStateManager>
    );

    expect(capturedState).toBeDefined();

    const items = [
      {
        quantity: 5,
        itemBudgetedCost: 20,
        itemActualCost: 100,
        itemReconciledCost: 999,
      },
      {
        quantity: 3,
        itemBudgetedCost: 40,
        itemActualCost: 50,
      },
      {
        quantity: 2,
        itemBudgetedCost: 30,
        itemReconciledCost: 75,
      },
    ];

    const totals = capturedState.calculateHeaderTotals(items);
    expect(totals.actual).toBeCloseTo(150);

    await act(async () => {
      await capturedState.syncHeaderTotals(items);
    });

    expect(mockedUpdateBudgetItem).toHaveBeenCalledWith(
      "proj-1",
      "header-1",
      expect.objectContaining({
        headerActualTotalCost: 150,
      })
    );

    expect(header.headerActualTotalCost).toBe(150);
    expect(setBudgetHeader).toHaveBeenCalled();
  });
});
