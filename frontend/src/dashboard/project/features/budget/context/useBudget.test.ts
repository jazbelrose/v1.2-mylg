import { describe, it, expect, beforeEach, vi } from "vitest";
import { renderHook, waitFor } from "@testing-library/react";

const apiMocks = vi.hoisted(() => ({
  fetchBudgetHeader: vi.fn(),
  fetchBudgetItems: vi.fn(),
}));

vi.mock("@/shared/utils/api", () => ({
  fetchBudgetHeader: apiMocks.fetchBudgetHeader,
  fetchBudgetItems: apiMocks.fetchBudgetItems,
}));

describe("useBudgetData", () => {
  beforeEach(() => {
    vi.resetModules();
    apiMocks.fetchBudgetHeader.mockReset();
    apiMocks.fetchBudgetItems.mockReset();
  });

  it("updates cached project data when backend responses change", async () => {
    const headerV1 = { budgetId: "b1", revision: 1, total: 100 };
    const headerV2 = { budgetId: "b1", revision: 2, total: 250 };

    apiMocks.fetchBudgetHeader.mockResolvedValueOnce(headerV1);
    apiMocks.fetchBudgetItems.mockResolvedValue([]);

    const { default: useBudgetData } = await import("./useBudget");

    const firstRender = renderHook(() => useBudgetData("project-1"));

    await waitFor(() => {
      expect(firstRender.result.current.budgetHeader).toEqual(headerV1);
      expect(firstRender.result.current.loading).toBe(false);
    });

    firstRender.unmount();

    apiMocks.fetchBudgetHeader.mockResolvedValueOnce(headerV2);
    apiMocks.fetchBudgetItems.mockResolvedValue([]);

    const secondRender = renderHook(() => useBudgetData("project-1"));

    // Hydrates from cache immediately
    expect(secondRender.result.current.budgetHeader).toEqual(headerV1);

    await waitFor(() => {
      expect(secondRender.result.current.budgetHeader).toEqual(headerV2);
      expect(secondRender.result.current.loading).toBe(false);
    });

    expect(apiMocks.fetchBudgetHeader).toHaveBeenCalledTimes(2);
  });
});
