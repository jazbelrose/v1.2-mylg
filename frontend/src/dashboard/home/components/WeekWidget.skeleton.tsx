import React from "react";

import { cn } from "@/components/ui/utils";

type WeekWidgetSkeletonProps = {
  variant?: "desktop" | "mobile";
  className?: string;
};

const days = Array.from({ length: 7 });

const WeekWidgetSkeleton: React.FC<WeekWidgetSkeletonProps> = ({
  variant = "desktop",
  className,
}) => {
  const navSize = variant === "desktop" ? "h-10 w-10" : "h-9 w-9";
  const dayHeight = variant === "desktop" ? "h-20" : "h-16";

  return (
    <div
      className={cn(
        "week-widget",
        variant === "desktop" ? "week-widget--desktop" : "week-widget--mobile",
        "relative isolate flex w-full flex-col gap-4 rounded-[24px]",
        className
      )}
    >
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className={cn("skel rounded-2xl", navSize)} />
            <div className="skel h-5 w-40 rounded-md" />
          </div>
          <div className={cn("skel rounded-2xl", navSize)} />
        </div>
        <div className="skel h-3 w-24 rounded-md" />
      </div>

      <div
        className={cn(
          "grid gap-2",
          variant === "desktop"
            ? "grid-cols-7"
            : "grid-cols-7 sm:grid-cols-7"
        )}
      >
        {days.map((_, index) => (
          <div
            key={index}
            className={cn("skel rounded-2xl", dayHeight)}
          />
        ))}
      </div>

      <div className="mt-2 space-y-2">
        <div className="skel h-2 w-full rounded-full" />
        <div className="skel h-2 w-3/4 rounded-full" />
      </div>
    </div>
  );
};

export default WeekWidgetSkeleton;
