import React from "react";

import { cn } from "@/components/ui/utils";

type TasksRollupSkeletonProps = {
  variant?: "desktop" | "mobile";
  className?: string;
};

const TasksRollupSkeleton: React.FC<TasksRollupSkeletonProps> = ({
  variant = "desktop",
  className,
}) => {
  if (variant === "mobile") {
    return (
      <div
        className={cn(
          "flex w-full flex-col gap-4 rounded-[24px] border border-white/10 p-4 shadow-[0_16px_40px_rgba(0,0,0,0.35)] backdrop-blur-sm",
          className
        )}
        style={{ background: "var(--bg2, #111111)" }}
      >
        <div className="flex items-center justify-between gap-3">
          <div className="skel h-5 w-24 rounded-md" />
          <div className="skel h-6 w-16 rounded-md" />
        </div>
        <div className="flex gap-3 overflow-hidden">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="skel h-16 min-w-[120px] flex-1 rounded-2xl"
            />
          ))}
        </div>
        <div className="skel h-4 w-3/4 rounded-md" />
      </div>
    );
  }

  return (
    <div
      className={cn(
        "flex w-full flex-col gap-5 rounded-[24px] border border-white/10 p-6 shadow-[0_18px_48px_rgba(0,0,0,0.4)] backdrop-blur-sm",
        className
      )}
      style={{ background: "var(--bg2, #111111)" }}
    >
      <div className="flex items-center justify-between gap-4">
        <div className="space-y-2">
          <div className="skel h-5 w-28 rounded-md" />
          <div className="skel h-3 w-20 rounded-md" />
        </div>
        <div className="flex items-center gap-2">
          <div className="skel h-9 w-9 rounded-xl" />
          <div className="skel h-9 w-9 rounded-xl" />
        </div>
      </div>

      <div className="hidden gap-3 md:grid md:grid-cols-4">
        {Array.from({ length: 4 }).map((_, index) => (
          <div key={index} className="skel h-20 rounded-2xl" />
        ))}
      </div>
      <div className="flex gap-3 overflow-hidden md:hidden">
        {Array.from({ length: 4 }).map((_, index) => (
          <div
            key={index}
            className="skel h-16 min-w-[130px] flex-1 rounded-2xl"
          />
        ))}
      </div>

      <div className="space-y-3">
        {Array.from({ length: 3 }).map((_, index) => (
          <div key={index} className="flex flex-wrap items-center gap-2">
            <div className="skel h-3 w-16 rounded-md" />
            <div className="skel h-7 w-24 rounded-full" />
            <div className="skel h-7 w-32 rounded-full" />
          </div>
        ))}
      </div>

      <div className="skel h-3 w-36 rounded-md" />
    </div>
  );
};

export default TasksRollupSkeleton;
