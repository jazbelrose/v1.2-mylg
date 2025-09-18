import React from "react";
import { render } from "@testing-library/react";
import { vi, test, expect } from "vitest";
import VisxPieChart from "./VisxPieChart";

// Mock the dependencies
vi.mock("@visx/shape", () => ({
  Pie: () => null,
}));

vi.mock("@visx/group", () => ({
  Group: () => null,
}));

vi.mock("@visx/responsive", () => ({
  ParentSize: ({ children }: { children: (size: { width: number; height: number }) => React.ReactNode }) =>
    children({ width: 400, height: 400 }),
}));

vi.mock("@visx/tooltip", () => ({
  useTooltip: () => ({}),
  useTooltipInPortal: () => ({}),
}));

vi.mock("@visx/event", () => ({
  localPoint: vi.fn(),
}));

vi.mock("@react-spring/web", () => ({
  animated: {
    path: "path",
    circle: "circle",
    text: "text",
  },
  useSpring: vi.fn(() => ({})),
  to: vi.fn(),
}));

vi.mock("@/shared/utils/budgetUtils", () => ({
  formatUSD: (value: number) => `$${value}`,
}));

vi.mock("@/shared/utils/colorUtils", () => ({
  CHART_COLORS: ["#000"],
  generateSequentialPalette: vi.fn(() => ["#000"]),
  getColor: vi.fn(() => "#000"),
}));

vi.mock("@/app/contexts/useData", () => ({
  useData: vi.fn(() => ({})),
}));

test("renders VisxPieChart component", () => {
  render(<VisxPieChart data={[]} total={0} />);
  expect(document.body).toBeTruthy();
});








