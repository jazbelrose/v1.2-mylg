import React from "react";
import { Plus } from "lucide-react";
import { cn } from "./utils";
import "./budget-add-item-button.css";

export interface BudgetAddItemButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  label?: string;
}

export const BudgetAddItemButton = React.forwardRef<
  HTMLButtonElement,
  BudgetAddItemButtonProps
>(({ className, label = "Add item", "aria-label": ariaLabel, type = "button", ...props }, ref) => {
  const computedAriaLabel = ariaLabel ?? label;

  return (
    <button
      ref={ref}
      type={type}
      className={cn("budget-add-item-button", className)}
      aria-label={computedAriaLabel}
      {...props}
    >
      <Plus aria-hidden size={16} strokeWidth={2} className="budget-add-item-button__icon" />
      <span className="budget-add-item-button__label">{label}</span>
    </button>
  );
});

BudgetAddItemButton.displayName = "BudgetAddItemButton";
