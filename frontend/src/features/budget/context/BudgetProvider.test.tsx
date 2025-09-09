import React from "react";
import { render } from "@testing-library/react";
import { vi } from "vitest";
import { BudgetProvider, useBudget } from "./BudgetProvider";

// Mock the dependencies
vi.mock("@/app/contexts/SocketContext", () => ({
  useSocket: () => ({ ws: null, isConnected: false }),
}));

vi.mock("@/app/contexts/DataProvider", () => ({
  useData: () => ({ user: { firstName: "Test" }, userId: "test-user" }),
}));

vi.mock("./useBudget", () => ({
  __esModule: true,
  default: () => ({
    budgetHeader: {
      headerBallPark: 1000,
      headerFinalTotalCost: 1500,
      headerBudgetedTotalCost: 1200,
      headerActualTotalCost: 1100,
      headerEffectiveMarkup: 0.25,
      revision: 1,
    },
    budgetItems: [
      { itemBudgetedCost: 500, invoiceGroup: "Group A" },
      { itemBudgetedCost: 300, invoiceGroup: "Group B" },
      { itemBudgetedCost: 700, invoiceGroup: "Group A" },
    ],
    setBudgetHeader: vi.fn(),
    setBudgetItems: vi.fn(),
    refresh: vi.fn(),
    loading: false,
  }),
}));

// Test component to access context
const TestComponent = () => {
  const { getStats, getPie, wsOps } = useBudget();
  
  const stats = getStats();
  const pieData = getPie("invoiceGroup");
  
  return (
    <div>
      <div data-testid="ballpark">{stats.ballpark}</div>
      <div data-testid="final-cost">{stats.finalCost}</div>
      <div data-testid="pie-length">{pieData.length}</div>
      <div data-testid="ws-ops-available">{typeof wsOps.emitBudgetUpdate === 'function' ? 'true' : 'false'}</div>
    </div>
  );
};

describe("BudgetProvider", () => {
  test("provides memoized selectors with correct data", () => {
    const { getByTestId } = render(
      <BudgetProvider projectId="test-project">
        <TestComponent />
      </BudgetProvider>
    );

    // Test that stats are calculated correctly
    expect(getByTestId("ballpark")).toHaveTextContent("1000"); // Should use headerBallPark when no final costs
    expect(getByTestId("final-cost")).toHaveTextContent("1500");
    
    // Test that pie data falls back to ballpark when no final costs
    expect(getByTestId("pie-length")).toHaveTextContent("1");
    
    // Test that WebSocket operations are available
    expect(getByTestId("ws-ops-available")).toHaveTextContent("true");
  });

  test("getStats returns correct ballpark when no final costs available", () => {
    // This test should pass since the mocked budgetItems have no itemFinalCost
    const TestComponentNoCosts = () => {
      const { getStats, getPie } = useBudget();
      const stats = getStats();
      const pieData = getPie("invoiceGroup");
      
      return (
        <div>
          <div data-testid="ballpark-no-costs">{stats.ballpark}</div>
          <div data-testid="pie-length-no-costs">{pieData.length}</div>
        </div>
      );
    };

    const { getByTestId } = render(
      <BudgetProvider projectId="test-project">
        <TestComponentNoCosts />
      </BudgetProvider>
    );

    // Should use ballpark when no final costs
    expect(getByTestId("ballpark-no-costs")).toHaveTextContent("1000");
    // Should return single ballpark item when no final costs
    expect(getByTestId("pie-length-no-costs")).toHaveTextContent("1");
  });
});