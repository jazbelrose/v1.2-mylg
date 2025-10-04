import React from "react";

const weekPillStyle: React.CSSProperties = {
  height: 54,
};

const navButtonStyle: React.CSSProperties = {
  width: 32,
  height: 28,
};

const progressStyle: React.CSSProperties = {
  height: 10,
};

const WeekWidgetSkeleton = ({ className = "" }: { className?: string }) => {
  const rootClass = ["skel", "rounded-3xl", className].filter(Boolean).join(" ");

  return (
    <div
      className={rootClass}
      style={{
        border: "1px solid rgba(255, 255, 255, 0.08)",
        padding: 14,
        minHeight: 168,
        pointerEvents: "none",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          gap: 12,
          marginBottom: 12,
        }}
      >
        <div style={{ flex: 1, display: "grid", gap: 6 }}>
          <div className="skel rounded-md" style={{ height: 14, width: "48%" }} />
          <div className="skel rounded-md" style={{ height: 12, width: "32%" }} />
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div className="skel rounded-md" style={navButtonStyle} />
          <div className="skel rounded-md" style={navButtonStyle} />
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(7, minmax(0, 1fr))",
          gap: 6,
          marginBottom: 14,
        }}
      >
        {Array.from({ length: 7 }).map((_, idx) => (
          <div key={idx} className="skel rounded-2xl" style={weekPillStyle} />
        ))}
      </div>

      <div style={{ display: "grid", gap: 8 }}>
        <div className="skel rounded-md" style={progressStyle} />
        <div className="skel rounded-md" style={progressStyle} />
      </div>
    </div>
  );
};

export default WeekWidgetSkeleton;
