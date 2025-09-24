import type { FC } from "react";

import type { RangeDisplayMeta } from "./projectHeaderTypes";

interface RangeMetaProps {
  meta: RangeDisplayMeta | null;
  className?: string;
}

const RangeMeta: FC<RangeMetaProps> = ({ meta, className }) => {
  if (!meta) return null;

  const { start, end, duration, accessibleLabel, label } = meta;
  const hasDate = Boolean(start || end);
  const combinedClassName = ["meta", className].filter(Boolean).join(" ");

  return (
    <span className={combinedClassName} role="text" aria-label={accessibleLabel || label}>
      {start ? (
        <time dateTime={start.dateTime}>{start.label}</time>
      ) : null}
      {start && end ? (
        <span className="range-separator" aria-hidden="true">
          –
        </span>
      ) : null}
      {end ? (
        <time dateTime={end.dateTime}>{end.label}</time>
      ) : null}
      {hasDate ? (
        <span className="dot" aria-hidden="true">
          ·
        </span>
      ) : null}
      <span className="duration">
        <span className="clock" aria-hidden="true">
          ⏱
        </span>
        <span>{duration.label}</span>
      </span>
    </span>
  );
};

export default RangeMeta;
