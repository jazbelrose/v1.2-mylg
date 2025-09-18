import React, {
  forwardRef,
  type ButtonHTMLAttributes,
  type HTMLAttributes,
  type InputHTMLAttributes,
} from "react";
import styles from "./dashboard-panel-header.module.css";

const cx = (...values: Array<string | null | undefined | false>): string =>
  values.filter(Boolean).join(" ");

type HeaderProps = HTMLAttributes<HTMLElement>;

export const DashboardPanelHeader = forwardRef<HTMLElement, HeaderProps>(
  ({ className, ...props }, ref) => (
    <header ref={ref} className={cx(styles.header, className)} {...props} />
  ),
);
DashboardPanelHeader.displayName = "DashboardPanelHeader";

type TitleWrapProps = HTMLAttributes<HTMLDivElement>;

export const DashboardPanelTitleWrap = ({ className, ...props }: TitleWrapProps) => (
  <div className={cx(styles.titleWrap, className)} {...props} />
);

export const DashboardPanelTitle = ({
  className,
  ...props
}: HTMLAttributes<HTMLHeadingElement>) => (
  <h2 className={cx(styles.title, className)} {...props} />
);

type ActionsProps = HTMLAttributes<HTMLDivElement>;

export const DashboardPanelActions = ({ className, ...props }: ActionsProps) => (
  <div className={cx(styles.actions, className)} {...props} />
);

type PillsProps = HTMLAttributes<HTMLDivElement>;

export const DashboardPanelPills = ({ className, ...props }: PillsProps) => (
  <div className={cx(styles.pills, className)} {...props} />
);

type PillButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
  variant?: "default" | "sort" | "icon";
};

export const DashboardPanelPillButton = forwardRef<HTMLButtonElement, PillButtonProps>(
  ({ active = false, variant = "default", className, type, ...props }, ref) => {
    const variantClass =
      variant === "sort"
        ? styles.pillSort
        : variant === "icon"
        ? styles.pillIcon
        : undefined;
    return (
      <button
        ref={ref}
        type={type ?? "button"}
        className={cx(styles.pill, variantClass, active && styles.pillActive, className)}
        {...props}
      />
    );
  },
);
DashboardPanelPillButton.displayName = "DashboardPanelPillButton";

type SortWrapperProps = HTMLAttributes<HTMLDivElement>;

export const DashboardPanelSortWrapper = forwardRef<HTMLDivElement, SortWrapperProps>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cx(styles.sortWrapper, className)} {...props} />
  ),
);
DashboardPanelSortWrapper.displayName = "DashboardPanelSortWrapper";

export const DashboardPanelSortMenu = forwardRef<HTMLDivElement, HTMLAttributes<HTMLDivElement>>(
  ({ className, ...props }, ref) => (
    <div ref={ref} className={cx(styles.sortMenu, className)} {...props} />
  ),
);
DashboardPanelSortMenu.displayName = "DashboardPanelSortMenu";

type ActionGroupProps = HTMLAttributes<HTMLDivElement>;

export const DashboardPanelActionGroup = ({
  className,
  ...props
}: ActionGroupProps) => (
  <div className={cx(styles.rightControls, className)} {...props} />
);

type SearchContainerProps = HTMLAttributes<HTMLDivElement>;

export const DashboardPanelSearchContainer = ({
  className,
  ...props
}: SearchContainerProps) => (
  <div className={cx(styles.searchContainer, className)} {...props} />
);

type SearchInputProps = InputHTMLAttributes<HTMLInputElement>;

export const DashboardPanelSearchInput = forwardRef<HTMLInputElement, SearchInputProps>(
  ({ className, type, ...props }, ref) => (
    <input
      ref={ref}
      type={type ?? "search"}
      className={cx(styles.searchInput, className)}
      {...props}
    />
  ),
);
DashboardPanelSearchInput.displayName = "DashboardPanelSearchInput";

type ViewToggleProps = HTMLAttributes<HTMLDivElement>;

export const DashboardPanelViewToggle = ({ className, ...props }: ViewToggleProps) => (
  <div className={cx(styles.viewToggle, className)} {...props} />
);

type ViewToggleButtonProps = ButtonHTMLAttributes<HTMLButtonElement> & {
  active?: boolean;
};

export const DashboardPanelViewToggleButton = forwardRef<
  HTMLButtonElement,
  ViewToggleButtonProps
>(({ active = false, className, type, ...props }, ref) => (
  <button
    ref={ref}
    type={type ?? "button"}
    className={cx(styles.viewToggleButton, active && styles.viewToggleButtonActive, className)}
    {...props}
  />
));
DashboardPanelViewToggleButton.displayName = "DashboardPanelViewToggleButton";

