import React from "react";

const TasksRollupSkeleton = ({ className = "" }: { className?: string }) => {
  const rootClass = ["skel", "rounded-3xl", className, "tasks-rollup-skeleton"].filter(Boolean).join(" ");

  return (
    <div
      className={rootClass}
      style={{
        border: "1px solid rgba(255, 255, 255, 0.08)",
        padding: 16,
        minHeight: 140,
        pointerEvents: "none",
        width: "100%",
      }}
    >
      <div className="skel rounded-md" style={{ height: 12, width: "38%" }} />

      <div className="tasks-rollup-skeleton-metrics">
        {Array.from({ length: 4 }).map((_, idx) => (
          <div key={idx} className="skel rounded-2xl tasks-rollup-skeleton-pill">
            <div className="skel rounded-md" style={{ height: 12, width: "64%" }} />
            <div className="skel rounded-md" style={{ height: 18, width: "48%" }} />
          </div>
        ))}
      </div>

      <div className="skel rounded-md" style={{ height: 10, width: "44%" }} />
    </div>
  );
};

export default TasksRollupSkeleton;
