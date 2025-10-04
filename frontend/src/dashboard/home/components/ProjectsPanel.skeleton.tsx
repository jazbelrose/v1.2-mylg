import React from "react";

import { cn } from "@/components/ui/utils";

type ProjectsPanelSkeletonProps = {
  variant?: "desktop" | "mobile";
  className?: string;
};

const ProjectsPanelSkeleton: React.FC<ProjectsPanelSkeletonProps> = ({
  variant = "desktop",
  className,
}) => {
  const avatarCount = variant === "desktop" ? 7 : 5;
  const rowCount = variant === "desktop" ? 5 : 4;

  return (
    <div
      className={cn(
        "relative flex w-full flex-col gap-6 rounded-[24px] border border-white/10 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.35)] backdrop-blur-sm",
        variant === "mobile" ? "p-4" : "p-6",
        className
      )}
      style={{ background: "var(--bg2, #111111)" }}
    >
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="space-y-2">
          <div className="skel h-5 w-32 rounded-md" />
          <div className="skel h-3 w-24 rounded-md" />
        </div>
        <div className="skel h-6 w-20 rounded-full" />
      </div>

      <div className="flex items-center gap-3">
        {Array.from({ length: avatarCount }).map((_, index) => (
          <div key={index} className="skel h-10 w-10 rounded-full" />
        ))}
      </div>

      <div className="flex flex-col gap-4">
        {Array.from({ length: rowCount }).map((_, index) => (
          <div key={index} className="flex items-center gap-4">
            <div className="skel h-10 w-10 rounded-2xl" />
            <div className="flex flex-1 items-center justify-between gap-4">
              <div className="flex flex-1 flex-col gap-2">
                <div className="skel h-3 w-40 max-w-[16rem] rounded-md" />
                <div className="skel h-3 w-28 max-w-[10rem] rounded-md" />
              </div>
              <div className="skel h-3 w-20 rounded-md" />
            </div>
          </div>
        ))}
      </div>

      <div className="skel h-11 w-full rounded-2xl" />
    </div>
  );
};

export default ProjectsPanelSkeleton;
