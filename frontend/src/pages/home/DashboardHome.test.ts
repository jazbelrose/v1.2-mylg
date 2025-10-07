import { describe, expect, it } from "vitest";

import {
  PROJECTS_OVERVIEW_VIEW,
  parseDashboardPath,
} from "../../dashboard/home/pages/DashboardHome";

describe("parseDashboardPath", () => {
  it("returns the projects overview view by default", () => {
    expect(parseDashboardPath("/dashboard")).toEqual({
      view: PROJECTS_OVERVIEW_VIEW,
      userSlug: null,
    });
  });

  it("interprets project routes", () => {
    expect(parseDashboardPath("/dashboard/projects")).toEqual({
      view: PROJECTS_OVERVIEW_VIEW,
      userSlug: null,
    });

    expect(parseDashboardPath("/dashboard/projects/allprojects")).toEqual({
      view: "projects-list",
      userSlug: null,
    });
  });

  it("returns the direct messages view and slug", () => {
    expect(parseDashboardPath("/dashboard/projects/messages/teammate")).toEqual({
      view: "messages",
      userSlug: "teammate",
    });
  });

  it("tolerates missing dashboard segment", () => {
    expect(parseDashboardPath("/other/path")).toEqual({
      view: PROJECTS_OVERVIEW_VIEW,
      userSlug: null,
    });
  });
});