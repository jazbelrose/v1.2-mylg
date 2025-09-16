import React, { useMemo, useState } from "react";
import WeekWidget, { type Track, type Dot } from "@/features/dashboard/components/WeekWidget";
import { useData } from "@/app/contexts/useData";
import { getColor } from "@/shared/utils/colorUtils";
import Squircle from "@/shared/ui/Squircle";
import styles from "./WeekWidgetCard.module.css";

const CARD_RADIUS = 24;
const CARD_CORNER_RADII = Object.freeze({ top: CARD_RADIUS + 2, bottom: CARD_RADIUS - 2 });

type TimelineEvent = { date?: string; description?: string; [k: string]: unknown };
type Project = {
  projectId: string;
  title?: string;
  color?: string;
  dateCreated?: string;
  finishline?: string;
  timelineEvents?: TimelineEvent[];
};

const MAX_VISIBLE_TRACKS = 3;

type WeekWidgetCardProps = {
  className?: string;
};

function toDay(d?: string | Date | number) {
  if (!d) return null;
  const v = d instanceof Date ? d : new Date(d);
  return Number.isNaN(v.getTime()) ? null : new Date(v.getFullYear(), v.getMonth(), v.getDate());
}

function sameDay(a: Date | null, b: Date | null) {
  return !!(a && b) &&
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate();
}

const WeekWidgetCard: React.FC<WeekWidgetCardProps> = ({ className }) => {
  const { projects = [] } = useData() as { projects: Project[] };
  const [weekOf, setWeekOf] = useState<Date>(new Date());

  const colorMap = useMemo(() => {
    const m: Record<string, string> = {};
    for (const p of projects) m[p.projectId] = p.color || getColor(p.projectId);
    return m;
  }, [projects]);

  const tracks: Track[] = useMemo(() => {
    return projects
      .map((p) => {
        const start = toDay(p.dateCreated);
        const end = toDay(p.finishline);
        if (!start || !end || end < start) return null;
        return { id: p.projectId, color: colorMap[p.projectId] || "#FA3356", start, end };
      })
      .filter(Boolean) as Track[];
  }, [projects, colorMap]);

  const dots: Dot[] = useMemo(() => {
    const out: Dot[] = [];
    for (const p of projects) {
      for (const ev of p.timelineEvents ?? []) {
        const d = toDay(ev.date);
        if (d) out.push({ date: d, color: colorMap[p.projectId] || "#FA3356" });
      }
    }
    return out;
  }, [projects, colorMap]);

  const moreCount = Math.max(0, tracks.length - MAX_VISIBLE_TRACKS);

  const getTooltipItems = (date: Date) => {
    const day = toDay(date)!;
    const items: { id: string; title?: string; color?: string; note?: string }[] = [];

    for (const p of projects) {
      const color = colorMap[p.projectId] || "#FA3356";
      const start = toDay(p.dateCreated);
      const end = toDay(p.finishline);

      if (start && end && day >= start && day <= end) {
        items.push({ id: p.projectId, title: p.title || p.projectId, color });
      }
      for (const ev of p.timelineEvents ?? []) {
        const d = toDay(ev.date);
        if (sameDay(d, day)) {
          const note = (ev.description as string) || undefined;
          const hit = items.find((i) => i.id === p.projectId);
          if (hit) hit.note ??= note;
          else items.push({ id: p.projectId, title: p.title || p.projectId, color, note });
        }
      }
    }
    return items;
  };

  return (
    <Squircle
      as="section"
      radius={CARD_RADIUS}
      smoothing={0.6}
      cornerRadii={CARD_CORNER_RADII}
      className={`${styles.card} ${className ?? ""}`.trim()}
      aria-label="Week overview"
    >
      <header className={styles.header}>
        <div className={styles.titleWrap}>
          <h3 className={styles.title}>This Week</h3>
          <p className={styles.subtitle}>Timeline snapshots across your projects.</p>
        </div>
        {moreCount > 0 && (
          <span
            className={styles.morePill}
            aria-label={`${moreCount} more active projects this week`}
          >
            +{moreCount} more
          </span>
        )}
      </header>

      <WeekWidget
        weekOf={weekOf}
        tracks={tracks}
        dots={dots}
        className={styles.widget}
        onPrevWeek={(d) => setWeekOf(d)}
        onNextWeek={(d) => setWeekOf(d)}
        onSelectDate={(d) => setWeekOf(d)}
        getTooltipItems={getTooltipItems}
        isMobile
      />
    </Squircle>
  );
};

export default WeekWidgetCard;
