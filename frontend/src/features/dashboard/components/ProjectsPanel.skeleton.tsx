import React from "react";

const avatarStyle: React.CSSProperties = {
  width: 36,
  height: 36,
  borderRadius: 12,
};

const iconStyle: React.CSSProperties = {
  width: 32,
  height: 32,
  borderRadius: 10,
};

const titleLine = (width: string) => (
  <div className="skel rounded-md" style={{ height: 12, width }} />
);

const ProjectsPanelSkeleton = ({ className = "" }: { className?: string }) => {
  const rootClass = ["skel", "rounded-3xl", className].filter(Boolean).join(" ");

  return (
    <div
      className={rootClass}
      style={{
        border: "1px solid rgba(255, 255, 255, 0.08)",
        padding: 16,
        minHeight: 275,
        display: "flex",
        flexDirection: "column",
        gap: 14,
        pointerEvents: "none",
        width: "100%",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: 12,
        }}
      >
        <div style={{ flex: 1, display: "grid", gap: 6 }}>
          {titleLine("58%")}
          <div className="skel rounded-md" style={{ height: 10, width: "36%" }} />
        </div>
        <div className="skel rounded-md" style={{ width: 68, height: 22 }} />
      </div>

      <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
        {Array.from({ length: 5 }).map((_, idx) => (
          <div key={idx} className="skel rounded-xl" style={avatarStyle} />
        ))}
        <div className="skel rounded-md" style={{ width: 42, height: 18 }} />
      </div>

      <div style={{ display: "grid", gap: 12, flex: 1 }}>
        {Array.from({ length: 5 }).map((_, idx) => (
          <div
            key={idx}
            style={{
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              gap: 12,
              alignItems: "center",
            }}
          >
            <div className="skel rounded-xl" style={iconStyle} />
            <div style={{ display: "grid", gap: 6 }}>
              {titleLine("72%")}
              <div className="skel rounded-md" style={{ height: 10, width: "48%" }} />
            </div>
            <div className="skel rounded-md" style={{ width: 54, height: 10 }} />
          </div>
        ))}
      </div>

      <div className="skel rounded-xl" style={{ height: 36 }} />
    </div>
  );
};

export default ProjectsPanelSkeleton;
