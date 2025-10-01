import React from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";

import BudgetDonut, { type BudgetDonutSlice } from "./BudgetDonut";

describe("BudgetDonut", () => {
  const slices: BudgetDonutSlice[] = [
    { id: "design", label: "Design", value: 1000 },
    { id: "labor", label: "Labor", value: 500 },
  ];

  it("renders total label and accessible table", async () => {
    render(
      <div style={{ width: 320, height: 240 }}>
        <BudgetDonut
          data={slices}
          total={1500}
          ariaLabel="Test budget chart"
          totalFormatter={(value) => `$${value.toFixed(0)}`}
        />
      </div>
    );

    expect(screen.getByText("$1500")).toBeInTheDocument();
    expect(screen.getByRole("table", { name: "Test budget chart" })).toBeInTheDocument();
    expect(screen.getByText("Design")).toBeInTheDocument();
    expect(screen.getByText("Labor")).toBeInTheDocument();

    const centerButton = screen.getByRole("button", { name: /view budget allocation/i });
    fireEvent.mouseEnter(centerButton);

    const dialog = await screen.findByRole("dialog", { name: "Budget allocation breakdown" });
    expect(dialog).toBeInTheDocument();
    expect(within(dialog).getByText("Budget allocation")).toBeInTheDocument();
    expect(within(dialog).getByText("Design")).toBeInTheDocument();
    expect(within(dialog).getByText("66.7%"))
      .toBeInTheDocument();

    fireEvent.pointerDown(document.body);
    expect(
      screen.queryByRole("dialog", { name: "Budget allocation breakdown" })
    ).not.toBeInTheDocument();
  });

  it("refreshes the center popover when slice labels change", async () => {
    const { rerender } = render(
      <div style={{ width: 320, height: 240 }}>
        <BudgetDonut
          data={slices}
          total={1500}
          ariaLabel="Budget chart label change"
          totalFormatter={(value) => `$${value.toFixed(0)}`}
        />
      </div>
    );

    const centerButton = screen.getByRole("button", { name: /view budget allocation/i });

    fireEvent.mouseEnter(centerButton);
    const initialDialog = await screen.findByRole("dialog", {
      name: "Budget allocation breakdown",
    });
    expect(within(initialDialog).getByText("Design")).toBeInTheDocument();
    fireEvent.pointerDown(document.body);

    rerender(
      <div style={{ width: 320, height: 240 }}>
        <BudgetDonut
          data={[
            { id: "design", label: "Strategy", value: 1000 },
            { id: "labor", label: "Labor", value: 500 },
          ]}
          total={1500}
          ariaLabel="Budget chart label change"
          totalFormatter={(value) => `$${value.toFixed(0)}`}
        />
      </div>
    );

    fireEvent.pointerDown(document.body);
    fireEvent.mouseEnter(centerButton);
    const updatedDialog = await screen.findByRole("dialog", {
      name: "Budget allocation breakdown",
    });
    expect(within(updatedDialog).getByText("Strategy")).toBeInTheDocument();
  });
});
