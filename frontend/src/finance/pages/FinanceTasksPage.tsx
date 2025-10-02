import React, { useState } from "react";
import FinanceLayout from "../components/FinanceLayout";
import TasksOverviewCard from "@/dashboard/home/components/TasksOverviewCard";
import styles from "./FinanceTasksPage.module.css";

const FinanceTasksPage: React.FC = () => {
  const [showMap, setShowMap] = useState(false);

  return (
    <FinanceLayout
      title="Finance tasks"
      description="Action items tied to finance workflows. Syncs with the core Tasks module but scoped to company work."
    >
      <div className={styles.page}>
        <label className={styles.mapToggle}>
          <input
            type="checkbox"
            checked={showMap}
            onChange={(event) => setShowMap(event.target.checked)}
          />
          Show geo map for vendor tasks
        </label>

        <TasksOverviewCard className="finance-task-card" />

        {showMap ? (
          <div className={styles.mapPlaceholder} role="img" aria-label="Map preview placeholder">
            Map is optional and can be integrated with geo tasks.
          </div>
        ) : null}
      </div>
    </FinanceLayout>
  );
};

export default FinanceTasksPage;
