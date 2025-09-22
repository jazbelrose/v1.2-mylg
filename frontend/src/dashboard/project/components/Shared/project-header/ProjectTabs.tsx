import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from "react";

import { useProjectTabs } from "../useProjectTabs";

interface ProjectTabsProps {
  projectId: string;
  projectTitle?: string | null;
}

const ProjectTabs: React.FC<ProjectTabsProps> = ({ projectId, projectTitle }) => {
  const tabRefs = useRef<HTMLButtonElement[]>([]);
  const [sliderStyle, setSliderStyle] = useState<{ width: number; left: number }>({
    width: 0,
    left: 0,
  });
  const [transitionEnabled, setTransitionEnabled] = useState(false);

  const { tabs, storageKey, getActiveIndex, getFromIndex, confirmNavigate } =
    useProjectTabs(projectId, projectTitle);

  useEffect(() => {
    tabRefs.current = tabRefs.current.slice(0, tabs.length);
  }, [tabs.length]);

  const updateSlider = useCallback(() => {
    const current = getActiveIndex();
    const el = tabRefs.current[current];
    if (el) {
      setSliderStyle({ width: el.offsetWidth, left: el.offsetLeft });
    }
    if (typeof window !== "undefined") {
      sessionStorage.setItem(storageKey, String(current));
    }
  }, [getActiveIndex, storageKey]);

  useLayoutEffect(() => {
    const fromEl = tabRefs.current[getFromIndex()];
    if (fromEl) {
      setSliderStyle({ width: fromEl.offsetWidth, left: fromEl.offsetLeft });
    }
    setTransitionEnabled(false);
  }, [getFromIndex]);

  useEffect(() => {
    requestAnimationFrame(() => {
      setTransitionEnabled(true);
      updateSlider();
    });
  }, [updateSlider]);

  useEffect(() => {
    if (typeof window === "undefined") return undefined;
    window.addEventListener("resize", updateSlider);
    return () => window.removeEventListener("resize", updateSlider);
  }, [updateSlider]);

  const activeIndex = getActiveIndex();

  return (
    <div className="segmented-control with-slider" role="tablist" aria-label="Project navigation">
      <span
        className="tab-slider"
        style={{
          width: sliderStyle.width,
          transform: `translateX(${sliderStyle.left}px)`,
          transition: transitionEnabled ? undefined : "none",
        }}
        aria-hidden="true"
      />
      {tabs.map((tab, index) => {
        const isActive = index === activeIndex;
        return (
          <button
            key={tab.key}
            type="button"
            ref={(el) => {
              if (el) tabRefs.current[index] = el;
            }}
            onClick={() => confirmNavigate(tab.path)}
            className={isActive ? "active" : ""}
            aria-pressed={isActive}
          >
            {tab.icon}
            <span>{tab.label}</span>
          </button>
        );
      })}
    </div>
  );
};

export default ProjectTabs;
