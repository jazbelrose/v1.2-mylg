import { describe, it, expect } from "vitest";
import { renderHook, act } from "@testing-library/react";

import { useProjectFilters } from "./useProjectFilters";
import type { ProjectLike } from "@/features/dashboard/hooks/useProjectKpis";

describe("useProjectFilters", () => {
  const projects: ProjectLike[] = [
    {
      projectId: "alpha",
      title: "Alpha Roadmap",
      status: "Active",
      updatedAt: "2024-06-01T00:00:00Z",
      dateCreated: "2024-03-01T00:00:00Z",
    },
    {
      projectId: "beta",
      title: "Beta Launch",
      status: "Archived",
      updatedAt: "2024-06-05T00:00:00Z",
      dateCreated: "2024-04-01T00:00:00Z",
    },
    {
      projectId: "gamma",
      title: "Gamma Planning",
      status: "Active",
      updatedAt: "2024-05-28T00:00:00Z",
      dateCreated: "2024-05-01T00:00:00Z",
    },
  ] as ProjectLike[];

  it("limits recents by activity timestamp", () => {
    const { result } = renderHook(() =>
      useProjectFilters({ projects, recentsLimit: 2 })
    );

    expect(result.current.filteredProjects).toHaveLength(2);
    expect(result.current.filteredProjects[0]?.projectId).toBe("gamma");
  });

  it("filters projects by query and scope", () => {
    const { result } = renderHook(() =>
      useProjectFilters({ projects, recentsLimit: 2 })
    );

    act(() => {
      result.current.setQuery("gamma");
    });

    expect(result.current.filteredProjects).toHaveLength(1);
    expect(result.current.filteredProjects[0]?.projectId).toBe("gamma");

    act(() => {
      result.current.setScope("all");
      result.current.setQuery("");
    });

    expect(result.current.filteredProjects).toHaveLength(3);
  });

  it("exposes normalized status options and selection", () => {
    const { result } = renderHook(() =>
      useProjectFilters({ projects, recentsLimit: 3 })
    );

    expect(result.current.statusOptions.map((option) => option.label)).toEqual([
      "All statuses",
      "active",
      "archived",
    ]);

    act(() => {
      const option = result.current.statusOptions[1];
      result.current
        .statusDropdown
        .getOptionButtonProps(option, 1)
        .onClick();
    });

    expect(result.current.filteredProjects.every((project) => project.status === "Active")).toBe(true);
  });
});
