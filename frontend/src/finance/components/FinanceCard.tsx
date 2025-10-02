import type { ReactNode } from "react";
import styles from "./FinanceCard.module.css";

export type FinanceCardProps = {
  title: string;
  metric?: ReactNode;
  subtitle?: ReactNode;
  badge?: ReactNode;
  footer?: ReactNode;
  children?: ReactNode;
  "aria-label"?: string;
};

export function FinanceCard({
  title,
  metric,
  subtitle,
  badge,
  footer,
  children,
  "aria-label": ariaLabel,
}: FinanceCardProps) {
  return (
    <section className={styles.card} aria-label={ariaLabel}>
      <header className={styles.cardHeader}>
        <div>
          <h3 className={styles.cardTitle}>{title}</h3>
          {subtitle ? <p className={styles.cardSubtitle}>{subtitle}</p> : null}
        </div>
        {badge ? <span className={styles.badge}>{badge}</span> : null}
      </header>

      {metric ? <div className={styles.metric}>{metric}</div> : null}

      <div className={styles.content}>{children}</div>

      {footer ? <footer className={styles.footer}>{footer}</footer> : null}
    </section>
  );
}

export default FinanceCard;
